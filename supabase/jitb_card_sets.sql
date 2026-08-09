-- JACK IN THE BOX (j-hope, album_id 113) — versiones + card_sets. Solo photocards. Idempotente.

INSERT INTO public.album_versions (album_id, name, short_name, sort_order)
SELECT 113, v.name, v.short_name, v.sort_order
FROM (VALUES
  ('Weverse Albums Ver.', 'WV', 1),
  ('Hope Edition', 'HOPE', 2),
  ('Vinyl', 'VINYL', 3),
  ('Capsule Album', 'CA', 4)
) AS v(name, short_name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.album_versions av WHERE av.album_id = 113 AND av.short_name = v.short_name);

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, country, sort_order, is_active)
SELECT 113, av.id, cc.id, v.name, v.short_name, v.description, v.retailer, v.country, v.sort_order, true
FROM (VALUES
  ('Weverse Albums Ver. Standard PC', 'JITB-WV-STANDARD-PC', NULL, NULL, NULL, 'album_pc', 'WV', 1),
  ('Weverse Albums Ver. Random PCs', 'JITB-WV-RANDOM-PC', NULL, NULL, NULL, 'album_pc', 'WV', 2),
  ('Capsule Album PC', 'JITB-CA-PC', NULL, NULL, NULL, 'album_pc', 'CA', 3),
  ('Hope Edition Random PCs', 'JITB-HOPE-RANDOM-PC', NULL, NULL, NULL, 'album_pc', 'HOPE', 4),
  ('Vinyl PC', 'JITB-VINYL-PC', NULL, NULL, NULL, 'vinyl_pc', 'VINYL', 5),

  ('WVG Early Bird Holo PC (WV Albums)', 'JITB-WVG-HOLO-PC-WV', NULL, 'Weverse Global', 'GLOBAL', 'pob', 'WV', 10),
  ('WVG Early Bird Transp. PVC PC (Hope Ed.)', 'JITB-WVG-PVC-PC-HOPE', NULL, 'Weverse Global', 'GLOBAL', 'pob', 'HOPE', 11),
  ('WVG Early Bird Transp. PVC PC (WV Albums)', 'JITB-WVG-PVC-PC-WV', NULL, 'Weverse Global', 'GLOBAL', 'pob', 'WV', 12),
  ('Weverse Global POB PC (Hope Ed.)', 'JITB-WVG-POB-PC-HOPE', NULL, 'Weverse Global', 'GLOBAL', 'pob', 'HOPE', 13),
  ('Capsule Album WVG Gift PC', 'JITB-CA-WVG-GIFT-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', 'CA', 14),
  ('Capsule Album Merch Package PC', 'JITB-CA-MERCH-PKG-PC', NULL, NULL, 'GLOBAL', 'pob', 'CA', 15),

  ('USA Exclusive PC (Hope Ed.)', 'JITB-USA-EXCLUSIVE-PC', NULL, NULL, 'USA', 'exclusive', 'HOPE', 20),

  ('HYBE Insight Lucky Draw (WV Albums)', 'JITB-HYBEINSIGHT-LD', NULL, 'HYBE Insight', 'GLOBAL', 'lucky_draw', 'WV', 30),
  ('Soundwave Lucky Draw (Hope Ed., Korea)', 'JITB-KR-SOUNDWAVE-LD', NULL, 'Soundwave', 'KOREA', 'lucky_draw', 'HOPE', 31),
  ('M2U Lucky Draw (Hope Ed., Korea)', 'JITB-KR-M2U-LD', NULL, 'M2U', 'KOREA', 'lucky_draw', 'HOPE', 32),
  ('Powerstation Lucky Draw (Hope Ed., Korea)', 'JITB-KR-POWERSTATION-LD', NULL, 'Powerstation', 'KOREA', 'lucky_draw', 'HOPE', 33),
  ('JPFC Lucky Draw (Japan)', 'JITB-JP-JPFC-LD', NULL, 'JPFC', 'JAPAN', 'lucky_draw', NULL, 34),
  ('UMS Lucky Draw (Japan)', 'JITB-JP-UMS-LD', NULL, 'UMS', 'JAPAN', 'lucky_draw', NULL, 35),

  ('Hope In The Box PCs', 'JITB-MERCH-HOPEBOX-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 40),

  ('JITB Documentary VOD PC', 'JITB-DOC-VOD-PC', 'j-hope IN THE BOX, documental VOD', NULL, 'GLOBAL', 'event_pc', NULL, 50),
  ('JITB Korea Hologram PC', 'JITB-DOC-KR-HOLOGRAM-PC', NULL, NULL, 'KOREA', 'event_pc', NULL, 51),
  ('JITB Korea Lotte Cinema PC', 'JITB-DOC-KR-LOTTE-PC', NULL, 'Lotte Cinema', 'KOREA', 'event_pc', NULL, 52),
  ('JITB Japan Photocards', 'JITB-DOC-JP-PC', NULL, NULL, 'JAPAN', 'event_pc', NULL, 53),
  ('JITB Japan 2-Visual PC', 'JITB-DOC-JP-2VISUAL-PC', NULL, NULL, 'JAPAN', 'event_pc', NULL, 54)
) AS v(name, short_name, description, retailer, country, category_short, version_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
LEFT JOIN public.album_versions av ON av.album_id = 113 AND av.short_name = v.version_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
