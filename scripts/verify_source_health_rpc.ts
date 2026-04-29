/**
 * Verify get_source_quality_stats() RPC returns Sprint 2 health fields.
 * Usage: npx ts-node --transpile-only scripts/verify_source_health_rpc.ts
 */
import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Worktrees don't have their own .env; fall back to the main repo's.
for (const p of [path.resolve(__dirname, "../.env"), "/Users/ghebrehiwet/arei-platform-clean/.env"]) {
  dotenv.config({ path: p });
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const REQUIRED = [
  "source_id",
  "listing_count",
  "approved_count",
  "with_image_count",
  "with_price_count",
  "with_sqm_count",
  "with_beds_count",
  "with_baths_count",
  "trust_passed_count",
  "indexable_count",
  "public_feed_count",
  "last_updated_at",
] as const;

(async () => {
  const sb = createClient(url, key);
  const { data, error } = await sb.rpc("get_source_quality_stats");
  if (error) {
    console.error("RPC error:", error.message);
    process.exit(1);
  }
  const rows = (data || []) as Record<string, unknown>[];
  console.log(`Got ${rows.length} rows`);
  if (rows.length === 0) {
    console.error("FAIL: zero rows");
    process.exit(1);
  }
  const sample = rows[0];
  const missing = REQUIRED.filter((k) => !(k in sample));
  if (missing.length > 0) {
    console.error("FAIL — missing fields:", missing);
    console.error("Sample row keys:", Object.keys(sample));
    process.exit(1);
  }
  console.log("OK — all required fields present");
  console.log("Sample row:", JSON.stringify(sample, null, 2));

  const watch = ["cv_estatecv", "gh_meqasa", "cv_ccoreinvestments", "cv_amicv", "cv_terracaboverde"];
  console.log("\nWatch sources:");
  for (const id of watch) {
    const r = rows.find((x) => x.source_id === id);
    if (!r) {
      console.log(`  ${id}: not found`);
      continue;
    }
    console.log(
      `  ${id}: listings=${r.listing_count} approved=${r.approved_count} indexable=${r.indexable_count} trust=${r.trust_passed_count} feed=${r.public_feed_count} sqm=${r.with_sqm_count} beds=${r.with_beds_count} baths=${r.with_baths_count} updated=${r.last_updated_at}`
    );
  }
})();
