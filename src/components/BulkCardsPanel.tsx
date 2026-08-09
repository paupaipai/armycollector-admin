import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ImagePlus, UploadCloud, X, Trash2 } from 'lucide-react';
import { STORAGE_BUCKET, supabase, supabaseAdmin } from '../lib/supabase';
import { BTS_GROUP, BTS_MEMBERS } from '../data/members';
import { SaveToast } from './SaveToast';
import type {
  Album, AlbumEra, AlbumVersion, CardCategory, CardInsert, CardSet, CollectionType, ImportedCropFile,
} from '../types';

const RARITIES = ['Common', 'Rare', 'Ultra Rare', 'Limited'] as const;

/** Las imágenes solo se ven como referencia dentro de la app, nunca se descargan. */
const MAX_IMAGE_WIDTH = 160;
const MAX_IMAGE_HEIGHT = 240;

/** Redimensiona `file` para que quepa dentro de maxWidth×maxHeight (sin recortar ni estirar). */
async function resizeImageFile(file: File, maxWidth: number, maxHeight: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
  if (scale === 1) {
    bitmap.close();
    return file;
  }

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
  if (!blob) return file;

  return new File([blob], file.name, { type });
}

type Props = {
  albums: Album[];
  versions: AlbumVersion[];
  categories: CardCategory[];
  cardSets: CardSet[];
  collectionTypes: CollectionType[];
  albumEras: AlbumEra[];
  importedFiles?: ImportedCropFile[];
  onChanged?: () => Promise<void>;
};

type FileMap = Record<string, File | undefined>;

/** Normaliza un string para usar como segmento de ruta (preserva guiones bajos). */
function toPath(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Reemplaza guion en/em dash (y variantes unicode) por guion normal "-". */
function normalizeDashes(s: string) {
  return s.replace(/[\u2010-\u2015]/g, '-');
}

/** Nombre de card por defecto según la categoría, cuando no hay un Card Set que lo sugiera. */
const CATEGORY_DEFAULT_NAMES: Record<string, string> = {
  album_pc: 'Album Photocard',
  pob: 'POB PC',
  lucky_draw: 'Lucky Draw PC',
  exclusive: 'Exclusive PC',
  vinyl_pc: 'Vinyl PC',
  album_pola: 'Polaroid',
};

/** Rareza por defecto según la categoría. */
const CATEGORY_DEFAULT_RARITY: Record<string, string> = {
  lucky_draw: 'Rare',
  exclusive: 'Rare',
};

/** Quita ocurrencias (palabra completa, sin distinguir mayúsculas) de `tokens` dentro de `text`. */
function stripTokens(text: string, tokens: (string | null | undefined)[]): string {
  let result = text;
  const ordered = (tokens.filter(Boolean) as string[]).sort((a, b) => b.length - a.length);
  for (const token of ordered) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '');
  }
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Deriva el "descriptor" propio de un Card Set, quitando del nombre del set
 * las partes que ya identifican álbum/versión y el sufijo genérico "PC(s)".
 *
 * Ej: name="BE Deluxe JPFC Lucky Draw PCs", album.short_name="BE", version.short_name="Deluxe"
 *     → "JPFC Lucky Draw"
 */
function deriveSetDescriptor(cardSet: CardSet, album?: Album, version?: AlbumVersion | null): string {
  const tokens = [album?.short_name, album?.name, version?.short_name, version?.name];
  const stripped = stripTokens(cardSet.name, tokens);
  return stripped.replace(/\s+PCs?$/i, '').trim();
}

/**
 * Genera la ruta única de imagen para una card.
 * Estructura: {type}/{era}/{album}/{category}/{version}/{cardSet}/{memberFileName}
 * (las carpetas de versión y card set se agregan solo si están presentes; ambas pueden coexistir).
 */
export function generateCardImagePath({
  collectionTypeShort,
  eraShort,
  albumShort,
  categoryShort,
  versionShort,
  cardSetShort,
  memberFileName,
}: {
  collectionTypeShort: string;
  eraShort: string;
  albumShort: string;
  categoryShort: string;
  versionShort: string | null;
  cardSetShort: string | null;
  memberFileName: string;
}): string {
  const parts = [
    toPath(collectionTypeShort),
    toPath(eraShort),
    toPath(albumShort),
    toPath(categoryShort),
    versionShort ? toPath(versionShort) : null,
    cardSetShort ? toPath(cardSetShort) : null,
  ].filter(Boolean) as string[];

  return `${parts.join('/')}/${memberFileName}`;
}

export function BulkCardsPanel({
  albums, versions, categories, cardSets, collectionTypes, albumEras, importedFiles = [], onChanged,
}: Props) {
  const [filterTypeId, setFilterTypeId] = useState('');
  const [filterEraId, setFilterEraId] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cardSetId, setCardSetId] = useState('');
  const [includeGroup, setIncludeGroup] = useState(true);
  const [basePath, setBasePath] = useState('');
  const [codeBase, setCodeBase] = useState('');
  const [cardName, setCardName] = useState('Album Photocard');
  const [groupCardName, setGroupCardName] = useState('Group Album Photocard');
  const [suffix, setSuffix] = useState('ALBUM-PC');
  const [rarity, setRarity] = useState('Common');
  const [releaseDate, setReleaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<FileMap>({});
  const [message, setMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'saving' | 'success' | null>(null);
  /** Rows pendientes de confirmar reemplazo de imagen. */
  const [pendingSave, setPendingSave] = useState<CardInsert[] | null>(null);
  /** Rutas de imágenes que ya existen en Storage. */
  const [existingPaths, setExistingPaths] = useState<string[]>([]);

  const closeToast = useCallback(() => setToastStatus(null), []);

  // Importar archivos del Cropper
  useEffect(() => {
    if (!importedFiles.length) return;
    setFiles((current) => {
      const next: FileMap = { ...current };
      for (const item of importedFiles) next[item.fileName.toLowerCase()] = item.file;
      return next;
    });
  }, [importedFiles]);

  // Filtros para acotar la lista de álbumes (Tipo → Era → Álbum)
  const filteredEras = useMemo(
    () => (filterTypeId ? albumEras.filter((e) => String(e.collection_type_id) === filterTypeId) : albumEras),
    [albumEras, filterTypeId],
  );
  const filteredAlbums = useMemo(
    () => albums.filter((a) => {
      if (filterTypeId && String(a.collection_type_id ?? '') !== filterTypeId) return false;
      if (filterEraId && String(a.era_id ?? '') !== filterEraId) return false;
      return true;
    }),
    [albums, filterTypeId, filterEraId],
  );

  function onFilterTypeChange(v: string) {
    setFilterTypeId(v);
    setFilterEraId('');
    setAlbumId('');
    setVersionId('');
    setCardSetId('');
  }

  function onFilterEraChange(v: string) {
    setFilterEraId(v);
    setAlbumId('');
    setVersionId('');
    setCardSetId('');
  }

  // Entidades derivadas
  const album = useMemo(() => albums.find((a) => String(a.id) === albumId), [albums, albumId]);
  const version = useMemo(() => versions.find((v) => String(v.id) === versionId), [versions, versionId]);
  const category = useMemo(() => categories.find((c) => String(c.id) === categoryId), [categories, categoryId]);
  const cardSet = useMemo(() => cardSets.find((s) => String(s.id) === cardSetId), [cardSets, cardSetId]);
  const collectionType = useMemo(
    () => (album?.collection_type_id ? collectionTypes.find((t) => t.id === album.collection_type_id) : null),
    [album, collectionTypes],
  );
  const era = useMemo(
    () => (album?.era_id ? albumEras.find((e) => e.id === album.era_id) : null),
    [album, albumEras],
  );

  const albumVersions = useMemo(() => versions.filter((v) => String(v.album_id) === albumId), [versions, albumId]);
  const albumCardSets = useMemo(() => cardSets.filter((s) => String(s.album_id) === albumId), [cardSets, albumId]);

  /** El álbum tiene versiones definidas → la versión es importante para generar rutas únicas. */
  const albumHasVersions = albumVersions.length > 0;

  // Al seleccionar un Card Set, sincronizar álbum/versión/categoría desde ese set:
  // si el set define version_id o category_id, esos valores son la fuente de verdad.
  useEffect(() => {
    if (!cardSet) return;
    if (cardSet.album_id != null && String(cardSet.album_id) !== albumId) {
      setAlbumId(String(cardSet.album_id));
    }
    if (cardSet.version_id != null && String(cardSet.version_id) !== versionId) {
      setVersionId(String(cardSet.version_id));
    }
    if (cardSet.category_id != null && String(cardSet.category_id) !== categoryId) {
      setCategoryId(String(cardSet.category_id));
    }
  }, [cardSet]);

  // Auto-sugerir basePath, codeBase, suffix, card name y rareza al cambiar álbum/versión/categoría/set
  useEffect(() => {
    if (!albumId || !categoryId) return;

    const typePart = collectionType ? toPath(collectionType.short_name) : 'unknown';
    const eraPart = era ? toPath(era.short_name) : 'unknown';
    const albumPart = album ? toPath(album.short_name || album.name) : 'unknown';
    const catPart = category ? toPath(category.short_name || category.name) : 'unknown';

    // La ruta incluye versión y card set como carpetas independientes (ambas pueden coexistir)
    const versionPart = version ? toPath(version.short_name || version.name) : null;
    const cardSetPart = cardSet ? toPath(cardSet.short_name) : null;

    const newBasePath = [typePart, eraPart, albumPart, catPart, versionPart, cardSetPart]
      .filter(Boolean)
      .join('/');
    setBasePath(newBasePath);

    // Código base: álbum + versión (si existe), p.ej. "BE-DELUXE"
    const albumCode = album?.short_name ? album.short_name.toUpperCase().replace(/[-_]+/g, '') : '';
    const versionCode = version?.short_name ? version.short_name.toUpperCase().replace(/[-_]+/g, '') : '';
    const codeBaseSuggestion = [albumCode, versionCode].filter(Boolean).join('-');
    if (codeBaseSuggestion) {
      setCodeBase(normalizeDashes(codeBaseSuggestion));
    }

    if (album?.release_date) {
      setReleaseDate(album.release_date.slice(0, 10));
    }

    // Descriptor propio del card set (p.ej. "JPFC Lucky Draw"), usado para sugerir suffix y card name
    const descriptor = cardSet ? deriveSetDescriptor(cardSet, album, version) : '';

    const suffixSuggestion = descriptor
      ? descriptor.toUpperCase().replace(/[\s_]+/g, '-')
      : category?.short_name
      ? category.short_name.toUpperCase().replace(/[\s_]+/g, '-')
      : '';
    if (suffixSuggestion) {
      setSuffix(normalizeDashes(suffixSuggestion));
    }

    const categoryDefaultName = category?.short_name ? CATEGORY_DEFAULT_NAMES[category.short_name] : undefined;
    const cardNameSuggestion = descriptor ? `${descriptor} PC` : categoryDefaultName;
    if (cardNameSuggestion) {
      setCardName(cardNameSuggestion);
      setGroupCardName(`Group ${cardNameSuggestion}`);
    }

    const raritySuggestion = category?.short_name ? CATEGORY_DEFAULT_RARITY[category.short_name] : undefined;
    if (raritySuggestion) {
      setRarity(raritySuggestion);
    }
  }, [albumId, versionId, categoryId, cardSetId, album, version, category, cardSet, collectionType, era]);

  const selectedMembers = includeGroup ? [...BTS_MEMBERS, BTS_GROUP] : [...BTS_MEMBERS];

  const generatedRows: CardInsert[] = useMemo(() => {
    const normalizedBasePath = cleanPath(basePath);
    const retailer = cardSet?.retailer ?? null;
    const country = cardSet?.country ?? null;
    const drawType = cardSet?.draw_type ?? null;

    return selectedMembers.flatMap((m) => {
      const isGroup = Boolean(m.isGroup);
      const memberBase = m.fileName.replace('.png', '');

      // Estructura: {codigoBase}-{MEMBER_CODE}-{suffixCodigo}
      const codeParts = [codeBase, m.codePart, suffix].filter(Boolean) as string[];

      const baseRow: CardInsert = {
        album_id: Number(albumId),
        version_id: versionId ? Number(versionId) : null,
        category_id: Number(categoryId),
        member: m.member,
        member_full_name: m.fullName,
        member_emoji: m.emoji,
        retailer,
        card_name: isGroup ? groupCardName : `${m.member} ${cardName}`,
        code: normalizeDashes(codeParts.join('-')).toUpperCase(),
        image_path: `${normalizedBasePath}/${m.fileName}`,
        rarity,
        is_group: isGroup,
        is_blurred: false,
        release_date: releaseDate || null,
        notes: notes || null,
        is_visible: true,
        card_set_id: cardSetId ? Number(cardSetId) : null,
        country,
        draw_type: drawType,
      };

      const extraRows: CardInsert[] = [];
      let n = 2;
      while (files[`${memberBase}_${n}.png`]) {
        const extraCodeParts = [codeBase, m.codePart, suffix, String(n)].filter(Boolean) as string[];
        extraRows.push({
          ...baseRow,
          card_name: isGroup ? `${groupCardName} ${n}` : `${m.member} ${cardName} ${n}`,
          code: normalizeDashes(extraCodeParts.join('-')).toUpperCase(),
          image_path: `${normalizedBasePath}/${memberBase}_${n}.png`,
        });
        n++;
      }

      return [baseRow, ...extraRows];
    });
  }, [
    albumId, versionId, categoryId, cardSetId, basePath, cardSet,
    selectedMembers, codeBase, suffix, cardName, groupCardName, rarity, releaseDate, notes, files,
  ]);

  function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files || []);
    const next: FileMap = { ...files };

    for (const file of incoming) {
      const lower = file.name.toLowerCase();
      if (selectedMembers.some((m) => lower === m.fileName)) {
        next[lower] = file;
      } else {
        const numMatch = lower.match(/^([a-z]+)_(\d+)\.png$/);
        if (numMatch && selectedMembers.some((m) => m.fileName === `${numMatch[1]}.png`)) {
          next[lower] = file;
        }
      }
    }

    setFiles(next);
  }

  /** Quita una sola imagen seleccionada (no toca lo que ya está guardado en Storage/DB). */
  function removeFile(fileName: string) {
    setFiles((current) => {
      const next = { ...current };
      delete next[fileName.toLowerCase()];
      return next;
    });
  }

  /** Limpia todas las imágenes seleccionadas para este lote (no toca lo ya guardado). */
  function clearFiles() {
    setFiles({});
    setMessage(null);
  }

  /** Verifica en Storage cuáles de las rutas destino ya tienen imagen. */
  async function checkExistingImages(rowsToSave: CardInsert[]): Promise<string[]> {
    const folderMap = new Map<string, string[]>();
    for (const row of rowsToSave) {
      const parts = row.image_path.split('/');
      const folder = parts.slice(0, -1).join('/');
      const file = parts[parts.length - 1];
      if (!folderMap.has(folder)) folderMap.set(folder, []);
      folderMap.get(folder)!.push(file);
    }

    const existing: string[] = [];
    for (const [folder, fileNames] of folderMap) {
      const { data } = await supabaseAdmin.storage.from(STORAGE_BUCKET).list(folder);
      if (data) {
        for (const item of data) {
          if (fileNames.includes(item.name)) {
            existing.push(`${folder}/${item.name}`);
          }
        }
      }
    }
    return existing;
  }

  async function uploadImages(rowsToSave: CardInsert[]) {
    for (const row of rowsToSave) {
      const fileName = row.image_path.split('/').pop() || '';
      const file = files[fileName.toLowerCase()];
      if (!file) continue;

      const resized = await resizeImageFile(file, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT);

      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(row.image_path, resized, { cacheControl: '3600', upsert: true });

      if (error) throw new Error(`Error subiendo ${fileName}: ${error.message}`);
    }
  }

  async function doSave(rowsToSave: CardInsert[]) {
    setToastStatus('saving');
    try {
      await uploadImages(rowsToSave);

      const { error } = await supabase
        .from('cards')
        .upsert(rowsToSave, { onConflict: 'code' });

      if (error) throw error;
      await onChanged?.();
      setToastStatus('success');
      setMessage(`Listo: ${rowsToSave.length} cards guardadas.`);
    } catch (err) {
      setToastStatus(null);
      setMessage(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const errors: string[] = [];
    if (!albumId) errors.push('Selecciona un álbum.');
    if (!cardSetId) errors.push('Selecciona un Card Set.');
    if (!categoryId) errors.push('Selecciona una categoría.');
    if (!basePath.trim()) errors.push('El Base path Storage es obligatorio.');
    if (!codeBase.trim()) errors.push('El código base es obligatorio.');
    if (!suffix.trim()) errors.push('El suffix de código es obligatorio.');
    if (!rarity) errors.push('Selecciona una rareza.');
    if (!cardName.trim()) errors.push('El Card name es obligatorio.');
    if (includeGroup && !files['group.png']) {
      errors.push('Incluiste Group/BTS pero no seleccionaste group.png.');
    }
    if (cardSet?.version_id != null && versionId && Number(versionId) !== cardSet.version_id) {
      errors.push('La versión seleccionada no coincide con la versión del Card Set.');
    }
    if (cardSet?.category_id != null && categoryId && Number(categoryId) !== cardSet.category_id) {
      errors.push('La categoría seleccionada no coincide con la categoría del Card Set.');
    }

    if (errors.length) {
      setMessage(errors.join(' '));
      return;
    }

    const rowsToSave = generatedRows.filter((row) => {
      const fileName = row.image_path.split('/').pop() || '';
      return Boolean(files[fileName.toLowerCase()]);
    });

    if (!rowsToSave.length) {
      setMessage('No hay imágenes seleccionadas para subir.');
      return;
    }

    // Verificar si ya existen imágenes en las rutas destino
    setToastStatus('saving');
    let existing: string[] = [];
    try {
      existing = await checkExistingImages(rowsToSave);
    } catch {
      // Si el check falla, continuar igual
    }
    setToastStatus(null);

    if (existing.length > 0) {
      setExistingPaths(existing);
      setPendingSave(rowsToSave);
      return;
    }

    await doSave(rowsToSave);
  }

  function handleConfirmReplace() {
    const rows = pendingSave;
    setPendingSave(null);
    setExistingPaths([]);
    if (rows) doSave(rows);
  }

  function handleCancelReplace() {
    setPendingSave(null);
    setExistingPaths([]);
  }

  const versionWarning = albumHasVersions && !versionId;

  return (
    <>
      <SaveToast status={toastStatus} onClose={closeToast} />

      {/* Modal de confirmación de reemplazo */}
      {existingPaths.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="admin-card p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">Imágenes existentes detectadas</h3>
            </div>
            <p className="text-sm text-violet-100/80">
              Ya existen <strong>{existingPaths.length}</strong> imagen(es) en las rutas destino.
              ¿Deseas reemplazarlas?
            </p>
            <ul className="text-xs text-violet-100/55 space-y-1 max-h-40 overflow-y-auto font-mono">
              {existingPaths.map((p) => <li key={p} className="break-all">{p}</li>)}
            </ul>
            <div className="flex gap-3">
              <button onClick={handleCancelReplace} className="flex-1 btn-secondary">Cancelar</button>
              <button onClick={handleConfirmReplace} className="flex-1 btn-primary">Sí, reemplazar</button>
            </div>
          </div>
        </div>
      )}

      <section className="grid xl:grid-cols-[440px_1fr] gap-6">
        <form onSubmit={submit} className="admin-card p-6 space-y-4">
          <h2 className="text-xl font-black text-white">Carga masiva de photocards</h2>

          <Select label="Tipo" value={filterTypeId} onChange={onFilterTypeChange}>
            <option value="">Todos</option>
            {collectionTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>

          <Select label="Era" value={filterEraId} onChange={onFilterEraChange}>
            <option value="">Todas</option>
            {filteredEras.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>

          <Select
            label="Álbum"
            value={albumId}
            onChange={(v) => { setAlbumId(v); setVersionId(''); setCardSetId(''); }}
            required
          >
            <option value="">Seleccionar</option>
            {filteredAlbums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>

          <Select
            label={albumHasVersions ? 'Versión (recomendada para este álbum)' : 'Versión'}
            value={versionId}
            onChange={setVersionId}
            disabled={cardSet?.version_id != null}
          >
            <option value="">Sin versión</option>
            {albumVersions.map((v) => (
              <option key={v.id} value={v.id}>{v.name}{v.short_name ? ` (${v.short_name})` : ''}</option>
            ))}
          </Select>

          {versionWarning && (
            <p className="text-xs text-amber-400 flex items-start gap-1.5 -mt-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              Este álbum tiene {albumVersions.length} versión(es). Selecciona una versión para que la ruta
              y el código sean únicos por versión y no se sobreescriban imágenes entre ellas.
            </p>
          )}

          <Select label="Card Set" value={cardSetId} onChange={setCardSetId} required>
            <option value="">Seleccionar</option>
            {albumCardSets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <p className="text-xs text-violet-100/55 -mt-2">
            Al elegir un Card Set se sincronizan automáticamente versión, categoría y se sugieren
            código base, suffix, card name y rareza.
          </p>

          <Select
            label="Categoría"
            value={categoryId}
            onChange={setCategoryId}
            required
            disabled={cardSet?.category_id != null}
          >
            <option value="">Seleccionar</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <label className="flex items-center gap-2 text-sm font-medium text-violet-100">
            <input
              type="checkbox"
              checked={includeGroup}
              onChange={(e) => setIncludeGroup(e.target.checked)}
            />
            Incluir Group/BTS
          </label>

          <Field
            label="Base path Storage"
            value={basePath}
            onChange={setBasePath}
            placeholder="korean_albums/love_yourself/lyh/album_pc/lyh_l"
          />

          <Field label="Código base" value={codeBase} onChange={setCodeBase} placeholder="LYH" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Suffix código" value={suffix} onChange={setSuffix} placeholder="ALBUM-PC" />
            <Select label="Rareza" value={rarity} onChange={setRarity}>
              {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>

          <Field label="Card name" value={cardName} onChange={setCardName} />
          <Field label="Group card name" value={groupCardName} onChange={setGroupCardName} />
          <Field label="Release date" value={releaseDate} onChange={setReleaseDate} type="date" />
          <Field label="Notas" value={notes} onChange={setNotes} placeholder="LY Her Album Photocard" />

          <label className="block rounded-3xl border-2 border-dashed border-violet-200/20 bg-violet-100/10 p-5 text-center cursor-pointer">
            <ImagePlus className="mx-auto text-violet-50 mb-2" />
            <span className="font-bold text-violet-50">Seleccionar imágenes</span>
            <p className="text-xs text-violet-100/65 mt-1">
              Nombres esperados: rm.png, jin.png, suga.png, jhope.png, jimin.png, v.png, jungkook.png, group.png.
              Para múltiples: suga_2.png, group_2.png…
            </p>
            <input className="hidden" type="file" accept="image/*" multiple onChange={onFiles} />
          </label>

          {Object.keys(files).length > 0 && (
            <button
              type="button"
              onClick={clearFiles}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Limpiar selección ({Object.keys(files).length})
            </button>
          )}

          <button
            type="submit"
            disabled={toastStatus === 'saving'}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <UploadCloud size={18} /> Subir imágenes y guardar cards
          </button>

          {message && <p className="text-sm text-violet-100/80">{message}</p>}
        </form>

        {/* Preview */}
        <div className="admin-card p-6 min-w-0">
          <h2 className="text-xl font-black text-white mb-1">Preview antes de guardar</h2>
          <p className="text-sm text-violet-100/65 mb-4">
            Upsert por <code>code</code>. Estructura: <code>CODIGO_BASE-MIEMBRO-SUFFIX</code>
            (el código base ya incluye la versión cuando corresponde).
          </p>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {generatedRows.map((row) => {
              const fileName = row.image_path.split('/').pop() || '';
              const file = files[fileName.toLowerCase()];
              return (
                <article key={row.code} className="relative rounded-3xl border border-violet-200/10 p-4 bg-white/10">
                  {file && (
                    <button
                      type="button"
                      onClick={() => removeFile(fileName)}
                      title="Quitar del lote"
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <div className="aspect-[2.8/4] rounded-2xl bg-white/10 border border-violet-200/10 overflow-hidden flex items-center justify-center">
                    {file ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={row.code}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-violet-100/55 text-center px-4">
                        Sin imagen<br />{fileName}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-0.5">
                    <div className="font-bold text-white text-sm">{row.member} · {row.card_name}</div>
                    <div className="text-xs text-violet-100/65 break-all font-mono">{row.code}</div>
                    <div className="text-xs text-violet-100/50 break-all font-mono">{row.image_path}</div>
                    <div className="text-[11px] text-violet-100/45 mt-1 space-y-0.5">
                      <div>Álbum: {album?.name ?? '—'}{version ? ` · Versión: ${version.name}` : ''}</div>
                      <div>Categoría: {category?.name ?? '—'}{cardSet ? ` · Card Set: ${cardSet.name}` : ''}</div>
                      <div>Rareza: {row.rarity}</div>
                      {(row.country || row.draw_type) && (
                        <div>País: {row.country ?? '—'}{row.draw_type ? ` · Draw: ${row.draw_type}` : ''}</div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

function cleanPath(path: string) {
  return path.trim().replace(/^\/+|\/+$/g, '');
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function Select({
  label, value, onChange, children, required, disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select
        required={required}
        disabled={disabled}
        className="input disabled:opacity-60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
