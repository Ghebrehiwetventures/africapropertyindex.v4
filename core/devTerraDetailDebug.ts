/**
 * One-off debug script to test Terra Cabo Verde detail page extraction.
 * Run with: npx ts-node --transpile-only core/devTerraDetailDebug.ts
 */

import { fetchHtml } from "./fetchHtml";
import { parseTerraCaboVerde } from "./parseTerraCaboVerde";
import { terraCaboVerdePlugin } from "./detail/plugins/terraCaboVerde";

const TERRA_LIST_URL = "https://terracaboverde.com/properties/";

async function main() {
  console.log("[1] Fetching Terra listing page...");
  const listResult = await fetchHtml(TERRA_LIST_URL);

  if (!listResult.success || !listResult.html) {
    console.error("Failed to fetch listing page:", listResult.error);
    process.exit(1);
  }

  console.log(`[2] Parsing listings (${listResult.html.length} bytes)...`);
  const listings = parseTerraCaboVerde(
    listResult.html,
    "cv_terracaboverde",
    "Terra Cabo Verde",
    TERRA_LIST_URL
  );

  console.log(`[3] Found ${listings.length} listings`);

  // Pick first listing with detailUrl
  const listing = listings.find((l) => l.detailUrl);
  if (!listing || !listing.detailUrl) {
    console.error("No listing with detailUrl found");
    process.exit(1);
  }

  console.log("[4] Selected listing:");
  console.log(JSON.stringify({ id: listing.id, title: listing.title, detailUrl: listing.detailUrl }, null, 2));

  console.log("\n[5] Fetching detail page...");
  const detailResult = await fetchHtml(listing.detailUrl);

  if (!detailResult.success || !detailResult.html) {
    console.error("Failed to fetch detail page:", detailResult.error);
    process.exit(1);
  }

  console.log(`[6] Running terraCaboVerdePlugin.extract (${detailResult.html.length} bytes)...`);
  const extractResult = terraCaboVerdePlugin.extract(detailResult.html, listing.detailUrl);

  console.log("\n[7] Extraction result:");
  console.log(JSON.stringify({
    success: extractResult.success,
    bedrooms: extractResult.bedrooms,
    bathrooms: extractResult.bathrooms,
    parkingSpaces: extractResult.parkingSpaces,
    terraceArea: extractResult.terraceArea,
    amenities: extractResult.amenities,
    title: extractResult.title,
    imageCount: extractResult.imageUrls.length,
    descriptionLength: extractResult.description?.length || 0,
  }, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
