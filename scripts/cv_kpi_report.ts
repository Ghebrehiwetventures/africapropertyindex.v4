/**
 * CV KPI Report – Nuläge mot "CV dominerad" (docs/kaza-verde-cv-dominated-kpi.md).
 * Usage: npx ts-node scripts/cv_kpi_report.ts
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or same as ingest) in env.
 */
import { getSupabaseClient } from "../core/supabaseClient";

const FRESHNESS_DAYS = 30;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

interface Row {
  id: string;
  source_id: string;
  approved: boolean | null;
  price: number | null;
  island: string | null;
  city: string | null;
  image_urls: string[] | null;
  property_size_sqm: number | null;
  bedrooms: number | null;
  created_at: string | null;
  updated_at: string | null;
  canonical_id?: string | null;
  is_superseded?: boolean | null;
}

async function main() {
  const sb = getSupabaseClient();
  const cutoff = daysAgo(FRESHNESS_DAYS);

  const { data: rows, error } = await sb
    .from("listings")
    .select(
      "id, source_id, approved, price, island, city, image_urls, property_size_sqm, bedrooms, created_at, updated_at, canonical_id, is_superseded"
    )
    .ilike("source_id", "cv_%");

  if (error) {
    console.error("Supabase error:", error.message);
    process.exit(1);
  }

  const all = (rows ?? []) as Row[];
  const approved = all.filter((r) => r.approved === true);
  const visible = approved.filter(
    (r) => r.is_superseded !== true
  );
  const totalVisible = visible.length;

  const withPrice = visible.filter((r) => r.price != null && r.price > 0);
  const withLocation = visible.filter(
    (r) => (r.island && r.island.trim() !== "") || (r.city && r.city.trim() !== "")
  );
  const withImages = visible.filter(
    (r) => Array.isArray(r.image_urls) && r.image_urls.length > 0
  );
  const withAreaOrBeds = visible.filter(
    (r) =>
      (r.property_size_sqm != null && r.property_size_sqm > 0) ||
      (r.bedrooms != null && r.bedrooms >= 0)
  );
  const updatedLast30 = visible.filter(
    (r) => r.updated_at && r.updated_at >= cutoff
  );

  const byCanonical = new Map<string, Row[]>();
  for (const r of visible) {
    const cid = r.canonical_id ?? r.id;
    if (!byCanonical.has(cid)) byCanonical.set(cid, []);
    byCanonical.get(cid)!.push(r);
  }
  const duplicateGroups = [...byCanonical.values()].filter((arr) => arr.length > 1);
  const duplicateCount = duplicateGroups.reduce((sum, arr) => sum + arr.length - 1, 0);
  const uniqueCount = totalVisible - duplicateCount;

  const bySource = new Map<string, { total: number; recent: number }>();
  for (const r of visible) {
    const sid = r.source_id || "unknown";
    if (!bySource.has(sid)) bySource.set(sid, { total: 0, recent: 0 });
    bySource.get(sid)!.total++;
    if (r.updated_at && r.updated_at >= cutoff) bySource.get(sid)!.recent++;
  }
  const stableSources = [...bySource.entries()].filter(
    ([_, v]) => v.total >= 10 && v.recent >= 1
  ).length;

  const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) : "0");
  const ok = (v: number, target: number) => (v >= target ? "✓" : "✗");

  console.log("\n=== KAZA VERDE – CV KPI REPORT (nuläge) ===\n");
  console.log("Källa: listings WHERE source_id LIKE 'cv_%' AND approved = true");
  console.log("(is_superseded = true exkluderad från visible.)\n");

  console.log("--- 1️⃣ DATA ---\n");
  console.log("Unika CV-listings (visible)     ", totalVisible.toString().padStart(6), "  Mål ≥300    ", ok(totalVisible, 300));
  console.log("  (av dessa, unika canonical_id)", uniqueCount.toString().padStart(6));
  console.log("Med price > 0                   ", withPrice.length.toString().padStart(6), `  ${pct(withPrice.length, totalVisible)}%`, "  Mål ≥95%   ", ok(withPrice.length, totalVisible * 0.95));
  console.log("Med location (island/city)      ", withLocation.length.toString().padStart(6), `  ${pct(withLocation.length, totalVisible)}%`, "  Mål ≥90%   ", ok(withLocation.length, totalVisible * 0.9));
  console.log("Med ≥1 bild                     ", withImages.length.toString().padStart(6), `  ${pct(withImages.length, totalVisible)}%`, "  Mål ≥90%   ", ok(withImages.length, totalVisible * 0.9));
  console.log("Med area eller bedrooms         ", withAreaOrBeds.length.toString().padStart(6), `  ${pct(withAreaOrBeds.length, totalVisible)}%`, "  Mål ≥85%   ", ok(withAreaOrBeds.length, totalVisible * 0.85));
  const dupPct = totalVisible ? (duplicateCount / totalVisible) * 100 : 0;
  console.log("Dubletter (canonical_id > 1)    ", duplicateCount.toString().padStart(6), `  ${dupPct.toFixed(1)}%`, "  Mål ≤5%    ", dupPct <= 5 ? "✓" : "✗");
  console.log("Uppdaterade senaste 30 d        ", updatedLast30.length.toString().padStart(6), `  ${pct(updatedLast30.length, totalVisible)}%`, "  Mål ≥80%   ", ok(updatedLast30.length, totalVisible * 0.8));
  console.log("Stabila källor (≥10 list, 30d) ", stableSources.toString().padStart(6), "  Mål ≥5     ", ok(stableSources, 5));

  console.log("\n--- Per källa (visible) ---");
  const sorted = [...bySource.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [sid, v] of sorted) {
    console.log(`  ${sid.padEnd(28)} ${v.total.toString().padStart(4)} list  (senaste 30d: ${v.recent})`);
  }

  console.log("\n--- 2️⃣ PRODUKT / 3–5 (manuell bedömning) ---");
  console.log("Se docs/kaza-verde-cv-dominated-kpi.md för produkt-, distribution-, positionerings- och monetiserings-KPIs.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
