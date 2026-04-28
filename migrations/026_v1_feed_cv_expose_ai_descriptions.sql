-- 026_v1_feed_cv_expose_ai_descriptions.sql
--
-- Adds the ai_descriptions JSONB column to the v1_feed_cv view so the
-- frontend SDK can read it without bypassing the view contract. The
-- backing column was added by migration 025; this migration makes it
-- visible to anon/authenticated readers via the existing view.
--
-- The view body is otherwise identical to migration 010 — only the
-- column list grows by one entry. CREATE OR REPLACE preserves grants.

CREATE OR REPLACE VIEW public.v1_feed_cv AS
SELECT id,
  source_id,
  source_url,
  title,
  description,
  ai_descriptions,
  price,
  currency,
  country,
  region,
  island,
  city,
  bedrooms,
  bathrooms,
  property_size_sqm,
  land_area_sqm,
  image_urls,
  status,
  created_at,
  updated_at,
  approved,
  violations,
  area_sqm,
  latitude,
  longitude,
  has_valid_images,
  property_type,
  amenities,
  price_period,
  dedup_key,
  canonical_id,
  source_url_normalized,
  first_seen_at,
  last_seen_at,
  is_superseded
FROM listings
WHERE country = 'Cape Verde'
  AND approved = true
  AND is_superseded IS NOT TRUE
  AND title IS NOT NULL
  AND title <> ''
  AND island IS NOT NULL
  AND island <> ''
  AND price_period = 'sale'
  AND source_url LIKE 'http%'
  AND island = ANY (ARRAY[
    'Sal',
    'Boa Vista',
    'Santiago',
    'São Vicente',
    'Santo Antão',
    'São Nicolau',
    'Maio',
    'Fogo',
    'Brava'
  ])
  AND (
    (price IS NOT NULL AND price > 0)
    OR (image_urls IS NOT NULL AND array_length(image_urls, 1) > 0)
    OR (description IS NOT NULL AND length(description) > 50)
  )
  AND source_id NOT IN ('cv_source_1', 'cv_source_2');

GRANT SELECT ON public.v1_feed_cv TO anon;
GRANT SELECT ON public.v1_feed_cv TO authenticated;
