import { useEffect, useState } from 'react';
import { LogOut, Database, Images, Layers3, Scissors, Tags, CreditCard } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Login } from './components/Login';
import { AlbumsPanel } from './components/AlbumsPanel';
import { VersionsPanel } from './components/VersionsPanel';
import { BulkCardsPanel } from './components/BulkCardsPanel';
import { CropperPanel } from './components/CropperPanel';
import { CategoriesPanel } from './components/CategoriesPanel';
import { CardsPanel } from './components/CardsPanel';
import type { Album, AlbumVersion, CardCategory, Card, ImportedCropFile } from './types';

type Tab = 'bulk' | 'cropper' | 'albums' | 'versions' | 'categories' | 'cards';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>('albums');
  const [importedCropFiles, setImportedCropFiles] = useState<ImportedCropFile[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [versions, setVersions] = useState<AlbumVersion[]>([]);
  const [categories, setCategories] = useState<CardCategory[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [adminError, setAdminError] = useState<string | null>(null);

  async function loadData() {
    const [albumsRes, versionsRes, categoriesRes, cardsRes] = await Promise.all([
      supabase.from('albums').select('*').order('sort_order', { ascending: true }).order('name'),
      supabase.from('album_versions').select('*').order('album_id', { ascending: true }).order('sort_order', { ascending: true }),
      supabase.from('card_categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('cards').select('*').order('id', { ascending: false }),
    ]);

    if (!albumsRes.error) setAlbums(albumsRes.data || []);
    if (!versionsRes.error) setVersions(versionsRes.data || []);
    if (!categoriesRes.error) setCategories(categoriesRes.data || []);
    if (!cardsRes.error) setCards(cardsRes.data || []);
  }

  async function checkSession(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setAdminError(null);

    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        setSessionEmail(null);
        setIsAdmin(false);
        return;
      }

      setSessionEmail(user.email || null);

      if (import.meta.env.VITE_SKIP_ADMIN_CHECK === 'true') {
        setIsAdmin(true);
        await loadData();
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        setAdminError(`No pude validar is_admin en user_profiles: ${error.message}`);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(profile?.is_admin));
        if (profile?.is_admin) await loadData();
      }
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Error de conexión con Supabase.');
      setIsAdmin(false);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    checkSession();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') checkSession(false);
      if (event === 'SIGNED_OUT') {
        setSessionEmail(null);
        setIsAdmin(false);
        setAlbums([]);
        setVersions([]);
        setCategories([]);
        setCards([]);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#7c3aed_0,#4a176d_38%,#2b0a4a_100%)] flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-violet-300/30 border-t-fuchsia-500 animate-spin" />
      </div>
    );
  }

  if (!sessionEmail) return <Login />;

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#6d28d9_0,#4a176d_42%,#2b0a4a_100%)] flex items-center justify-center p-6">
        <div className="max-w-lg rounded-[2rem] bg-white/90 backdrop-blur border border-violet-100 p-8 text-center shadow-2xl shadow-black/20">
          <h1 className="text-2xl font-bold text-ink">Acceso no autorizado</h1>
          <p className="text-gray-600 mt-3">
            Tu usuario existe, pero no tiene permiso admin. Ejecuta el SQL de configuración y marca tu perfil con <code>is_admin = true</code>.
          </p>
          {adminError && <p className="mt-4 text-sm text-red-500">{adminError}</p>}
          <button onClick={signOut} className="mt-6 rounded-2xl bg-kpurple text-white px-5 py-3 font-bold">Salir</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#7c3aed_0,#4a176d_38%,#2b0a4a_100%)]">
      <header className="sticky top-0 z-10 border-b border-violet-300/20 bg-[#210c36]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Army-Collector Admin</h1>
            <p className="text-sm text-violet-100/80">{sessionEmail}</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <TabButton active={tab === 'albums'} onClick={() => setTab('albums')} icon={<Database size={16} />} label="Álbumes" />
            <TabButton active={tab === 'versions'} onClick={() => setTab('versions')} icon={<Layers3 size={16} />} label="Versiones" />
            <TabButton active={tab === 'categories'} onClick={() => setTab('categories')} icon={<Tags size={16} />} label="Categorías" />
            <TabButton active={tab === 'cards'} onClick={() => setTab('cards')} icon={<CreditCard size={16} />} label="Cards" />
            <TabButton active={tab === 'bulk'} onClick={() => setTab('bulk')} icon={<Images size={16} />} label="Carga masiva" />
            <TabButton active={tab === 'cropper'} onClick={() => setTab('cropper')} icon={<Scissors size={16} />} label="Cropper" />
            <button onClick={signOut} className="shrink-0 rounded-2xl border border-violet-200/20 bg-white/10 px-4 py-2 text-sm font-bold text-violet-100 flex items-center gap-2 hover:bg-white/15">
              <LogOut size={16} /> Salir
            </button>
          </nav>
        </div>
      </header>

      <section className="w-full p-4 md:p-6">
        <div className={tab !== 'albums' ? 'hidden' : ''}><AlbumsPanel albums={albums} onChanged={loadData} /></div>
        <div className={tab !== 'versions' ? 'hidden' : ''}><VersionsPanel albums={albums} versions={versions} onChanged={loadData} /></div>
        <div className={tab !== 'categories' ? 'hidden' : ''}><CategoriesPanel categories={categories} onChanged={loadData} /></div>
        <div className={tab !== 'cards' ? 'hidden' : ''}><CardsPanel albums={albums} versions={versions} categories={categories} cards={cards} onChanged={loadData} /></div>
        <div className={tab !== 'bulk' ? 'hidden' : ''}><BulkCardsPanel albums={albums} versions={versions} categories={categories} importedFiles={importedCropFiles} /></div>
        <div className={tab !== 'cropper' ? 'hidden' : ''}><CropperPanel onSendToBulk={(files) => { setImportedCropFiles(files); setTab('bulk'); }} /></div>
      </section>
    </main>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-bold flex items-center gap-2 transition ${active ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-950/20' : 'bg-white/10 border border-violet-200/20 text-violet-100 hover:bg-white/15'}`}>
      {icon}
      {label}
    </button>
  );
}
