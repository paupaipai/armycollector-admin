import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Album, AlbumVersion, Card, CardCategory } from '../types';
import { STORAGE_BUCKET, supabase } from '../lib/supabase';

function getImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

type Props = {
  albums: Album[];
  versions: AlbumVersion[];
  categories: CardCategory[];
  cards: Card[];
  onChanged: () => Promise<void>;
};

export function CardsPanel({ albums, versions, categories, cards }: Props) {
  const [search, setSearch] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (albumFilter && String(c.album_id) !== albumFilter) return false;
      if (categoryFilter && String(c.category_id) !== categoryFilter) return false;
      if (!q) return true;
      return [c.member, c.card_name, c.code, c.image_path, c.retailer, c.notes].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [cards, search, albumFilter, categoryFilter]);

  return (
    <div className="admin-card p-6 min-w-0">
      <div className="flex flex-col gap-3 mb-4">
        <h2 className="text-xl font-black text-white">Cards</h2>
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
      <div className="rounded-3xl border border-violet-200/10">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Img</th>
              <th>Álbum</th>
              <th>Versión</th>
              <th>Categoría</th>
              <th>Miembro</th>
              <th>Card</th>
              <th>Code</th>
              <th>Visible</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const album = albums.find((a) => a.id === c.album_id);
              const version = versions.find((v) => v.id === c.version_id);
              const category = categories.find((cat) => cat.id === c.category_id);
              const imgUrl = c.image_path ? getImageUrl(c.image_path) : null;
              return (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={c.card_name}
                        className="w-8 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewUrl(imgUrl)}
                        loading="lazy"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = 'none';
                          const span = document.createElement('span');
                          span.className = 'text-violet-100/40 text-xs';
                          span.textContent = 'No image';
                          el.parentElement?.appendChild(span);
                        }}
                      />
                    ) : (
                      <span className="text-violet-100/40 text-xs">No image</span>
                    )}
                  </td>
                  <td>{album?.short_name || album?.name || c.album_id}</td>
                  <td>{version?.short_name || '-'}</td>
                  <td>{category?.short_name || category?.name || c.category_id}</td>
                  <td className="font-bold">{c.member}</td>
                  <td>{c.card_name}</td>
                  <td className="font-mono text-xs">{c.code}</td>
                  <td>{c.is_visible ? 'Sí' : 'No'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {previewUrl && createPortal(
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={() => setPreviewUrl(null)}
        >
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              style={{ position: 'absolute', top: -12, right: -12, width: 32, height: 32, borderRadius: '50%', background: '#7c3aed', color: 'white', fontWeight: 'bold', fontSize: 14, border: 'none', cursor: 'pointer', zIndex: 1 }}
              onClick={() => setPreviewUrl(null)}
            >
              ✕
            </button>
            <img
              src={previewUrl}
              alt="Vista previa"
              style={{ maxHeight: '80vh', maxWidth: '90vw', width: 'auto', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
