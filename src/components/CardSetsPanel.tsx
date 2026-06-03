import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Pencil, RotateCcw, Save } from 'lucide-react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { SaveToast } from './SaveToast';
import type { Album, AlbumVersion, CardCategory, CardSet } from '../types';

type Props = {
  albums: Album[];
  versions: AlbumVersion[];
  categories: CardCategory[];
  cardSets: CardSet[];
  onChanged: () => Promise<void>;
};

const emptyForm = {
  album_id: '',
  version_id: '',
  category_id: '',
  name: '',
  short_name: '',
  description: '',
  retailer: '',
  round: '',
  sort_order: '0',
  is_active: true,
};

export function CardSetsPanel({ albums, versions, categories, cardSets, onChanged }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'saving' | 'success' | null>(null);
  const closeToast = useCallback(() => setToastStatus(null), []);

  const albumVersions = useMemo(
    () => versions.filter((v) => String(v.album_id) === form.album_id),
    [versions, form.album_id]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cardSets;
    return cardSets.filter((s) =>
      [s.name, s.short_name, s.description, s.retailer, s.round].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [cardSets, search]);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'album_id') next.version_id = '';
      return next;
    });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  }

  function edit(cs: CardSet) {
    setEditingId(cs.id);
    setForm({
      album_id: String(cs.album_id),
      version_id: cs.version_id != null ? String(cs.version_id) : '',
      category_id: cs.category_id != null ? String(cs.category_id) : '',
      name: cs.name,
      short_name: cs.short_name,
      description: cs.description || '',
      retailer: cs.retailer || '',
      round: cs.round || '',
      sort_order: String(cs.sort_order ?? 0),
      is_active: cs.is_active,
    });
    setMessage(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.album_id) { setMessage('Selecciona un álbum.'); return; }
    const payload = {
      album_id: Number(form.album_id),
      version_id: form.version_id ? Number(form.version_id) : null,
      category_id: form.category_id ? Number(form.category_id) : null,
      name: form.name.trim(),
      short_name: form.short_name.trim(),
      description: form.description.trim() || null,
      retailer: form.retailer.trim() || null,
      round: form.round.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };
    const query = editingId
      ? supabase.from('card_sets').update(payload).eq('id', editingId)
      : supabase.from('card_sets').insert(payload);
    setToastStatus('saving');
    const { error } = await query;
    if (error) { setToastStatus(null); setMessage(error.message); return; }
    await onChanged();
    setToastStatus('success');
    reset();
  }

  const albumName = (id: number) => albums.find((a) => a.id === id)?.short_name || albums.find((a) => a.id === id)?.name || String(id);
  const versionName = (id: number | null) => id ? (versions.find((v) => v.id === id)?.short_name || String(id)) : '-';
  const categoryName = (id: number | null) => id ? (categories.find((c) => c.id === id)?.short_name || String(id)) : '-';

  return (
    <>
      <SaveToast status={toastStatus} onClose={closeToast} />
      <section className="grid lg:grid-cols-[440px_1fr] gap-6">
        <form onSubmit={submit} className="admin-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">{editingId ? 'Editar set' : 'Nuevo card set'}</h2>
              <p className="text-sm text-violet-100/75">Tabla <code>card_sets</code>.</p>
            </div>
            {editingId && <button type="button" onClick={reset} className="btn-secondary"><RotateCcw size={16} /> Nuevo</button>}
          </div>

          <label className="block">
            <span className="label">Álbum</span>
            <select className="input" value={form.album_id}
              onChange={(e) => set('album_id', e.target.value)} required>
              <option value="">Seleccionar</option>
              {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Versión (opcional)</span>
              <select className="input" value={form.version_id} onChange={(e) => set('version_id', e.target.value)}>
                <option value="">Sin versión</option>
                {albumVersions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Categoría (opcional)</span>
              <select className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>

          <Field label="Nombre" value={form.name} onChange={(v) => set('name', v)} placeholder="Album Photocards" required />
          <Field label="Short name" value={form.short_name} onChange={(v) => set('short_name', v)} placeholder="album-pcs" required />
          <Field label="Descripción" value={form.description} onChange={(v) => set('description', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Retailer" value={form.retailer} onChange={(v) => set('retailer', v)} placeholder="Weverse" />
            <Field label="Round" value={form.round} onChange={(v) => set('round', v)} placeholder="1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Orden" value={form.sort_order} onChange={(v) => set('sort_order', v)} type="number" />
            <label className="flex items-end pb-2 gap-2 text-sm font-bold text-violet-50">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
              Activo
            </label>
          </div>

          <button className="btn-primary w-full"><Save size={18} /> {editingId ? 'Guardar cambios' : 'Crear set'}</button>
          {message && <p className="text-sm text-red-300">{message}</p>}
        </form>

        <div className="admin-card p-6 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-black text-white">Card Sets existentes</h2>
            <input className="input max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." />
          </div>
          <div className="rounded-3xl border border-violet-200/10">
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Álbum</th><th>Versión</th><th>Categoría</th><th>Nombre</th><th>Short</th><th>Retailer</th><th>Activo</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((cs) => (
                  <tr key={cs.id}>
                    <td>{cs.id}</td>
                    <td>{albumName(cs.album_id)}</td>
                    <td>{versionName(cs.version_id)}</td>
                    <td>{categoryName(cs.category_id)}</td>
                    <td className="font-bold">{cs.name}</td>
                    <td>{cs.short_name}</td>
                    <td>{cs.retailer || '-'}</td>
                    <td>{cs.is_active ? 'Sí' : 'No'}</td>
                    <td><button className="icon-btn" onClick={() => edit(cs)}><Pencil size={15} /> Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="text-violet-100/70 mt-4">No hay resultados.</p>}
        </div>
      </section>
    </>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} type={type} required={required} />
    </label>
  );
}
