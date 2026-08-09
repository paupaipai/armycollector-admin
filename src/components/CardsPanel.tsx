import { FormEvent, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Pencil, Save, Trash2, X } from 'lucide-react';
import type { Album, AlbumEra, AlbumVersion, Card, CardCategory, CardSet, CollectionType } from '../types';
import { STORAGE_BUCKET, supabase, supabaseAdmin } from '../lib/supabase';

const RARITIES = ['Common', 'Rare', 'Ultra Rare', 'Limited'] as const;

function getImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

type Props = {
  albums: Album[];
  versions: AlbumVersion[];
  categories: CardCategory[];
  cardSets: CardSet[];
  cards: Card[];
  collectionTypes: CollectionType[];
  albumEras: AlbumEra[];
  onChanged: () => Promise<void>;
};

const emptyEditForm = {
  album_id: '',
  version_id: '',
  category_id: '',
  card_set_id: '',
  member: '',
  member_full_name: '',
  member_emoji: '',
  card_name: '',
  code: '',
  retailer: '',
  rarity: 'Common',
  is_group: false,
  is_blurred: false,
  is_visible: true,
  release_date: '',
  notes: '',
  country: '',
  draw_type: '',
  sort_order: '0',
};

export function CardsPanel({ albums, versions, categories, cardSets, cards, collectionTypes, albumEras, onChanged }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [eraFilter, setEraFilter] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState<'' | 'group' | 'solo'>('');
  const [sortBy, setSortBy] = useState<'id' | 'sort_order'>('id');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingCard, setDeletingCard] = useState<Card | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const albumsById = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums]);

  const memberOptions = useMemo(
    () => Array.from(new Set(cards.map((c) => c.member).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [cards],
  );

  const filteredEras = useMemo(
    () => (typeFilter ? albumEras.filter((e) => String(e.collection_type_id) === typeFilter) : albumEras),
    [albumEras, typeFilter],
  );

  const filteredAlbums = useMemo(
    () => albums.filter((a) => {
      if (typeFilter && String(a.collection_type_id ?? '') !== typeFilter) return false;
      if (eraFilter && String(a.era_id ?? '') !== eraFilter) return false;
      return true;
    }),
    [albums, typeFilter, eraFilter],
  );

  function onTypeFilterChange(v: string) {
    setTypeFilter(v);
    setEraFilter('');
    setAlbumFilter('');
  }

  function onEraFilterChange(v: string) {
    setEraFilter(v);
    setAlbumFilter('');
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = cards.filter((c) => {
      const album = albumsById.get(c.album_id);
      if (typeFilter && String(album?.collection_type_id ?? '') !== typeFilter) return false;
      if (eraFilter && String(album?.era_id ?? '') !== eraFilter) return false;
      if (albumFilter && String(c.album_id) !== albumFilter) return false;
      if (categoryFilter && String(c.category_id) !== categoryFilter) return false;
      if (memberFilter && c.member !== memberFilter) return false;
      if (groupFilter === 'group' && !c.is_group) return false;
      if (groupFilter === 'solo' && c.is_group) return false;
      if (!q) return true;
      return [c.member, c.card_name, c.code, c.image_path, c.retailer, c.notes].some((v) => (v || '').toLowerCase().includes(q));
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'sort_order') return (a.sort_order - b.sort_order) || (a.id - b.id);
      return a.id - b.id;
    });
  }, [cards, search, typeFilter, eraFilter, albumFilter, categoryFilter, memberFilter, groupFilter, albumsById, sortBy]);

  // ---------- Editar ----------

  const editAlbumVersions = useMemo(
    () => versions.filter((v) => String(v.album_id) === editForm.album_id),
    [versions, editForm.album_id],
  );
  const editAlbumCardSets = useMemo(
    () => cardSets.filter((s) => String(s.album_id) === editForm.album_id),
    [cardSets, editForm.album_id],
  );

  function openEdit(card: Card) {
    setEditingCard(card);
    setEditError(null);
    setEditForm({
      album_id: String(card.album_id),
      version_id: card.version_id != null ? String(card.version_id) : '',
      category_id: String(card.category_id),
      card_set_id: card.card_set_id != null ? String(card.card_set_id) : '',
      member: card.member,
      member_full_name: card.member_full_name || '',
      member_emoji: card.member_emoji || '',
      card_name: card.card_name,
      code: card.code,
      retailer: card.retailer || '',
      rarity: card.rarity || 'Common',
      is_group: Boolean(card.is_group),
      is_blurred: Boolean(card.is_blurred),
      is_visible: Boolean(card.is_visible),
      release_date: card.release_date ? card.release_date.slice(0, 10) : '',
      notes: card.notes || '',
      country: card.country || '',
      draw_type: card.draw_type || '',
      sort_order: String(card.sort_order ?? 0),
    });
  }

  function closeEdit() {
    setEditingCard(null);
    setEditForm(emptyEditForm);
    setEditError(null);
  }

  function setField<K extends keyof typeof emptyEditForm>(key: K, value: (typeof emptyEditForm)[K]) {
    setEditForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'album_id') { next.version_id = ''; next.card_set_id = ''; }
      return next;
    });
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingCard) return;
    setEditBusy(true);
    setEditError(null);
    const payload = {
      album_id: Number(editForm.album_id),
      version_id: editForm.version_id ? Number(editForm.version_id) : null,
      category_id: Number(editForm.category_id),
      card_set_id: editForm.card_set_id ? Number(editForm.card_set_id) : null,
      member: editForm.member.trim(),
      member_full_name: editForm.member_full_name.trim() || null,
      member_emoji: editForm.member_emoji.trim() || null,
      card_name: editForm.card_name.trim(),
      code: editForm.code.trim(),
      retailer: editForm.retailer.trim() || null,
      rarity: editForm.rarity,
      is_group: editForm.is_group,
      is_blurred: editForm.is_blurred,
      is_visible: editForm.is_visible,
      release_date: editForm.release_date || null,
      notes: editForm.notes.trim() || null,
      country: editForm.country.trim() || null,
      draw_type: editForm.draw_type.trim() || null,
      sort_order: Number(editForm.sort_order) || 0,
    };
    const { error } = await supabase.from('cards').update(payload).eq('id', editingCard.id);
    setEditBusy(false);
    if (error) { setEditError(error.message); return; }
    await onChanged();
    closeEdit();
  }

  // ---------- Eliminar ----------

  async function confirmDelete() {
    if (!deletingCard) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      if (deletingCard.image_path) {
        const { error: storageError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .remove([deletingCard.image_path]);
        if (storageError) throw storageError;
      }
      const { error } = await supabase.from('cards').delete().eq('id', deletingCard.id);
      if (error) throw error;
      await onChanged();
      setDeletingCard(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="admin-card p-6 min-w-0">
      <div className="flex flex-col gap-3 mb-4">
        <h2 className="text-xl font-black text-white">Cards</h2>
        <div className="flex flex-wrap gap-3">
          <input className="input flex-[2] min-w-[220px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar code, miembro, path..." />
          <select className="input flex-1 min-w-[150px]" value={typeFilter} onChange={(e) => onTypeFilterChange(e.target.value)}>
            <option value="">Todos los tipos</option>
            {collectionTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="input flex-1 min-w-[150px]" value={eraFilter} onChange={(e) => onEraFilterChange(e.target.value)}>
            <option value="">Todas las eras</option>
            {filteredEras.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select className="input flex-1 min-w-[150px]" value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)}>
            <option value="">Todos los álbumes</option>
            {filteredAlbums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="input flex-1 min-w-[150px]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input flex-1 min-w-[150px]" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
            <option value="">Todos los miembros</option>
            {memberOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="input flex-1 min-w-[150px]" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value as '' | 'group' | 'solo')}>
            <option value="">Grupal e individual</option>
            <option value="group">Solo grupales</option>
            <option value="solo">Solo individuales</option>
          </select>
          <select className="input flex-1 min-w-[150px]" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'id' | 'sort_order')}>
            <option value="id">Ordenar por ID</option>
            <option value="sort_order">Ordenar por orden de visualización</option>
          </select>
        </div>
        <p className="text-xs text-violet-100/65">Mostrando {filtered.length} de {cards.length} cards.</p>
      </div>
      <div className="rounded-3xl border border-violet-200/10 overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Img</th>
              <th>Álbum</th>
              <th>Versión</th>
              <th>Categoría</th>
              <th>Set</th>
              <th>Miembro</th>
              <th>Card</th>
              <th>Code</th>
              <th>País</th>
              <th>Draw</th>
              <th>Orden</th>
              <th>Visible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const album = albums.find((a) => a.id === c.album_id);
              const version = versions.find((v) => v.id === c.version_id);
              const category = categories.find((cat) => cat.id === c.category_id);
              const cardSet = cardSets.find((s) => s.id === c.card_set_id);
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
                  <td>{cardSet?.short_name || cardSet?.name || '-'}</td>
                  <td className="font-bold">{c.member}</td>
                  <td>{c.card_name}</td>
                  <td className="font-mono text-xs">{c.code}</td>
                  <td>{c.country || '-'}</td>
                  <td>{c.draw_type || '-'}</td>
                  <td>{c.sort_order ?? 0}</td>
                  <td>{c.is_visible ? 'Sí' : 'No'}</td>
                  <td className="whitespace-nowrap">
                    <div className="flex gap-2">
                      <button className="icon-btn" onClick={() => openEdit(c)}><Pencil size={15} /> Editar</button>
                      <button className="icon-btn text-red-300" onClick={() => { setDeletingCard(c); setDeleteError(null); }}>
                        <Trash2 size={15} /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="text-violet-100/70 mt-4">No hay resultados.</p>}

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

      {/* Modal de edición */}
      {editingCard && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={closeEdit}>
          <form
            onSubmit={submitEdit}
            onClick={(e) => e.stopPropagation()}
            className="admin-card p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-white">Editar card #{editingCard.id}</h3>
              <button type="button" onClick={closeEdit} className="icon-btn"><X size={16} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Álbum</span>
                <select className="input" value={editForm.album_id} onChange={(e) => setField('album_id', e.target.value)} required>
                  {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label">Categoría</span>
                <select className="input" value={editForm.category_id} onChange={(e) => setField('category_id', e.target.value)} required>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label">Versión</span>
                <select className="input" value={editForm.version_id} onChange={(e) => setField('version_id', e.target.value)}>
                  <option value="">Sin versión</option>
                  {editAlbumVersions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label">Card Set</span>
                <select className="input" value={editForm.card_set_id} onChange={(e) => setField('card_set_id', e.target.value)}>
                  <option value="">Sin set</option>
                  {editAlbumCardSets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <EField label="Miembro" value={editForm.member} onChange={(v) => setField('member', v)} required />
              <EField label="Nombre completo" value={editForm.member_full_name} onChange={(v) => setField('member_full_name', v)} />
              <EField label="Emoji" value={editForm.member_emoji} onChange={(v) => setField('member_emoji', v)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <EField label="Card name" value={editForm.card_name} onChange={(v) => setField('card_name', v)} required />
              <EField label="Code" value={editForm.code} onChange={(v) => setField('code', v)} required />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <EField label="Retailer" value={editForm.retailer} onChange={(v) => setField('retailer', v)} />
              <EField label="País" value={editForm.country} onChange={(v) => setField('country', v)} placeholder="KOREA" />
              <EField label="Draw type" value={editForm.draw_type} onChange={(v) => setField('draw_type', v)} placeholder="R1" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="label">Rareza</span>
                <select className="input" value={editForm.rarity} onChange={(e) => setField('rarity', e.target.value)}>
                  {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <EField label="Release date" value={editForm.release_date} onChange={(v) => setField('release_date', v)} type="date" />
              <EField label="Orden de visualización" value={editForm.sort_order} onChange={(v) => setField('sort_order', v)} type="number" />
            </div>

            <EField label="Notas" value={editForm.notes} onChange={(v) => setField('notes', v)} />

            <div className="flex items-center gap-5 text-sm font-bold text-violet-50">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.is_group} onChange={(e) => setField('is_group', e.target.checked)} /> Grupo
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.is_blurred} onChange={(e) => setField('is_blurred', e.target.checked)} /> Blurred
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.is_visible} onChange={(e) => setField('is_visible', e.target.checked)} /> Visible
              </label>
            </div>

            {editError && <p className="text-sm text-red-300">{editError}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={closeEdit} className="flex-1 btn-secondary">Cancelar</button>
              <button type="submit" disabled={editBusy} className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {editBusy ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Modal de confirmación de borrado */}
      {deletingCard && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !deleteBusy && setDeletingCard(null)}>
          <div className="admin-card p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">Eliminar card</h3>
            </div>
            <p className="text-sm text-violet-100/80">
              Vas a eliminar <strong>{deletingCard.card_name}</strong> ({deletingCard.code}) de la base de datos
              y su imagen (<code className="break-all">{deletingCard.image_path}</code>) de Storage. Esta acción no se puede deshacer.
            </p>
            {deleteError && <p className="text-sm text-red-300">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeletingCard(null)} disabled={deleteBusy} className="flex-1 btn-secondary">Cancelar</button>
              <button onClick={confirmDelete} disabled={deleteBusy} className="flex-1 btn-primary bg-red-600 hover:bg-red-500 disabled:opacity-60">
                {deleteBusy ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function EField({ label, value, onChange, placeholder, type = 'text', required = false }: {
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
