import { FormEvent, useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  cover_image_url: '',
  sort_order: '',
  is_active: true,
};

export function AlbumsPanel({ albums, onChanged }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);

  const filteredAlbums = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter((a) => [a.name, a.short_name, a.artist, String(a.release_year ?? '')].some((v) => (v || '').toLowerCase().includes(q)));
  }, [albums, search]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  }

  function edit(album: Album) {
    setEditingId(album.id);
    setForm({
      name: album.name || '',
      artist: album.artist || 'BTS',
      short_name: album.short_name || '',
      release_year: album.release_year ? String(album.release_year) : '',
      release_date: album.release_date || '',
      color: album.color || '#A6A6A6',
      cover_image_url: album.cover_image_url || '',
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

    const { error } = await query;
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(editingId ? 'Álbum actualizado.' : 'Álbum creado.');
    reset();
    await onChanged();
  }

  return (
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
          <Field label="Color" value={form.color} onChange={(v) => set('color', v)} type="color" />
          <Field label="Orden" value={form.sort_order} onChange={(v) => set('sort_order', v)} type="number" />
        </div>
        <Field label="Cover image path" value={form.cover_image_url} onChange={(v) => set('cover_image_url', v)} placeholder="korean-albums/orul82/cover.png" />

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
        <div className="overflow-auto rounded-3xl border border-violet-200/10">
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
