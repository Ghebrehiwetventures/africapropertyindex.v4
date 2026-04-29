-- Run this in Supabase Dashboard → SQL Editor to enable dashboard source-quality stats.
-- Requires table "listings" with columns: source_id, approved, image_urls, price,
-- property_size_sqm, area_sqm, bedrooms, bathrooms, trust_gate_passed, indexable, updated_at.
-- Also references public.v1_feed_cv (cv-only feed view) for public_feed_count;
-- non-cv sources receive 0 via LEFT JOIN.

-- The return shape changed in Sprint 2 (added with_sqm_count, with_beds_count,
-- with_baths_count, trust_passed_count, indexable_count, public_feed_count).
-- Postgres rejects CREATE OR REPLACE when the return signature changes, so we
-- DROP first. Safe: no other objects depend on this function.
drop function if exists get_source_quality_stats();

-- Version for image_urls as text[] (matches deployed schema):
create or replace function get_source_quality_stats()
returns table (
  source_id text,
  listing_count bigint,
  approved_count bigint,
  with_image_count bigint,
  with_price_count bigint,
  with_sqm_count bigint,
  with_beds_count bigint,
  with_baths_count bigint,
  trust_passed_count bigint,
  indexable_count bigint,
  public_feed_count bigint,
  last_updated_at timestamptz
) as $$
  with feed_counts as (
    select f.source_id::text as source_id, count(*)::bigint as feed_count
    from public.v1_feed_cv f
    group by f.source_id
  )
  select
    l.source_id::text,
    count(*)::bigint,
    count(*) filter (where l.approved)::bigint,
    count(*) filter (where l.image_urls is not null and coalesce(array_length(l.image_urls, 1), 0) > 0)::bigint,
    count(*) filter (where l.price is not null)::bigint,
    count(*) filter (where coalesce(l.property_size_sqm, l.area_sqm) is not null)::bigint,
    count(*) filter (where l.bedrooms is not null)::bigint,
    count(*) filter (where l.bathrooms is not null)::bigint,
    count(*) filter (where coalesce(l.trust_gate_passed, false))::bigint,
    count(*) filter (where coalesce(l.indexable, false))::bigint,
    coalesce(max(fc.feed_count), 0)::bigint,
    max(l.updated_at)
  from listings l
  left join feed_counts fc on fc.source_id = l.source_id::text
  where l.source_id is not null
  group by l.source_id
$$ language sql stable;

-- If image_urls is jsonb instead of text[], run this version instead:
-- create or replace function get_source_quality_stats()
-- returns table (
--   source_id text,
--   listing_count bigint,
--   approved_count bigint,
--   with_image_count bigint,
--   with_price_count bigint,
--   with_sqm_count bigint,
--   with_beds_count bigint,
--   with_baths_count bigint,
--   trust_passed_count bigint,
--   indexable_count bigint,
--   public_feed_count bigint,
--   last_updated_at timestamptz
-- ) as $$
--   with feed_counts as (
--     select f.source_id::text as source_id, count(*)::bigint as feed_count
--     from public.v1_feed_cv f
--     group by f.source_id
--   )
--   select
--     l.source_id::text,
--     count(*)::bigint,
--     count(*) filter (where l.approved)::bigint,
--     count(*) filter (where l.image_urls is not null and jsonb_array_length(l.image_urls::jsonb) > 0)::bigint,
--     count(*) filter (where l.price is not null)::bigint,
--     count(*) filter (where coalesce(l.property_size_sqm, l.area_sqm) is not null)::bigint,
--     count(*) filter (where l.bedrooms is not null)::bigint,
--     count(*) filter (where l.bathrooms is not null)::bigint,
--     count(*) filter (where coalesce(l.trust_gate_passed, false))::bigint,
--     count(*) filter (where coalesce(l.indexable, false))::bigint,
--     coalesce(max(fc.feed_count), 0)::bigint,
--     max(l.updated_at)
--   from listings l
--   left join feed_counts fc on fc.source_id = l.source_id::text
--   where l.source_id is not null
--   group by l.source_id
-- $$ language sql stable;
