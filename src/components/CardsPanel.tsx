import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { ImagePlus, Pencil, RotateCcw, Save } from 'lucide-react';
import { STORAGE_BUCKET, supabase } from '../lib/supabase';
import { BTS_GROUP, BTS_MEMBERS } from '../data/members';
import type { Album, AlbumVersion, Card, CardCategory } from '../types';

type Props = {
  albums: Album[];
  versions: AlbumVersion[];
  categories: CardCategory[];
  cards: Card[];
  onChanged: () => Promise<void>;
};

const emptyForm = {
  album_id: '',
  version_id: '',
  category_id: '',
  member: '',
  member_full_name: '',
  member_emoji: '',
  retailer: '',
  card_name: '',
  code: '',
  image_path: '',
  rarity: 'Common',
  is_group: false,
  is_blurred: false,
  release_date: '',
  notes: '',
  is_visible: true,
};

export function CardsPanel({ albums, versions, categories, cards, onChanged }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const albumVersions = useMemo(() => versions.filter((v) => String(v.album_id) === form.album_id), [versions, form.album_id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (albumFilter && String(c.album_id) !== albumFilter) return false;
      if (categoryFilter && String(c.category_id) !== categoryFilter) return false;
      if (!q) return true;
      return [c.member, c.card_name, c.code, c.image_path, c.retailer, c.notes].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [cards, search, albumFilter, categoryFilter]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    setMessage(null);
  }

  function fillMember(slug: string) {
    const all = [...BTS_MEMBERS, BTS_GROUP];
    const member = all.find((m) => m.fileName.replace('.png', '') === slug);
    if (!member) return;
    setForm((prev) => ({
      ...prev,
      member: member.member,
      member_full_name: member.fullName || '',
      member_emoji: member.emoji || '',
      is_group: Boolean(member.isGroup),
    }));
  }

  function edit(card: Card) {
    setEditingId(card.id);
    setForm({
      album_id: String(card.album_id),
      version_id: card.version_id ? String(card.version_id) : '',
      category_id: String(card.category_id),
      member: card.member || '',
      member_full_name: card.member_full_name || '',
      member_emoji: card.member_emoji || '',
      retailer: card.retailer || '',
      card_name: card.card_name || '',
      code: card.code || '',
      image_path: card.image_path || '',
      rarity: card.rarity || 'Common',
      is_group: Boolean(card.is_group),
      is_blurred: Boolean(card.is_blurred),
      release_date: card.release_date || '',
      notes: card.notes || '',
      is_visible: Boolean(card.is_visible),
    });
    setFile(null);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] || null;
    setFile(next);
  }

  async function uploadImageIfNeeded(path: string) {
    if (!file) return;
    if (!path.trim()) throw new Error('Para subir imagen, primero indica image_path.');
    const clean = path.trim().replace(/^\/+|\/+$/g, '');
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(clean, file, { cacheControl: '3600', upsert: true });
    if (error) throw new Error(`Error subiendo imagen: ${error.message}`);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!form.album_id || !form.category_id || !form.member.trim() || !form.card_name.trim() || !form.code.trim()) {
      setMessage('Completa álbum, categoría, miembro, nombre y code.');
      return;
    }

    const payload = {
      album_id: Number(form.album_id),
      version_id: form.version_id ? Number(form.version_id) : null,
      category_id: Number(form.category_id),
      member: form.member.trim(),
      member_full_name: form.member_full_name.trim() || null,
      member_emoji: form.member_emoji.trim() || null,
      retailer: form.retailer.trim() || null,
      card_name: form.card_name.trim(),
      code: form.code.trim().toUpperCase(),
      image_path: form.image_path.trim().replace(/^\/+|\/+$/g, ''),
      rarity: form.rarity.trim() || 'Common',
      is_group: form.is_group,
      is_blurred: form.is_blurred,
      release_date: form.release_date || null,
      notes: form.notes.trim() || null,
      is_visible: form.is_visible,
    };

    setBusy(true);
    try {
      await uploadImageIfNeeded(payload.image_path);
      const query = editingId
        ? supabase.from('cards').update(payload).eq('id', editingId)
        : supabase.from('cards').insert(payload);
      const { error } = await query;
      if (error) throw error;
      setMessage(editingId ? 'Card actualizada.' : 'Card creada.');
      reset();
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid xl:grid-cols-[460px_1fr] gap-6">
      <form onSubmit={submit} className="admin-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">{editingId ? 'Editar card' : 'Crear card'}</h2>
            <p className="text-sm text-violet-100/75">Administra la tabla <code>cards</code>.</p>
          </div>
          {editingId ? <button type="button" onClick={reset} className="btn-secondary"><RotateCcw size={16} /> Nueva</button> : null}
        </div>

        <Select label="Álbum" value={form.album_id} onChange={(v) => setForm((p) => ({ ...p, album_id: v, version_id: '' }))} required>
          <option value="">Seleccionar</option>
          {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select label="Versión" value={form.version_id} onChange={(v) => set('version_id', v)}>
          <option value="">Sin versión</option>
          {albumVersions.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.short_name})</option>)}
        </Select>
        <Select label="Categoría" value={form.category_id} onChange={(v) => set('category_id', v)} required>
          <option value="">Seleccionar</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Miembro" value={form.member} onChange={(v) => set('member', v)} placeholder="RM" required />
          <label className="block">
            <span className="label">Autocompletar BTS</span>
            <select className="input" onChange={(e) => e.target.value && fillMember(e.target.value)} defaultValue="">
              <option value="">Elegir...</option>
              <option value="rm">RM</option><option value="jin">Jin</option><option value="suga">Suga</option><option value="jhope">J-Hope</option><option value="jimin">Jimin</option><option value="v">V</option><option value="jungkook">Jungkook</option><option value="group">Group</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre completo" value={form.member_full_name} onChange={(v) => set('member_full_name', v)} />
          <Field label="Emoji" value={form.member_emoji} onChange={(v) => set('member_emoji', v)} />
        </div>
        <Field label="Card name" value={form.card_name} onChange={(v) => set('card_name', v)} placeholder="Album Photocard" required />
        <Field label="Code único" value={form.code} onChange={(v) => set('code', v)} placeholder="ORUL82-JHOPE-ALBUM-PC" required />
        <Field label="Image path" value={form.image_path} onChange={(v) => set('image_path', v)} placeholder="korean-albums/orul82/album-pcs/jhope.png" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Retailer" value={form.retailer} onChange={(v) => set('retailer', v)} placeholder="Weverse" />
          <Field label="Rareza" value={form.rarity} onChange={(v) => set('rarity', v)} />
        </div>
        <Field label="Release date" value={form.release_date} onChange={(v) => set('release_date', v)} type="date" />
        <label className="block">
          <span className="label">Notas</span>
          <textarea className="input min-h-24" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
        <div className="grid grid-cols-3 gap-2 text-sm font-bold text-violet-50">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_group} onChange={(e) => set('is_group', e.target.checked)} /> Group</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_blurred} onChange={(e) => set('is_blurred', e.target.checked)} /> Blurred</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_visible} onChange={(e) => set('is_visible', e.target.checked)} /> Visible</label>
        </div>

        <label className="block rounded-3xl border-2 border-dashed border-violet-200/20 bg-violet-100/10 p-5 text-center cursor-pointer">
          <ImagePlus className="mx-auto text-violet-100 mb-2" />
          <span className="font-bold text-violet-50">Subir/reemplazar imagen opcional</span>
          <p className="text-xs text-violet-100/65 mt-1">Se sube al bucket usando el image_path.</p>
          <input className="hidden" type="file" accept="image/*" onChange={onFile} />
          {file && <p className="text-xs text-violet-100 mt-2">Archivo: {file.name}</p>}
        </label>

        <button disabled={busy} className="btn-primary w-full disabled:opacity-50"><Save size={18} /> {busy ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear card'}</button>
        {message && <p className="text-sm text-violet-100/80">{message}</p>}
      </form>

      <div className="admin-card p-6 min-w-0">
        <div className="flex flex-col gap-3 mb-4">
          <h2 className="text-xl font-black text-white">Cards existentes</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar code, miembro, path..." />
            <select className="input" value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)}>
              <option value="">Todos los álbumes</option>
              {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-violet-100/65">Mostrando {filtered.length} de {cards.length} cards.</p>
        </div>
        <div className="overflow-auto rounded-3xl border border-violet-200/10 max-h-[75vh]">
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Álbum</th><th>Versión</th><th>Categoría</th><th>Miembro</th><th>Card</th><th>Code</th><th>Visible</th><th></th></tr></thead>
            <tbody>
              {filtered.map((c) => {
                const album = albums.find((a) => a.id === c.album_id);
                const version = versions.find((v) => v.id === c.version_id);
                const category = categories.find((cat) => cat.id === c.category_id);
                return (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{album?.short_name || album?.name || c.album_id}</td>
                    <td>{version?.short_name || '-'}</td>
                    <td>{category?.short_name || category?.name || c.category_id}</td>
                    <td className="font-bold">{c.member}</td>
                    <td>{c.card_name}</td>
                    <td className="font-mono text-xs">{c.code}</td>
                    <td>{c.is_visible ? 'Sí' : 'No'}</td>
                    <td><button className="icon-btn" onClick={() => edit(c)}><Pencil size={15} /> Editar</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} required={required} />
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
