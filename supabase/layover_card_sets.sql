-- Layover (V, album_id 110) — versiones + card_sets desde el template. Solo photocards. Idempotente.

INSERT INTO public.album_versions (album_id, name, short_name, sort_order)
SELECT 110, v.name, v.short_name, v.sort_order
FROM (VALUES
  ('Ver. 1 (Green)', 'V1', 1),
  ('Ver. 2 (Blue)', 'V2', 2),
  ('Ver. 3 (Purple)', 'V3', 3),
  ('Capsule Album', 'CA', 4),
  ('Weverse Version', 'WV', 5),
  ('Slow Dancing CD Single', 'SDCD', 6),
  ('Vinyl', 'VINYL', 7)
) AS v(name, short_name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.album_versions av WHERE av.album_id = 110 AND av.short_name = v.short_name);

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, country, sort_order, is_active)
SELECT 110, av.id, cc.id, v.name, v.short_name, v.description, v.retailer, v.country, v.sort_order, true
FROM (VALUES
  ('Ver. 1 (Green) Album Photocards', 'LAYOVER-V1-PC', NULL, NULL, NULL, 'album_pc', 'V1', 1),
  ('Ver. 2 (Blue) Album Photocards', 'LAYOVER-V2-PC', NULL, NULL, NULL, 'album_pc', 'V2', 2),
  ('Ver. 3 (Purple) Album Photocards', 'LAYOVER-V3-PC', NULL, NULL, NULL, 'album_pc', 'V3', 3),
  ('Weverse Albums Ver. Photocards', 'LAYOVER-WV-PC', NULL, NULL, NULL, 'album_pc', 'WV', 4),
  ('Vinyl Photocards', 'LAYOVER-VINYL-PC', NULL, NULL, NULL, 'vinyl_pc', 'VINYL', 5),
  ('Capsule Album PC', 'LAYOVER-CA-PC', NULL, NULL, NULL, 'album_pc', 'CA', 6),

  ('Capsule Album WVG Gift PC', 'LAYOVER-CA-WVG-GIFT-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', 'CA', 10),
  ('Capsule Album Merch Package PC', 'LAYOVER-CA-MERCH-PKG-PC', NULL, NULL, 'GLOBAL', 'pob', 'CA', 11),
  ('Weverse Global Early Bird Transp. PVC PC', 'LAYOVER-WVG-EARLYBIRD-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 12),
  ('Weverse Global WVG POB PC', 'LAYOVER-WVG-POB-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 13),
  ('WVG Additional Gift PVC PCs', 'LAYOVER-WVG-ADDGIFT-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 14),
  ('JPFC Holo PC w/ Mount', 'LAYOVER-JPFC-HOLO-MOUNT-PC', NULL, 'JPFC', 'JAPAN', 'pob', NULL, 15),
  ('JPFC Holo PC', 'LAYOVER-JPFC-HOLO-PC', NULL, 'JPFC', 'JAPAN', 'pob', NULL, 16),
  ('UMS PC', 'LAYOVER-UMS-PC', NULL, 'UMS', 'JAPAN', 'pob', NULL, 17),

  ('WV USA PC', 'LAYOVER-WVUSA-PC', NULL, 'Weverse USA', 'USA', 'exclusive', NULL, 20),
  ('Target PC', 'LAYOVER-TARGET-PC', NULL, 'Target', 'USA', 'exclusive', NULL, 21),
  ('Walmart PC', 'LAYOVER-WALMART-PC', NULL, 'Walmart', 'USA', 'exclusive', NULL, 22),
  ('Barnes & Noble PC', 'LAYOVER-BN-PC', NULL, 'Barnes & Noble', 'USA', 'exclusive', NULL, 23),
  ('Inkigayo Broadcast PCs', 'LAYOVER-INKIGAYO-PC', NULL, NULL, 'KOREA', 'exclusive', NULL, 24),

  ('Soundwave Lucky Draw (Korea)', 'LAYOVER-KR-SOUNDWAVE-LD', NULL, 'Soundwave', 'KOREA', 'lucky_draw', NULL, 30),
  ('M2U Lucky Draw (Korea)', 'LAYOVER-KR-M2U-LD', NULL, 'M2U', 'KOREA', 'lucky_draw', NULL, 31),
  ('Powerstation Lucky Draw (Korea)', 'LAYOVER-KR-POWERSTATION-LD', NULL, 'Powerstation', 'KOREA', 'lucky_draw', NULL, 32),
  ('JPFC Lucky Draw (Japan)', 'LAYOVER-JP-JPFC-LD', NULL, 'JPFC', 'JAPAN', 'lucky_draw', NULL, 33),
  ('UMS Lucky Draw (Japan)', 'LAYOVER-JP-UMS-LD', NULL, 'UMS', 'JAPAN', 'lucky_draw', NULL, 34),

  ('Orange Tan T-Shirt PC', 'LAYOVER-TSHIRT-ORANGE-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 40),
  ('Gray Tan T-Shirt PC', 'LAYOVER-TSHIRT-GRAY-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 41),
  ('Line Music PC', 'LAYOVER-LINEMUSIC-PC', NULL, 'Line Music', 'KOREA', 'merch_pc', NULL, 42)
) AS v(name, short_name, description, retailer, country, category_short, version_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
LEFT JOIN public.album_versions av ON av.album_id = 110 AND av.short_name = v.version_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
