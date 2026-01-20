import * as fs from "fs";
import * as path from "path";
import { fetchHtml } from "./fetchHtml";
import { parseGenericHtml, ParsedListing } from "./parseGenericHtml";
import { loadSourcesConfig, SourceConfig } from "./configLoader";
import { runDetailEnrichment } from "./detail/enrich";
import { DetailEnrichmentInput } from "./detail/types";
import { RuleViolation } from "./goldenRules";
import {
  LifecycleState,
  DropReason,
  ObserveReason,
  PreflightMetrics,
  PreflightResult,
  PreflightReport,
  PREFLIGHT_THRESHOLDS,
} from "./preflightTypes";

const MARKET_ID = "cv";

function calculateMetrics(listings: ParsedListing[]): PreflightMetrics {
  const count = listings.length;
  if (count === 0) {
    return {
      listingsCount: 0,
      hasPriceRatio: 0,
      hasImageRatio: 0,
      hasDescriptionRatio: 0,
    };
  }

  const withPrice = listings.filter(
    (l) => l.price !== undefined && l.price > 0
  ).length;
  const withImage = listings.filter(
    (l) => l.imageUrls.length >= PREFLIGHT_THRESHOLDS.minImagesPerListing
  ).length;
  const withDescription = listings.filter(
    (l) =>
      l.description &&
      l.description.length >= PREFLIGHT_THRESHOLDS.minDescriptionLength
  ).length;

  return {
    listingsCount: count,
    hasPriceRatio: withPrice / count,
    hasImageRatio: withImage / count,
    hasDescriptionRatio: withDescription / count,
  };
}

function classifySource(metrics: PreflightMetrics): {
  state: LifecycleState;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (metrics.listingsCount === 0) {
    return {
      state: LifecycleState.DROP,
      reasons: [DropReason.NO_LISTINGS],
    };
  }

  if (metrics.listingsCount < PREFLIGHT_THRESHOLDS.minListingsForNormal) {
    reasons.push(ObserveReason.LOW_COUNT);
  }

  if (metrics.hasPriceRatio < PREFLIGHT_THRESHOLDS.minPriceRatio) {
    reasons.push(ObserveReason.LOW_PRICE_RATIO);
  }

  if (metrics.hasImageRatio < PREFLIGHT_THRESHOLDS.minImageRatio) {
    reasons.push(ObserveReason.LOW_IMAGE_RATIO);
  }

  if (reasons.length > 0) {
    return { state: LifecycleState.OBSERVE, reasons };
  }

  return { state: LifecycleState.IN, reasons: [] };
}

function meetsThresholds(metrics: PreflightMetrics): boolean {
  return (
    metrics.listingsCount >= PREFLIGHT_THRESHOLDS.minListingsForNormal &&
    metrics.hasPriceRatio >= PREFLIGHT_THRESHOLDS.minPriceRatio &&
    metrics.hasImageRatio >= PREFLIGHT_THRESHOLDS.minImageRatio
  );
}

async function runTrialEnrichment(
  listings: ParsedListing[],
  sourceId: string
): Promise<ParsedListing[]> {
  const sample = listings.slice(0, PREFLIGHT_THRESHOLDS.trialEnrichmentLimit);

  const inputs: DetailEnrichmentInput[] = sample
    .filter((l) => l.detailUrl)
    .map((l) => ({
      listingId: l.id,
      sourceId,
      detailUrl: l.detailUrl!,
      currentTitle: l.title,
      currentPrice: l.price,
      currentDescription: l.description,
      currentImageUrls: l.imageUrls,
      currentLocation: l.location,
      violations: [
        RuleViolation.INSUFFICIENT_IMAGES,
        RuleViolation.DESCRIPTION_TOO_SHORT,
      ],
    }));

  if (inputs.length === 0) {
    return listings;
  }

  const { results } = await runDetailEnrichment(inputs, inputs.length);

  const enrichedMap = new Map(results.map((r) => [r.listingId, r]));
  return listings.map((l) => {
    const enriched = enrichedMap.get(l.id);
    if (enriched && enriched.success) {
      return {
        ...l,
        title: enriched.title || l.title,
        price: enriched.price || l.price,
        description: enriched.description || l.description,
        imageUrls:
          enriched.imageUrls.length > l.imageUrls.length
            ? enriched.imageUrls
            : l.imageUrls,
        location: enriched.location || l.location,
      };
    }
    return l;
  });
}

async function preflightSource(source: SourceConfig): Promise<PreflightResult> {
  const timestamp = new Date().toISOString();

  const fetchResult = await fetchHtml(source.url, source.userAgent);

  if (!fetchResult.success || !fetchResult.html) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      lifecycleState: LifecycleState.OBSERVE,
      metrics: {
        listingsCount: 0,
        hasPriceRatio: 0,
        hasImageRatio: 0,
        hasDescriptionRatio: 0,
      },
      reasons: [`FETCH_FAILED: ${fetchResult.error || "Unknown error"}`],
      timestamp,
      trialEnrichmentDone: false,
      promotedToIn: false,
    };
  }

  let listings = parseGenericHtml(
    fetchResult.html,
    source.id,
    source.name,
    source.url
  );

  let metrics = calculateMetrics(listings);
  let { state, reasons } = classifySource(metrics);

  let trialEnrichmentDone = false;
  let promotedToIn = false;

  if (state === LifecycleState.OBSERVE && listings.length > 0) {
    listings = await runTrialEnrichment(listings, source.id);
    trialEnrichmentDone = true;

    metrics = calculateMetrics(listings);

    if (meetsThresholds(metrics)) {
      state = LifecycleState.IN;
      reasons = [];
      promotedToIn = true;
    } else {
      const reclassified = classifySource(metrics);
      state = reclassified.state;
      reasons = reclassified.reasons;
    }
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    lifecycleState: state,
    metrics,
    reasons,
    timestamp,
    trialEnrichmentDone,
    promotedToIn,
  };
}

function generateTimestampFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `cv_preflight_${yyyy}${mm}${dd}_${hh}${min}${ss}.json`;
}

function findAvailableFilename(reportsDir: string, base: string): string {
  const basePath = path.join(reportsDir, base);
  if (!fs.existsSync(basePath)) {
    return basePath;
  }

  const ext = path.extname(base);
  const name = path.basename(base, ext);

  let suffix = 1;
  while (suffix < 100) {
    const suffixStr = String(suffix).padStart(2, "0");
    const candidate = path.join(reportsDir, `${name}_${suffixStr}${ext}`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
    suffix++;
  }

  throw new Error(`Cannot find available filename for ${base}`);
}

function persistReport(report: PreflightReport): string {
  const reportsDir = path.resolve(__dirname, "../reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const baseFilename = generateTimestampFilename();
  const filepath = findAvailableFilename(reportsDir, baseFilename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), "utf-8");
  return filepath;
}

export async function runPreflightCv(): Promise<PreflightReport> {
  const configResult = loadSourcesConfig(MARKET_ID);

  if (!configResult.success || !configResult.data) {
    throw new Error(`Failed to load sources config: ${configResult.error}`);
  }

  const sources = configResult.data.sources;
  const results: PreflightResult[] = [];

  for (const source of sources) {
    const result = await preflightSource(source);
    results.push(result);
  }

  const summary = {
    total: results.length,
    inCount: results.filter((r) => r.lifecycleState === LifecycleState.IN)
      .length,
    observeCount: results.filter(
      (r) => r.lifecycleState === LifecycleState.OBSERVE
    ).length,
    dropCount: results.filter((r) => r.lifecycleState === LifecycleState.DROP)
      .length,
  };

  const report: PreflightReport = {
    marketId: MARKET_ID,
    generatedAt: new Date().toISOString(),
    results,
    summary,
  };

  persistReport(report);

  return report;
}

if (require.main === module) {
  runPreflightCv()
    .then((report) => {
      console.log(`Preflight complete: ${report.summary.total} sources`);
      console.log(`  IN: ${report.summary.inCount}`);
      console.log(`  OBSERVE: ${report.summary.observeCount}`);
      console.log(`  DROP: ${report.summary.dropCount}`);
    })
    .catch((err) => {
      console.error("Preflight failed:", err);
      process.exit(1);
    });
}
