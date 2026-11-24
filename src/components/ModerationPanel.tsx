import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, Check, Crop, Flag, ImageUp, Inbox, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  CARD_IMAGE_COLUMNS, REVIEW_BUCKET, adjustPendingImage, imageUrlFor, moderateCardImage, moderateCardSubmission, signedReviewUrls,
} from '../lib/cardImages';
import type {
  Album, AlbumVersion, Card, CardCategory, CardImage, CardSet, CardSubmission, ImageReport, ReportStatus,
} from '../types';
import { ImageAdjustModal, type AdjustResult } from './ImageAdjustModal';

type Props = {
  albums: Album[];
  versions: AlbumVersion[];
  categories: CardCategory[];
  cardSets: CardSet[];
  cards: Card[];
  cardImages: CardImage[];
  onChanged: () => Promise<void>;
};

type Section = 'images' | 'reports' | 'submissions';

const PAGE = 24;

const REJECT_PRESETS = [
  'No corresponde a esta card',
  'Imagen de baja calidad o borrosa',
  'Imagen duplicada',
  'Tiene marca de agua o texto encima',
  'Contenido inapropiado',
];

const REPORT_REASON_LABEL: Record<string, string> = {
  wrong_card: 'Card incorrecta',
  duplicate: 'Duplicada',
  copyright: 'Copyright',
  inappropriate: 'Inapropiada',
  low_quality: 'Baja calidad',
  other: 'Otro',
};

const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: 'Abierto',
  resolved_kept: 'Resuelto: se mantuvo',
  resolved_removed: 'Resuelto: se retiró',
  dismissed: 'Descartado',
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

/** Pide un motivo (obligatorio) antes de una acción destructiva. */
type ReasonPrompt = {
  title: string;
  description: string;
  confirmLabel: string;
  presets?: string[];
  danger?: boolean;
  optional?: boolean;
  run: (reason: string) => Promise<void>;
};

export function ModerationPanel({ albums, versions, categories, cardSets, cards, cardImages, onChanged }: Props) {
  const [section, setSection] = useState<Section>('images');
  const [counts, setCounts] = useState({ images: 0, reports: 0, submissions: 0 });
  const [prompt, setPrompt] = useState<ReasonPrompt | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const albumsById = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums]);
  const versionsById = useMemo(() => new Map(versions.map((v) => [v.id, v])), [versions]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const setsById = useMemo(() => new Map(cardSets.map((s) => [s.id, s])), [cardSets]);

  /** Imagen publicada hoy por card y lado, para comparar con el aporte. */
  const currentByCardSide = useMemo(() => {
    const order: Record<string, number> = { community: 0, admin: 1, legacy: 2 };
    const m = new Map<string, CardImage>();
    for (const img of cardImages) {
      if (img.status !== 'approved' || !img.is_primary) continue;
      const key = `${img.card_id}:${img.side}`;
      const prev = m.get(key);
      if (!prev || order[img.source_type] < order[prev.source_type]) m.set(key, img);
    }
    return m;
  }, [cardImages]);

  const refreshCounts = useCallback(async () => {
    const [img, rep, sub] = await Promise.all([
      supabase.from('card_images').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('image_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('card_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setCounts({ images: img.count ?? 0, reports: rep.count ?? 0, submissions: sub.count ?? 0 });
  }, []);

  useEffect(() => { void refreshCounts(); }, [refreshCounts]);

  function cardLabel(cardId: number) {
    const c = cardsById.get(cardId);
    if (!c) return `Card #${cardId}`;
    const album = albumsById.get(c.album_id);
    return `${c.card_name} · ${album?.short_name || album?.name || ''}`;
  }

  async function afterAction(text: string) {
    setNotice({ kind: 'ok', text });
    await Promise.all([refreshCounts(), onChanged()]);
  }

  const shared = { cardsById, albumsById, versionsById, categoriesById, setsById, currentByCardSide, cardLabel, setPrompt, setNotice, afterAction };

  return (
    <div className="admin-card p-6 min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-black text-white flex items-center gap-2"><ShieldCheck size={20} /> Moderación</h2>
        <div className="flex gap-1.5 flex-wrap">
          <SectionButton active={section === 'images'} onClick={() => setSection('images')} icon={<ImageUp size={14} />} label="Imágenes" count={counts.images} />
          <SectionButton active={section === 'reports'} onClick={() => setSection('reports')} icon={<Flag size={14} />} label="Reportes" count={counts.reports} />
          <SectionButton active={section === 'submissions'} onClick={() => setSection('submissions')} icon={<Inbox size={14} />} label="Propuestas" count={counts.submissions} />
        </div>
      </div>

      {notice && (
        <div className={`rounded-2xl px-4 py-3 text-sm flex items-start justify-between gap-3 ${notice.kind === 'ok' ? 'bg-emerald-500/15 text-emerald-100' : 'bg-red-500/15 text-red-100'}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)}><X size={14} /></button>
        </div>
      )}

      {section === 'images' && <PendingImages {...shared} />}
      {section === 'reports' && <Reports {...shared} />}
      {section === 'submissions' && <Submissions {...shared} />}

      {prompt && <ReasonModal prompt={prompt} onClose={() => setPrompt(null)} />}
    </div>
  );
}

type Shared = {
  cardsById: Map<number, Card>;
  albumsById: Map<number, Album>;
  versionsById: Map<number, AlbumVersion>;
  categoriesById: Map<number, CardCategory>;
  setsById: Map<number, CardSet>;
  currentByCardSide: Map<string, CardImage>;
  cardLabel: (cardId: number) => string;
  setPrompt: (p: ReasonPrompt | null) => void;
  setNotice: (n: { kind: 'ok' | 'error'; text: string } | null) => void;
  afterAction: (text: string) => Promise<void>;
};

// ---------------------------------------------------------------------------
// Imágenes pendientes (aportes de la comunidad)
// ---------------------------------------------------------------------------

function PendingImages({ cardsById, currentByCardSide, cardLabel, setPrompt, setNotice, afterAction }: Shared) {
  const [rows, setRows] = useState<CardImage[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [handleFilter, setHandleFilter] = useState('');
  const [adjusting, setAdjusting] = useState<CardImage | null>(null);

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      let q = supabase
        .from('card_images')
        .select(CARD_IMAGE_COLUMNS)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (handleFilter.trim()) q = q.ilike('contributor_handle', `%${handleFilter.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      const page = (data || []) as unknown as CardImage[];
      const signed = await signedReviewUrls(page.map((r) => r.storage_path));
      setUrls((prev) => (offset === 0 ? signed : new Map([...prev, ...signed])));
      setRows((prev) => (offset === 0 ? page : [...prev, ...page]));
      setHasMore(page.length === PAGE);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Error cargando imágenes' });
    } finally {
      setLoading(false);
    }
  }, [handleFilter, setNotice]);

  useEffect(() => { void load(0); }, [load]);

  async function approve(img: CardImage) {
    setBusyId(img.id);
    try {
      await moderateCardImage({ action: 'approve', cardImageId: img.id });
      setRows((r) => r.filter((x) => x.id !== img.id));
      await afterAction(`Aprobada: ${cardLabel(img.card_id)} (${img.side === 'back' ? 'reverso' : 'frente'}).`);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'No se pudo aprobar' });
    } finally {
      setBusyId(null);
    }
  }

  /** Guarda el re-encuadre (y opcionalmente aprueba). Lanza para que el modal muestre el error. */
  async function saveAdjust(img: CardImage, result: AdjustResult, andApprove: boolean) {
    const patch = await adjustPendingImage(img, result.blob, result.width, result.height);
    const updated = { ...img, ...patch };
    setUrls((prev) => new Map(prev).set(patch.storage_path, URL.createObjectURL(result.blob)));
    setRows((r) => r.map((x) => (x.id === img.id ? updated : x)));
    if (andApprove) {
      await approve(updated);
    } else {
      setNotice({ kind: 'ok', text: `Encuadre ajustado: ${cardLabel(img.card_id)} (${result.width}×${result.height}).` });
    }
  }

  function reject(img: CardImage) {
    setPrompt({
      title: 'Rechazar aporte',
      description: `${cardLabel(img.card_id)} · @${img.contributor_handle || 'sin usuario'}. El motivo lo ve quien la subió.`,
      confirmLabel: 'Rechazar',
      presets: REJECT_PRESETS,
      danger: true,
      run: async (reason) => {
        await moderateCardImage({ action: 'reject', cardImageId: img.id, reason });
        setRows((r) => r.filter((x) => x.id !== img.id));
        await afterAction(`Rechazada: ${cardLabel(img.card_id)}.`);
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input className="input max-w-xs !mt-0" placeholder="Filtrar por @usuario" value={handleFilter} onChange={(e) => setHandleFilter(e.target.value)} />
        <button className="btn-secondary" onClick={() => load(0)} disabled={loading}><RefreshCw size={14} /> Recargar</button>
        <p className="text-xs text-violet-100/60">Se muestran las más antiguas primero. Aprobar mueve el archivo al bucket público y la deja como imagen principal de la card.</p>
      </div>

      {rows.length === 0 && !loading && <p className="text-violet-100/70">No hay aportes pendientes. 🎉</p>}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((img) => {
          const card = cardsById.get(img.card_id);
          const current = currentByCardSide.get(`${img.card_id}:${img.side}`);
          const currentUrl = current ? imageUrlFor(current) : null;
          const pendingUrl = urls.get(img.storage_path) ?? null;
          return (
            <div key={img.id} className="rounded-3xl border border-violet-200/15 bg-white/5 p-4 space-y-3">
              <div>
                <div className="font-bold text-white">{cardLabel(img.card_id)}</div>
                <div className="text-xs text-violet-100/60 font-mono">{card?.code}</div>
                <div className="text-xs text-violet-100/70 mt-1">
                  {img.side === 'back' ? 'Reverso' : 'Frente'} · @{img.contributor_handle || 'sin usuario'} · {fmtDate(img.created_at)}
                  {img.width && img.height ? ` · ${img.width}×${img.height}` : ''}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Thumb label={current ? `Actual (${current.source_type})` : 'Actual: sin imagen'} url={currentUrl} />
                <Thumb label="Nueva (aporte)" url={pendingUrl} />
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary !py-2" disabled={busyId === img.id} onClick={() => setAdjusting(img)} title="Ajustar encuadre">
                  <Crop size={15} /> Ajustar
                </button>
                <button className="flex-1 btn-primary !py-2 disabled:opacity-60" disabled={busyId === img.id} onClick={() => approve(img)}>
                  {busyId === img.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Aprobar
                </button>
                <button className="flex-1 btn-secondary text-red-200" disabled={busyId === img.id} onClick={() => reject(img)}>
                  <X size={15} /> Rechazar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {loading && <p className="text-violet-100/60 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando…</p>}
      {hasMore && !loading && <button className="btn-secondary" onClick={() => load(rows.length)}>Cargar más</button>}

      {adjusting && (() => {
        const current = currentByCardSide.get(`${adjusting.card_id}:${adjusting.side}`);
        return (
          <ImageAdjustModal
            title={cardLabel(adjusting.card_id)}
            subtitle={`${adjusting.side === 'back' ? 'Reverso' : 'Frente'} · @${adjusting.contributor_handle || 'sin usuario'}`}
            storagePath={adjusting.storage_path}
            currentUrl={current ? imageUrlFor(current) : null}
            currentLabel={current ? `Actual (${current.source_type})` : 'Actual: sin imagen'}
            onClose={() => setAdjusting(null)}
            onSave={(result, andApprove) => saveAdjust(adjusting, result, andApprove)}
          />
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reportes de imágenes
// ---------------------------------------------------------------------------

function Reports({ cardsById, cardLabel, setPrompt, setNotice, afterAction }: Shared) {
  const [status, setStatus] = useState<ReportStatus | ''>('open');
  const [rows, setRows] = useState<ImageReport[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('image_reports')
        .select(`*, card_images(${CARD_IMAGE_COLUMNS})`)
        .order('created_at', { ascending: status === 'open' })
        .limit(200);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data || []) as unknown as ImageReport[]);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Error cargando reportes' });
    } finally {
      setLoading(false);
    }
  }, [status, setNotice]);

  useEffect(() => { void load(); }, [load]);

  async function closeReport(report: ImageReport, next: 'resolved_kept' | 'dismissed', note: string) {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('image_reports')
      .update({
        status: next,
        resolved_by: auth.user?.id,
        resolved_at: new Date().toISOString(),
        resolution_note: note || null,
      })
      .eq('id', report.id)
      .eq('status', 'open');
    if (error) throw error;
  }

  function keep(report: ImageReport) {
    setPrompt({
      title: 'Mantener la imagen',
      description: 'El reporte se cierra y la imagen sigue publicada.',
      confirmLabel: 'Mantener',
      optional: true,
      run: async (note) => {
        await closeReport(report, 'resolved_kept', note);
        await load();
        await afterAction('Reporte cerrado: la imagen se mantiene.');
      },
    });
  }

  function dismiss(report: ImageReport) {
    setPrompt({
      title: 'Descartar reporte',
      description: 'Para reportes sin fundamento o spam. La imagen no cambia.',
      confirmLabel: 'Descartar',
      optional: true,
      run: async (note) => {
        await closeReport(report, 'dismissed', note);
        await load();
        await afterAction('Reporte descartado.');
      },
    });
  }

  function takedown(report: ImageReport) {
    const img = report.card_images;
    if (!img) return;
    setPrompt({
      title: 'Retirar la imagen',
      description:
        'Se borra el archivo, la card queda con "Imagen retirada" y el reporte se cierra como resuelto.' +
        (img.source_type === 'legacy' ? ' Al ser legacy, también se vacía cards.image_path (deja de verse en la Android 1.0.4).' : ''),
      confirmLabel: 'Retirar',
      presets: ['Reclamo de copyright', 'No corresponde a esta card', 'Contenido inapropiado'],
      danger: true,
      run: async (reason) => {
        await moderateCardImage({ action: 'takedown', cardImageId: img.id, reason, reportId: report.id });
        await load();
        await afterAction(`Imagen retirada: ${cardLabel(img.card_id)}.`);
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select className="input max-w-xs !mt-0" value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | '')}>
          <option value="open">Abiertos</option>
          <option value="resolved_removed">Resueltos: retirada</option>
          <option value="resolved_kept">Resueltos: mantenida</option>
          <option value="dismissed">Descartados</option>
          <option value="">Todos</option>
        </select>
        <button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw size={14} /> Recargar</button>
      </div>

      {rows.length === 0 && !loading && <p className="text-violet-100/70">No hay reportes en este estado.</p>}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const img = r.card_images;
          const card = img ? cardsById.get(img.card_id) : undefined;
          const url = img && img.status === 'approved' && !img.taken_down_at ? imageUrlFor(img) : null;
          return (
            <div key={r.id} className="rounded-3xl border border-violet-200/15 bg-white/5 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-white">{img ? cardLabel(img.card_id) : `Imagen #${r.card_image_id}`}</div>
                  <div className="text-xs text-violet-100/60 font-mono">{card?.code}</div>
                </div>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${r.reason === 'copyright' ? 'bg-red-500/25 text-red-100' : 'bg-white/10'}`}>
                  {REPORT_REASON_LABEL[r.reason] || r.reason}
                </span>
              </div>
              <Thumb label={img ? `${img.source_type}${img.contributor_handle ? ` · @${img.contributor_handle}` : ''} · ${img.side === 'back' ? 'reverso' : 'frente'}` : ''} url={url} emptyText={img?.taken_down_at ? 'Retirada' : 'Sin imagen'} />
              {r.detail && <p className="text-sm text-violet-50 break-words">“{r.detail}”</p>}
              <div className="text-xs text-violet-100/60">
                {fmtDate(r.created_at)} · {REPORT_STATUS_LABEL[r.status]}
                {r.resolution_note && <> · Nota: {r.resolution_note}</>}
              </div>
              {r.status === 'open' && (
                <div className="flex gap-2 flex-wrap">
                  <button className="flex-1 btn-primary !py-2 bg-red-600 hover:bg-red-500" disabled={!img || img.status !== 'approved' || Boolean(img.taken_down_at)} onClick={() => takedown(r)}>
                    <Ban size={15} /> Retirar
                  </button>
                  <button className="flex-1 btn-secondary" onClick={() => keep(r)}><Check size={15} /> Mantener</button>
                  <button className="flex-1 btn-secondary" onClick={() => dismiss(r)}><X size={15} /> Descartar</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {loading && <p className="text-violet-100/60 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando…</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Propuestas de cards nuevas
// ---------------------------------------------------------------------------

function Submissions({ albumsById, versionsById, categoriesById, setsById, setPrompt, setNotice, afterAction }: Shared) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rows, setRows] = useState<CardSubmission[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_submissions')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: status === 'pending' })
        .limit(100);
      if (error) throw error;
      const list = (data || []) as CardSubmission[];
      const reviewPaths = list
        .flatMap((s) => [s.bucket_id === REVIEW_BUCKET ? s.storage_path : '', s.back_storage_path || ''])
        .filter(Boolean);
      let signed = new Map<string, string>();
      try { signed = await signedReviewUrls(reviewPaths); } catch { /* aprobadas ya no están en revisión */ }
      setUrls(signed);
      setRows(list);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Error cargando propuestas' });
    } finally {
      setLoading(false);
    }
  }, [status, setNotice]);

  useEffect(() => { void load(); }, [load]);

  async function approve(s: CardSubmission) {
    setBusyId(s.id);
    try {
      const res = await moderateCardSubmission({ action: 'approve', submissionId: s.id });
      await load();
      if (res.action === 'resolve') {
        await afterAction('Propuesta marcada como resuelta. Al ser de un álbum no listado, no se creó ninguna card: créala a mano en Álbumes / Carga masiva.');
      } else {
        await afterAction(
          `Card creada: #${res.cardId} (${res.code}).` +
          (res.backPendingImageId ? ' El reverso quedó pendiente en la bandeja de Imágenes.' : ''),
        );
      }
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'No se pudo aprobar' });
    } finally {
      setBusyId(null);
    }
  }

  function reject(s: CardSubmission) {
    setPrompt({
      title: 'Rechazar propuesta',
      description: 'El motivo lo ve quien la propuso.',
      confirmLabel: 'Rechazar',
      presets: ['La card ya existe en el catálogo', 'No es una photocard oficial', 'Imagen de baja calidad', 'Faltan datos para identificarla'],
      danger: true,
      run: async (reason) => {
        await moderateCardSubmission({ action: 'reject', submissionId: s.id, reason });
        await load();
        await afterAction('Propuesta rechazada.');
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select className="input max-w-xs !mt-0" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
        </select>
        <button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw size={14} /> Recargar</button>
        <p className="text-xs text-violet-100/60">Aprobar crea la card (visible) con un code automático y publica el frente. El reverso queda pendiente en Imágenes.</p>
      </div>

      {rows.length === 0 && !loading && <p className="text-violet-100/70">No hay propuestas en este estado.</p>}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((s) => {
          const album = s.album_id != null ? albumsById.get(s.album_id) : undefined;
          const version = s.version_id != null ? versionsById.get(s.version_id) : undefined;
          const category = s.category_id != null ? categoriesById.get(s.category_id) : undefined;
          const set = s.card_set_id != null ? setsById.get(s.card_set_id) : undefined;
          return (
            <div key={s.id} className="rounded-3xl border border-violet-200/15 bg-white/5 p-4 space-y-3">
              <div>
                <div className="font-bold text-white">{s.card_name || 'Sin nombre'} · {s.member}</div>
                <div className="text-xs text-violet-100/70">@{s.contributor_handle || 'sin usuario'} · {fmtDate(s.created_at)}</div>
              </div>
              {s.album_unlisted ? (
                <div className="rounded-2xl bg-amber-500/15 text-amber-100 text-xs px-3 py-2">
                  Álbum no listado: hay que crearlo a mano. Aprobar solo la marca como resuelta.
                </div>
              ) : (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-violet-100/50">Álbum</dt><dd>{album?.name || s.album_id}</dd>
                  <dt className="text-violet-100/50">Versión</dt><dd>{version?.name || '-'}</dd>
                  <dt className="text-violet-100/50">Categoría</dt><dd>{category?.name || s.category_id}</dd>
                  <dt className="text-violet-100/50">Card set</dt><dd>{set?.name || '-'}</dd>
                </dl>
              )}
              {s.notes && <p className="text-sm text-violet-50 break-words">“{s.notes}”</p>}
              <div className="grid grid-cols-2 gap-2">
                <Thumb label="Frente" url={urls.get(s.storage_path) ?? null} emptyText={s.status === 'approved' ? 'Publicada' : 'Sin vista previa'} />
                <Thumb label="Reverso" url={s.back_storage_path ? urls.get(s.back_storage_path) ?? null : null} emptyText={s.back_storage_path ? 'Sin vista previa' : 'No enviado'} />
              </div>
              {s.rejection_reason && <p className="text-xs text-violet-100/60">Motivo: {s.rejection_reason}</p>}
              {s.created_card_id && <p className="text-xs text-violet-100/60">Card creada: #{s.created_card_id}</p>}
              {s.status === 'pending' && (
                <div className="flex gap-2">
                  <button className="flex-1 btn-primary !py-2 disabled:opacity-60" disabled={busyId === s.id} onClick={() => approve(s)}>
                    {busyId === s.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    {s.album_unlisted ? 'Marcar resuelta' : 'Aprobar y crear card'}
                  </button>
                  <button className="flex-1 btn-secondary text-red-200" disabled={busyId === s.id} onClick={() => reject(s)}>
                    <X size={15} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {loading && <p className="text-violet-100/60 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando…</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas compartidas
// ---------------------------------------------------------------------------

function Thumb({ label, url, emptyText = 'Sin imagen' }: { label: string; url: string | null; emptyText?: string }) {
  return (
    <div className="space-y-1">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} className="w-full h-44 object-contain rounded-xl bg-black/25" loading="lazy" />
        </a>
      ) : (
        <div className="w-full h-44 rounded-xl bg-black/25 flex items-center justify-center text-xs text-violet-100/40">{emptyText}</div>
      )}
      {label && <div className="text-[11px] text-violet-100/60 truncate">{label}</div>}
    </div>
  );
}

function SectionButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }) {
  return (
    <button onClick={onClick} className={`rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition ${active ? 'bg-fuchsia-600 text-white' : 'bg-white/10 border border-violet-200/20 text-violet-100 hover:bg-white/15'}`}>
      {icon} {label}
      {count > 0 && <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{count}</span>}
    </button>
  );
}

function ReasonModal({ prompt, onClose }: { prompt: ReasonPrompt; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canConfirm = prompt.optional || reason.trim().length > 0;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await prompt.run(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="admin-card p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white">{prompt.title}</h3>
        <p className="text-sm text-violet-100/80">{prompt.description}</p>
        {prompt.presets && (
          <div className="flex flex-wrap gap-1.5">
            {prompt.presets.map((p) => (
              <button key={p} type="button" className="icon-btn !py-1" onClick={() => setReason(p)}>{p}</button>
            ))}
          </div>
        )}
        <label className="block">
          <span className="label">{prompt.optional ? 'Nota (opcional)' : 'Motivo (obligatorio)'}</span>
          <textarea className="input min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex gap-3">
          <button type="button" className="flex-1 btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button
            type="button"
            className={`flex-1 btn-primary disabled:opacity-60 ${prompt.danger ? 'bg-red-600 hover:bg-red-500' : ''}`}
            onClick={confirm}
            disabled={busy || !canConfirm}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : null} {prompt.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
