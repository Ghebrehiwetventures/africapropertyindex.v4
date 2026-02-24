/**
 * FAS 1 verification – run after migration 003 and at least one CV ingest.
 * Usage: npx ts-node scripts/verify_fas1.ts
 */
import { getSupabaseClient } from "../core/supabaseClient";

const sb = getSupabaseClient();

async function check1() {
  console.log("\n=== Check 1: canonical_id & source_url_normalized (20 latest) ===\n");
  const { data, error } = await sb
    .from("listings")
    .select("id, source_id, source_url, source_url_normalized, canonical_id")
    .ilike("source_id", "cv_%")
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error:", error.message);
    return;
  }
  if (!data?.length) {
    console.log("No CV listings found.");
    return;
  }

  let allHaveCanonical = true;
  for (const row of data as any[]) {
    const cid = row.canonical_id;
    const ok = cid && cid.includes(":") && /^cv_[a-z0-9_]+:[a-f0-9]{16}$/.test(cid);
    if (!ok) allHaveCanonical = false;
    console.log(
      row.id?.slice(0, 18).padEnd(20),
      (row.canonical_id ?? "").slice(0, 36).padEnd(38),
      row.source_url_normalized ? "normalized" : "null"
    );
  }
  console.log("\nAll canonical_id non-empty and format source_id:hash?", allHaveCanonical ? "YES" : "NO");
}

async function check2() {
  console.log("\n=== Check 2: last_seen_at updated (last 1 hour) ===\n");
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await sb
    .from("listings")
    .select("id", { count: "exact", head: true })
    .ilike("source_id", "cv_%")
    .gte("last_seen_at", oneHourAgo);

  if (error) {
    console.error("Error:", error.message);
    return;
  }
  console.log("CV listings with last_seen_at in last 1 hour:", count ?? 0);
  console.log(count && count > 0 ? "OK – writer sets last_seen_at" : "WARN – 0 rows (run ingest first?)");
}

async function check3() {
  console.log("\n=== Check 3: first_seen_at (10 oldest rows) ===\n");
  const { data, error } = await sb
    .from("listings")
    .select("id, created_at, first_seen_at")
    .ilike("source_id", "cv_%")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Error:", error.message);
    return;
  }
  for (const row of (data || []) as any[]) {
    console.log(
      row.id?.slice(0, 20).padEnd(22),
      "created_at:",
      row.created_at ?? "null",
      "first_seen_at:",
      row.first_seen_at ?? "null"
    );
  }
  console.log("\n(Re-run after another ingest: first_seen_at must stay unchanged for these rows.)");
}

async function check4() {
  console.log("\n=== Check 4: canonical_id deterministic (one per URL pattern) ===\n");
  const { data, error } = await sb
    .from("listings")
    .select("canonical_id, source_url")
    .ilike("source_id", "cv_%")
    .like("source_url", "%terracaboverde.com%");

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  const byCanonical = new Map<string, number>();
  for (const row of (data || []) as any[]) {
    const c = row.canonical_id ?? "null";
    byCanonical.set(c, (byCanonical.get(c) ?? 0) + 1);
  }
  const dupes = [...byCanonical.entries()].filter(([, n]) => n > 1);
  console.log("Listings with source_url like '%terracaboverde.com%':", (data ?? []).length);
  console.log("Distinct canonical_id count:", byCanonical.size);
  if (dupes.length > 0) {
    console.log("DUPLICATES (same canonical_id, count > 1):", dupes);
  } else {
    console.log("OK – each canonical_id appears once for this URL pattern.");
  }
}

async function main() {
  console.log("FAS 1 verification – CV listings");
  await check1();
  await check2();
  await check3();
  await check4();
  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
