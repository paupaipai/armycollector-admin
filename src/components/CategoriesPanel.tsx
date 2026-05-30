import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Pencil, RotateCcw, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SaveToast } from './SaveToast';
import type { CardCategory } from '../types';

type Props = {
  categories: CardCategory[];
  onChanged: () => Promise<void>;
};

const emptyForm = {
  name: '',
  short_name: '',
  description: '',
  color: '#E040A0',
  sort_order: '',
};

export function CategoriesPanel({ categories, onChanged }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'saving' | 'success' | null>(null);
  const closeToast = useCallback(() => setToastStatus(null), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => [c.name, c.short_name, c.description].some((v) => (v || '').toLowerCase().includes(q)));
  }, [categories, search]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  }

  function edit(category: CardCategory) {
    setEditingId(category.id);
    setForm({
      name: category.name || '',
      short_name: category.short_name || '',
      description: category.description || '',
      color: category.color || '#E040A0',
      sort_order: category.sort_order ? String(category.sort_order) : '',
    });
    setMessage(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const payload = {
      name: form.name.trim(),
      short_name: form.short_name.trim() || null,
      description: form.description.trim() || null,
      color: form.color || null,
      sort_order: form.sort_order ? Number(form.sort_order) : null,
    };

    const query = editingId
      ? supabase.from('card_categories').update(payload).eq('id', editingId)
      : supabase.from('card_categories').insert(payload);

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
            <h2 className="text-xl font-black text-white">{editingId ? 'Editar categoría' : 'Crear categoría'}</h2>
            <p className="text-sm text-violet-100/75">Administra la tabla <code>card_categories</code>.</p>
          </div>
          {editingId ? <button type="button" onClick={reset} className="btn-secondary"><RotateCcw size={16} /> Nueva</button> : null}
        </div>

        <Field label="Nombre" value={form.name} onChange={(v) => set('name', v)} placeholder="Album / Vinyl PCs" required />
        <Field label="Short name" value={form.short_name} onChange={(v) => set('short_name', v)} placeholder="album_pc" />
        <label className="block">
          <span className="label">Descripción</span>
          <textarea className="input min-h-28" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Descripción opcional" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Color" value={form.color} onChange={(v) => set('color', v)} type="color" />
          <Field label="Orden" value={form.sort_order} onChange={(v) => set('sort_order', v)} type="number" />
        </div>

        <button className="btn-primary w-full"><Save size={18} /> {editingId ? 'Guardar cambios' : 'Guardar categoría'}</button>
        {message && <p className="text-sm text-violet-100/80">{message}</p>}
      </form>

      <div className="admin-card p-6 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-black text-white">Categorías existentes</h2>
          <input className="input max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar categoría..." />
        </div>
        <div className="rounded-3xl border border-violet-200/10">
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Short</th><th>Color</th><th>Orden</th><th></th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td className="font-bold">{c.name}</td>
                  <td>{c.short_name}</td>
                  <td><span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-white/30" style={{ backgroundColor: c.color || '#999' }} />{c.color}</span></td>
                  <td>{c.sort_order}</td>
                  <td><button className="icon-btn" onClick={() => edit(c)}><Pencil size={15} /> Editar</button></td>
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
