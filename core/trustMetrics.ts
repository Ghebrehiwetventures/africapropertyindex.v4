import { checkTitle } from "./goldenRules";
import { TrustStageInput, TrustStageListingResult } from "./trustStage";

export interface IngestRunMetricInput {
  market: string;
  startedAt: string;
  completedAt: string;
  listings: TrustStageInput[];
  trustResults: TrustStageListingResult[];
}

export interface IngestRunRecordInput {
  market: string;
  started_at: string;
  completed_at: string;
  status: string;
  total_listings: number;
  public_count: number;
  indexable_count: number;
  tier_a_count: number;
  tier_b_count: number;
  tier_c_count: number;
  run_delta_pct?: number | null;
  warning_flags: string[];
}

export interface SourceRunMetricRecordInput {
  market: string;
  source_id: string;
  fetched_count: number;
  public_count: number;
  indexable_count: number;
  tier_a_count: number;
  tier_b_count: number;
  tier_c_count: number;
  without_price_pct: number;
  without_location_pct: number;
  multi_domain_gallery_rate: number;
  duplicate_cover_rate: number;
  price_completeness: number;
  location_completeness: number;
  image_validity_rate: number;
  duplicate_rate: number;
  freshness: number;
  title_cleanliness: number;
  quality_score: number;
  warning_flags: string[];
}

function pct(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 10000) / 100;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeQualityScore(metric: Omit<SourceRunMetricRecordInput, "quality_score" | "warning_flags" | "market" | "source_id">): number {
  return roundScore(
    metric.price_completeness * 0.25 +
      metric.location_completeness * 0.2 +
      metric.image_validity_rate * 0.2 +
      (100 - metric.duplicate_rate) * 0.15 +
      metric.freshness * 0.1 +
      metric.title_cleanliness * 0.1
  );
}

export function computeTrustMetrics(
  input: IngestRunMetricInput
): {
  runRecord: IngestRunRecordInput;
  sourceMetrics: SourceRunMetricRecordInput[];
} {
  const trustById = new Map(input.trustResults.map((result) => [result.listingId, result]));

  const tierCounts = {
    A: input.trustResults.filter((result) => result.trust_tier === "A").length,
    B: input.trustResults.filter((result) => result.trust_tier === "B").length,
    C: input.trustResults.filter((result) => result.trust_tier === "C").length,
  };

  const sourceGroups = new Map<string, TrustStageInput[]>();
  for (const listing of input.listings) {
    const group = sourceGroups.get(listing.sourceId) || [];
    group.push(listing);
    sourceGroups.set(listing.sourceId, group);
  }

  const sourceMetrics: SourceRunMetricRecordInput[] = [];

  for (const [sourceId, listings] of sourceGroups.entries()) {
    const sourceResults = listings
      .map((listing) => trustById.get(listing.id))
      .filter((result): result is TrustStageListingResult => result != null);

    const fetchedCount = listings.length;
    const publicCount = sourceResults.filter((result) => result.trust_gate_passed).length;
    const indexableCount = sourceResults.filter((result) => result.indexable).length;
    const tierA = sourceResults.filter((result) => result.trust_tier === "A").length;
    const tierB = sourceResults.filter((result) => result.trust_tier === "B").length;
    const tierC = sourceResults.filter((result) => result.trust_tier === "C").length;
    const withoutPrice = sourceResults.filter((result) => result.price_status === "missing").length;
    const withoutLocation = sourceResults.filter((result) => result.location_confidence === "missing").length;
    const validImages = sourceResults.filter((result) => result.has_valid_image).length;
    const duplicateRows = sourceResults.filter((result) => result.duplicate_risk !== "low").length;
    const duplicateCoverRows = sourceResults.filter((result) =>
      result.review_reasons.includes("DUPLICATE_COVER_IMAGE")
    ).length;
    const multiDomainRows = sourceResults.filter((result) => result.multi_domain_gallery).length;
    const cleanTitles = listings.filter((listing) => !checkTitle(listing.title)).length;

    const baseMetric = {
      fetched_count: fetchedCount,
      public_count: publicCount,
      indexable_count: indexableCount,
      tier_a_count: tierA,
      tier_b_count: tierB,
      tier_c_count: tierC,
      without_price_pct: pct(withoutPrice, fetchedCount),
      without_location_pct: pct(withoutLocation, fetchedCount),
      multi_domain_gallery_rate: pct(multiDomainRows, fetchedCount),
      duplicate_cover_rate: pct(duplicateCoverRows, fetchedCount),
      price_completeness: pct(fetchedCount - withoutPrice, fetchedCount),
      location_completeness: pct(fetchedCount - withoutLocation, fetchedCount),
      image_validity_rate: pct(validImages, fetchedCount),
      duplicate_rate: pct(duplicateRows, fetchedCount),
      freshness: 100,
      title_cleanliness: pct(cleanTitles, fetchedCount),
    };

    sourceMetrics.push({
      market: input.market,
      source_id: sourceId,
      ...baseMetric,
      quality_score: computeQualityScore(baseMetric),
      warning_flags: [],
    });
  }

  return {
    runRecord: {
      market: input.market,
      started_at: input.startedAt,
      completed_at: input.completedAt,
      status: "completed",
      total_listings: input.trustResults.length,
      public_count: tierCounts.A + tierCounts.B,
      indexable_count: tierCounts.A,
      tier_a_count: tierCounts.A,
      tier_b_count: tierCounts.B,
      tier_c_count: tierCounts.C,
      warning_flags: [],
    },
    sourceMetrics,
  };
}
