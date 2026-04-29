-- Migration: source_health_snapshots
--
-- Daily snapshot of get_source_quality_stats() output, one row per source per
-- day. Powers the future "Cape Verde data health over time" admin chart so
-- improvements in source/scraper work become visible and measurable.
--
-- v1 design notes:
--   - Direct anon SELECT (admin reads via the existing anon Supabase client).
--   - No insert/update/delete policies → only the service role (used by the
--     daily GitHub Action snapshot job) can write.
--   - Primary key (snapshot_date, source_id) makes same-day re-runs idempotent
--     via INSERT ... ON CONFLICT DO UPDATE (upsert).
--   - health_grade is stored, not derived at read time. The grade reflects the
--     state on snapshot_date, not the state today.
--   - Counts and percentages are both stored. Percentages are denormalised so
--     charts don't recompute; counts let us recompute later if metric defs
--     change.

create table if not exists source_health_snapshots (
  snapshot_date          date         not null,
  source_id              text         not null,
  market_id              text         not null,
  listing_count          integer      not null,
  approved_count         integer      not null,
  public_feed_count      integer      not null,
  indexable_count        integer      not null,
  trust_passed_count     integer      not null,
  with_sqm_count         integer      not null,
  with_beds_count        integer      not null,
  with_baths_count       integer      not null,
  sqm_pct                numeric(5,1) not null,
  beds_pct               numeric(5,1) not null,
  baths_pct              numeric(5,1) not null,
  feed_conversion_pct    numeric(5,1) not null,
  health_grade           text         not null check (health_grade in ('A','B','C','D')),
  last_updated_at        timestamptz,
  created_at             timestamptz  not null default now(),
  primary key (snapshot_date, source_id)
);

create index if not exists source_health_snapshots_market_date_idx
  on source_health_snapshots (market_id, snapshot_date desc);

-- RLS: anon may SELECT. Writes are service-role only (no insert/update/delete
-- policies are defined, so the table is read-only from any non-service role).
alter table source_health_snapshots enable row level security;

drop policy if exists "anon read snapshots" on source_health_snapshots;
create policy "anon read snapshots"
  on source_health_snapshots
  for select
  to anon, authenticated
  using (true);
