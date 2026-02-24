-- Migration: Canonical identity columns (FAS 1 – no unique index yet)
-- Run in Supabase SQL Editor. Do not add unique constraint or index in this migration.
-- Date: 2026-02

ALTER TABLE listings ADD COLUMN IF NOT EXISTS canonical_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS source_url_normalized TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE listings ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_superseded BOOLEAN DEFAULT false;
