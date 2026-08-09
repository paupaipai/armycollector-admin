-- ECHO (Jin, album_id 109) — versiones + card_sets desde el template. Solo photocards. Idempotente.

INSERT INTO public.album_versions (album_id, name, short_name, sort_order)
SELECT 109, v.name, v.short_name, v.sort_order
FROM (VALUES
  ('ECHO (I)', 'ECHO1', 1),
  ('ECHO (II)', 'ECHO2', 2),
  ('ECHO (III)', 'ECHO3', 3),
  ('Weverse Version', 'WV', 4),
  ('Don''t Say You Love Me CD Single', 'CDS', 5),
  ('Don''t Say You Love Me CD Single + Instrumental', 'CDS_INST', 6)
) AS v(name, short_name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.album_versions av WHERE av.album_id = 109 AND av.short_name = v.short_name);

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, country, sort_order, is_active)
SELECT 109, av.id, cc.id, v.name, v.short_name, v.description, v.retailer, v.country, v.sort_order, true
FROM (VALUES
  ('ECHO (I) Album Photocards', 'ECHO-I-PC', NULL, NULL, NULL, 'album_pc', 'ECHO1', 1),
  ('ECHO (II) Album Photocards', 'ECHO-II-PC', NULL, NULL, NULL, 'album_pc', 'ECHO2', 2),
  ('ECHO (III) Album Photocards', 'ECHO-III-PC', NULL, NULL, NULL, 'album_pc', 'ECHO3', 3),
  ('Weverse Albums Ver. Photocards', 'ECHO-WV-PC', NULL, NULL, NULL, 'album_pc', 'WV', 4),

  ('Weverse Global Early Bird Gift PCs', 'ECHO-WVG-EARLYBIRD-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 10),
  ('Weverse Global WVG POB PCs', 'ECHO-WVG-POB-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 11),
  ('Weverse Global WVG Additional Special Gift PCs', 'ECHO-WVG-ADDGIFT-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 12),
  ('Kakao PC', 'ECHO-KAKAO-PC', NULL, 'Kakao', 'KOREA', 'pob', NULL, 13),
  ('YES24 Bday PC', 'ECHO-YES24-PC', NULL, 'YES24', 'KOREA', 'pob', NULL, 14),
  ('Aladin Holo PC', 'ECHO-ALADIN-PC', NULL, 'Aladin', 'KOREA', 'pob', NULL, 15),
  ('Mu.Plant PC', 'ECHO-MUPLANT-PC', NULL, 'Music Plant', 'KOREA', 'pob', NULL, 16),
  ('Soundwave PC', 'ECHO-SOUNDWAVE-PC', NULL, 'Soundwave', 'KOREA', 'pob', NULL, 17),
  ('WVJ PC w/ Mount', 'ECHO-WVJ-PC-MOUNT', NULL, 'Weverse Japan', 'JAPAN', 'pob', NULL, 18),
  ('UMS PC', 'ECHO-UMS-PC', NULL, 'UMS', 'JAPAN', 'pob', NULL, 19),

  ('WV USA PCs', 'ECHO-WVUSA-PC', NULL, 'Weverse USA', 'USA', 'exclusive', NULL, 20),
  ('Target PCs', 'ECHO-TARGET-PC', NULL, 'Target', 'USA', 'exclusive', NULL, 21),
  ('Walmart PCs', 'ECHO-WALMART-PC', NULL, 'Walmart', 'USA', 'exclusive', NULL, 22),
  ('Barnes & Noble PCs', 'ECHO-BN-PC', NULL, 'Barnes & Noble', 'USA', 'exclusive', NULL, 23),
  ('Army Found Echo PC', 'ECHO-ARMYFOUND-PC', 'Regalo del pop-up Army Found', 'Army Found', 'KOREA', 'exclusive', NULL, 24),
  ('Seongsu Event PC', 'ECHO-SEONGSU-PC', 'Regalo del evento pop-up en Seongsu', 'Seongsu Pop-up', 'KOREA', 'exclusive', NULL, 25),

  ('Weverse Global Lucky Draw (Korea)', 'ECHO-KR-WVG-LD', NULL, 'Weverse Global', 'KOREA', 'lucky_draw', NULL, 30),
  ('Beatroad Lucky Draw (Korea)', 'ECHO-KR-BEATROAD-LD', NULL, 'Beatroad', 'KOREA', 'lucky_draw', NULL, 31),
  ('Music Korea Lucky Draw (Korea)', 'ECHO-KR-MUSICKOREA-LD', NULL, 'Music Korea', 'KOREA', 'lucky_draw', NULL, 32),
  ('Powerstation Lucky Draw (Korea)', 'ECHO-KR-POWERSTATION-LD', NULL, 'Powerstation', 'KOREA', 'lucky_draw', NULL, 33),
  ('Weverse Japan Lucky Draw', 'ECHO-JP-WVJ-LD', NULL, 'Weverse Japan', 'JAPAN', 'lucky_draw', NULL, 34),
  ('UMS Lucky Draw (Japan)', 'ECHO-JP-UMS-LD', NULL, 'UMS', 'JAPAN', 'lucky_draw', NULL, 35),

  ('Shirt PC', 'ECHO-MERCH-SHIRT-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 40),
  ('Magnet PC', 'ECHO-MERCH-MAGNET-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 41),
  ('ID Photo Holder & PC', 'ECHO-MERCH-IDHOLDER-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 42),
  ('DSYLM Line Music PC', 'ECHO-LINEMUSIC-PC', 'PC de Line Music, Don''t Say You Love Me', 'Line Music', 'KOREA', 'merch_pc', NULL, 43)
) AS v(name, short_name, description, retailer, country, category_short, version_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
LEFT JOIN public.album_versions av ON av.album_id = 109 AND av.short_name = v.version_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
