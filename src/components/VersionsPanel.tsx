import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SaveToast } from './SaveToast';
import type { Album, AlbumVersion } from '../types';

type Props = {
  albums: Album[];
  versions: AlbumVersion[];
  onChanged: () => Promise<void>;
};

export function VersionsPanel({ albums, versions, onChanged }: Props) {
  const [albumId, setAlbumId] = useState<string>('');
  const [bulk, setBulk] = useState('');
  const [loadedVersionIds, setLoadedVersionIds] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'saving' | 'success' | null>(null);
  const closeToast = useCallback(() => setToastStatus(null), []);

  // Keep a ref to always have the latest versions in handlers
  const versionsRef = useRef(versions);
  versionsRef.current = versions;

  const selectedVersions = useMemo(
    () => versions.filter((v) => !albumId || String(v.album_id) === albumId),
    [versions, albumId],
  );

  function loadVersionsForAlbum(id: string) {
    if (!id) { setBulk(''); setLoadedVersionIds([]); return; }
    const filtered = versionsRef.current
      .filter((v) => String(v.album_id) === id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setLoadedVersionIds(filtered.map((v) => v.id));
    setBulk(filtered.map((v) =>
      v.short_name && v.short_name !== v.name ? `${v.name}:${v.short_name}` : (v.name || ''),
    ).join('\n'));
  }

  function handleAlbumChange(id: string) {
    setAlbumId(id);
    setMessage(null);
    loadVersionsForAlbum(id);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!albumId) { setMessage('Selecciona un álbum.'); return; }

    const lines = bulk.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) { setMessage('Agrega al menos una versión.'); return; }

    const toUpdate: { id: number; album_id: number; name: string; short_name: string; sort_order: number }[] = [];
    const inserts: { album_id: number; name: string; short_name: string; sort_order: number }[] = [];

    lines.forEach((line, index) => {
      const [nameRaw, shortRaw] = line.split(':');
      const name = (nameRaw || '').trim();
      const short_name = (shortRaw || name).trim();
      if (!name) return;

      const existingId = loadedVersionIds[index];
      if (existingId) {
        toUpdate.push({ id: existingId, album_id: Number(albumId), name, short_name, sort_order: index + 1 });
      } else {
        inserts.push({ album_id: Number(albumId), name, short_name, sort_order: index + 1 });
      }
    });

    setToastStatus('saving');

    for (const row of toUpdate) {
      const { id, ...payload } = row;
      const { error } = await supabase.from('album_versions').update(payload).eq('id', id);
      if (error) { setToastStatus(null); setMessage(error.message); return; }
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from('album_versions').insert(inserts);
      if (error) { setToastStatus(null); setMessage(error.message); return; }
    }

    await onChanged();
    setToastStatus('success');
    // Reload textarea with fresh data from parent
    setAlbumId((prev) => { loadVersionsForAlbum(prev); return prev; });
  }

  return (
    <>
      <SaveToast status={toastStatus} onClose={closeToast} />
      <section className="grid xl:grid-cols-[420px_1fr] gap-6">
        <form onSubmit={handleSubmit} className="admin-card p-6 space-y-4">
          <div>
            <h2 className="text-xl font-black text-white">Versiones</h2>
            <p className="text-sm text-violet-100/75">Selecciona un álbum para cargar y editar sus versiones en album_versions</p>
          </div>

          <label className="block">
            <span className="label">Álbum</span>
            <select
              className="input"
              value={albumId}
              onChange={(e) => handleAlbumChange(e.target.value)}
              required
            >
              <option value="">Seleccionar</option>
              {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="label">Versiones</span>
            <textarea
              className="input min-h-48 font-mono text-sm"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={albumId ? 'Este álbum no tiene versiones aún.' : 'Selecciona un álbum primero.'}
              disabled={!albumId}
            />
            <p className="text-xs text-violet-100/65 mt-1">
              Formato: nombre:short_name — una por línea. Las líneas nuevas al final se agregan.
            </p>
          </label>

          {albumId && !loadedVersionIds.length && (
            <div className="flex flex-wrap gap-2">
              <Preset label="Standard" value={'Standard:STD'} setBulk={setBulk} />
              <Preset label="LY Her" value={'Version L:L\nVersion O:O\nVersion V:V\nVersion E:E\nVinyl:Vinyl'} setBulk={setBulk} />
              <Preset label="LY Tear" value={'Version Y:Y\nVersion O:O\nVersion U:U\nVersion R:R\nVinyl:Vinyl'} setBulk={setBulk} />
              <Preset label="HYYH Pt.2" value={'Peach:PEACH\nBlue:BLUE'} setBulk={setBulk} />
            </div>
          )}

          <button disabled={!albumId} className="btn-primary w-full disabled:opacity-50">
            <Save size={18} /> Guardar versiones
          </button>
          {message && <p className="text-sm text-violet-100/80">{message}</p>}
        </form>

        <div className="admin-card p-6 min-w-0">
          <h2 className="text-xl font-black text-white mb-4">Versiones guardadas</h2>
          <div className="rounded-3xl border border-violet-200/10">
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Álbum</th><th>Versión</th><th>Short</th><th>Orden</th></tr>
              </thead>
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
                    </tr>
                  );
                })}
                {selectedVersions.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-violet-200/40 py-8">
                    {albumId ? 'Sin versiones para este álbum.' : 'Selecciona un álbum para filtrar.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

function Preset({ label, value, setBulk }: { label: string; value: string; setBulk: (v: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => setBulk(value)}
      className="rounded-full bg-violet-100/15 text-violet-50 border border-violet-200/20 px-3 py-2 text-xs font-bold hover:bg-violet-100/25"
    >
      {label}
    </button>
  );
}
