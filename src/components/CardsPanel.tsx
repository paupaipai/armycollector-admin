import { useMemo, useState } from 'react';
import type { Album, AlbumVersion, Card, CardCategory } from '../types';

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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
