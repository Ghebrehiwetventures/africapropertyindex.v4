-- Migration: Canonicalize public.v1_feed_cv contract
-- Date: 2026-03-07
--
-- Contract decision for launch:
-- Option A (price optional at feed level).
-- Price-sensitive logic belongs in query/RPC layers, not feed eligibility.

CREATE OR REPLACE VIEW public.v1_feed_cv AS
SELECT *
FROM public.listings
WHERE approved = true
  AND source_id ILIKE 'cv_%'
  AND COALESCE(is_superseded, false) = false
  AND source_url IS NOT NULL
  AND image_urls IS NOT NULL
  AND array_length(image_urls, 1) > 0
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
  -- Explicitly exclude stub/test sources from public feed
  AND source_id NOT IN ('cv_source_1', 'cv_source_2');

GRANT SELECT ON public.v1_feed_cv TO anon;
GRANT SELECT ON public.v1_feed_cv TO authenticated;

-- Verification checks
SELECT count(*) AS v1_feed_cv_count FROM public.v1_feed_cv;

SELECT count(*) AS stub_source_rows
FROM public.v1_feed_cv
WHERE source_id IN ('cv_source_1', 'cv_source_2');

