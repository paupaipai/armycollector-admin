# K-Collector Admin

Mantenedor web privado para cargar y administrar el catálogo de K-Collector en Supabase.

## Qué incluye esta versión

- Login con Supabase Auth.
- Validación de usuario admin con `user_profiles.is_admin`.
- Tema visual morado.
- Cropper web para recortar templates de photocards.
- Carga masiva de photocards con subida a Supabase Storage.
- CRUD básico para estas tablas:
  - `albums`
  - `album_versions`
  - `card_categories`
  - `cards`

## Variables de entorno

Copia `.env.example` como `.env` y completa:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_O_PUBLISHABLE_KEY
VITE_SUPABASE_STORAGE_BUCKET=photocards
VITE_SKIP_ADMIN_CHECK=false
```

No uses `service_role` ni `secret key` en esta app web.

## Instalación local

```bash
npm install
npm run dev
```

## Build para subir a Contabo / Nginx / Netlify

```bash
npm run build
```

Se genera la carpeta `dist/`.

## Supabase setup

Antes de usarlo, revisa y ejecuta:

```txt
supabase/admin_setup.sql
```

Cambia `TU_CORREO@EMAIL.COM` por tu correo real de Supabase Auth.

## Flujo recomendado

1. Crear o editar álbum en **Álbumes**.
2. Crear o editar versiones en **Versiones**.
3. Crear o editar categorías en **Categorías**.
4. Usar **Cropper** para recortar templates.
5. Enviar los recortes a **Carga masiva**.
6. Guardar cards e imágenes en Supabase.
7. Corregir individualmente desde **Cards** si hace falta.

## Ejemplo O!RUL8,2?

Base path:

```txt
korean-albums/orul82/album-pcs
```

Código base:

```txt
ORUL82
```

Suffix:

```txt
ALBUM-PC
```

Archivos esperados:

```txt
rm.png
jin.png
suga.png
jhope.png
jimin.png
v.png
jungkook.png
group.png
```
