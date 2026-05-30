import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ImagePlus, UploadCloud } from 'lucide-react';
import { STORAGE_BUCKET, supabase, supabaseAdmin } from '../lib/supabase';
import { BTS_GROUP, BTS_MEMBERS } from '../data/members';
import { SaveToast } from './SaveToast';
import type { Album, AlbumVersion, CardCategory, CardInsert, ImportedCropFile } from '../types';

type Props = {
  albums: Album[];
  versions: AlbumVersion[];
  categories: CardCategory[];
  importedFiles?: ImportedCropFile[];
};

type FileMap = Record<string, File | undefined>;

export function BulkCardsPanel({ albums, versions, categories, importedFiles = [] }: Props) {
  const [albumId, setAlbumId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [includeGroup, setIncludeGroup] = useState(true);
  const [basePath, setBasePath] = useState('korean-albums/orul82/album-pcs');
  const [codeBase, setCodeBase] = useState('ORUL82');
  const [cardName, setCardName] = useState('Album Photocard');
  const [groupCardName, setGroupCardName] = useState('Group Album Photocard');
  const [suffix, setSuffix] = useState('ALBUM-PC');
  const [rarity, setRarity] = useState('Common');
  const [releaseDate, setReleaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<FileMap>({});
  const [message, setMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'saving' | 'success' | null>(null);
  const closeToast = useCallback(() => setToastStatus(null), []);

  useEffect(() => {
    if (!importedFiles.length) return;
    setFiles((current) => {
      const next: FileMap = { ...current };
      for (const item of importedFiles) next[item.fileName.toLowerCase()] = item.file;
      return next;
    });
  }, [importedFiles]);

  const albumVersions = useMemo(() => versions.filter((v) => String(v.album_id) === albumId), [versions, albumId]);
  const selectedMembers = includeGroup ? [...BTS_MEMBERS, BTS_GROUP] : [...BTS_MEMBERS];

  const generatedRows: CardInsert[] = useMemo(() => {
    const normalizedBasePath = cleanPath(basePath);
    return selectedMembers.map((m) => {
      const isGroup = Boolean(m.isGroup);
      return {
        album_id: Number(albumId),
        version_id: versionId ? Number(versionId) : null,
        category_id: Number(categoryId),
        member: m.member,
        member_full_name: m.fullName,
        member_emoji: m.emoji,
        retailer: null,
        card_name: isGroup ? groupCardName : cardName,
        code: [codeBase, m.codePart, suffix].filter(Boolean).join('-').toUpperCase(),
        image_path: `${normalizedBasePath}/${m.fileName}`,
        rarity,
        is_group: isGroup,
        is_blurred: false,
        release_date: releaseDate || null,
        notes: notes || null,
        is_visible: true,
      };
    });
  }, [albumId, versionId, categoryId, basePath, selectedMembers, codeBase, suffix, cardName, groupCardName, rarity, releaseDate, notes]);

  function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files || []);
    const next: FileMap = { ...files };

    for (const file of incoming) {
      const lower = file.name.toLowerCase();
      const match = selectedMembers.find((m) => lower === m.fileName);
      if (match) next[match.fileName.toLowerCase()] = file;
    }

    setFiles(next);
  }

  async function uploadImages() {
    for (const row of generatedRows) {
      const fileName = row.image_path.split('/').pop() || '';
      const file = files[fileName.toLowerCase()];
      if (!file) continue;

      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(row.image_path, file, { cacheControl: '3600', upsert: true });

      if (error) throw new Error(`Error subiendo ${fileName}: ${error.message}`);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!albumId || !categoryId) {
      setMessage('Selecciona álbum y categoría.');
      return;
    }

    setToastStatus('saving');
    try {
      await uploadImages();

      const { error } = await supabase
        .from('cards')
        .upsert(generatedRows, { onConflict: 'code' });

      if (error) throw error;
      setToastStatus('success');
      setMessage(`Listo: ${generatedRows.length} cards guardadas. Las imágenes seleccionadas también se subieron.`);
    } catch (err) {
      setToastStatus(null);
      setMessage(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  return (
    <>
    <SaveToast status={toastStatus} onClose={closeToast} message={toastStatus === 'success' ? `¡${generatedRows.length} cards guardadas!` : undefined} />
    <section className="grid xl:grid-cols-[420px_1fr] gap-6">
      <form onSubmit={submit} className="admin-card p-6 space-y-4">
        <h2 className="text-xl font-black text-white">Carga masiva de photocards</h2>

        <Select label="Álbum" value={albumId} onChange={(v) => { setAlbumId(v); setVersionId(''); }} required>
          <option value="">Seleccionar</option>
          {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>

        <Select label="Versión" value={versionId} onChange={setVersionId}>
          <option value="">Sin versión</option>
          {albumVersions.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.short_name})</option>)}
        </Select>

        <Select label="Categoría" value={categoryId} onChange={setCategoryId} required>
          <option value="">Seleccionar</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={includeGroup} onChange={(e) => setIncludeGroup(e.target.checked)} />
          Incluir Group/BTS
        </label>

        <Field label="Base path Storage" value={basePath} onChange={setBasePath} placeholder="korean-albums/orul82/album-pcs" />
        <Field label="Código base" value={codeBase} onChange={setCodeBase} placeholder="ORUL82" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Suffix código" value={suffix} onChange={setSuffix} placeholder="ALBUM-PC" />
          <Field label="Rareza" value={rarity} onChange={setRarity} />
        </div>

        <Field label="Card name" value={cardName} onChange={setCardName} />
        <Field label="Group card name" value={groupCardName} onChange={setGroupCardName} />
        <Field label="Release date" value={releaseDate} onChange={setReleaseDate} type="date" />
        <Field label="Notas" value={notes} onChange={setNotes} placeholder="O!RUL8,2? Album Photocard" />

        <label className="block rounded-3xl border-2 border-dashed border-violet-200/20 bg-violet-100/10 p-5 text-center cursor-pointer">
          <ImagePlus className="mx-auto text-violet-50 mb-2" />
          <span className="font-bold text-violet-50">Seleccionar imágenes</span>
          <p className="text-xs text-violet-100/65 mt-1">Nombres esperados: rm.png, jin.png, suga.png, jhope.png, jimin.png, v.png, jungkook.png, group.png</p>
          <input className="hidden" type="file" accept="image/*" multiple onChange={onFiles} />
        </label>

        <button disabled={toastStatus === 'saving'} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
          <UploadCloud size={18} /> Subir imágenes y guardar cards
        </button>

        {message && <p className="text-sm text-violet-100/80">{message}</p>}
      </form>

      <div className="admin-card p-6 min-w-0">
        <h2 className="text-xl font-black text-white mb-2">Preview antes de guardar</h2>
        <p className="text-sm text-violet-100/65 mb-4">Se hará upsert por <code>code</code>, así puedes corregir y volver a guardar.</p>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {generatedRows.map((row) => {
            const fileName = row.image_path.split('/').pop() || '';
            const file = files[fileName.toLowerCase()];
            return (
              <article key={row.code} className="rounded-3xl border border-violet-200/10 p-4 bg-white/10">
                <div className="aspect-[2.8/4] rounded-2xl bg-white/10 border border-violet-200/10 overflow-hidden flex items-center justify-center">
                  {file ? (
                    <img src={URL.createObjectURL(file)} alt={row.code} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-violet-100/55 text-center px-4">Sin imagen seleccionada<br />{fileName}</span>
                  )}
                </div>
                <div className="mt-3">
                  <div className="font-bold text-white">{row.member} · {row.card_name}</div>
                  <div className="text-xs text-violet-100/65 break-all">{row.code}</div>
                  <div className="text-xs text-violet-100/65 break-all mt-1">{row.image_path}</div>
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

function Field({ label, value, onChange, placeholder, type = 'text' }: {
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

function Select({ label, value, onChange, children, required }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select required={required} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}
