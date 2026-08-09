-- The Astronaut (Jin, album_id 107) — versiones + card_sets desde el template. Solo photocards. Idempotente.

INSERT INTO public.album_versions (album_id, name, short_name, sort_order)
SELECT 107, v.name, v.short_name, v.sort_order
FROM (VALUES
  ('Version 01', 'V1', 1),
  ('Version 02', 'V2', 2)
) AS v(name, short_name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.album_versions av WHERE av.album_id = 107 AND av.short_name = v.short_name);

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, country, sort_order, is_active)
SELECT 107, av.id, cc.id, v.name, v.short_name, v.description, v.retailer, v.country, v.sort_order, true
FROM (VALUES
  ('Version 01 Random PCs', 'ASTRO-V1-RANDOM-PC', NULL, NULL, NULL, 'album_pc', 'V1', 1),
  ('Version 02 Random PCs', 'ASTRO-V2-RANDOM-PC', NULL, NULL, NULL, 'album_pc', 'V2', 2),

  ('Weverse Global PC', 'ASTRO-WVG-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 10),
  ('JPFC Holo PCs', 'ASTRO-JPFC-HOLO-PC', NULL, 'JPFC', 'JAPAN', 'pob', NULL, 11),
  ('UMS PC', 'ASTRO-UMS-PC', NULL, 'UMS', 'JAPAN', 'pob', NULL, 12),

  ('WV USA PC', 'ASTRO-WVUSA-PC', NULL, 'Weverse USA', 'USA', 'exclusive', NULL, 20),

  ('Soundwave Lucky Draw (Korea)', 'ASTRO-KR-SOUNDWAVE-LD', NULL, 'Soundwave', 'KOREA', 'lucky_draw', NULL, 30),
  ('M2U Lucky Draw (Korea)', 'ASTRO-KR-M2U-LD', NULL, 'M2U', 'KOREA', 'lucky_draw', NULL, 31),
  ('Powerstation Lucky Draw (Korea)', 'ASTRO-KR-POWERSTATION-LD', NULL, 'Powerstation', 'KOREA', 'lucky_draw', NULL, 32),
  ('JPFC Lucky Draw (Japan)', 'ASTRO-JP-JPFC-LD', NULL, 'JPFC', 'JAPAN', 'lucky_draw', NULL, 33),
  ('UMS Lucky Draw (Japan)', 'ASTRO-JP-UMS-LD', NULL, 'UMS', 'JAPAN', 'lucky_draw', NULL, 34),

  ('ID Card Holder PCs', 'ASTRO-MERCH-IDHOLDER-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 40)
) AS v(name, short_name, description, retailer, country, category_short, version_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
LEFT JOIN public.album_versions av ON av.album_id = 107 AND av.short_name = v.version_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
