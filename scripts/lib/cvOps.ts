import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const CV_MARKET = "cv";
export const STALE_REVIEW_REASON = "STALE";
export const STALE_REASON = "LAST_SEEN_GT_14_DAYS";
export const SOLD_RESERVED_SOURCES = [
  "cv_terracaboverde",
  "cv_cabohouseproperty",
  "cv_oceanproperty24",
] as const;

export interface RunSummaryRow {
  id: number;
  market: string;
  started_at: string;
  completed_at: string | null;
  total_listings: number;
  public_count: number;
  indexable_count: number;
  tier_a_count: number;
  tier_b_count: number;
  tier_c_count: number;
  run_delta_pct: number | null;
  warning_flags: string[];
}

export interface FeedCounts {
  publicCount: number;
  indexableCount: number;
  islandsCount: number;
  islands: string[];
}

export interface SourceDeltaRow {
  sourceId: string;
  publicCount: number;
  previousPublicCount: number;
  publicDelta: number;
  indexableCount: number;
  previousIndexableCount: number;
  indexableDelta: number;
  qualityScore: number;
  previousQualityScore: number;
}

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set");
  }
  return databaseUrl;
}

export async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: requireDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export function ensureOpsArtifactsDir(): string {
  const dir = path.resolve(__dirname, "../../artifacts/ops");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeArtifactPair(baseName: string, payload: unknown, text: string): {
  jsonPath: string;
  textPath: string;
} {
  const dir = ensureOpsArtifactsDir();
  const jsonPath = path.join(dir, `${baseName}.json`);
  const textPath = path.join(dir, `${baseName}.txt`);
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(textPath, text);
  return { jsonPath, textPath };
}

export function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return Math.round((((current - previous) / previous) * 100) * 100) / 100;
}

export async function getRunPair(client: Client, market: string = CV_MARKET): Promise<{
  latest: RunSummaryRow;
  previous: RunSummaryRow | null;
}> {
  const result = await client.query<RunSummaryRow>(
    `
      SELECT
        id,
        market,
        started_at,
        completed_at,
        total_listings,
        public_count,
        indexable_count,
        tier_a_count,
        tier_b_count,
        tier_c_count,
        run_delta_pct,
        warning_flags
      FROM public.ingest_runs
      WHERE market = $1
        AND status = 'completed'
      ORDER BY started_at DESC
      LIMIT 2
    `,
    [market]
  );

  if (result.rows.length === 0) {
    throw new Error(`No completed ingest_runs found for market=${market}`);
  }

  return {
    latest: result.rows[0],
    previous: result.rows[1] ?? null,
  };
}

export async function getFeedCounts(client: Client): Promise<FeedCounts> {
  const result = await client.query<{
    public_count: string;
    indexable_count: string;
    islands_count: string;
    islands: string[] | null;
  }>(
    `
      SELECT
        (SELECT COUNT(*)::text FROM public.v1_feed_cv) AS public_count,
        (SELECT COUNT(*)::text FROM public.v1_feed_cv_indexable) AS indexable_count,
        (
          SELECT COUNT(DISTINCT island)::text
          FROM public.v1_feed_cv
          WHERE island IS NOT NULL
        ) AS islands_count,
        (
          SELECT ARRAY(
            SELECT DISTINCT island
            FROM public.v1_feed_cv
            WHERE island IS NOT NULL
            ORDER BY island
          )
        ) AS islands
    `
  );

  const row = result.rows[0];
  return {
    publicCount: Number(row.public_count) || 0,
    indexableCount: Number(row.indexable_count) || 0,
    islandsCount: Number(row.islands_count) || 0,
    islands: row.islands ?? [],
  };
}

export async function getLatestScopeReasonCounts(
  client: Client,
  startedAt: string,
  reasons: string[]
): Promise<Record<string, number>> {
  const result = await client.query<{ reason: string; count: string }>(
    `
      SELECT reason, COUNT(*)::text AS count
      FROM (
        SELECT unnest(COALESCE(review_reasons, ARRAY[]::text[])) AS reason
        FROM public.listings
        WHERE source_id ILIKE 'cv_%'
          AND COALESCE(last_seen_at, first_seen_at) >= $1::timestamptz
      ) reasons
      WHERE reason = ANY($2::text[])
      GROUP BY reason
    `,
    [startedAt, reasons]
  );

  const counts: Record<string, number> = {};
  for (const reason of reasons) counts[reason] = 0;
  for (const row of result.rows) counts[row.reason] = Number(row.count) || 0;
  return counts;
}

export async function getTopReviewReasons(
  client: Client,
  startedAt: string,
  limit: number = 10
): Promise<Array<{ reason: string; count: number }>> {
  const result = await client.query<{ reason: string; count: string }>(
    `
      SELECT reason, COUNT(*)::text AS count
      FROM (
        SELECT unnest(COALESCE(review_reasons, ARRAY[]::text[])) AS reason
        FROM public.listings
        WHERE source_id ILIKE 'cv_%'
          AND COALESCE(last_seen_at, first_seen_at) >= $1::timestamptz
      ) reasons
      GROUP BY reason
      ORDER BY COUNT(*) DESC, reason ASC
      LIMIT $2
    `,
    [startedAt, limit]
  );

  return result.rows.map((row) => ({
    reason: row.reason,
    count: Number(row.count) || 0,
  }));
}

export async function getStaleCounts(client: Client): Promise<{
  total: number;
  bySource: Array<{ sourceId: string; count: number }>;
}> {
  const [totalResult, bySourceResult] = await Promise.all([
    client.query<{ stale_total: string }>(
      `
        SELECT COUNT(*)::text AS stale_total
        FROM public.listings
        WHERE source_id ILIKE 'cv_%'
          AND COALESCE(is_stale, false) = true
      `
    ),
    client.query<{ source_id: string; count: string }>(
      `
        SELECT source_id, COUNT(*)::text AS count
        FROM public.listings
        WHERE source_id ILIKE 'cv_%'
          AND COALESCE(is_stale, false) = true
        GROUP BY source_id
        ORDER BY COUNT(*) DESC, source_id ASC
      `
    ),
  ]);

  return {
    total: Number(totalResult.rows[0]?.stale_total ?? 0),
    bySource: bySourceResult.rows.map((row) => ({
      sourceId: row.source_id,
      count: Number(row.count) || 0,
    })),
  };
}

export async function getSoldReservedCountsBySource(
  client: Client,
  startedAt: string
): Promise<Record<string, number>> {
  const result = await client.query<{ source_id: string; count: string }>(
    `
      SELECT source_id, COUNT(*)::text AS count
      FROM public.listings
      WHERE source_id = ANY($1::text[])
        AND COALESCE(last_seen_at, first_seen_at) >= $2::timestamptz
        AND COALESCE(review_reasons, ARRAY[]::text[]) @> ARRAY['SOLD_OR_RESERVED']::text[]
      GROUP BY source_id
    `,
    [SOLD_RESERVED_SOURCES, startedAt]
  );

  const counts: Record<string, number> = {};
  for (const sourceId of SOLD_RESERVED_SOURCES) counts[sourceId] = 0;
  for (const row of result.rows) counts[row.source_id] = Number(row.count) || 0;
  return counts;
}

export async function getSourceDeltas(
  client: Client,
  latestRunId: number,
  previousRunId: number | null
): Promise<SourceDeltaRow[]> {
  const result = await client.query<{
    source_id: string;
    public_count: number;
    previous_public_count: number | null;
    indexable_count: number;
    previous_indexable_count: number | null;
    quality_score: number;
    previous_quality_score: number | null;
  }>(
    `
      SELECT
        latest.source_id,
        latest.public_count,
        previous.public_count AS previous_public_count,
        latest.indexable_count,
        previous.indexable_count AS previous_indexable_count,
        latest.quality_score,
        previous.quality_score AS previous_quality_score
      FROM public.source_run_metrics latest
      LEFT JOIN public.source_run_metrics previous
        ON previous.ingest_run_id = $2
       AND previous.source_id = latest.source_id
      WHERE latest.ingest_run_id = $1
      ORDER BY latest.public_count DESC, latest.source_id ASC
    `,
    [latestRunId, previousRunId]
  );

  return result.rows.map((row) => {
    const previousPublicCount = Number(row.previous_public_count ?? 0);
    const previousIndexableCount = Number(row.previous_indexable_count ?? 0);
    const previousQualityScore = Number(row.previous_quality_score ?? 0);
    const publicCount = Number(row.public_count ?? 0);
    const indexableCount = Number(row.indexable_count ?? 0);
    const qualityScore = Number(row.quality_score ?? 0);

    return {
      sourceId: row.source_id,
      publicCount,
      previousPublicCount,
      publicDelta: publicCount - previousPublicCount,
      indexableCount,
      previousIndexableCount,
      indexableDelta: indexableCount - previousIndexableCount,
      qualityScore,
      previousQualityScore,
    };
  });
}

export function formatCountTable(
  rows: Array<{ label: string; value: string | number }>
): string {
  const width = Math.max(...rows.map((row) => row.label.length), 0) + 2;
  return rows
    .map((row) => `${row.label.padEnd(width)} ${String(row.value)}`)
    .join("\n");
}
