-- Soporta: (1) borrar cards desde el admin, (2) editar cards, (3) orden de visualización.
-- Idempotente.

ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- El admin ya podía INSERT/UPDATE cards (policy "admin write cards" es FOR ALL),
-- así que el DELETE de fila queda cubierto por la misma policy. Solo falta permiso
-- de borrado en Storage, que ya existe ("admin delete photocards" en admin_setup.sql).
