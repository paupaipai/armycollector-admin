import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Pencil, RotateCcw, Save } from 'lucide-react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { SaveToast } from './SaveToast';
import type { CollectionType } from '../types';

type Props = {
  collectionTypes: CollectionType[];
  onChanged: () => Promise<void>;
};

const emptyForm = {
  name: '',
  short_name: '',
  description: '',
  icon: '',
  color: '#A855F7',
  sort_order: '0',
  is_active: true,
};

export function CollectionTypesPanel({ collectionTypes, onChanged }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'saving' | 'success' | null>(null);
  const closeToast = useCallback(() => setToastStatus(null), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collectionTypes.filter((t) => {
      if (activeFilter === 'active' && !t.is_active) return false;
      if (activeFilter === 'inactive' && t.is_active) return false;
      if (!q) return true;
      return [t.name, t.short_name, t.description].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [collectionTypes, search, activeFilter]);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  }

  function edit(ct: CollectionType) {
    setEditingId(ct.id);
    setForm({
      name: ct.name,
      short_name: ct.short_name,
      description: ct.description || '',
      icon: ct.icon || '',
      color: ct.color || '#A855F7',
      sort_order: String(ct.sort_order ?? 0),
      is_active: ct.is_active,
    });
    setMessage(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      short_name: form.short_name.trim(),
      description: form.description.trim() || null,
      icon: form.icon.trim() || null,
      color: form.color || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };
    setToastStatus('saving');
    if (editingId) {
      const { data, error } = await supabase
        .from('collection_types')
        .update(payload)
        .eq('id', editingId)
        .select();
      if (error) { setToastStatus(null); setMessage(error.message); return; }
      if (!data || data.length === 0) {
        setToastStatus(null);
        setMessage('No se pudo actualizar el registro. Verifica los permisos en Supabase (RLS).');
        return;
      }
    } else {
      const { error } = await supabase.from('collection_types').insert(payload);
      if (error) { setToastStatus(null); setMessage(error.message); return; }
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
              <h2 className="text-xl font-black text-white">{editingId ? 'Editar tipo' : 'Nuevo tipo de colección'}</h2>
              <p className="text-sm text-violet-100/75">Tabla <code>collection_types</code>.</p>
            </div>
            {editingId && <button type="button" onClick={reset} className="btn-secondary"><RotateCcw size={16} /> Nuevo</button>}
          </div>

          <Field label="Nombre" value={form.name} onChange={(v) => set('name', v)} placeholder="Korean Albums" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Short name" value={form.short_name} onChange={(v) => set('short_name', v)} placeholder="korean-albums" required />
            <Field label="Ícono (emoji)" value={form.icon} onChange={(v) => set('icon', v)} placeholder="💿" />
          </div>
          <Field label="Descripción" value={form.description} onChange={(v) => set('description', v)} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Color" value={form.color} onChange={(v) => set('color', v)} />
            <Field label="Orden" value={form.sort_order} onChange={(v) => set('sort_order', v)} type="number" />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-violet-50">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            Activo
          </label>

          <button className="btn-primary w-full"><Save size={18} /> {editingId ? 'Guardar cambios' : 'Crear tipo'}</button>
          {message && <p className="text-sm text-red-300">{message}</p>}
        </form>

        <div className="admin-card p-6 min-w-0">
          <div className="flex flex-col gap-3 mb-4">
            <h2 className="text-xl font-black text-white">Tipos de colección</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tipo..." />
              <select className="input" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                <option value="">Activo / Inactivo</option>
                <option value="active">Solo activos</option>
                <option value="inactive">Solo inactivos</option>
              </select>
            </div>
            <p className="text-xs text-violet-100/65">Mostrando {filtered.length} de {collectionTypes.length} tipos.</p>
          </div>
          <div className="rounded-3xl border border-violet-200/10">
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Nombre</th><th>Short</th><th>Ícono</th><th>Orden</th><th>Activo</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((ct) => (
                  <tr key={ct.id}>
                    <td>{ct.id}</td>
                    <td className="font-bold">{ct.name}</td>
                    <td>{ct.short_name}</td>
                    <td>{ct.icon}</td>
                    <td>{ct.sort_order}</td>
                    <td>{ct.is_active ? 'Sí' : 'No'}</td>
                    <td><button className="icon-btn" onClick={() => edit(ct)}><Pencil size={15} /> Editar</button></td>
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
