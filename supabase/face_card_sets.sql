-- FACE (Jimin, album_id 108) — versiones + card_sets desde el template. Solo photocards. Idempotente.
-- Nota: en este template "USA EXCLUSIVE" son postcards (no PC), por eso no se incluyen.

INSERT INTO public.album_versions (album_id, name, short_name, sort_order)
SELECT 108, v.name, v.short_name, v.sort_order
FROM (VALUES
  ('Invisible Face', 'INVISIBLE', 1),
  ('Undefinable Face', 'UNDEFINABLE', 2),
  ('Weverse Version', 'WV', 3),
  ('Capsule Album', 'CA', 4),
  ('Like Crazy CD Single', 'LCCD', 5),
  ('Vinyl', 'VINYL', 6)
) AS v(name, short_name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.album_versions av WHERE av.album_id = 108 AND av.short_name = v.short_name);

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, country, sort_order, is_active)
SELECT 108, av.id, cc.id, v.name, v.short_name, v.description, v.retailer, v.country, v.sort_order, true
FROM (VALUES
  ('Invisible Face Standard PCs', 'FACE-INVISIBLE-STANDARD-PC', NULL, NULL, NULL, 'album_pc', 'INVISIBLE', 1),
  ('Undefinable Face Standard PCs', 'FACE-UNDEFINABLE-STANDARD-PC', NULL, NULL, NULL, 'album_pc', 'UNDEFINABLE', 2),
  ('Random PCs', 'FACE-RANDOM-PC', 'Photocards aleatorias, no ligadas a una versión específica', NULL, NULL, 'album_pc', NULL, 3),
  ('Weverse Albums Ver. Random PC', 'FACE-WV-RANDOM-PC', NULL, NULL, NULL, 'album_pc', 'WV', 4),
  ('Weverse Albums App Digital Random PC', 'FACE-WV-DIGITAL-RANDOM-PC', 'PC digital via scan QR de la app Weverse Albums', NULL, NULL, 'album_pc', 'WV', 5),
  ('Vinyl Photocards', 'FACE-VINYL-PC', NULL, NULL, NULL, 'vinyl_pc', 'VINYL', 6),
  ('Capsule Album PC', 'FACE-CA-PC', NULL, NULL, NULL, 'album_pc', 'CA', 7),

  ('Capsule Album WVG Gift PC', 'FACE-CA-WVG-GIFT-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', 'CA', 10),
  ('Capsule Album Merch Package PC', 'FACE-CA-MERCH-PKG-PC', NULL, NULL, 'GLOBAL', 'pob', 'CA', 11),
  ('Weverse Global WVG Early Bird PC', 'FACE-WVG-EARLYBIRD-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 12),
  ('Weverse Global WVG POB PC', 'FACE-WVG-POB-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 13),
  ('Weverse Global WVG PVC PC', 'FACE-WVG-PVC-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 14),
  ('JPFC Holo PC (w/ Mount)', 'FACE-JPFC-HOLO-MOUNT-PC', NULL, 'JPFC', 'JAPAN', 'pob', NULL, 15),
  ('JPFC Holo PC', 'FACE-JPFC-HOLO-PC', NULL, 'JPFC', 'JAPAN', 'pob', NULL, 16),
  ('UMS PC', 'FACE-UMS-PC', NULL, 'UMS', 'JAPAN', 'pob', NULL, 17),

  ('Production Diary POB Photocards', 'FACE-PRODDIARY-POB-PC', 'Jimin''s Production Diary, POB photocards', NULL, 'GLOBAL', 'event_pc', NULL, 20),
  ('Production Diary Special Talk PC', 'FACE-PRODDIARY-TALK-PC', 'Jimin''s Production Diary, Special Talk', NULL, 'GLOBAL', 'event_pc', NULL, 21),

  ('Soundwave Lucky Draw (Korea)', 'FACE-KR-SOUNDWAVE-LD', NULL, 'Soundwave', 'KOREA', 'lucky_draw', NULL, 30),
  ('M2U Lucky Draw (Korea)', 'FACE-KR-M2U-LD', NULL, 'M2U', 'KOREA', 'lucky_draw', NULL, 31),
  ('Powerstation Lucky Draw (Korea)', 'FACE-KR-POWERSTATION-LD', NULL, 'Powerstation', 'KOREA', 'lucky_draw', NULL, 32),
  ('JPFC Lucky Draw (Japan)', 'FACE-JP-JPFC-LD', NULL, 'JPFC', 'JAPAN', 'lucky_draw', NULL, 33),
  ('UMS Lucky Draw (Japan)', 'FACE-JP-UMS-LD', NULL, 'UMS', 'JAPAN', 'lucky_draw', NULL, 34),

  ('The Truth Untold Weverse Gifts Album Purchase PCs', 'FACE-TTU-WVGIFT-PC', 'Exhibición The Truth Untold, regalo Weverse por compra de álbum', 'Weverse', 'GLOBAL', 'event_pc', NULL, 40),
  ('The Truth Untold Photocard Set', 'FACE-TTU-PC-SET', 'Exhibición The Truth Untold, set principal de photocards', NULL, 'GLOBAL', 'event_pc', NULL, 41),
  ('The Truth Untold Merch Necklace PC', 'FACE-TTU-MERCH-NECKLACE-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 42),
  ('The Truth Untold Merch Earring PC', 'FACE-TTU-MERCH-EARRING-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 43),
  ('The Truth Untold Merch Hoodie PC', 'FACE-TTU-MERCH-HOODIE-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 44),
  ('The Truth Untold Merch Blanket PC', 'FACE-TTU-MERCH-BLANKET-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 45),
  ('The Truth Untold Merch Photo Stand PC', 'FACE-TTU-MERCH-PHOTOSTAND-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 46),

  ('Knit Cardigan PC', 'FACE-MERCH-CARDIGAN-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 50),
  ('Broadcast PCs (Raffle)', 'FACE-RAFFLE-BROADCAST-PC', NULL, NULL, 'KOREA', 'exclusive', NULL, 51),
  ('WV Art Raffle PC', 'FACE-RAFFLE-WVART-PC', NULL, 'Weverse', 'GLOBAL', 'exclusive', NULL, 52),
  ('Line Music PC', 'FACE-LINEMUSIC-PC', NULL, 'Line Music', 'KOREA', 'merch_pc', NULL, 53)
) AS v(name, short_name, description, retailer, country, category_short, version_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
LEFT JOIN public.album_versions av ON av.album_id = 108 AND av.short_name = v.version_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
