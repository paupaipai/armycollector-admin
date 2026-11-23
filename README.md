# K-Collector Admin

Mantenedor web privado para cargar y administrar el catálogo de K-Collector en Supabase.

## Qué incluye esta versión

- Login con Supabase Auth.
- Validación de usuario admin con `user_profiles.is_admin`.
- Tema visual morado.
- Cropper web para recortar templates de photocards.
- Carga masiva de photocards con subida a Supabase Storage.
- CRUD básico para estas tablas:
  - `collection_types`, `album_eras`, `albums`, `album_versions`, `card_categories`, `card_sets`
  - `cards`
- **Moderación** (Purple Collector v2):
  - **Imágenes**: aportes pendientes de la comunidad (frente y reverso), comparados con la imagen actual. Aprobar / rechazar con motivo.
  - **Reportes**: reclamos sobre imágenes. Retirar (borra el archivo y, si es legacy, vacía `cards.image_path`), mantener o descartar.
  - **Propuestas**: cards nuevas propuestas por usuarios. Aprobar crea la card y publica el frente; el reverso queda pendiente en Imágenes. Las de álbum no listado solo se marcan resueltas.
- **Challenge**: crear, activar, cambiar término, cerrar, reabrir y finalizar el Community Challenge; ranking en vivo, aportes por usuario, anular y restaurar puntos, ranking final y premios.

## Imágenes desde la v2 (importante)

La app v2 **no** lee `cards.image_path`: lee la vista `cards_full`, que resuelve la imagen desde `card_images`
(comunidad aprobada → admin aprobada → legacy). Por eso:

- **Carga masiva** sube a `photocards`, guarda `cards.image_path` (lo sigue leyendo la Android 1.0.4) **y registra la fila legacy en `card_images`**. Sin esa fila la card sale sin imagen en la v2.
- Si una card tenía la imagen **retirada por un reclamo**, re-subirla no la re-publica: se mantiene retirada en ambas apps y el mantenedor avisa.
- **Cards** muestra la imagen que ve la app, su origen (legacy / comunidad + @usuario), si fue retirada y si tiene reverso. Al editar una card se ven todas sus imágenes y se puede retirar cualquiera aprobada.
- Eliminar una card borra sus filas de `card_images` y reportes (cascade) y todos sus archivos, en cualquier bucket. Las cards creadas desde una propuesta aprobada no se pueden borrar (restricción de la base): ocúltalas con *Visible*.
- No edites `cards.image_path` a mano salvo para retirar una imagen.

Buckets: `photocards` (legacy, público), `photocard-community` (aportes aprobados, público),
`photocard-community-review` (pendientes, privado: el mantenedor usa URLs firmadas). Todos con límite de 5 MiB, PNG/JPEG/WebP.

Las acciones de moderación pasan por las edge functions `moderate-card-image` y `moderate-card-submission`,
que validan `is_admin` con el JWT de la sesión. El Challenge usa las RPC `challenge_admin_*`.

## Variables de entorno

Copia `.env.example` como `.env` y completa:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_O_PUBLISHABLE_KEY
VITE_SUPABASE_STORAGE_BUCKET=photocards
VITE_SKIP_ADMIN_CHECK=false
```

No uses `service_role` ni `secret key` en esta app web. Cualquier variable `VITE_*` que el código lea termina
dentro del bundle público. Si tu `.env` tiene `VITE_SUPABASE_SERVICE_KEY`, bórrala: el código no la usa y no hace falta.

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

El esquema de producción lo definen las migraciones de `supabase/migrations/` del repo de la app.
**No ejecutes `supabase/admin_setup.sql`**: es del setup inicial y deshace correcciones de seguridad.

Para hacer admin a alguien: desde el dashboard de Supabase (con `service_role`), poner
`user_profiles.is_admin = true`. Desde la corrección SR-8 los usuarios no pueden cambiar esa columna.

## Flujo recomendado

1. Crear o editar álbum en **Álbumes**.
2. Crear o editar versiones en **Versiones**.
3. Crear o editar categorías en **Categorías**.
4. Usar **Cropper** para recortar templates.
5. Enviar los recortes a **Carga masiva**.
6. Guardar cards e imágenes en Supabase.
7. Corregir individualmente desde **Cards** si hace falta.
8. Revisar **Moderación** (aportes, reportes y propuestas de la comunidad).

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
