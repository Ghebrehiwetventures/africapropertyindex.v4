/**
 * Post–Script A validation: three counts (expect 0, 0, 0).
 * Usage: npx ts-node scripts/validate_fas2_backfill.ts
 */
import { getSupabaseClient } from "../core/supabaseClient";

const sb = getSupabaseClient();

async function main() {
  const { count: c1 } = await sb.from("listings").select("id", { count: "exact", head: true }).is("canonical_id", null);
  const { data: d2 } = await sb.from("listings").select("id").not("source_url", "is", null).is("source_url_normalized", null);
  const { count: c3 } = await sb.from("listings").select("id", { count: "exact", head: true }).is("first_seen_at", null);

  console.log("canonical_id is null:                    %s", c1 ?? 0);
  console.log("source_url not null AND source_url_normalized is null: %s", d2?.length ?? 0);
  console.log("first_seen_at is null:                   %s", c3 ?? 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
