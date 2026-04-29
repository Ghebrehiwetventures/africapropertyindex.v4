/**
 * Create get_source_quality_stats() RPC in Supabase so the admin dashboard can show source quality.
 * Requires DATABASE_URL in .env (Supabase Dashboard → Settings → Database → Connection string → URI).
 *
 * Usage: npx ts-node --transpile-only scripts/setup_supabase_rpc.ts
 */
import * as path from "path";
import * as fs from "fs";
import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Sprint 2 changed the return shape — DROP before CREATE because Postgres
// rejects CREATE OR REPLACE when the return signature changes.
const SQL_DROP = `drop function if exists get_source_quality_stats();`;

const SQL_JSONB = `
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
    count(*) filter (where l.image_urls is not null and jsonb_array_length(l.image_urls::jsonb) > 0)::bigint,
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
`;

const SQL_TEXT_ARRAY = `
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
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "Missing DATABASE_URL. Add it to .env from Supabase Dashboard → Settings → Database → Connection string (URI)."
    );
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(SQL_DROP);
    try {
      await client.query(SQL_JSONB);
      console.log("Created get_source_quality_stats() (jsonb image_urls).");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("cannot cast") && msg.includes("jsonb")) {
        console.log("jsonb version failed (image_urls may be text[]), trying text[] version...");
        await client.query(SQL_DROP);
        await client.query(SQL_TEXT_ARRAY);
        console.log("Created get_source_quality_stats() (text[] image_urls).");
      } else {
        throw e;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
