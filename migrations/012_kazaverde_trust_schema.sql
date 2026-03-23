-- Migration: KazaVerde trust/publishability schema v1
-- Date: 2026-03-21

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS price_status TEXT DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS location_confidence TEXT DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS has_valid_image BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_hash TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_risk TEXT DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS identity_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS cross_source_match_key TEXT,
  ADD COLUMN IF NOT EXISTS canonical_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS trust_tier TEXT DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS trust_gate_passed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS indexable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reasons TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS multi_domain_gallery BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_listings_trust_tier ON public.listings (trust_tier);
CREATE INDEX IF NOT EXISTS idx_listings_trust_gate_passed ON public.listings (trust_gate_passed);
CREATE INDEX IF NOT EXISTS idx_listings_indexable ON public.listings (indexable);
CREATE INDEX IF NOT EXISTS idx_listings_identity_fingerprint ON public.listings (identity_fingerprint);
CREATE INDEX IF NOT EXISTS idx_listings_cross_source_match_key ON public.listings (cross_source_match_key);
CREATE INDEX IF NOT EXISTS idx_listings_canonical_listing_id ON public.listings (canonical_listing_id);

CREATE TABLE IF NOT EXISTS public.listing_images (
  id BIGSERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER NOT NULL,
  image_domain TEXT,
  bytes INTEGER,
  width INTEGER,
  height INTEGER,
  aspect_ratio NUMERIC(10, 4),
  white_background_ratio NUMERIC(10, 4),
  visual_complexity NUMERIC(10, 4),
  perceptual_hash TEXT,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  invalid_reasons TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_images_unique
  ON public.listing_images (listing_id, image_url);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id
  ON public.listing_images (listing_id);

CREATE INDEX IF NOT EXISTS idx_listing_images_perceptual_hash
  ON public.listing_images (perceptual_hash)
  WHERE perceptual_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.listing_duplicate_matches (
  source_listing_id TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  matched_listing_id TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL,
  match_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
  canonical_listing_id TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  duplicate_risk TEXT NOT NULL DEFAULT 'high',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_listing_id, matched_listing_id, match_type)
);

CREATE INDEX IF NOT EXISTS idx_listing_duplicate_matches_canonical
  ON public.listing_duplicate_matches (canonical_listing_id);

CREATE TABLE IF NOT EXISTS public.ingest_runs (
  id BIGSERIAL PRIMARY KEY,
  market TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  total_listings INTEGER NOT NULL DEFAULT 0,
  public_count INTEGER NOT NULL DEFAULT 0,
  indexable_count INTEGER NOT NULL DEFAULT 0,
  tier_a_count INTEGER NOT NULL DEFAULT 0,
  tier_b_count INTEGER NOT NULL DEFAULT 0,
  tier_c_count INTEGER NOT NULL DEFAULT 0,
  run_delta_pct NUMERIC(10, 2),
  warning_flags TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ingest_runs_market_started_at
  ON public.ingest_runs (market, started_at DESC);

CREATE TABLE IF NOT EXISTS public.source_run_metrics (
  id BIGSERIAL PRIMARY KEY,
  ingest_run_id BIGINT NOT NULL REFERENCES public.ingest_runs(id) ON DELETE CASCADE,
  market TEXT NOT NULL,
  source_id TEXT NOT NULL,
  fetched_count INTEGER NOT NULL DEFAULT 0,
  public_count INTEGER NOT NULL DEFAULT 0,
  indexable_count INTEGER NOT NULL DEFAULT 0,
  tier_a_count INTEGER NOT NULL DEFAULT 0,
  tier_b_count INTEGER NOT NULL DEFAULT 0,
  tier_c_count INTEGER NOT NULL DEFAULT 0,
  without_price_pct NUMERIC(10, 2) NOT NULL DEFAULT 0,
  without_location_pct NUMERIC(10, 2) NOT NULL DEFAULT 0,
  multi_domain_gallery_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  duplicate_cover_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_completeness NUMERIC(10, 2) NOT NULL DEFAULT 0,
  location_completeness NUMERIC(10, 2) NOT NULL DEFAULT 0,
  image_validity_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  duplicate_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  freshness NUMERIC(10, 2) NOT NULL DEFAULT 0,
  title_cleanliness NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quality_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  warning_flags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ingest_run_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_source_run_metrics_source
  ON public.source_run_metrics (source_id, ingest_run_id DESC);
