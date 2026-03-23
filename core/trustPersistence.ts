import { getSupabaseClient } from "./supabaseClient";
import { ListingImageRecord } from "./listingImageValidator";
import { DuplicateMatchRow } from "./trustStage";
import {
  IngestRunRecordInput,
  SourceRunMetricRecordInput,
} from "./trustMetrics";

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export async function replaceListingImages(imageRows: ListingImageRecord[]): Promise<void> {
  if (imageRows.length === 0) return;

  const supabase = getSupabaseClient();
  const listingIds = unique(imageRows.map((row) => row.listing_id));

  const { error: deleteError } = await supabase
    .from("listing_images")
    .delete()
    .in("listing_id", listingIds);

  if (deleteError) {
    throw new Error(`listing_images delete failed: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase
    .from("listing_images")
    .insert(imageRows);

  if (insertError) {
    throw new Error(`listing_images insert failed: ${insertError.message}`);
  }
}

export async function replaceDuplicateMatches(
  listingIds: string[],
  duplicateMatches: DuplicateMatchRow[]
): Promise<void> {
  if (listingIds.length === 0) return;

  const supabase = getSupabaseClient();
  const uniqueIds = unique(listingIds);

  const { error: deleteError } = await supabase
    .from("listing_duplicate_matches")
    .delete()
    .in("source_listing_id", uniqueIds);

  if (deleteError) {
    throw new Error(`listing_duplicate_matches delete failed: ${deleteError.message}`);
  }

  if (duplicateMatches.length === 0) return;

  const { error: insertError } = await supabase
    .from("listing_duplicate_matches")
    .insert(duplicateMatches);

  if (insertError) {
    throw new Error(`listing_duplicate_matches insert failed: ${insertError.message}`);
  }
}

async function getPreviousRunSummary(
  market: string
): Promise<{ public_count: number } | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("ingest_runs")
    .select("public_count")
    .eq("market", market)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`[TrustPersistence] Could not read previous ingest run: ${error.message}`);
    return null;
  }

  return data ? { public_count: Number(data.public_count) || 0 } : null;
}

function computeDeltaPct(current: number, previous: number | null): number | null {
  if (previous == null || previous <= 0) return null;
  return Math.round((((current - previous) / previous) * 100) * 100) / 100;
}

function applySourceWarnings(
  sourceMetrics: SourceRunMetricRecordInput[],
  previousBySource: Map<string, number>
): void {
  for (const metric of sourceMetrics) {
    const previousPublicCount = previousBySource.get(metric.source_id);
    if (previousPublicCount == null || previousPublicCount <= 0) continue;

    const deltaPct =
      Math.round((((metric.public_count - previousPublicCount) / previousPublicCount) * 100) * 100) / 100;
    if (Math.abs(deltaPct) > 10) {
      metric.warning_flags.push("PUBLIC_DELTA_GT_10_PERCENT");
    }
  }
}

async function getPreviousSourceCounts(sourceIds: string[]): Promise<Map<string, number>> {
  const supabase = getSupabaseClient();
  const result = new Map<string, number>();
  if (sourceIds.length === 0) return result;

  const { data, error } = await supabase
    .from("source_run_metrics")
    .select("source_id, public_count, ingest_run_id")
    .in("source_id", sourceIds)
    .order("ingest_run_id", { ascending: false });

  if (error) {
    console.warn(`[TrustPersistence] Could not read previous source metrics: ${error.message}`);
    return result;
  }

  for (const row of data || []) {
    const sourceId = String(row.source_id);
    if (!result.has(sourceId)) {
      result.set(sourceId, Number(row.public_count) || 0);
    }
  }

  return result;
}

export async function persistRunAndSourceMetrics(
  runRecord: IngestRunRecordInput,
  sourceMetrics: SourceRunMetricRecordInput[]
): Promise<number | null> {
  const supabase = getSupabaseClient();
  const previousRun = await getPreviousRunSummary(runRecord.market);
  runRecord.run_delta_pct = computeDeltaPct(
    runRecord.public_count,
    previousRun?.public_count ?? null
  );

  if (runRecord.run_delta_pct != null && Math.abs(runRecord.run_delta_pct) > 10) {
    runRecord.warning_flags.push("PUBLIC_COUNT_DELTA_GT_10_PERCENT");
  }

  const previousBySource = await getPreviousSourceCounts(
    sourceMetrics.map((metric) => metric.source_id)
  );
  applySourceWarnings(sourceMetrics, previousBySource);

  const { data, error } = await supabase
    .from("ingest_runs")
    .insert(runRecord)
    .select("id")
    .single();

  if (error) {
    throw new Error(`ingest_runs insert failed: ${error.message}`);
  }

  const ingestRunId = Number(data.id);
  if (!Number.isFinite(ingestRunId)) {
    return null;
  }

  if (sourceMetrics.length > 0) {
    const payload = sourceMetrics.map((metric) => ({
      ...metric,
      ingest_run_id: ingestRunId,
    }));

    const { error: metricsError } = await supabase
      .from("source_run_metrics")
      .insert(payload);

    if (metricsError) {
      throw new Error(`source_run_metrics insert failed: ${metricsError.message}`);
    }
  }

  return ingestRunId;
}
