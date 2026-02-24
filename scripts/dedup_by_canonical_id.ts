/**
 * FAS 2 – Mark duplicate canonical_id rows as superseded. No deletes.
 * Winner: best score (images, description length, filled fields, updated_at).
 * Losers: is_superseded = true.
 *
 * Usage: npx ts-node scripts/dedup_by_canonical_id.ts
 */
import { getSupabaseClient } from "../core/supabaseClient";

const sb = getSupabaseClient();

type Row = {
  id: string;
  canonical_id: string;
  image_urls: string[] | null;
  description: string | null;
  updated_at: string;
  bedrooms: number | null;
  bathrooms: number | null;
  property_size_sqm: number | null;
  land_area_sqm: number | null;
  property_type: string | null;
  amenities: string[] | null;
  is_superseded: boolean | null;
};

function filledFieldsCount(row: Row): number {
  let n = 0;
  if (row.bedrooms != null) n++;
  if (row.bathrooms != null) n++;
  if (row.property_size_sqm != null) n++;
  if (row.land_area_sqm != null) n++;
  if (row.property_type != null) n++;
  if (row.amenities != null && row.amenities.length > 0) n++;
  return n;
}

function score(row: Row): [number, number, number, string] {
  const images = (row.image_urls?.length ?? 0);
  const descLen = (row.description?.length ?? 0);
  const filled = filledFieldsCount(row);
  return [images, descLen, filled, row.updated_at];
}

function pickWinner(rows: Row[]): Row {
  return rows.slice().sort((a, b) => {
    const [imgA, descA, filledA, upA] = score(a);
    const [imgB, descB, filledB, upB] = score(b);
    if (imgB !== imgA) return imgB - imgA;
    if (descB !== descA) return descB - descA;
    if (filledB !== filledA) return filledB - filledA;
    return upB.localeCompare(upA);
  })[0];
}

async function main() {
  const { data: rows, error } = await sb
    .from("listings")
    .select(
      "id, canonical_id, image_urls, description, updated_at, bedrooms, bathrooms, property_size_sqm, land_area_sqm, property_type, amenities, is_superseded"
    )
    .not("canonical_id", "is", null)
    .or("is_superseded.eq.false,is_superseded.is.null");

  if (error) {
    console.error("Fetch error:", error.message);
    process.exit(1);
  }

  const list = (rows || []) as Row[];
  const byCanonical = new Map<string, Row[]>();
  for (const row of list) {
    const cid = row.canonical_id;
    if (!byCanonical.has(cid)) byCanonical.set(cid, []);
    byCanonical.get(cid)!.push(row);
  }

  const duplicateGroups = [...byCanonical.entries()].filter(([, r]) => r.length > 1);
  let totalSuperseded = 0;
  const worst: { canonical_id: string; count: number; winner_id: string }[] = [];

  console.log("Duplicate canonical_id groups: %s\n", duplicateGroups.length);

  for (const [canonicalId, groupRows] of duplicateGroups) {
    const winner = pickWinner(groupRows);
    const losers = groupRows.filter((r) => r.id !== winner.id);

    for (const row of losers) {
      const { error: upErr } = await sb
        .from("listings")
        .update({ is_superseded: true })
        .eq("id", row.id);

      if (upErr) {
        console.error("Update failed for %s: %s", row.id, upErr.message);
        continue;
      }
      totalSuperseded++;
    }

    worst.push({
      canonical_id: canonicalId,
      count: groupRows.length,
      winner_id: winner.id,
    });
  }

  worst.sort((a, b) => b.count - a.count);
  const top20 = worst.slice(0, 20);

  console.log("Groups processed: %s", duplicateGroups.length);
  console.log("Rows marked is_superseded = true: %s", totalSuperseded);
  console.log("\nTop 20 worst groups (by duplicate count):");
  for (const w of top20) {
    console.log("  %s  count=%s  winner=%s", w.canonical_id, w.count, w.winner_id);
  }

  console.log("\nValidation (run in Supabase):");
  console.log("  select canonical_id, count(*) from listings where canonical_id is not null and is_superseded = false group by canonical_id having count(*) > 1;");
  console.log("  select count(*) from listings where is_superseded = true;");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
