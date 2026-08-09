-- Right Place, Wrong Person (RM, album_id 104) — versiones + card_sets. Solo photocards. Idempotente.
-- Nota: en este template los ítems "Weverse Global POBs" principales son "Photo/Photos", no PC, así que se excluyen.

INSERT INTO public.album_versions (album_id, name, short_name, sort_order)
SELECT 104, v.name, v.short_name, v.sort_order
FROM (VALUES
  ('Ver. A', 'VERA', 1),
  ('Ver. B', 'VERB', 2),
  ('Ver. C', 'VERC', 3),
  ('Weverse Version', 'WV', 4),
  ('Vinyl', 'VINYL', 5),
  ('Come Back To Me CD Single', 'CBTM', 6),
  ('Lost! CD Single', 'LOST', 7)
) AS v(name, short_name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.album_versions av WHERE av.album_id = 104 AND av.short_name = v.short_name);

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, country, sort_order, is_active)
SELECT 104, av.id, cc.id, v.name, v.short_name, v.description, v.retailer, v.country, v.sort_order, true
FROM (VALUES
  ('Ver. A Photocards', 'RPWP-VERA-PC', NULL, NULL, NULL, 'album_pc', 'VERA', 1),
  ('Ver. B Photocards', 'RPWP-VERB-PC', NULL, NULL, NULL, 'album_pc', 'VERB', 2),
  ('Ver. C Photocards', 'RPWP-VERC-PC', NULL, NULL, NULL, 'album_pc', 'VERC', 3),
  ('Weverse Albums Ver. Photocards', 'RPWP-WV-PC', NULL, NULL, NULL, 'album_pc', 'WV', 4),
  ('Vinyl Photocards', 'RPWP-VINYL-PC', NULL, NULL, NULL, 'vinyl_pc', 'VINYL', 5),

  ('WVG Special Gift Additional PCs', 'RPWP-WVG-ADDGIFT-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 10),
  ('JPFC Holo PC w/ Mount', 'RPWP-JPFC-HOLO-MOUNT-PC', NULL, 'JPFC', 'JAPAN', 'pob', NULL, 11),
  ('UMS Holo PC', 'RPWP-UMS-HOLO-PC', NULL, 'UMS', 'JAPAN', 'pob', NULL, 12),
  ('UMS PC', 'RPWP-UMS-PC', NULL, 'UMS', 'JAPAN', 'pob', NULL, 13),

  ('WV USA PC', 'RPWP-WVUSA-PC', NULL, 'Weverse USA', 'USA', 'exclusive', NULL, 20),
  ('Target PC', 'RPWP-TARGET-PC', NULL, 'Target', 'USA', 'exclusive', NULL, 21),
  ('Walmart PC', 'RPWP-WALMART-PC', NULL, 'Walmart', 'USA', 'exclusive', NULL, 22),
  ('Barnes & Noble PC', 'RPWP-BN-PC', NULL, 'Barnes & Noble', 'USA', 'exclusive', NULL, 23),
  ('Indie Store PC', 'RPWP-INDIESTORE-PC', NULL, 'Indie Store', 'USA', 'exclusive', NULL, 24),
  ('Weverse Raffle PC', 'RPWP-WEVERSE-RAFFLE-PC', NULL, 'Weverse', 'GLOBAL', 'exclusive', NULL, 25),

  ('Soundwave Lucky Draw (Korea)', 'RPWP-KR-SOUNDWAVE-LD', NULL, 'Soundwave', 'KOREA', 'lucky_draw', NULL, 30),
  ('Musicart Lucky Draw (Korea)', 'RPWP-KR-MUSICART-LD', NULL, 'Musicart', 'KOREA', 'lucky_draw', NULL, 31),
  ('Powerstation Lucky Draw (Korea)', 'RPWP-KR-POWERSTATION-LD', NULL, 'Powerstation', 'KOREA', 'lucky_draw', NULL, 32),
  ('JPFC Lucky Draw (Japan)', 'RPWP-JP-JPFC-LD', NULL, 'JPFC', 'JAPAN', 'lucky_draw', NULL, 33),
  ('UMS Lucky Draw (Japan)', 'RPWP-JP-UMS-LD', NULL, 'UMS', 'JAPAN', 'lucky_draw', NULL, 34),

  ('Hoodie PC', 'RPWP-MERCH-HOODIE-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 40),

  ('RPWP Documentary Korea Week 1 PC & Ticket Holder Set', 'RPWP-DOC-KR-WK1-PC', NULL, NULL, 'KOREA', 'event_pc', NULL, 50),
  ('RPWP Documentary Japan Cheki Cards (Popcorn Bag)', 'RPWP-DOC-JP-CHEKI-PC', NULL, NULL, 'JAPAN', 'event_pc', NULL, 51),
  ('RPWP Documentary Japan Week 3 Photocards', 'RPWP-DOC-JP-WK3-PC', NULL, NULL, 'JAPAN', 'event_pc', NULL, 52),
  ('RPWP Documentary Japan Final Week Clear PCs', 'RPWP-DOC-JP-FINALWK-PC', NULL, NULL, 'JAPAN', 'event_pc', NULL, 53),
  ('RPWP Documentary Other Countries Photocards', 'RPWP-DOC-OC-PC', NULL, NULL, 'OTHER', 'event_pc', NULL, 54)
) AS v(name, short_name, description, retailer, country, category_short, version_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
LEFT JOIN public.album_versions av ON av.album_id = 104 AND av.short_name = v.version_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
