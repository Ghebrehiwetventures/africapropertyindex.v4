/**
 * FAS 2 – Backfill canonical identity fields for existing listings.
 * Idempotent, batched. Safe to re-run.
 *
 * Updates rows where:
 *   canonical_id IS NULL OR source_url_normalized IS NULL OR
 *   first_seen_at IS NULL OR first_seen_at = migration default timestamp.
 *
 * Usage: npx ts-node scripts/backfill_canonical_identity.ts
 */
import { getSupabaseClient } from "../core/supabaseClient";
import { getCanonicalId } from "../core/canonicalId";
import { normalizeUrl } from "../core/normalizeUrl";

const BATCH_SIZE = 1000;
const MIGRATION_003_DEFAULT_TS = "2026-02-21T18:10:19.052634+00:00";

type Row = {
  id: string;
  source_id: string;
  source_url: string | null;
  created_at: string;
  first_seen_at: string | null;
  source_url_normalized: string | null;
  canonical_id: string | null;
};

function needsBackfill(row: Row): boolean {
  if (row.canonical_id == null) return true;
  if (row.source_url_normalized == null) return true;
  if (row.first_seen_at == null) return true;
  if (row.first_seen_at === MIGRATION_003_DEFAULT_TS) return true;
  return false;
}

async function main() {
  const sb = getSupabaseClient();
  let offset = 0;
  let totalScanned = 0;
  let totalUpdated = 0;

  console.log("Backfill canonical identity (batches of %s). Migration default first_seen_at: %s\n", BATCH_SIZE, MIGRATION_003_DEFAULT_TS);

  while (true) {
    const { data: rows, error } = await sb
      .from("listings")
      .select("id, source_id, source_url, created_at, first_seen_at, source_url_normalized, canonical_id")
      .order("id", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error("Fetch error:", error.message);
      process.exit(1);
    }

    const batch = (rows || []) as Row[];
    totalScanned += batch.length;

    const toUpdate = batch.filter(needsBackfill);

    for (const row of toUpdate) {
      const source_url_normalized = row.source_url ? normalizeUrl(row.source_url) : null;
      const canonical_id = getCanonicalId(row.source_id, row.source_url, row.id);
      const first_seen_at =
        row.first_seen_at == null || row.first_seen_at === MIGRATION_003_DEFAULT_TS
          ? row.created_at
          : row.first_seen_at;

      const { error: upErr } = await sb
        .from("listings")
        .update({
          canonical_id,
          source_url_normalized: source_url_normalized || null,
          first_seen_at,
        })
        .eq("id", row.id);

      if (upErr) {
        console.error("Update failed for %s: %s", row.id, upErr.message);
        continue;
      }
      totalUpdated++;
    }

    if (toUpdate.length > 0) {
      console.log("  scanned %s, updated %s in this batch (running total updated: %s)", batch.length, toUpdate.length, totalUpdated);
    }

    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log("\nDone. Total scanned: %s, total updated: %s", totalScanned, totalUpdated);
  console.log("\nValidation queries (run in Supabase if needed):");
  console.log("  select count(*) from listings where canonical_id is null;");
  console.log("  select count(*) from listings where source_url is not null and source_url_normalized is null;");
  console.log("  select count(*) from listings where first_seen_at is null;");
  console.log("  select min(first_seen_at), max(first_seen_at) from listings;");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
