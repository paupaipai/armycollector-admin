-- ARIRANG (BTS grupal, album_id 3) — página "8) GROUP - ARIRANG" (Group/Units).
-- El álbum ya tenía 39 card_sets y 282 cards de templates anteriores. De esta página,
-- solo "Weverse USA" y "BTS US Store" (Exclusive PCs) son nuevos: el resto (Weverse Albums Ver. PCs,
-- WV Global Early Bird Selfie PCs, WV Japan Set Benefit PC) ya existía con otro nombre. Idempotente.

INSERT INTO public.card_sets (album_id, version_id, category_id, name, short_name, description, retailer, country, sort_order, is_active)
SELECT 3, NULL, cc.id, v.name, v.short_name, v.description, v.retailer, v.country, v.sort_order, true
FROM (VALUES
  ('Weverse USA Exclusive PC', 'ARIRANG_WEVERSE_USA_EXCLUSIVE', NULL, 'Weverse USA', 'USA', 'exclusive', 150),
  ('BTS US Store Exclusive PC', 'ARIRANG_BTS_US_STORE_EXCLUSIVE', NULL, 'BTS US Store', 'USA', 'exclusive', 151)
) AS v(name, short_name, description, retailer, country, category_short, sort_order)
JOIN public.card_categories cc ON cc.short_name = v.category_short
WHERE NOT EXISTS (SELECT 1 FROM public.card_sets cs WHERE cs.short_name = v.short_name);
