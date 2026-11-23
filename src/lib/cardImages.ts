import { supabase, STORAGE_BUCKET } from './supabase';
import type { CardImage } from '../types';

/**
 * Imágenes de cards (Purple Collector v2).
 *
 * Desde la v2 la app NO lee `cards.image_path`: lee la vista `cards_full`, que
 * resuelve la imagen desde `card_images` (comunidad aprobada > admin aprobada >
 * legacy). Por eso cada card que el mantenedor crea o re-sube tiene que tener
 * su fila legacy en `card_images`; si no, en la app nueva sale el placeholder
 * aunque el archivo exista. `cards.image_path` se sigue llenando porque la
 * Android 1.0.4 la lee directo.
 */

export const REVIEW_BUCKET = 'photocard-community-review';
export const COMMUNITY_BUCKET = 'photocard-community';

const CARD_IMAGE_COLUMNS =
  'id, card_id, bucket_id, storage_path, source_type, status, is_primary, side, contributed_by, contributor_handle, ' +
  'reviewed_by, reviewed_at, rejection_reason, taken_down_at, width, height, byte_size, created_at';

export { CARD_IMAGE_COLUMNS };

export function publicImageUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** URL firmada para el bucket privado de revisión (el admin puede leerlo por policy). */
export async function signedReviewUrls(paths: string[], expiresIn = 3600): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return out;
  const { data, error } = await supabase.storage.from(REVIEW_BUCKET).createSignedUrls(unique, expiresIn);
  if (error) throw error;
  for (const row of data || []) {
    if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  }
  return out;
}

/** URL para mostrar una fila de card_images (pública o firmada según el bucket). */
export function imageUrlFor(img: Pick<CardImage, 'bucket_id' | 'storage_path'>, signed?: Map<string, string>): string | null {
  if (img.bucket_id === REVIEW_BUCKET) return signed?.get(img.storage_path) ?? null;
  return publicImageUrl(img.bucket_id, img.storage_path);
}

/** Todas las filas de card_images que cumplen el filtro, paginando de a 1000. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Query = any;

export async function fetchCardImages(build: (q: Query) => Query): Promise<CardImage[]> {
  const pageSize = 1000;
  const all: CardImage[] = [];
  let from = 0;
  while (true) {
    const base = supabase.from('card_images').select(CARD_IMAGE_COLUMNS);
    const { data, error } = await build(base).order('id', { ascending: true }).range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data || []) as unknown as CardImage[];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export type LegacySyncResult = {
  inserted: number;
  updated: number;
  /** Codes de cards cuya imagen fue retirada por reclamo: no se re-publican solas. */
  skippedTakenDown: string[];
};

/**
 * Deja una fila legacy aprobada y primaria (frente) por cada card, apuntando a
 * su `image_path` actual. Idempotente: se puede correr después de cada guardado.
 *
 * - Sin fila legacy → se inserta.
 * - Con primaria legacy en otra ruta → se actualiza la ruta.
 * - Si la imagen legacy de esa card fue retirada (taken_down_at) y no hay
 *   primaria, NO se vuelve a publicar: se informa para que el admin lo decida.
 */
export async function syncLegacyImages(
  cards: { id: number; code: string; image_path: string | null }[],
): Promise<LegacySyncResult> {
  const result: LegacySyncResult = { inserted: 0, updated: 0, skippedTakenDown: [] };
  const withPath = cards.filter((c) => c.image_path);
  if (!withPath.length) return result;

  const ids = withPath.map((c) => c.id);
  const existing: CardImage[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await supabase
      .from('card_images')
      .select(CARD_IMAGE_COLUMNS)
      .eq('source_type', 'legacy')
      .eq('side', 'front')
      .in('card_id', chunk);
    if (error) throw error;
    existing.push(...((data || []) as unknown as CardImage[]));
  }

  const byCard = new Map<number, CardImage[]>();
  for (const row of existing) {
    if (!byCard.has(row.card_id)) byCard.set(row.card_id, []);
    byCard.get(row.card_id)!.push(row);
  }

  const toInsert: Partial<CardImage>[] = [];
  for (const card of withPath) {
    const rows = byCard.get(card.id) || [];
    const primary = rows.find((r) => r.is_primary && r.status === 'approved');
    if (primary) {
      if (primary.storage_path !== card.image_path) {
        const { error } = await supabase
          .from('card_images')
          .update({ storage_path: card.image_path, bucket_id: STORAGE_BUCKET })
          .eq('id', primary.id);
        if (error) throw error;
        result.updated++;
      }
      continue;
    }
    if (rows.some((r) => r.taken_down_at)) {
      result.skippedTakenDown.push(card.code);
      continue;
    }
    // Hay una fila legacy no primaria con la misma ruta (caso raro): se repone como primaria.
    const samePath = rows.find((r) => r.storage_path === card.image_path);
    if (samePath) {
      const { error } = await supabase.from('card_images').update({ is_primary: true }).eq('id', samePath.id);
      if (error) throw error;
      result.updated++;
      continue;
    }
    toInsert.push({
      card_id: card.id,
      bucket_id: STORAGE_BUCKET,
      storage_path: card.image_path!,
      source_type: 'legacy',
      status: 'approved',
      is_primary: true,
      side: 'front',
    });
  }

  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await supabase.from('card_images').insert(toInsert.slice(i, i + 500));
    if (error) throw error;
  }
  result.inserted = toInsert.length;
  return result;
}

/** Extrae el mensaje real de error de una edge function ({ success:false, error }). */
async function invokeEdge<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const parsed = await context.json();
        if (parsed?.error) message = parsed.error;
      } catch {
        // el cuerpo no era JSON
      }
    }
    throw new Error(message);
  }
  if (data && typeof data === 'object' && 'success' in data && !(data as { success: boolean }).success) {
    throw new Error((data as { error?: string }).error || `${name} falló`);
  }
  return data as T;
}

export type ModerateImageAction =
  | { action: 'approve'; cardImageId: number }
  | { action: 'reject'; cardImageId: number; reason: string }
  | { action: 'takedown'; cardImageId: number; reason: string; reportId?: number };

export function moderateCardImage(payload: ModerateImageAction) {
  return invokeEdge<{ success: true; action: string; cardImageId: number; cardId?: number }>('moderate-card-image', payload);
}

export type ModerateSubmissionAction =
  | { action: 'approve'; submissionId: number }
  | { action: 'reject'; submissionId: number; reason: string };

export function moderateCardSubmission(payload: ModerateSubmissionAction) {
  return invokeEdge<{ success: true; action: 'approve' | 'reject' | 'resolve'; submissionId: number; cardId?: number; code?: string; backPendingImageId?: number | null }>(
    'moderate-card-submission',
    payload,
  );
}
