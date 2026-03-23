-- Migration: KazaVerde trust-driven public feed + admin RPCs
-- Date: 2026-03-21

DROP FUNCTION IF EXISTS public.get_source_quality_stats();
DROP FUNCTION IF EXISTS public.get_latest_ingest_run_summary(TEXT);

CREATE OR REPLACE VIEW public.v1_feed_cv AS
SELECT *
FROM public.listings
WHERE source_id ILIKE 'cv_%'
  AND COALESCE(trust_gate_passed, false) = true
  AND trust_tier IN ('A', 'B')
  AND source_url IS NOT NULL
  AND COALESCE(has_valid_image, false) = true
  AND island IN (
    'Boa Vista',
    'Brava',
    'Fogo',
    'Maio',
    'Sal',
    'Santiago',
    'Santo Antão',
    'São Nicolau',
    'São Vicente'
  )
  AND source_id NOT IN ('cv_source_1', 'cv_source_2');

CREATE OR REPLACE VIEW public.v1_feed_cv_indexable AS
SELECT *
FROM public.v1_feed_cv
WHERE COALESCE(indexable, false) = true;

GRANT SELECT ON public.v1_feed_cv TO anon;
GRANT SELECT ON public.v1_feed_cv TO authenticated;
GRANT SELECT ON public.v1_feed_cv_indexable TO anon;
GRANT SELECT ON public.v1_feed_cv_indexable TO authenticated;

CREATE OR REPLACE FUNCTION public.get_source_quality_stats()
RETURNS TABLE (
  source_id TEXT,
  listing_count BIGINT,
  approved_count BIGINT,
  with_image_count BIGINT,
  with_price_count BIGINT,
  tier_a_count BIGINT,
  tier_b_count BIGINT,
  tier_c_count BIGINT,
  without_price_pct NUMERIC,
  without_location_pct NUMERIC,
  multi_domain_gallery_rate NUMERIC,
  duplicate_cover_rate NUMERIC,
  price_completeness NUMERIC,
  location_completeness NUMERIC,
  image_validity_rate NUMERIC,
  duplicate_rate NUMERIC,
  freshness NUMERIC,
  title_cleanliness NUMERIC,
  quality_score NUMERIC,
  latest_run_delta_pct NUMERIC,
  latest_run_warning BOOLEAN
) AS $$
  WITH latest_runs AS (
    SELECT DISTINCT ON (market)
      id,
      market,
      run_delta_pct,
      warning_flags
    FROM public.ingest_runs
    WHERE status = 'completed'
    ORDER BY market, started_at DESC
  )
  SELECT
    s.source_id::TEXT,
    s.fetched_count::BIGINT,
    s.public_count::BIGINT,
    ROUND((s.image_validity_rate / 100.0) * s.fetched_count)::BIGINT,
    ROUND((s.price_completeness / 100.0) * s.fetched_count)::BIGINT,
    s.tier_a_count::BIGINT,
    s.tier_b_count::BIGINT,
    s.tier_c_count::BIGINT,
    s.without_price_pct,
    s.without_location_pct,
    s.multi_domain_gallery_rate,
    s.duplicate_cover_rate,
    s.price_completeness,
    s.location_completeness,
    s.image_validity_rate,
    s.duplicate_rate,
    s.freshness,
    s.title_cleanliness,
    s.quality_score,
    lr.run_delta_pct,
    COALESCE(array_position(lr.warning_flags, 'PUBLIC_COUNT_DELTA_GT_10_PERCENT') IS NOT NULL, false)
  FROM public.source_run_metrics s
  JOIN latest_runs lr
    ON lr.id = s.ingest_run_id
   AND lr.market = s.market
  ORDER BY s.market, s.source_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_latest_ingest_run_summary(p_market TEXT DEFAULT NULL)
RETURNS TABLE (
  market TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_listings INTEGER,
  public_count INTEGER,
  indexable_count INTEGER,
  tier_a_count INTEGER,
  tier_b_count INTEGER,
  tier_c_count INTEGER,
  run_delta_pct NUMERIC,
  warning_flags TEXT[]
) AS $$
  SELECT
    r.market,
    r.started_at,
    r.completed_at,
    r.total_listings,
    r.public_count,
    r.indexable_count,
    r.tier_a_count,
    r.tier_b_count,
    r.tier_c_count,
    r.run_delta_pct,
    r.warning_flags
  FROM public.ingest_runs r
  WHERE r.status = 'completed'
    AND (p_market IS NULL OR r.market = p_market)
  ORDER BY r.started_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;
