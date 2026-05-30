import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Save } from 'lucide-react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { SaveToast } from './SaveToast';
import type { Album } from '../types';

type Props = {
  albums: Album[];
  onChanged: () => Promise<void>;
};

const emptyForm = {
  name: '',
  artist: 'BTS',
  short_name: '',
  release_year: '',
  release_date: '',
  color: '#A6A6A6',
  cover_category: 'korean-albums',
  cover_image_url: '',
  sort_order: '',
  is_active: true,
};

function buildCoverPath(category: string, shortName: string) {
  const cat = category.trim();
  const slug = shortName.trim().toLowerCase();
  if (!cat || !slug) return '';
  return `${cat}/${slug}/cover.png`;
}

export function AlbumsPanel({ albums, onChanged }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'saving' | 'success' | null>(null);
  const closeToast = useCallback(() => setToastStatus(null), []);

  const filteredAlbums = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter((a) => [a.name, a.short_name, a.artist, String(a.release_year ?? '')].some((v) => (v || '').toLowerCase().includes(q)));
  }, [albums, search]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'cover_category' || key === 'short_name') {
        next.cover_image_url = buildCoverPath(next.cover_category, next.short_name);
      }
      return next;
    });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  }

  function edit(album: Album) {
    setEditingId(album.id);
    const existingPath = album.cover_image_url || '';
    const parts = existingPath.split('/');
    const cover_category = parts.length >= 3 ? parts[0] : 'korean-albums';
    setForm({
      name: album.name || '',
      artist: album.artist || 'BTS',
      short_name: album.short_name || '',
      release_year: album.release_year ? String(album.release_year) : '',
      release_date: album.release_date || '',
      color: album.color || '#A6A6A6',
      cover_category,
      cover_image_url: existingPath,
      sort_order: album.sort_order ? String(album.sort_order) : '',
      is_active: Boolean(album.is_active),
    });
    setMessage(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const payload = {
      name: form.name.trim(),
      artist: form.artist.trim() || null,
      short_name: form.short_name.trim() || null,
      release_year: form.release_year ? Number(form.release_year) : null,
      release_date: form.release_date || null,
      color: form.color || null,
      cover_image_url: form.cover_image_url.trim() || null,
      sort_order: form.sort_order ? Number(form.sort_order) : null,
      is_active: form.is_active,
    };

    const query = editingId
      ? supabase.from('albums').update(payload).eq('id', editingId)
      : supabase.from('albums').insert(payload);

    setToastStatus('saving');
    const { error } = await query;
    if (error) {
      setToastStatus(null);
      setMessage(error.message);
      return;
    }

    await onChanged();
    setToastStatus('success');
    reset();
  }

  return (
    <>
    <SaveToast status={toastStatus} onClose={closeToast} />
    <section className="grid lg:grid-cols-[440px_1fr] gap-6">
      <form onSubmit={submit} className="admin-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">{editingId ? 'Editar álbum' : 'Crear álbum'}</h2>
            <p className="text-sm text-violet-100/75">Administra la tabla <code>albums</code>.</p>
          </div>
          {editingId ? <button type="button" onClick={reset} className="btn-secondary"><RotateCcw size={16} /> Nuevo</button> : null}
        </div>

        <Field label="Nombre" value={form.name} onChange={(v) => set('name', v)} placeholder="O!RUL8,2?" required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Artista" value={form.artist} onChange={(v) => set('artist', v)} />
          <Field label="Short name" value={form.short_name} onChange={(v) => set('short_name', v)} placeholder="ORUL82" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Año" value={form.release_year} onChange={(v) => set('release_year', v)} type="number" />
          <Field label="Fecha" value={form.release_date} onChange={(v) => set('release_date', v)} type="date" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Color" value={form.color} onChange={(v) => set('color', v)} />
          <Field label="Orden" value={form.sort_order} onChange={(v) => set('sort_order', v)} type="number" />
        </div>
        <Field label="Categoría imagen" value={form.cover_category} onChange={(v) => set('cover_category', v)} placeholder="korean-albums" />
        <label className="block">
          <span className="label">Cover image path</span>
          <div className="input mt-1 text-violet-200/60 select-all font-mono text-sm">
            {form.cover_image_url || <span className="text-violet-200/30">se genera automáticamente</span>}
          </div>
        </label>

        <label className="flex items-center gap-2 text-sm font-bold text-violet-50">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          Activo
        </label>

        <button className="btn-primary w-full"><Save size={18} /> {editingId ? 'Guardar cambios' : 'Guardar álbum'}</button>
        {message && <p className="text-sm text-violet-100/80">{message}</p>}
      </form>

      <div className="admin-card p-6 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-black text-white">Álbumes existentes</h2>
          <input className="input max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar álbum..." />
        </div>
        <div className="rounded-3xl border border-violet-200/10">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th><th>Álbum</th><th>Short</th><th>Año</th><th>Orden</th><th>Activo</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filteredAlbums.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td className="font-bold">{a.name}</td>
                  <td>{a.short_name}</td>
                  <td>{a.release_year}</td>
                  <td>{a.sort_order}</td>
                  <td>{a.is_active ? 'Sí' : 'No'}</td>
                  <td><button className="icon-btn" onClick={() => edit(a)}><Pencil size={15} /> Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAlbums.length === 0 && <p className="text-violet-100/70 mt-4">No hay resultados.</p>}
      </div>
    </section>
    </>
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="block">
      <span className="label">{label}</span>
      <label className="input mt-1 flex items-center gap-3 cursor-pointer p-2">
        <span className="relative h-9 w-9 shrink-0 rounded-xl border-2 border-white/20 overflow-hidden shadow-inner" style={{ backgroundColor: value }}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-violet-50 font-mono text-sm uppercase"
          maxLength={7}
          placeholder="#A6A6A6"
        />
      </label>
    </div>
  );
}
