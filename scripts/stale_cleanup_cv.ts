import {
  CV_MARKET,
  STALE_REASON,
  STALE_REVIEW_REASON,
  formatCountTable,
  writeArtifactPair,
  withClient,
} from "./lib/cvOps";

const DEFAULT_STALE_DAYS = 14;

interface StaleCleanupResult {
  market: string;
  staleDays: number;
  generatedAt: string;
  thresholdAt: string;
  reactivatedCount: number;
  staleMarkedCount: number;
  staleTotal: number;
  staleBySource: Array<{ sourceId: string; count: number }>;
  affectedExamples: Array<{
    id: string;
    sourceId: string;
    title: string | null;
    lastSeenAt: string | null;
    action: "marked_stale" | "reactivated";
  }>;
  policy: {
    deletesListings: boolean;
    feedBehavior: string;
    adminBehavior: string;
  };
}

async function main(): Promise<void> {
  const staleDays = Number.parseInt(process.env.STALE_DAYS || `${DEFAULT_STALE_DAYS}`, 10);
  if (!Number.isFinite(staleDays) || staleDays <= 0) {
    throw new Error(`Invalid STALE_DAYS=${process.env.STALE_DAYS}`);
  }

  const generatedAt = new Date().toISOString();

  const result = await withClient<StaleCleanupResult>(async (client) => {
    const thresholdResult = await client.query<{ threshold_at: string }>(
      `SELECT (now() - make_interval(days => $1))::timestamptz AS threshold_at`,
      [staleDays]
    );
    const thresholdAt = thresholdResult.rows[0].threshold_at;

    const reactivated = await client.query<{
      id: string;
      source_id: string;
      title: string | null;
      last_seen_at: string | null;
    }>(
      `
        UPDATE public.listings
        SET
          is_stale = false,
          stale_at = NULL,
          stale_reason = NULL,
          last_reactivated_at = now(),
          review_reasons = array_remove(COALESCE(review_reasons, ARRAY[]::text[]), $1)
        WHERE source_id ILIKE 'cv_%'
          AND COALESCE(is_stale, false) = true
          AND COALESCE(last_seen_at, first_seen_at) >= $2::timestamptz
        RETURNING id, source_id, title, last_seen_at
      `,
      [STALE_REVIEW_REASON, thresholdAt]
    );

    const marked = await client.query<{
      id: string;
      source_id: string;
      title: string | null;
      last_seen_at: string | null;
    }>(
      `
        UPDATE public.listings
        SET
          is_stale = true,
          stale_at = COALESCE(stale_at, now()),
          stale_reason = $1,
          last_reactivated_at = CASE
            WHEN COALESCE(is_stale, false) = true THEN last_reactivated_at
            ELSE NULL
          END,
          approved = false,
          indexable = false,
          review_reasons = CASE
            WHEN array_position(COALESCE(review_reasons, ARRAY[]::text[]), $2) IS NULL
              THEN array_append(COALESCE(review_reasons, ARRAY[]::text[]), $2)
            ELSE COALESCE(review_reasons, ARRAY[]::text[])
          END
        WHERE source_id ILIKE 'cv_%'
          AND COALESCE(last_seen_at, first_seen_at) < $3::timestamptz
          AND (
            COALESCE(is_stale, false) = false
            OR approved = true
            OR COALESCE(indexable, false) = true
            OR array_position(COALESCE(review_reasons, ARRAY[]::text[]), $2) IS NULL
          )
        RETURNING id, source_id, title, last_seen_at
      `,
      [STALE_REASON, STALE_REVIEW_REASON, thresholdAt]
    );

    const staleTotalResult = await client.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM public.listings
        WHERE source_id ILIKE 'cv_%'
          AND COALESCE(is_stale, false) = true
      `
    );

    const staleBySourceResult = await client.query<{ source_id: string; count: string }>(
      `
        SELECT source_id, COUNT(*)::text AS count
        FROM public.listings
        WHERE source_id ILIKE 'cv_%'
          AND COALESCE(is_stale, false) = true
        GROUP BY source_id
        ORDER BY COUNT(*) DESC, source_id ASC
      `
    );

    const affectedExamples = [
      ...marked.rows.slice(0, 5).map((row) => ({
        id: row.id,
        sourceId: row.source_id,
        title: row.title,
        lastSeenAt: row.last_seen_at,
        action: "marked_stale" as const,
      })),
      ...reactivated.rows.slice(0, 5).map((row) => ({
        id: row.id,
        sourceId: row.source_id,
        title: row.title,
        lastSeenAt: row.last_seen_at,
        action: "reactivated" as const,
      })),
    ];

    return {
      market: CV_MARKET,
      staleDays,
      generatedAt,
      thresholdAt,
      reactivatedCount: reactivated.rowCount,
      staleMarkedCount: marked.rowCount,
      staleTotal: Number(staleTotalResult.rows[0]?.count ?? 0),
      staleBySource: staleBySourceResult.rows.map((row) => ({
        sourceId: row.source_id,
        count: Number(row.count) || 0,
      })),
      affectedExamples,
      policy: {
        deletesListings: false,
        feedBehavior:
          "Stale listings remain in listings but are excluded from public feeds via is_stale=false feed filter and latest-run sync.",
        adminBehavior:
          "Stale listings are counted separately via is_stale=true and forced to approved=false / indexable=false until seen again.",
      },
    };
  });

  const lines = [
    "CV stale cleanup",
    "",
    formatCountTable([
      { label: "Market", value: result.market },
      { label: "Stale threshold", value: `${result.staleDays} days` },
      { label: "Marked stale", value: result.staleMarkedCount },
      { label: "Reactivated", value: result.reactivatedCount },
      { label: "Current stale total", value: result.staleTotal },
    ]),
  ];

  if (result.staleBySource.length > 0) {
    lines.push(
      "",
      "Stale by source",
      ...result.staleBySource.map((row) => `- ${row.sourceId}: ${row.count}`)
    );
  }

  const text = lines.join("\n");
  const { jsonPath, textPath } = writeArtifactPair("cv_stale_cleanup", result, text);

  console.log(text);
  console.log(`\nJSON: ${jsonPath}`);
  console.log(`Text: ${textPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
