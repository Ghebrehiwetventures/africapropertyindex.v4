import {
  DetailEnrichmentInput,
  DetailEnrichmentResult,
  EnrichmentSummary,
} from "./types";
import { DetailQueue } from "./queue";
import { getStrategyFactory } from "./strategyFactory";
import { generateCanonicalId } from "./canonicalId";
import { fetchHtml, FetchResult, FetchOptions } from "../fetchHtml";
import { RuleViolation } from "../goldenRules";
import { SourceStatus } from "../status";

// Browser-like headers for SimplyCapeVerde to reduce CAPTCHA triggers
const SIMPLY_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9,sv-SE;q=0.8,sv;q=0.7",
  "Referer": "https://simplycapeverde.com/",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function needsEnrichment(violations: RuleViolation[]): boolean {
  return violations.some(
    (v) =>
      v === RuleViolation.INSUFFICIENT_IMAGES ||
      v === RuleViolation.DESCRIPTION_TOO_SHORT
  );
}

/**
 * Check if URL looks like a Terra list page (not a detail page)
 * List pages have patterns like ?e-page- or pathname /properties or /properties/
 */
function isTerraListPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Check query string for pagination
    if (parsed.search.includes("e-page-")) {
      return true;
    }
    // Check pathname for /properties (list pages)
    const pathname = parsed.pathname;
    if (pathname === "/properties" || pathname === "/properties/") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function runDetailEnrichment(
  inputs: DetailEnrichmentInput[],
  maxPages: number = 2
): Promise<{
  results: DetailEnrichmentResult[];
  summary: EnrichmentSummary;
  pausedSource?: { sourceId: string; status: SourceStatus };
}> {
  const factory = getStrategyFactory();

  const enrichable = inputs.filter((input) => {
    if (!input.detailUrl) return false;
    // DEBUG_TERRA override: bypass needsEnrichment check for Terra
    const debugTerraOverride = process.env.DEBUG_TERRA === "1" && input.sourceId === "cv_terracaboverde";
    // Simply Cape Verde always requires detail enrichment for Golden quality
    const forceDetailForSimply = input.sourceId === "cv_simplycapeverde";
    if (!debugTerraOverride && !forceDetailForSimply && !needsEnrichment(input.violations)) return false;
    if (!factory.hasPlugin(input.sourceId)) return false;
    return true;
  });

  console.log(`[Enrichment] ${enrichable.length} eligible (of ${inputs.length})`);

  if (enrichable.length === 0) {
    return {
      results: [],
      summary: { totalProcessed: 0, successCount: 0, failedCount: 0, skippedCount: 0, enrichedCount: 0 },
    };
  }

  const toProcess = enrichable.slice(0, maxPages);
  console.log(`[Enrichment] Processing ${toProcess.length} (limit: ${maxPages})`);

  const queue = new DetailQueue(3000, 5000);
  queue.enqueueAll(toProcess);

  const results: DetailEnrichmentResult[] = [];
  let stoppedReason: "CAPTCHA" | "HTTP_403" | "HTTP_429" | undefined;
  let pausedSource: { sourceId: string; status: SourceStatus } | undefined;

  while (!queue.isEmpty()) {
    const delayMs = queue.getDelayForNext();
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const input = queue.dequeue();
    if (!input) break;

    const listingId = input.listingId;
    const detailUrl = input.detailUrl;

    const plugin = factory.getPlugin(input.sourceId);
    if (!plugin) continue;

    // Check for Terra list page guard before fetching
    if (isTerraListPage(detailUrl)) {
      console.log(`[Enrichment] ↷ ${listingId} url=${detailUrl} reason=list page guard`);
      results.push({
        listingId,
        detailUrl,
        success: false,
        enriched: false,
        skipped: true,
        skippedReason: "list page guard",
        imageUrls: input.currentImageUrls,
      });
      continue;
    }

    console.log(`[Enrichment] Fetching ${listingId}...`);

    // SimplyCapeVerde: extra delay + browser headers to reduce CAPTCHA
    const isSimply = input.sourceId === "cv_simplycapeverde";
    if (isSimply) {
      const extraDelay = 8000 + Math.floor(Math.random() * 4000); // 8-12s jitter
      console.log(`[Enrichment] Simply rate-limit: waiting ${extraDelay}ms`);
      await sleep(extraDelay);
    }

    const fetchOpts: FetchOptions | undefined = isSimply
      ? { headers: SIMPLY_BROWSER_HEADERS }
      : undefined;
    const fetchResult: FetchResult = await fetchHtml(detailUrl, fetchOpts);

    // CAPTCHA/403/429 handling
    // Simply: skip listing and continue (don't stop the whole run)
    // Other sources: pause and stop
    if (fetchResult.statusCode === 403) {
      if (input.sourceId === "cv_simplycapeverde") {
        console.log(`[Enrichment] ✗ ${listingId} url=${detailUrl} reason=403`);
        results.push({ listingId, detailUrl, success: false, enriched: false, skipped: true, skippedReason: "403", imageUrls: input.currentImageUrls });
        continue;
      }
      stoppedReason = "HTTP_403";
      pausedSource = { sourceId: input.sourceId, status: SourceStatus.PAUSED_BY_SYSTEM };
      console.log(`[Enrichment] 403 - PAUSED_BY_SYSTEM`);
      break;
    }

    if (fetchResult.statusCode === 429) {
      if (input.sourceId === "cv_simplycapeverde") {
        console.log(`[Enrichment] ✗ ${listingId} url=${detailUrl} reason=429`);
        results.push({ listingId, detailUrl, success: false, enriched: false, skipped: true, skippedReason: "429", imageUrls: input.currentImageUrls });
        continue;
      }
      stoppedReason = "HTTP_429";
      pausedSource = { sourceId: input.sourceId, status: SourceStatus.PAUSED_BY_SYSTEM };
      console.log(`[Enrichment] 429 - PAUSED_BY_SYSTEM`);
      break;
    }

    if (fetchResult.html && fetchResult.html.toLowerCase().includes("captcha")) {
      if (input.sourceId === "cv_simplycapeverde") {
        console.log(`[Enrichment] ✗ ${listingId} url=${detailUrl} reason=captcha`);
        results.push({ listingId, detailUrl, success: false, enriched: false, skipped: true, skippedReason: "captcha", imageUrls: input.currentImageUrls });
        continue;
      }
      stoppedReason = "CAPTCHA";
      pausedSource = { sourceId: input.sourceId, status: SourceStatus.PAUSED_BY_SYSTEM };
      console.log(`[Enrichment] CAPTCHA - PAUSED_BY_SYSTEM`);
      break;
    }

    if (!fetchResult.success || !fetchResult.html) {
      console.log(`[Enrichment] ✗ ${listingId} url=${detailUrl} reason=fetch failed: ${fetchResult.error || "no html"}`);
      results.push({
        listingId,
        detailUrl,
        success: false,
        enriched: false,
        imageUrls: input.currentImageUrls,
        error: fetchResult.error,
      });
      continue;
    }

    const extractResult = plugin.extract(fetchResult.html, detailUrl);

    if (!extractResult.success) {
      console.log(`[Enrichment] ✗ ${listingId} url=${detailUrl} reason=plugin returned success:false`);
      results.push({
        listingId,
        detailUrl,
        success: false,
        enriched: false,
        imageUrls: input.currentImageUrls,
        error: extractResult.error,
      });
      continue;
    }

    const allImages = [...input.currentImageUrls];
    for (const img of extractResult.imageUrls) {
      if (!allImages.includes(img)) allImages.push(img);
    }

    const wasEnriched =
      allImages.length > input.currentImageUrls.length ||
      (extractResult.description?.length || 0) > (input.currentDescription?.length || 0);

    const canonicalId = generateCanonicalId(
      input.sourceId,
      extractResult.title || input.currentTitle,
      extractResult.price || input.currentPrice,
      extractResult.location || input.currentLocation
    );

    results.push({
      listingId,
      detailUrl,
      success: true,
      enriched: wasEnriched,
      canonicalId,
      title: extractResult.title || input.currentTitle,
      price: extractResult.price || input.currentPrice,
      description: extractResult.description || input.currentDescription,
      imageUrls: allImages,
      location: extractResult.location || input.currentLocation,
      // Structured property data from extraction
      bedrooms: extractResult.bedrooms,
      bathrooms: extractResult.bathrooms,
      parkingSpaces: extractResult.parkingSpaces,
      terraceArea: extractResult.terraceArea,
      amenities: extractResult.amenities,
    });

    console.log(`[Enrichment] ✓ ${listingId} (enriched: ${wasEnriched})`);
  }

  return {
    results,
    summary: {
      totalProcessed: results.length,
      successCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success && !r.skipped).length,
      skippedCount: results.filter((r) => r.skipped).length,
      enrichedCount: results.filter((r) => r.enriched).length,
      stoppedReason,
    },
    pausedSource,
  };
}
