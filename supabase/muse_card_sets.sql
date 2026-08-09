-- MUSE (Jimin, album_id 101) — versiones + card_sets desde el template. Solo photocards. Idempotente.

INSERT INTO public.album_versions (album_id, name, short_name, sort_order)
SELECT 101, v.name, v.short_name, v.sort_order
FROM (VALUES
  ('Blooming Ver.', 'BLOOMING', 1),
  ('Serenade Ver.', 'SERENADE', 2),
  ('Weverse Version', 'WV', 3),
  ('Who CD Single', 'WHOCDS', 4),
  ('Vinyl', 'VINYL', 5)
) AS v(name, short_name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.album_versions av WHERE av.album_id = 101 AND av.short_name = v.short_name);

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, country, sort_order, is_active)
SELECT 101, av.id, cc.id, v.name, v.short_name, v.description, v.retailer, v.country, v.sort_order, true
FROM (VALUES
  ('Blooming Ver. Photocards', 'MUSE-BLOOMING-PC', NULL, NULL, NULL, 'album_pc', 'BLOOMING', 1),
  ('Serenade Ver. Photocards', 'MUSE-SERENADE-PC', NULL, NULL, NULL, 'album_pc', 'SERENADE', 2),
  ('Weverse Albums Ver. Photocards', 'MUSE-WV-PC', NULL, NULL, NULL, 'album_pc', 'WV', 3),
  ('Vinyl PC', 'MUSE-VINYL-PC', NULL, NULL, NULL, 'vinyl_pc', 'VINYL', 4),

  ('Weverse Global Early Bird Gift PCs', 'MUSE-WVG-EARLYBIRD-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 10),
  ('Weverse Global WVG POB PCs', 'MUSE-WVG-POB-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 11),
  ('Weverse Global WVG Additional Special Gift PCs', 'MUSE-WVG-ADDGIFT-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 12),
  ('The Truth Untold Special Event PCs', 'MUSE-TTU-EVENT-PC', NULL, 'Weverse Global', 'GLOBAL', 'pob', NULL, 13),
  ('Kakaotalk PC', 'MUSE-KAKAO-PC', NULL, 'Kakao', 'KOREA', 'pob', NULL, 14),
  ('JPFC Holo PC w/ Stand', 'MUSE-JPFC-HOLO-STAND-PC', NULL, 'JPFC', 'JAPAN', 'pob', NULL, 15),
  ('JPFC Clear Holo PC', 'MUSE-JPFC-CLEARHOLO-PC', NULL, 'JPFC', 'JAPAN', 'pob', NULL, 16),
  ('UMS PC', 'MUSE-UMS-PC', NULL, 'UMS', 'JAPAN', 'pob', NULL, 17),

  ('WV USA PCs', 'MUSE-WVUSA-PC', NULL, 'Weverse USA', 'USA', 'exclusive', NULL, 20),
  ('Target PCs', 'MUSE-TARGET-PC', NULL, 'Target', 'USA', 'exclusive', NULL, 21),
  ('Walmart PCs', 'MUSE-WALMART-PC', NULL, 'Walmart', 'USA', 'exclusive', NULL, 22),
  ('Barnes & Noble PCs', 'MUSE-BN-PC', NULL, 'Barnes & Noble', 'USA', 'exclusive', NULL, 23),
  ('JPFC Memb. Exclusive PC', 'MUSE-JPFC-EXCLUSIVE-PC', NULL, 'JPFC', 'JAPAN', 'exclusive', NULL, 24),
  ('Closer Than This Raffle PCs', 'MUSE-RAFFLE-CLOSERTHANTHIS-PC', NULL, 'Weverse Raffle', 'GLOBAL', 'exclusive', NULL, 25),

  ('Weverse Lucky Draw (Korea)', 'MUSE-KR-WEVERSE-LD', NULL, 'Weverse', 'KOREA', 'lucky_draw', NULL, 30),
  ('Soundwave Lucky Draw (Korea)', 'MUSE-KR-SOUNDWAVE-LD', NULL, 'Soundwave', 'KOREA', 'lucky_draw', NULL, 31),
  ('Makestar Lucky Draw (Korea)', 'MUSE-KR-MAKESTAR-LD', NULL, 'Makestar', 'KOREA', 'lucky_draw', NULL, 32),
  ('Powerstation Lucky Draw (Korea)', 'MUSE-KR-POWERSTATION-LD', NULL, 'Powerstation', 'KOREA', 'lucky_draw', NULL, 33),
  ('JPFC Lucky Draw (Japan)', 'MUSE-JP-JPFC-LD', NULL, 'JPFC', 'JAPAN', 'lucky_draw', NULL, 34),
  ('UMS Lucky Draw (Japan)', 'MUSE-JP-UMS-LD', NULL, 'UMS', 'JAPAN', 'lucky_draw', NULL, 35),

  ('Collar Shirt PC', 'MUSE-MERCH-COLLARSHIRT-PC', NULL, NULL, 'GLOBAL', 'merch_pc', NULL, 40),

  ('Pop-up Store Army Day PC', 'MUSE-POPUP-ARMYDAY-PC', NULL, NULL, 'KOREA', 'event_pc', NULL, 50),
  ('The Truth Untold Exhibition Photocard Set', 'MUSE-TTU-PC-SET', 'Set principal de photocards de la exhibición', NULL, 'GLOBAL', 'event_pc', NULL, 51)
) AS v(name, short_name, description, retailer, country, category_short, version_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
LEFT JOIN public.album_versions av ON av.album_id = 101 AND av.short_name = v.version_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
