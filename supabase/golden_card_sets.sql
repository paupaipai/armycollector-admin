-- GOLDEN (Jungkook) — Card Sets desde el template "Golden - Ultimate Template" (@912DAZE)
-- Alcance: SOLO photocards (se excluyen posters, postcards, polaroids, stickers, tickets, jigsaws, merch sin PC).
-- Todo queda anidado bajo el álbum "Golden" (album_id 114, era Jungkook) — Seven / Golden The Moments /
-- I Am Still / Golden Live On Stage no son álbumes propios, son card_sets de Golden.
-- Idempotente: se puede correr más de una vez sin duplicar columnas, categorías ni sets.

-- ============================================================
-- 0) COLUMNAS country / draw_type EN card_sets
-- La tabla `cards` en producción ya las tiene (se usaron a mano para los Lucky Draw
-- cargados manualmente), pero `card_sets` no. Al agregarlas acá, se heredan a cada
-- card generada por el set — igual que ya pasa con `retailer` y `round`.
-- ============================================================

ALTER TABLE public.card_sets ADD COLUMN IF NOT EXISTS country   text;
ALTER TABLE public.card_sets ADD COLUMN IF NOT EXISTS draw_type text;

-- ============================================================
-- 1) DOS CATEGORÍAS NUEVAS (no existía nada que calzara bien)
-- ============================================================

INSERT INTO public.card_categories (name, short_name, description, color, sort_order, is_active)
SELECT 'Merch PCs', 'merch_pc',
       'Photocards incluidos al comprar merch (jacket, bag, merch box, keyring, etc.)',
       '#FF8C42', 11, true
WHERE NOT EXISTS (SELECT 1 FROM public.card_categories WHERE short_name = 'merch_pc');

INSERT INTO public.card_categories (name, short_name, description, color, sort_order, is_active)
SELECT 'Event PCs', 'event_pc',
       'Photocards de eventos/exhibiciones (Golden The Moments, I Am Still) por semana o país.',
       '#8B5CF6', 12, true
WHERE NOT EXISTS (SELECT 1 FROM public.card_categories WHERE short_name = 'event_pc');

-- ============================================================
-- 2) CARD SETS
-- Álbum fijo: 114 (Golden). version_id NULL en todos (no dependen de una versión física).
-- country: KOREA / JAPAN / CHINA / USA / EUROPE / GLOBAL (multi-país) / OTHER (resto del mundo).
-- draw_type: solo se llena en sets de Lucky Draw (R1 / R2 / OFFLINE / ONLINE); el resto NULL.
-- ============================================================

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, round, country, draw_type, sort_order, is_active)
SELECT 114, NULL, cc.id, v.name, v.short_name, v.description, v.retailer, v.round, v.country, v.draw_type, v.sort_order, true
FROM (VALUES
  -- ---------- POBs / Exclusive Gifts (categoría: pob) ----------
  ('Weverse Shop Early Bird Transparent PVC PC', 'GOLDEN-WVS-EARLYBIRD-PC', 'POB de pre-orden temprana en Weverse Shop', 'Weverse Shop', NULL, 'GLOBAL', NULL, 'pob', 1),
  ('Weverse Shop WVG POB PC', 'GOLDEN-WVS-POB-PC', 'POB estándar de Weverse Shop', 'Weverse Shop', NULL, 'GLOBAL', NULL, 'pob', 2),
  ('Golden The Moments Special Event PCs (Weverse Shop)', 'GOLDEN-WVS-MOMENTS-EVENT-PC', 'POB especial por evento Golden The Moments', 'Weverse Shop', NULL, 'GLOBAL', NULL, 'pob', 3),
  ('WVG Additional Gift PVC PCs', 'GOLDEN-WVG-ADDGIFT-PC', 'Regalo adicional Weverse Global', 'Weverse Shop', NULL, 'GLOBAL', NULL, 'pob', 4),
  ('JPFC Holo PC w/ Mount', 'GOLDEN-JPFC-HOLO-MOUNT-PC', 'POB Japan Fanclub, holográfico con soporte', 'JPFC', NULL, 'JAPAN', NULL, 'pob', 5),
  ('JPFC Holo PC', 'GOLDEN-JPFC-HOLO-PC', 'POB Japan Fanclub, holográfico', 'JPFC', NULL, 'JAPAN', NULL, 'pob', 6),
  ('UMS POB PC', 'GOLDEN-UMS-POB-PC', 'POB Universal Music Store Japan', 'UMS', NULL, 'JAPAN', NULL, 'pob', 7),

  -- ---------- Exclusive PCs (retailers USA/EU + Seven) ----------
  ('USA D2C Exclusive PC', 'GOLDEN-USA-D2C-PC', 'Exclusivo tienda D2C USA', 'USA D2C', NULL, 'USA', NULL, 'exclusive', 10),
  ('Target Exclusive PC', 'GOLDEN-TARGET-PC', 'Exclusivo Target', 'Target', NULL, 'USA', NULL, 'exclusive', 11),
  ('Walmart Exclusive PC', 'GOLDEN-WALMART-PC', 'Exclusivo Walmart', 'Walmart', NULL, 'USA', NULL, 'exclusive', 12),
  ('Barnes & Noble Exclusive PC', 'GOLDEN-BN-PC', 'Exclusivo Barnes & Noble', 'Barnes & Noble', NULL, 'USA', NULL, 'exclusive', 13),
  ('Europe Exclusive PC', 'GOLDEN-EU-EXCL-PC', 'Exclusivo distribución Europa', 'Europe', NULL, 'EUROPE', NULL, 'exclusive', 14),
  ('Seven Photocards', 'GOLDEN-SEVEN-PC', 'Photocards promocionales del single SEVEN (shirt, broadcasts, 3D, Line Music)', NULL, NULL, 'KOREA', NULL, 'exclusive', 15),

  -- ---------- Merch PCs ----------
  ('Jacket PC', 'GOLDEN-MERCH-JACKET-PC', 'Photocard incluido con la jacket oficial', NULL, NULL, 'GLOBAL', NULL, 'merch_pc', 20),
  ('Bag PC', 'GOLDEN-MERCH-BAG-PC', 'Photocard incluido con la bag oficial', NULL, NULL, 'GLOBAL', NULL, 'merch_pc', 21),
  ('Merch Box PC', 'GOLDEN-MERCH-BOX-PC', 'Photocard incluido con la merch box', NULL, NULL, 'GLOBAL', NULL, 'merch_pc', 22),
  ('Golden The Moments Merch PCs', 'GOLDEN-MOMENTS-MERCH-PC', 'Photocards incluidos con merch de la exhibición (holder keyring, golden bar, necklace, perfume)', 'Golden The Moments Exhibition', NULL, 'GLOBAL', NULL, 'merch_pc', 23),

  -- ---------- Lucky Draw ----------
  ('Soundwave LD R1 (Korea)', 'GOLDEN-KR-SOUNDWAVE-R1', 'Lucky Draw Soundwave, ronda 1', 'Soundwave', 'R1', 'KOREA', 'R1', 'lucky_draw', 30),
  ('Soundwave LD R2 (Korea)', 'GOLDEN-KR-SOUNDWAVE-R2', 'Lucky Draw Soundwave, ronda 2', 'Soundwave', 'R2', 'KOREA', 'R2', 'lucky_draw', 31),
  ('M2U LD R1 (Korea)', 'GOLDEN-KR-M2U-R1', 'Lucky Draw M2U, ronda 1', 'M2U', 'R1', 'KOREA', 'R1', 'lucky_draw', 32),
  ('M2U LD R2 (Korea)', 'GOLDEN-KR-M2U-R2', 'Lucky Draw M2U, ronda 2', 'M2U', 'R2', 'KOREA', 'R2', 'lucky_draw', 33),
  ('Powerstation LD R1 (Korea)', 'GOLDEN-KR-POWERSTATION-R1', 'Lucky Draw Powerstation, ronda 1', 'Powerstation', 'R1', 'KOREA', 'R1', 'lucky_draw', 34),
  ('Powerstation LD R2 (Korea)', 'GOLDEN-KR-POWERSTATION-R2', 'Lucky Draw Powerstation, ronda 2', 'Powerstation', 'R2', 'KOREA', 'R2', 'lucky_draw', 35),
  ('Yetimall LD (China)', 'GOLDEN-CN-YETIMALL-LD', 'Lucky Draw Yetimall China', 'Yetimall', NULL, 'CHINA', NULL, 'lucky_draw', 36),
  ('JPFC LD (Japan)', 'GOLDEN-JP-JPFC-LD', 'Lucky Draw Japan Fanclub', 'JPFC', NULL, 'JAPAN', NULL, 'lucky_draw', 37),
  ('YZY LD (Japan)', 'GOLDEN-JP-YZY-LD', 'Lucky Draw YZY Japan', 'YZY', NULL, 'JAPAN', NULL, 'lucky_draw', 38),
  ('UMS LD (Japan)', 'GOLDEN-JP-UMS-LD', 'Lucky Draw UMS Japan', 'UMS', NULL, 'JAPAN', NULL, 'lucky_draw', 39),
  ('Golden Live On Stage Offline LD', 'GOLDEN-GLOS-OFFLINE-LD', 'Lucky Draw retiro en el venue del concierto', 'GLOS On-site Pickup', 'OFFLINE', 'KOREA', 'OFFLINE', 'lucky_draw', 40),
  ('Golden Live On Stage Online LD', 'GOLDEN-GLOS-ONLINE-LD', 'Lucky Draw comprado vía Weverse Shop', 'GLOS Weverse Shop', 'ONLINE', 'KOREA', 'ONLINE', 'lucky_draw', 41),

  -- ---------- Tour ----------
  ('Golden Live On Stage Attendee Benefit PC', 'GOLDEN-GLOS-ATTENDEE-PC', 'Photocard de regalo por asistencia al concierto', NULL, NULL, 'KOREA', NULL, 'tour', 50),

  -- ---------- Event PCs (Golden The Moments + I Am Still) ----------
  ('Golden The Moments Photocard Set', 'GOLDEN-MOMENTS-PC-SET', 'Set principal de photocards de la exhibición Golden The Moments (15 diseños)', 'Golden The Moments Exhibition', NULL, 'GLOBAL', NULL, 'event_pc', 60),
  ('I Am Still Korea Week 2 Photocards', 'GOLDEN-IAS-KR-WK2-PC', 'I Am Still, Corea, semana 2', 'I Am Still Korea', NULL, 'KOREA', NULL, 'event_pc', 61),
  ('I Am Still Japan Advance Reservation Photocards', 'GOLDEN-IAS-JP-ADVRES-PC', 'I Am Still, Japón, reserva anticipada', 'I Am Still Japan', NULL, 'JAPAN', NULL, 'event_pc', 62),
  ('I Am Still Japan Cheki Cards (Popcorn Bag)', 'GOLDEN-IAS-JP-CHEKI-PC', 'I Am Still, Japón, cheki incluido con popcorn bag', 'I Am Still Japan', NULL, 'JAPAN', NULL, 'event_pc', 63),
  ('I Am Still Japan Week 1 Photocards', 'GOLDEN-IAS-JP-WK1-PC', 'I Am Still, Japón, semana 1', 'I Am Still Japan', NULL, 'JAPAN', NULL, 'event_pc', 64),
  ('I Am Still Japan Week 4 Photocards', 'GOLDEN-IAS-JP-WK4-PC', 'I Am Still, Japón, semana 4', 'I Am Still Japan', NULL, 'JAPAN', NULL, 'event_pc', 65),
  ('I Am Still Japan Final Week PC', 'GOLDEN-IAS-JP-FINALWK-PC', 'I Am Still, Japón, semana final', 'I Am Still Japan', NULL, 'JAPAN', NULL, 'event_pc', 66),
  ('I Am Still Other Countries Week 1 PC', 'GOLDEN-IAS-OC-WK1-PC', 'I Am Still, otros países, semana 1', 'I Am Still Other Countries', NULL, 'OTHER', NULL, 'event_pc', 67),
  ('I Am Still Other Countries Week 2 PC', 'GOLDEN-IAS-OC-WK2-PC', 'I Am Still, otros países, semana 2', 'I Am Still Other Countries', NULL, 'OTHER', NULL, 'event_pc', 68),
  ('I Am Still Other Countries Week 3 Party Edition PCs', 'GOLDEN-IAS-OC-WK3-PARTY-PC', 'I Am Still, otros países, semana 3, edición party', 'I Am Still Other Countries', NULL, 'OTHER', NULL, 'event_pc', 69)
) AS v(name, short_name, description, retailer, round, country, draw_type, category_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
