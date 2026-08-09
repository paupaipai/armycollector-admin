-- INDIGO (RM) — Versiones y Card Sets desde el template "Indigo - Ultimate Template" (@912DAZE)
-- Alcance: SOLO photocards (se excluyen posters, postcards, instant photos, stickers, memopads,
-- bookmarks, L-holders, frames y el resto de merch sin PC).
-- Álbum: 105 (Indigo, era RM). A diferencia de Golden, este álbum todavía no tenía versiones cargadas.
-- Idempotente: se puede correr más de una vez sin duplicar versiones ni sets.

-- ============================================================
-- 1) VERSIONES DEL ÁLBUM (sección "ALBUMS" del template)
-- ============================================================

INSERT INTO public.album_versions (album_id, name, short_name, sort_order)
SELECT 105, v.name, v.short_name, v.sort_order
FROM (VALUES
  ('Book Edition', 'BOOK', 1),
  ('Postcard Edition', 'PCE', 2),
  ('Vinyl', 'VINYL', 3),
  ('Capsule Album', 'CA', 4)
) AS v(name, short_name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.album_versions av WHERE av.album_id = 105 AND av.short_name = v.short_name
);

-- ============================================================
-- 2) CARD SETS
-- Usa las categorías ya existentes (album_pc, exclusive, pob, lucky_draw) y las creadas
-- para Golden (merch_pc). No se necesitó ninguna categoría nueva para Indigo.
-- ============================================================

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, round, country, draw_type, sort_order, is_active)
SELECT 105, av.id, cc.id, v.name, v.short_name, v.description, v.retailer, v.round, v.country, v.draw_type, v.sort_order, true
FROM (VALUES
  -- ---------- Album Inclusions (categoría: album_pc / vinyl_pc) ----------
  ('Book Edition Random PCs', 'INDIGO-BOOK-RANDOM-PC', 'Photocards aleatorias incluidas en Book Edition', NULL, NULL, NULL, NULL, 'album_pc', 'BOOK', 1),
  ('Book Edition Fabric Card', 'INDIGO-BOOK-FABRIC-CARD', 'Card de tela incluida en Book Edition', NULL, NULL, NULL, NULL, 'album_pc', 'BOOK', 2),
  ('Postcard Edition Random PCs', 'INDIGO-PCE-RANDOM-PC', 'Photocards aleatorias incluidas en Postcard Edition', NULL, NULL, NULL, NULL, 'album_pc', 'PCE', 3),
  ('Vinyl PC', 'INDIGO-VINYL-PC', 'Photocard incluida en la versión Vinyl', NULL, NULL, NULL, NULL, 'vinyl_pc', 'VINYL', 4),
  ('Capsule Album PC', 'INDIGO-CA-PC', 'Photocard incluida en Capsule Album', NULL, NULL, NULL, NULL, 'album_pc', 'CA', 5),

  -- ---------- POBs / Exclusive Gifts ----------
  ('Weverse Global PC', 'INDIGO-WVG-PC', 'POB Weverse Global', 'Weverse Global', NULL, 'GLOBAL', NULL, 'pob', NULL, 10),
  ('WV USA Exclusive PC', 'INDIGO-WVUSA-PC', 'Exclusivo Weverse USA', 'Weverse USA', NULL, 'USA', NULL, 'exclusive', NULL, 11),
  ('Capsule Album WVG Gift PC', 'INDIGO-CA-WVG-GIFT-PC', 'Regalo Weverse Global por compra de Capsule Album', 'Weverse Global', NULL, 'GLOBAL', NULL, 'pob', 'CA', 12),
  ('Capsule Album Merch Package PC', 'INDIGO-CA-MERCH-PKG-PC', 'PC incluida en el merch package de Capsule Album', NULL, NULL, 'GLOBAL', NULL, 'pob', 'CA', 13),
  ('JPFC Holo PC w/ Mount', 'INDIGO-JPFC-HOLO-MOUNT-PC', 'POB Japan Fanclub, holográfico con soporte', 'JPFC', NULL, 'JAPAN', NULL, 'pob', NULL, 14),
  ('UMS PC', 'INDIGO-UMS-PC', 'POB Universal Music Store Japan', 'UMS', NULL, 'JAPAN', NULL, 'pob', NULL, 15),

  -- ---------- Lucky Draw (Korea) ----------
  ('Soundwave LD (Korea)', 'INDIGO-KR-SOUNDWAVE-LD', 'Lucky Draw Soundwave', 'Soundwave', NULL, 'KOREA', NULL, 'lucky_draw', NULL, 20),
  ('M2U LD (Korea)', 'INDIGO-KR-M2U-LD', 'Lucky Draw M2U', 'M2U', NULL, 'KOREA', NULL, 'lucky_draw', NULL, 21),
  ('Powerstation LD (Korea)', 'INDIGO-KR-POWERSTATION-LD', 'Lucky Draw Powerstation', 'Powerstation', NULL, 'KOREA', NULL, 'lucky_draw', NULL, 22),

  -- ---------- Merch ----------
  ('Denim Shirt PC', 'INDIGO-MERCH-DENIM-PC', 'Photocard incluida con la denim shirt oficial', NULL, NULL, 'GLOBAL', NULL, 'merch_pc', NULL, 30)
) AS v(name, short_name, description, retailer, round, country, draw_type, category_short, version_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
LEFT JOIN public.album_versions av ON av.album_id = 105 AND av.short_name = v.version_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
