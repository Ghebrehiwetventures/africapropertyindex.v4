-- Migration 013: expose rendered translation fields in the public feed views.
-- These fields are tactical display-layer output and must remain distinct from
-- native source-truth columns like title/description.

DROP VIEW IF EXISTS public.v1_feed_cv_indexable;
DROP VIEW IF EXISTS public.v1_feed_cv;

CREATE VIEW public.v1_feed_cv AS
WITH latest_run AS (
  SELECT ingest_runs.started_at
  FROM ingest_runs
  WHERE ingest_runs.market = 'cv'
    AND ingest_runs.status = 'completed'
  ORDER BY ingest_runs.started_at DESC
  LIMIT 1
)
SELECT
  l.id,
  l.source_id,
  l.source_url,
  l.title,
  l.rendered_title_en,
  l.description,
  l.rendered_description_en,
  l.description_html,
  l.rendered_description_html_en,
  l.rendered_translation_source,
  l.rendered_translation_source_language,
  l.rendered_translation_target_language,
  l.rendered_translation_is_source_truth,
  l.rendered_translation_updated_at,
  l.price,
  l.currency,
  l.country,
  l.region,
  l.island,
  l.city,
  l.bedrooms,
  l.bathrooms,
  l.property_size_sqm,
  l.land_area_sqm,
  l.image_urls,
  l.status,
  l.created_at,
  l.updated_at,
  l.approved,
  l.violations,
  l.area_sqm,
  l.latitude,
  l.longitude,
  l.has_valid_images,
  l.property_type,
  l.amenities,
  l.price_period,
  l.dedup_key,
  l.canonical_id,
  l.source_url_normalized,
  l.first_seen_at,
  l.last_seen_at,
  l.is_superseded,
  l.price_status,
  l.location_confidence,
  l.has_valid_image,
  l.cover_image_url,
  l.cover_image_hash,
  l.duplicate_risk,
  l.identity_fingerprint,
  l.cross_source_match_key,
  l.canonical_listing_id,
  l.trust_tier,
  l.trust_gate_passed,
  l.indexable,
  l.review_reasons,
  l.multi_domain_gallery,
  l.is_stale,
  l.stale_at,
  l.stale_reason
FROM listings l
CROSS JOIN latest_run r
WHERE l.source_id ILIKE 'cv_%'
  AND COALESCE(l.trust_gate_passed, false) = true
  AND l.trust_tier = ANY (ARRAY['A', 'B'])
  AND l.source_url IS NOT NULL
  AND COALESCE(l.has_valid_image, false) = true
  AND COALESCE(l.is_stale, false) = false
  AND COALESCE(l.last_seen_at, l.first_seen_at) >= r.started_at
  AND l.island = ANY (ARRAY[
    'Boa Vista',
    'Brava',
    'Fogo',
    'Maio',
    'Sal',
    'Santiago',
    'Santo Antão',
    'São Nicolau',
    'São Vicente'
  ])
  AND l.source_id <> ALL (ARRAY['cv_source_1', 'cv_source_2']);

CREATE VIEW public.v1_feed_cv_indexable AS
SELECT
  id,
  source_id,
  source_url,
  title,
  rendered_title_en,
  description,
  rendered_description_en,
  description_html,
  rendered_description_html_en,
  rendered_translation_source,
  rendered_translation_source_language,
  rendered_translation_target_language,
  rendered_translation_is_source_truth,
  rendered_translation_updated_at,
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
  is_superseded,
  price_status,
  location_confidence,
  has_valid_image,
  cover_image_url,
  cover_image_hash,
  duplicate_risk,
  identity_fingerprint,
  cross_source_match_key,
  canonical_listing_id,
  trust_tier,
  trust_gate_passed,
  indexable,
  review_reasons,
  multi_domain_gallery,
  is_stale,
  stale_at,
  stale_reason
FROM public.v1_feed_cv
WHERE COALESCE(indexable, false) = true;

GRANT SELECT ON public.v1_feed_cv TO anon;
GRANT SELECT ON public.v1_feed_cv TO authenticated;
GRANT SELECT ON public.v1_feed_cv_indexable TO anon;
GRANT SELECT ON public.v1_feed_cv_indexable TO authenticated;
