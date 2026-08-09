-- HAPPY (Jin, album_id 106) — versiones + card_sets desde el template. Solo photocards. Idempotente.

INSERT INTO public.album_versions (album_id, name, short_name, sort_order)
SELECT 106, v.name, v.short_name, v.sort_order
FROM (VALUES
  ('Journey Ver.', 'JOURNEY', 1),
  ('Imagine Ver.', 'IMAGINE', 2),
  ('Navigate Ver.', 'NAVIGATE', 3),
  ('Weverse Version', 'WV', 4),
  ('Vinyl', 'VINYL', 5),
  ('I''ll Be There CD Single', 'IBT', 6),
  ('Running Wild CD Single', 'RW', 7),
  ('Running Wild Instrumental CD Single', 'RW_INST', 8),
  ('Capsule Album', 'CA', 9)
) AS v(name, short_name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.album_versions av WHERE av.album_id = 106 AND av.short_name = v.short_name);

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, country, draw_type, sort_order, is_active)
SELECT 106, av.id, cc.id, v.name, v.short_name, v.description, v.retailer, v.country, v.draw_type, v.sort_order, true
FROM (VALUES
  ('Journey Ver. Regular Album PCs', 'HAPPY-JOURNEY-PC', NULL, NULL, NULL, NULL, 'album_pc', 'JOURNEY', 1),
  ('Weverse Albums Ver. PC', 'HAPPY-WV-PC', NULL, NULL, NULL, NULL, 'album_pc', 'WV', 2),
  ('Imagine Ver. Regular Album PCs', 'HAPPY-IMAGINE-PC', NULL, NULL, NULL, NULL, 'album_pc', 'IMAGINE', 3),
  ('Navigate Ver. Regular Album PCs', 'HAPPY-NAVIGATE-PC', NULL, NULL, NULL, NULL, 'album_pc', 'NAVIGATE', 4),
  ('Capsule Album PC', 'HAPPY-CA-PC', NULL, NULL, NULL, NULL, 'album_pc', 'CA', 5),
  ('Vinyl PC', 'HAPPY-VINYL-PC', NULL, NULL, NULL, NULL, 'vinyl_pc', 'VINYL', 6),

  ('Capsule Album WVG Gift PC', 'HAPPY-CA-WVG-GIFT-PC', NULL, 'Weverse Global', 'GLOBAL', NULL, 'pob', 'CA', 10),
  ('Capsule Album Merch Package PC', 'HAPPY-CA-MERCH-PKG-PC', NULL, NULL, 'GLOBAL', NULL, 'pob', 'CA', 11),
  ('Weverse Global Early Bird Gift PVC PCs', 'HAPPY-WVG-EARLYBIRD-PC', NULL, 'Weverse Global', 'GLOBAL', NULL, 'pob', NULL, 12),
  ('Weverse Global WVG POB PCs', 'HAPPY-WVG-POB-PC', NULL, 'Weverse Global', 'GLOBAL', NULL, 'pob', NULL, 13),
  ('Weverse Global WVG Additional Special Gift PCs', 'HAPPY-WVG-ADDGIFT-PC', NULL, 'Weverse Global', 'GLOBAL', NULL, 'pob', NULL, 14),
  ('Kakao Talk PC', 'HAPPY-KAKAO-PC', NULL, 'Kakao Talk', 'KOREA', NULL, 'pob', NULL, 15),
  ('YES24 PC', 'HAPPY-YES24-PC', NULL, 'YES24', 'KOREA', NULL, 'pob', NULL, 16),
  ('Aladin PC', 'HAPPY-ALADIN-PC', NULL, 'Aladin', 'KOREA', NULL, 'pob', NULL, 17),
  ('Ktown4u PC', 'HAPPY-KTOWN4U-PC', NULL, 'Ktown4u', 'KOREA', NULL, 'pob', NULL, 18),
  ('Makestar PC', 'HAPPY-MAKESTAR-PC', NULL, 'Makestar', 'KOREA', NULL, 'pob', NULL, 19),
  ('Music Plant PC', 'HAPPY-MUSICPLANT-PC', NULL, 'Music Plant', 'KOREA', NULL, 'pob', NULL, 20),
  ('Music Korea PC', 'HAPPY-MUSICKOREA-PC', NULL, 'Music Korea', 'KOREA', NULL, 'pob', NULL, 21),
  ('JPFC Holo PC w/ Stand', 'HAPPY-JPFC-HOLO-STAND-PC', NULL, 'JPFC', 'JAPAN', NULL, 'pob', NULL, 22),
  ('UMS Holo PC', 'HAPPY-UMS-HOLO-PC', NULL, 'UMS', 'JAPAN', NULL, 'pob', NULL, 23),
  ('UMS PC', 'HAPPY-UMS-PC', NULL, 'UMS', 'JAPAN', NULL, 'pob', NULL, 24),

  ('WV USA PCs', 'HAPPY-WVUSA-PC', NULL, 'Weverse USA', 'USA', NULL, 'exclusive', NULL, 30),
  ('Walmart PCs', 'HAPPY-WALMART-PC', NULL, 'Walmart', 'USA', NULL, 'exclusive', NULL, 31),
  ('Target PCs', 'HAPPY-TARGET-PC', NULL, 'Target', 'USA', NULL, 'exclusive', NULL, 32),
  ('Barnes & Noble PCs', 'HAPPY-BN-PC', NULL, 'Barnes & Noble', 'USA', NULL, 'exclusive', NULL, 33),
  ('JPFC Memb. Exclusive PC', 'HAPPY-JPFC-EXCLUSIVE-PC', NULL, 'JPFC', 'JAPAN', NULL, 'exclusive', NULL, 34),
  ('Happy Days With Jin PC & Letter', 'HAPPY-DAYS-WITHJIN-PC', NULL, 'Weverse', 'GLOBAL', NULL, 'exclusive', NULL, 35),

  ('Weverse Shop Lucky Draw (Korea)', 'HAPPY-KR-WVSHOP-LD', NULL, 'Weverse Shop', 'KOREA', NULL, 'lucky_draw', NULL, 40),
  ('Withmuu Lucky Draw (Korea)', 'HAPPY-KR-WITHMUU-LD', NULL, 'Withmuu', 'KOREA', NULL, 'lucky_draw', NULL, 41),
  ('Musicart Lucky Draw (Korea)', 'HAPPY-KR-MUSICART-LD', NULL, 'Musicart', 'KOREA', NULL, 'lucky_draw', NULL, 42),
  ('Powerstation Lucky Draw (Korea)', 'HAPPY-KR-POWERSTATION-LD', NULL, 'Powerstation', 'KOREA', NULL, 'lucky_draw', NULL, 43),
  ('JPFC Lucky Draw (Japan)', 'HAPPY-JP-JPFC-LD', NULL, 'JPFC', 'JAPAN', NULL, 'lucky_draw', NULL, 44),
  ('UMS Lucky Draw (Japan)', 'HAPPY-JP-UMS-LD', NULL, 'UMS', 'JAPAN', NULL, 'lucky_draw', NULL, 45),
  ('Special Stage Offline LDs', 'HAPPY-STAGE-OFFLINE-LD', 'Showcase Albums, Weverse gifts, retiro on-site', NULL, 'KOREA', 'OFFLINE', 'lucky_draw', NULL, 46),
  ('Special Stage Online LDs', 'HAPPY-STAGE-ONLINE-LD', 'Showcase Albums, Weverse gifts, compra online', NULL, 'KOREA', 'ONLINE', 'lucky_draw', NULL, 47),

  ('Special Stage Attendee Benefit PC', 'HAPPY-STAGE-ATTENDEE-PC', 'Happy Special Stage, beneficio por asistencia', NULL, 'KOREA', NULL, 'tour', NULL, 50),

  ('I''ll Be There Line Music PC', 'HAPPY-IBT-LINEMUSIC-PC', NULL, 'Line Music', 'KOREA', NULL, 'merch_pc', NULL, 60),
  ('Running Wild Line Music PC', 'HAPPY-RW-LINEMUSIC-PC', NULL, 'Line Music', 'KOREA', NULL, 'merch_pc', NULL, 61),
  ('Robe PC', 'HAPPY-MERCH-ROBE-PC', NULL, NULL, 'GLOBAL', NULL, 'merch_pc', NULL, 62),

  ('Pop-up Store Exclusive PCs', 'HAPPY-POPUP-EXCLUSIVE-PC', NULL, NULL, 'KOREA', NULL, 'event_pc', NULL, 63),
  ('Army Day PC', 'HAPPY-ARMYDAY-PC', NULL, NULL, 'KOREA', NULL, 'event_pc', NULL, 64)
) AS v(name, short_name, description, retailer, country, draw_type, category_short, version_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
LEFT JOIN public.album_versions av ON av.album_id = 106 AND av.short_name = v.version_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
