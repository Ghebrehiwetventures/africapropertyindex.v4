-- Migration: relax legacy dedup_key uniqueness in favor of trust-stage canonicalization
-- Date: 2026-03-21

DROP INDEX IF EXISTS public.idx_listings_dedup_key;

CREATE INDEX IF NOT EXISTS idx_listings_dedup_key
  ON public.listings (dedup_key)
  WHERE dedup_key IS NOT NULL;
