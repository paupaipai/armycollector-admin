-- D-DAY (SUGA / Agust D, album_id 99) — completa lo que ya estaba cargado a mano.
-- 1) rellena country/draw_type en los 26 sets existentes.
-- 2) agrega los sets que faltan: Documentary, D-DAY in Japan, The Original, The Movie, Merch, Tour.
-- Alcance: solo photocards. Idempotente.

-- ============================================================
-- 1) country / draw_type en sets existentes
-- ============================================================

UPDATE public.card_sets SET country = 'KOREA' WHERE album_id = 99 AND short_name IN
  ('DDAY-SOUNDWAVE-LD-PC', 'DDAY-M2U-LD-PC', 'DDAY-POWERSTATION-LD-PC', 'DDAY-TOUR-SEOUL-FINAL-LD-PC') AND country IS NULL;

UPDATE public.card_sets SET country = 'JAPAN' WHERE album_id = 99 AND short_name IN
  ('DDAY-JPFC-LD-PC', 'DDAY-UMS-LD-PC', 'DDAY-JPFC-HOLO-PC', 'DDAY-UMS-PC', 'DDAY-TOUR-JAPAN-PEARL-HOLO-LD-PC') AND country IS NULL;

UPDATE public.card_sets SET country = 'USA' WHERE album_id = 99 AND short_name IN
  ('DDAY-WV-USA-PC', 'DDAY-TARGET-PC', 'DDAY-WALMART-PC') AND country IS NULL;

UPDATE public.card_sets SET country = 'GLOBAL' WHERE album_id = 99 AND short_name IN
  ('DDAY-WVG-EARLY-BIRD-GIFT-PC', 'DDAY-WVG-POB-PC', 'DDAY-WVG-PVC-PC', 'DDAY-CAPSULE-WV-GIFT-PC',
   'DDAY-CAPSULE-MERCH-PACKAGE-PC', 'DDAY-TOUR-REGULAR-LD-PC') AND country IS NULL;

-- ============================================================
-- 2) card_sets nuevos
-- ============================================================

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, round, country, draw_type, sort_order, is_active)
SELECT 99, NULL, cc.id, v.name, v.short_name, v.description, v.retailer, NULL, v.country, NULL, v.sort_order, true
FROM (VALUES
  -- ---------- Road to D-Day Documentary (event_pc) ----------
  ('Documentary Weverse VOD PC', 'DDAY-DOC-WVVOD-PC', 'PC del VOD de Road to D-Day en Weverse', 'Weverse VOD', 'GLOBAL', 'event_pc', 70),
  ('Documentary Korea Hologram PC', 'DDAY-DOC-KR-HOLOGRAM-PC', 'PC holográfica del estreno en Corea', 'Documentary Korea', 'KOREA', 'event_pc', 71),
  ('Documentary Korea Lotte Cinema PC', 'DDAY-DOC-KR-LOTTE-PC', 'PC exclusiva Lotte Cinema', 'Lotte Cinema', 'KOREA', 'event_pc', 72),
  ('Documentary Japan Photocards', 'DDAY-DOC-JP-PC', 'Photocards del estreno en Japón', 'Documentary Japan', 'JAPAN', 'event_pc', 73),
  ('Documentary Japan 2-Visual PC', 'DDAY-DOC-JP-2VISUAL-PC', 'PC de 2 visuales, estreno Japón', 'Documentary Japan', 'JAPAN', 'event_pc', 74),

  -- ---------- D-Day In Japan (jp_edition_pc) ----------
  ('D-Day In Japan DVD Heat PC', 'DDAY-JP-DVD-HEAT-PC', 'PC sensible al calor incluida en el DVD japonés', NULL, 'JAPAN', 'jp_edition_pc', 80),
  ('D-Day In Japan DVD Lenticular RPC 1', 'DDAY-JP-DVD-LENTI-RPC1', 'PC lenticular aleatoria 1, DVD japonés', NULL, 'JAPAN', 'jp_edition_pc', 81),
  ('D-Day In Japan DVD Lenticular RPC 2', 'DDAY-JP-DVD-LENTI-RPC2', 'PC lenticular aleatoria 2, DVD japonés', NULL, 'JAPAN', 'jp_edition_pc', 82),
  ('D-Day In Japan Bluray Heat PC', 'DDAY-JP-BD-HEAT-PC', 'PC sensible al calor incluida en el Blu-ray japonés', NULL, 'JAPAN', 'jp_edition_pc', 83),
  ('D-Day In Japan Bluray Lenticular RPC 1', 'DDAY-JP-BD-LENTI-RPC1', 'PC lenticular aleatoria 1, Blu-ray japonés', NULL, 'JAPAN', 'jp_edition_pc', 84),
  ('D-Day In Japan Bluray Lenticular RPC 2', 'DDAY-JP-BD-LENTI-RPC2', 'PC lenticular aleatoria 2, Blu-ray japonés', NULL, 'JAPAN', 'jp_edition_pc', 85),

  -- ---------- D-Day The Original (album_pc) ----------
  ('D-Day The Original Photocard Set', 'DDAY-ORIGINAL-PC-SET', 'Set principal de photocards de D-Day The Original', 'D-Day The Original', NULL, 'album_pc', 90),

  -- ---------- D-Day The Movie (event_pc) ----------
  ('The Movie Korea Week 2 PCs', 'DDAY-MOVIE-KR-WK2-PC', 'D-Day The Movie, Corea, semana 2', 'D-Day The Movie Korea', 'KOREA', 'event_pc', 95),
  ('The Movie Japan Original Visual PCs', 'DDAY-MOVIE-JP-ORIGVISUAL-PC', 'D-Day The Movie, Japón, visual original', 'D-Day The Movie Japan', 'JAPAN', 'event_pc', 96),
  ('The Movie Japan Cheki Cards (Popcorn Bag)', 'DDAY-MOVIE-JP-CHEKI-PC', 'D-Day The Movie, Japón, cheki con popcorn bag', 'D-Day The Movie Japan', 'JAPAN', 'event_pc', 97),
  ('The Movie Japan Week 1 PC', 'DDAY-MOVIE-JP-WK1-PC', 'D-Day The Movie, Japón, semana 1', 'D-Day The Movie Japan', 'JAPAN', 'event_pc', 98),
  ('The Movie Japan Final Week Cutting Cards', 'DDAY-MOVIE-JP-FINALWK-CUTTING-PC', 'D-Day The Movie, Japón, semana final', 'D-Day The Movie Japan', 'JAPAN', 'event_pc', 99),
  ('The Movie Limited PC', 'DDAY-MOVIE-LIMITED-PC', 'D-Day The Movie, PC limitada', 'D-Day The Movie', 'GLOBAL', 'event_pc', 100),

  -- ---------- Merch (merch_pc) ----------
  ('Weverse Merch Lanyard PC', 'DDAY-MERCH-LANYARD-PC', NULL, NULL, 'GLOBAL', 'merch_pc', 110),
  ('Weverse Merch Metallic PC', 'DDAY-MERCH-METALLIC-PC', NULL, NULL, 'GLOBAL', 'merch_pc', 111),
  ('Weverse Merch Card Holder PC', 'DDAY-MERCH-CARDHOLDER-PC', NULL, NULL, 'GLOBAL', 'merch_pc', 112),
  ('Weverse Merch Oversized Shirt PC', 'DDAY-MERCH-SHIRT-PC', NULL, NULL, 'GLOBAL', 'merch_pc', 113),
  ('Weverse Merch Cross Bag PC', 'DDAY-MERCH-CROSSBAG-PC', NULL, NULL, 'GLOBAL', 'merch_pc', 114),
  ('Weverse Merch Box #15 PC', 'DDAY-MERCH-BOX15-PC', NULL, NULL, 'GLOBAL', 'merch_pc', 115),
  ('On-Site Hoodie PCs (USA Tour)', 'DDAY-MERCH-HOODIE-USA-PC', 'PC incluida con hoodie, venta on-site del tour USA', 'D-Day Tour USA', 'USA', 'merch_pc', 116),
  ('Mini Photocard Set - Agust D Ver.', 'DDAY-MINI-PC-SET-AGUSTD', 'Set de mini photocards, versión Agust D', NULL, NULL, 'merch_pc', 117),
  ('Mini Photocard Set - Suga Ver.', 'DDAY-MINI-PC-SET-SUGA', 'Set de mini photocards, versión Suga', NULL, NULL, 'merch_pc', 118),

  -- ---------- Tour ----------
  ('Movie Night PC', 'DDAY-MOVIE-NIGHT-PC', 'PC del evento Movie Night', 'D-Day Movie Night', 'KOREA', 'tour', 120)
) AS v(name, short_name, description, retailer, country, category_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
