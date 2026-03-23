-- Migration: Source-level stale stats RPC for admin
-- Date: 2026-03-22

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS last_reactivated_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS public.get_source_stale_stats(TEXT);

CREATE OR REPLACE FUNCTION public.get_source_stale_stats(p_market TEXT DEFAULT 'cv')
RETURNS TABLE (
  source_id TEXT,
  listing_count BIGINT,
  stale_count BIGINT,
  newly_stale_count BIGINT,
  reactivated_count BIGINT,
  stale_share_pct NUMERIC,
  latest_run_started_at TIMESTAMPTZ
) AS $$
  WITH latest_run AS (
    SELECT started_at
    FROM public.ingest_runs
    WHERE market = p_market
      AND status = 'completed'
    ORDER BY started_at DESC
    LIMIT 1
  ),
  source_base AS (
    SELECT
      l.source_id,
      COUNT(*)::BIGINT AS listing_count,
      COUNT(*) FILTER (WHERE COALESCE(l.is_stale, false) = true)::BIGINT AS stale_count,
      COUNT(*) FILTER (
        WHERE l.stale_at IS NOT NULL
          AND l.stale_at >= lr.started_at
      )::BIGINT AS newly_stale_count,
      COUNT(*) FILTER (
        WHERE l.last_reactivated_at IS NOT NULL
          AND l.last_reactivated_at >= lr.started_at
      )::BIGINT AS reactivated_count,
      lr.started_at AS latest_run_started_at
    FROM public.listings l
    CROSS JOIN latest_run lr
    WHERE l.source_id ILIKE (p_market || '\_%')
    GROUP BY l.source_id, lr.started_at
  )
  SELECT
    source_id,
    listing_count,
    stale_count,
    newly_stale_count,
    reactivated_count,
    CASE
      WHEN listing_count <= 0 THEN 0
      ELSE ROUND((stale_count::numeric / listing_count::numeric) * 100, 2)
    END AS stale_share_pct,
    latest_run_started_at
  FROM source_base
  ORDER BY stale_share_pct DESC, stale_count DESC, source_id ASC;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.get_source_stale_stats(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_source_stale_stats(TEXT) TO authenticated;
