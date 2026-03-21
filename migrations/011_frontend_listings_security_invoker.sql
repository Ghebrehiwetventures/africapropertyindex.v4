-- Migration: make frontend listing views respect caller permissions and RLS
-- Date: 2026-03-18
--
-- Why this touches two views:
-- public.frontend_listings_v2 selects from public.frontend_listings_v1.
-- To ensure caller-based permission checks flow all the way through to
-- public.listings, both views need security_invoker = true.
--
-- Rollback note:
-- Revert with:
--   ALTER VIEW IF EXISTS public.frontend_listings_v1
--     RESET (security_invoker);
--   ALTER VIEW IF EXISTS public.frontend_listings_v2
--     RESET (security_invoker);

ALTER VIEW IF EXISTS public.frontend_listings_v1
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.frontend_listings_v2
  SET (security_invoker = true);
