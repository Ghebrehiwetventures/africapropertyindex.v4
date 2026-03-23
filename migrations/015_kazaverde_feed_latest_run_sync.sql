-- Migration: Sync KazaVerde public feeds to the latest completed CV ingest run
-- Date: 2026-03-22

CREATE OR REPLACE VIEW public.v1_feed_cv AS
WITH latest_run AS (
  SELECT started_at
  FROM public.ingest_runs
  WHERE market = 'cv'
    AND status = 'completed'
  ORDER BY started_at DESC
  LIMIT 1
)
SELECT l.*
FROM public.listings l
CROSS JOIN latest_run r
WHERE l.source_id ILIKE 'cv_%'
  AND COALESCE(l.trust_gate_passed, false) = true
  AND l.trust_tier IN ('A', 'B')
  AND l.source_url IS NOT NULL
  AND COALESCE(l.has_valid_image, false) = true
  AND COALESCE(l.last_seen_at, l.first_seen_at) >= r.started_at
  AND l.island IN (
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
  AND l.source_id NOT IN ('cv_source_1', 'cv_source_2');

CREATE OR REPLACE VIEW public.v1_feed_cv_indexable AS
SELECT *
FROM public.v1_feed_cv
WHERE COALESCE(indexable, false) = true;

GRANT SELECT ON public.v1_feed_cv TO anon;
GRANT SELECT ON public.v1_feed_cv TO authenticated;
GRANT SELECT ON public.v1_feed_cv_indexable TO anon;
GRANT SELECT ON public.v1_feed_cv_indexable TO authenticated;
