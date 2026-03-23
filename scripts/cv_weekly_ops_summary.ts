import {
  CV_MARKET,
  writeArtifactPair,
  withClient,
} from "./lib/cvOps";

interface WeeklyOpsSummary {
  market: string;
  generatedAt: string;
  windowDays: number;
  runCount: number;
  publicRange: {
    min: number;
    max: number;
    latest: number;
  };
  indexableRange: {
    min: number;
    max: number;
    latest: number;
  };
  latestWarnings: string[];
  latestRunAt: string | null;
  sourceWinners: Array<{ sourceId: string; publicDelta: number }>;
  sourceLosers: Array<{ sourceId: string; publicDelta: number }>;
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const windowDays = 7;

  const summary = await withClient<WeeklyOpsSummary>(async (client) => {
    const runsResult = await client.query<{
      id: number;
      started_at: string;
      public_count: number;
      indexable_count: number;
      warning_flags: string[];
    }>(
      `
        SELECT id, started_at, public_count, indexable_count, warning_flags
        FROM public.ingest_runs
        WHERE market = $1
          AND status = 'completed'
          AND started_at >= now() - interval '7 days'
        ORDER BY started_at ASC
      `,
      [CV_MARKET]
    );

    const latestSourceDeltasResult = await client.query<{
      source_id: string;
      public_delta: number;
    }>(
      `
        WITH latest_two AS (
          SELECT id, started_at
          FROM public.ingest_runs
          WHERE market = $1
            AND status = 'completed'
          ORDER BY started_at DESC
          LIMIT 2
        ),
        latest AS (
          SELECT id
          FROM latest_two
          ORDER BY started_at DESC
          LIMIT 1
        ),
        previous_run AS (
          SELECT id
          FROM latest_two
          ORDER BY started_at ASC
          LIMIT 1
        )
        SELECT
          current.source_id,
          current.public_count - COALESCE(prev_metrics.public_count, 0) AS public_delta
        FROM public.source_run_metrics current
        CROSS JOIN latest
        LEFT JOIN previous_run
          ON true
        LEFT JOIN public.source_run_metrics prev_metrics
          ON prev_metrics.ingest_run_id = previous_run.id
         AND prev_metrics.source_id = current.source_id
        WHERE current.ingest_run_id = latest.id
        ORDER BY public_delta DESC, current.source_id ASC
      `,
      [CV_MARKET]
    );

    const runs = runsResult.rows;
    const publicCounts = runs.map((row) => Number(row.public_count) || 0);
    const indexableCounts = runs.map((row) => Number(row.indexable_count) || 0);
    const deltas = latestSourceDeltasResult.rows.map((row) => ({
      sourceId: row.source_id,
      publicDelta: Number(row.public_delta) || 0,
    }));
    const latestRun = runs[runs.length - 1] ?? null;

    return {
      market: CV_MARKET,
      generatedAt,
      windowDays,
      runCount: runs.length,
      publicRange: {
        min: publicCounts.length > 0 ? Math.min(...publicCounts) : 0,
        max: publicCounts.length > 0 ? Math.max(...publicCounts) : 0,
        latest: publicCounts[publicCounts.length - 1] ?? 0,
      },
      indexableRange: {
        min: indexableCounts.length > 0 ? Math.min(...indexableCounts) : 0,
        max: indexableCounts.length > 0 ? Math.max(...indexableCounts) : 0,
        latest: indexableCounts[indexableCounts.length - 1] ?? 0,
      },
      latestWarnings: latestRun?.warning_flags ?? [],
      latestRunAt: latestRun?.started_at ?? null,
      sourceWinners: deltas.filter((row) => row.publicDelta > 0).slice(0, 5),
      sourceLosers: deltas
        .filter((row) => row.publicDelta < 0)
        .sort((a, b) => a.publicDelta - b.publicDelta)
        .slice(0, 5),
    };
  });

  const lines = [
    "CV weekly ops summary",
    "",
    `Runs last 7d: ${summary.runCount}`,
    `Public range: ${summary.publicRange.min} -> ${summary.publicRange.max} (latest ${summary.publicRange.latest})`,
    `Indexable range: ${summary.indexableRange.min} -> ${summary.indexableRange.max} (latest ${summary.indexableRange.latest})`,
  ];

  if (summary.sourceWinners.length > 0) {
    lines.push("", "Top source gains");
    for (const row of summary.sourceWinners) {
      lines.push(`- ${row.sourceId}: +${row.publicDelta}`);
    }
  }

  if (summary.sourceLosers.length > 0) {
    lines.push("", "Top source losses");
    for (const row of summary.sourceLosers) {
      lines.push(`- ${row.sourceId}: ${row.publicDelta}`);
    }
  }

  if (summary.latestWarnings.length > 0) {
    lines.push("", "Latest warnings");
    for (const warning of summary.latestWarnings) {
      lines.push(`- ${warning}`);
    }
  }

  const text = lines.join("\n");
  const { jsonPath, textPath } = writeArtifactPair("cv_weekly_ops_summary", summary, text);

  console.log(text);
  console.log(`\nJSON: ${jsonPath}`);
  console.log(`Text: ${textPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
