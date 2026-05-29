-- K-Collector Admin setup
-- Ejecuta esto en Supabase SQL Editor antes de usar el mantenedor.

-- 1) Permiso admin en perfiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Permite que cada usuario lea su propio perfil.
-- Sin esto, la policy de escritura en albums/cards falla porque
-- la subquery EXISTS (SELECT FROM user_profiles) no puede leer la tabla.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own profile" ON public.user_profiles;
CREATE POLICY "users can read own profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 2) Marca tu usuario como admin.
-- Reemplaza el correo por tu email de login de Supabase Auth.
UPDATE public.user_profiles up
SET is_admin = true
FROM auth.users au
WHERE up.id = au.id
  AND au.email = 'TU_CORREO@EMAIL.COM';

-- 3) Índice único para permitir upsert por code.
CREATE UNIQUE INDEX IF NOT EXISTS cards_code_unique_idx
ON public.cards (code);

-- 4) RLS básico recomendado para tablas de catálogo.
-- Si ya tienes políticas creadas, revisa antes de ejecutar en producción.

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalog read for authenticated" ON public.albums;
CREATE POLICY "catalog read for authenticated"
ON public.albums FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "versions read for authenticated" ON public.album_versions;
CREATE POLICY "versions read for authenticated"
ON public.album_versions FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "categories read for authenticated" ON public.card_categories;
CREATE POLICY "categories read for authenticated"
ON public.card_categories FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "cards read for authenticated" ON public.cards;
CREATE POLICY "cards read for authenticated"
ON public.cards FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "admin write albums" ON public.albums;
CREATE POLICY "admin write albums"
ON public.albums FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.is_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.is_admin = true
));

DROP POLICY IF EXISTS "admin write versions" ON public.album_versions;
CREATE POLICY "admin write versions"
ON public.album_versions FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.is_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.is_admin = true
));

DROP POLICY IF EXISTS "admin write cards" ON public.cards;
CREATE POLICY "admin write cards"
ON public.cards FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.is_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.is_admin = true
));


DROP POLICY IF EXISTS "admin write categories" ON public.card_categories;
CREATE POLICY "admin write categories"
ON public.card_categories FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.is_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.is_admin = true
));

-- 5) Storage policies para el bucket 'photocards'.
-- Asegúrate de que el bucket exista en Supabase Storage.
-- Si el bucket es público, tus imágenes se podrán ver desde la app móvil.
INSERT INTO storage.buckets (id, name, public)
VALUES ('photocards', 'photocards', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "admin upload photocards" ON storage.objects;
CREATE POLICY "admin upload photocards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photocards'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
);

DROP POLICY IF EXISTS "admin update photocards" ON storage.objects;
CREATE POLICY "admin update photocards"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photocards'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
)
WITH CHECK (
  bucket_id = 'photocards'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
);

DROP POLICY IF EXISTS "public read photocards" ON storage.objects;
CREATE POLICY "public read photocards"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photocards');
