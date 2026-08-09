-- HOPE ON THE STREET Vol.1 (j-hope, album_id 111) — versiones + card_sets. Solo photocards. Idempotente.
-- Nota: "USA EXCLUSIVE" y "KOREAN RETAILER POBs" en este template son postcards/stickers/tickets, no PC.

INSERT INTO public.album_versions (album_id, name, short_name, sort_order)
SELECT 111, v.name, v.short_name, v.sort_order
FROM (VALUES
  ('Prelude Ver.', 'PRELUDE', 1),
  ('Interlude Ver.', 'INTERLUDE', 2),
  ('Weverse Version', 'WV', 3),
  ('Neuron CD Single', 'NEURON', 4),
  ('Vinyl', 'VINYL', 5)
) AS v(name, short_name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.album_versions av WHERE av.album_id = 111 AND av.short_name = v.short_name);

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, country, sort_order, is_active)
SELECT 111, av.id, cc.id, v.name, v.short_name, v.description, v.retailer, v.country, v.sort_order, true
FROM (VALUES
  ('Prelude Ver. Album Photocards', 'HOTS-PRELUDE-PC', NULL, NULL, NULL, 'album_pc', 'PRELUDE', 1),
  ('Interlude Ver. Album Photocards', 'HOTS-INTERLUDE-PC', NULL, NULL, NULL, 'album_pc', 'INTERLUDE', 2),
  ('Vinyl Photocard', 'HOTS-VINYL-PC', NULL, NULL, NULL, 'vinyl_pc', 'VINYL', 3),

  ('Weverse Global Early Bird Transp. PC', 'HOTS-WVG-EARLYBIRD-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 10),
  ('Weverse Global WVG POB PCs', 'HOTS-WVG-POB-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 11),
  ('WVG Additional Special Gift PCs', 'HOTS-WVG-ADDGIFT-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 12),
  ('JPFC Holo PC w/ Mount', 'HOTS-JPFC-HOLO-MOUNT-PC', NULL, 'JPFC', 'JAPAN', 'pob', NULL, 13),
  ('UMS Holo PC', 'HOTS-UMS-HOLO-PC', NULL, 'UMS', 'JAPAN', 'pob', NULL, 14),
  ('UMS PC', 'HOTS-UMS-PC', NULL, 'UMS', 'JAPAN', 'pob', NULL, 15),

  ('Soundwave Lucky Draw (Korea)', 'HOTS-KR-SOUNDWAVE-LD', NULL, 'Soundwave', 'KOREA', 'lucky_draw', NULL, 20),
  ('M2U Lucky Draw (Korea)', 'HOTS-KR-M2U-LD', NULL, 'M2U', 'KOREA', 'lucky_draw', NULL, 21),
  ('Powerstation Lucky Draw (Korea)', 'HOTS-KR-POWERSTATION-LD', NULL, 'Powerstation', 'KOREA', 'lucky_draw', NULL, 22),
  ('JPFC Lucky Draw (Japan)', 'HOTS-JP-JPFC-LD', NULL, 'JPFC', 'JAPAN', 'lucky_draw', NULL, 23),
  ('UMS Lucky Draw (Japan)', 'HOTS-JP-UMS-LD', NULL, 'UMS', 'JAPAN', 'lucky_draw', NULL, 24),

  ('JPFC Memb. Exclusive PC (Raffle)', 'HOTS-JPFC-RAFFLE-PC', NULL, 'JPFC', 'JAPAN', 'exclusive', NULL, 30),
  ('Army Day Raffle PC', 'HOTS-ARMYDAY-RAFFLE-PC', NULL, NULL, 'KOREA', 'exclusive', NULL, 31),

  ('Pop-up Store Album Set Gift PC', 'HOTS-POPUP-ALBUMSET-PC', NULL, NULL, 'KOREA', 'event_pc', NULL, 40),

  ('Jacket PC', 'HOTS-MERCH-JACKET-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 50)
) AS v(name, short_name, description, retailer, country, category_short, version_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
LEFT JOIN public.album_versions av ON av.album_id = 111 AND av.short_name = v.version_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
