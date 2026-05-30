import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Pencil, RotateCcw, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SaveToast } from './SaveToast';
import type { Album, AlbumVersion } from '../types';

type VersionRow = { album_id: number; name: string; short_name: string; sort_order: number };

type Props = {
  albums: Album[];
  versions: AlbumVersion[];
  onChanged: () => Promise<void>;
};

export function VersionsPanel({ albums, versions, onChanged }: Props) {
  const [albumId, setAlbumId] = useState<string>('');
  const [bulk, setBulk] = useState('Standard:STD');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ album_id: '', name: '', short_name: '', sort_order: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'saving' | 'success' | null>(null);
  const closeToast = useCallback(() => setToastStatus(null), []);

  const selectedVersions = useMemo(() => versions.filter((v) => !albumId || String(v.album_id) === albumId), [versions, albumId]);

  function resetEdit() {
    setEditingId(null);
    setEditForm({ album_id: albumId, name: '', short_name: '', sort_order: '' });
  }

  function edit(v: AlbumVersion) {
    setEditingId(v.id);
    setEditForm({
      album_id: String(v.album_id),
      name: v.name || '',
      short_name: v.short_name || '',
      sort_order: v.sort_order ? String(v.sort_order) : '',
    });
    setMessage(null);
  }

  async function submitBulk(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const rows = bulk
      .split('\n')
      .map((line, index) => {
        const [nameRaw, shortRaw] = line.split(':');
        const name = (nameRaw || '').trim();
        const short_name = (shortRaw || name).trim();
        return name ? { album_id: Number(albumId), name, short_name, sort_order: index + 1 } : null;
      })
      .filter((row): row is VersionRow => Boolean(row));

    if (!albumId || rows.length === 0) {
      setMessage('Selecciona álbum y agrega al menos una versión.');
      return;
    }

    setToastStatus('saving');
    const { error } = await supabase.from('album_versions').insert(rows);
    if (error) {
      setToastStatus(null);
      setMessage(error.message);
      return;
    }

    await onChanged();
    setToastStatus('success');
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!editingId) return;

    const payload = {
      album_id: Number(editForm.album_id),
      name: editForm.name.trim(),
      short_name: editForm.short_name.trim() || null,
      sort_order: editForm.sort_order ? Number(editForm.sort_order) : null,
    };

    setToastStatus('saving');
    const { error } = await supabase.from('album_versions').update(payload).eq('id', editingId);
    if (error) {
      setToastStatus(null);
      setMessage(error.message);
      return;
    }
    await onChanged();
    setToastStatus('success');
    resetEdit();
  }

  return (
    <>
    <SaveToast status={toastStatus} onClose={closeToast} />
    <section className="grid xl:grid-cols-[420px_420px_1fr] gap-6">
      <form onSubmit={submitBulk} className="admin-card p-6 space-y-4">
        <h2 className="text-xl font-black text-white">Crear versiones</h2>
        <p className="text-sm text-violet-100/75">Carga rápida en <code>album_versions</code>.</p>

        <AlbumSelect albums={albums} value={albumId} onChange={(v) => { setAlbumId(v); setEditForm((p) => ({ ...p, album_id: v })); }} required />

        <label className="block">
          <span className="label">Versiones</span>
          <textarea
            className="input min-h-48 font-mono text-sm"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={'Standard:STD\nVersion L:L\nVersion O:O'}
          />
          <p className="text-xs text-violet-100/65 mt-1">Formato: nombre:short_name, una por línea.</p>
        </label>

        <div className="flex flex-wrap gap-2">
          <Preset label="Standard" value={'Standard:STD'} setBulk={setBulk} />
          <Preset label="LY Her" value={'Version L:L\nVersion O:O\nVersion V:V\nVersion E:E\nVinyl:Vinyl'} setBulk={setBulk} />
          <Preset label="LY Tear" value={'Version Y:Y\nVersion O:O\nVersion U:U\nVersion R:R\nVinyl:Vinyl'} setBulk={setBulk} />
          <Preset label="HYYH Pt.2" value={'Peach:PEACH\nBlue:BLUE'} setBulk={setBulk} />
        </div>

        <button className="btn-primary w-full"><Save size={18} /> Guardar versiones</button>
        {message && <p className="text-sm text-violet-100/80">{message}</p>}
      </form>

      <form onSubmit={submitEdit} className="admin-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Editar versión</h2>
            <p className="text-sm text-violet-100/75">Selecciona una versión de la tabla.</p>
          </div>
          {editingId ? <button type="button" onClick={resetEdit} className="btn-secondary"><RotateCcw size={16} /> Limpiar</button> : null}
        </div>
        <AlbumSelect albums={albums} value={editForm.album_id} onChange={(v) => setEditForm((p) => ({ ...p, album_id: v }))} required />
        <Field label="Nombre" value={editForm.name} onChange={(v) => setEditForm((p) => ({ ...p, name: v }))} required />
        <Field label="Short name" value={editForm.short_name} onChange={(v) => setEditForm((p) => ({ ...p, short_name: v }))} />
        <Field label="Orden" value={editForm.sort_order} onChange={(v) => setEditForm((p) => ({ ...p, sort_order: v }))} type="number" />
        <button disabled={!editingId} className="btn-primary w-full disabled:opacity-50"><Save size={18} /> Guardar cambios</button>
      </form>

      <div className="admin-card p-6 min-w-0">
        <h2 className="text-xl font-black text-white mb-4">Versiones</h2>
        <div className="rounded-3xl border border-violet-200/10">
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Álbum</th><th>Versión</th><th>Short</th><th>Orden</th><th></th></tr></thead>
            <tbody>
              {selectedVersions.map((v) => {
                const album = albums.find((a) => a.id === v.album_id);
                return (
                  <tr key={v.id}>
                    <td>{v.id}</td>
                    <td>{album?.short_name || album?.name || v.album_id}</td>
                    <td className="font-bold">{v.name}</td>
                    <td>{v.short_name}</td>
                    <td>{v.sort_order}</td>
                    <td><button className="icon-btn" onClick={() => edit(v)}><Pencil size={15} /> Editar</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    </>
  );
}

function AlbumSelect({ albums, value, onChange, required }: { albums: Album[]; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="label">Álbum</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="">Seleccionar</option>
        {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </label>
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

function Preset({ label, value, setBulk }: { label: string; value: string; setBulk: (v: string) => void }) {
  return <button type="button" onClick={() => setBulk(value)} className="rounded-full bg-violet-100/15 text-violet-50 border border-violet-200/20 px-3 py-2 text-xs font-bold hover:bg-violet-100/25">{label}</button>;
}
