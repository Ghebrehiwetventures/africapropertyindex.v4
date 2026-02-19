-- Run this in Supabase Dashboard → SQL Editor (once).
-- Adds updated_at column and auto-update trigger to listings.

-- 1. Add column (skip if already exists)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Backfill: set updated_at = created_at for existing rows
UPDATE listings SET updated_at = created_at WHERE updated_at IS NULL;

-- 3. Trigger function: auto-set updated_at on every INSERT or UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
