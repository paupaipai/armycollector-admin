import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Pencil, RotateCcw, Save } from 'lucide-react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { SaveToast } from './SaveToast';
import type { AlbumEra, CollectionType } from '../types';

type Props = {
  collectionTypes: CollectionType[];
  albumEras: AlbumEra[];
  onChanged: () => Promise<void>;
};

const emptyForm = {
  collection_type_id: '',
  name: '',
  short_name: '',
  description: '',
  icon_name: '',
  color: '#A855F7',
  sort_order: '0',
  is_active: true,
};

export function AlbumErasPanel({ collectionTypes, albumEras, onChanged }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'saving' | 'success' | null>(null);
  const closeToast = useCallback(() => setToastStatus(null), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return albumEras;
    return albumEras.filter((e) =>
      [e.name, e.short_name, e.description].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [albumEras, search]);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  }

  function edit(era: AlbumEra) {
    setEditingId(era.id);
    setForm({
      collection_type_id: String(era.collection_type_id),
      name: era.name,
      short_name: era.short_name,
      description: era.description || '',
      icon_name: era.icon_name || '',
      color: era.color || '#A855F7',
      sort_order: String(era.sort_order ?? 0),
      is_active: era.is_active,
    });
    setMessage(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.collection_type_id) { setMessage('Selecciona un tipo de colección.'); return; }
    const payload = {
      collection_type_id: Number(form.collection_type_id),
      name: form.name.trim(),
      short_name: form.short_name.trim(),
      description: form.description.trim() || null,
      icon_name: form.icon_name.trim() || null,
      color: form.color || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };
    console.log('[submit] editingId:', editingId, 'payload:', payload);
    setToastStatus('saving');
    const { data, error } = editingId
      ? await supabase.from('album_eras').update(payload).eq('id', editingId).select()
      : await supabase.from('album_eras').insert(payload).select();
    console.log('[submit] result:', { data, error });
    if (error) { setToastStatus(null); setMessage(error.message); return; }
    await onChanged();
    setToastStatus('success');
    reset();
  }

  const collectionTypeName = (id: number) =>
    collectionTypes.find((t) => t.id === id)?.name ?? String(id);

  return (
    <>
      <SaveToast status={toastStatus} onClose={closeToast} />
      <section className="grid lg:grid-cols-[440px_1fr] gap-6">
        <form onSubmit={submit} className="admin-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">{editingId ? 'Editar era' : 'Nueva era'}</h2>
              <p className="text-sm text-violet-100/75">Tabla <code>album_eras</code>.</p>
            </div>
            {editingId && <button type="button" onClick={reset} className="btn-secondary"><RotateCcw size={16} /> Nueva</button>}
          </div>

          <label className="block">
            <span className="label">Tipo de colección</span>
            <select className="input" value={form.collection_type_id}
              onChange={(e) => set('collection_type_id', e.target.value)} required>
              <option value="">Seleccionar</option>
              {collectionTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>

          <Field label="Nombre" value={form.name} onChange={(v) => set('name', v)} placeholder="Love Yourself Era" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Short name" value={form.short_name} onChange={(v) => set('short_name', v)} placeholder="ly-era" required />
            <Field label="Nombre del ícono" value={form.icon_name} onChange={(v) => set('icon_name', v)} placeholder="heart" />
          </div>
          <Field label="Descripción" value={form.description} onChange={(v) => set('description', v)} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Color" value={form.color} onChange={(v) => set('color', v)} />
            <Field label="Orden" value={form.sort_order} onChange={(v) => set('sort_order', v)} type="number" />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-violet-50">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            Activa
          </label>

          <button className="btn-primary w-full"><Save size={18} /> {editingId ? 'Guardar cambios' : 'Crear era'}</button>
          {message && <p className="text-sm text-red-300">{message}</p>}
        </form>

        <div className="admin-card p-6 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-black text-white">Eras existentes</h2>
            <input className="input max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." />
          </div>
          <div className="rounded-3xl border border-violet-200/10">
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Tipo</th><th>Nombre</th><th>Short</th><th>Ícono</th><th>Orden</th><th>Activa</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((era) => (
                  <tr key={era.id}>
                    <td>{era.id}</td>
                    <td>{collectionTypeName(era.collection_type_id)}</td>
                    <td className="font-bold">{era.name}</td>
                    <td>{era.short_name}</td>
                    <td>{era.icon_name}</td>
                    <td>{era.sort_order}</td>
                    <td>{era.is_active ? 'Sí' : 'No'}</td>
                    <td><button className="icon-btn" onClick={() => edit(era)}><Pencil size={15} /> Editar</button></td>
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="block">
      <span className="label">{label}</span>
      <label className="input mt-1 flex items-center gap-3 cursor-pointer p-2">
        <span className="relative h-9 w-9 shrink-0 rounded-xl border-2 border-white/20 overflow-hidden shadow-inner" style={{ backgroundColor: value }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </span>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-violet-50 font-mono text-sm uppercase"
          maxLength={7} placeholder="#A855F7" />
      </label>
    </div>
  );
}
