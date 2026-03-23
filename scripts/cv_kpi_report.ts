import {
  CV_MARKET,
  formatCountTable,
  getFeedCounts,
  getRunPair,
  getSoldReservedCountsBySource,
  getSourceDeltas,
  getStaleCounts,
  getTopReviewReasons,
  pctDelta,
  writeArtifactPair,
  withClient,
} from "./lib/cvOps";

interface KpiReport {
  market: string;
  generatedAt: string;
  latestRun: {
    id: number;
    startedAt: string;
    publicCount: number;
    indexableCount: number;
    tierA: number;
    tierB: number;
    tierC: number;
    warningFlags: string[];
  };
  previousRun: null | {
    id: number;
    startedAt: string;
    publicCount: number;
    indexableCount: number;
  };
  feed: {
    publicCount: number;
    indexableCount: number;
    islandsCount: number;
    islands: string[];
  };
  stale: {
    total: number;
    bySource: Array<{ sourceId: string; count: number }>;
  };
  topReviewReasons: Array<{ reason: string; count: number }>;
  sourceDeltas: Array<{
    sourceId: string;
    publicCount: number;
    previousPublicCount: number;
    publicDelta: number;
    indexableCount: number;
    previousIndexableCount: number;
    indexableDelta: number;
    qualityScore: number;
    previousQualityScore: number;
  }>;
  soldReservedDeltas: Array<{
    sourceId: string;
    current: number;
    previous: number;
    delta: number;
  }>;
  warnings: string[];
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();

  const report = await withClient<KpiReport>(async (client) => {
    const { latest, previous } = await getRunPair(client, CV_MARKET);
    const feed = await getFeedCounts(client);
    const stale = await getStaleCounts(client);
    const topReviewReasons = await getTopReviewReasons(client, latest.started_at, 10);
    const sourceDeltas = await getSourceDeltas(client, latest.id, previous?.id ?? null);
    const currentSoldReserved = await getSoldReservedCountsBySource(client, latest.started_at);
    const previousSoldReserved = previous
      ? await getSoldReservedCountsBySource(client, previous.started_at)
      : {};

    const soldReservedDeltas = Object.keys(currentSoldReserved)
      .sort()
      .map((sourceId) => {
        const current = currentSoldReserved[sourceId] ?? 0;
        const prev = previousSoldReserved[sourceId] ?? 0;
        return {
          sourceId,
          current,
          previous: prev,
          delta: current - prev,
        };
      });

    const warnings: string[] = [];
    const publicDeltaPct = previous ? pctDelta(latest.public_count, previous.public_count) : null;
    const indexableDeltaPct = previous ? pctDelta(latest.indexable_count, previous.indexable_count) : null;

    if (publicDeltaPct != null && Math.abs(publicDeltaPct) > 10) {
      warnings.push(`public_count delta ${publicDeltaPct}% vs previous run`);
    }
    if (indexableDeltaPct != null && Math.abs(indexableDeltaPct) > 10) {
      warnings.push(`indexable_count delta ${indexableDeltaPct}% vs previous run`);
    }
    if (feed.islandsCount !== 7) {
      warnings.push(`islands_count=${feed.islandsCount} (expected 7)`);
    }
    if (latest.warning_flags.length > 0) {
      warnings.push(...latest.warning_flags.map((flag) => `run warning: ${flag}`));
    }

    return {
      market: CV_MARKET,
      generatedAt,
      latestRun: {
        id: latest.id,
        startedAt: latest.started_at,
        publicCount: latest.public_count,
        indexableCount: latest.indexable_count,
        tierA: latest.tier_a_count,
        tierB: latest.tier_b_count,
        tierC: latest.tier_c_count,
        warningFlags: latest.warning_flags ?? [],
      },
      previousRun: previous
        ? {
            id: previous.id,
            startedAt: previous.started_at,
            publicCount: previous.public_count,
            indexableCount: previous.indexable_count,
          }
        : null,
      feed,
      stale,
      topReviewReasons,
      sourceDeltas,
      soldReservedDeltas,
      warnings,
    };
  });

  const lines: string[] = [
    "CV KPI report",
    "",
    formatCountTable([
      { label: "Public", value: report.latestRun.publicCount },
      { label: "Indexable", value: report.latestRun.indexableCount },
      {
        label: "Tier A/B/C",
        value: `${report.latestRun.tierA}/${report.latestRun.tierB}/${report.latestRun.tierC}`,
      },
      { label: "Islands", value: report.feed.islandsCount },
      { label: "Stale", value: report.stale.total },
    ]),
  ];

  if (report.topReviewReasons.length > 0) {
    lines.push("", "Top review reasons");
    for (const row of report.topReviewReasons) {
      lines.push(`- ${row.reason}: ${row.count}`);
    }
  }

  if (report.sourceDeltas.length > 0) {
    lines.push("", "Source deltas");
    for (const row of report.sourceDeltas.slice(0, 10)) {
      const publicDeltaPrefix = row.publicDelta >= 0 ? "+" : "";
      const indexableDeltaPrefix = row.indexableDelta >= 0 ? "+" : "";
      lines.push(
        `- ${row.sourceId}: public ${row.publicCount} (${publicDeltaPrefix}${row.publicDelta}), indexable ${row.indexableCount} (${indexableDeltaPrefix}${row.indexableDelta})`
      );
    }
  }

  lines.push("", "Sold/reserved deltas");
  for (const row of report.soldReservedDeltas) {
    const deltaPrefix = row.delta >= 0 ? "+" : "";
    lines.push(`- ${row.sourceId}: ${row.current} (${deltaPrefix}${row.delta} vs previous)`);
  }

  if (report.warnings.length > 0) {
    lines.push("", "Warnings");
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  const text = lines.join("\n");
  const { jsonPath, textPath } = writeArtifactPair("cv_kpi_report", report, text);

  console.log(text);
  console.log(`\nJSON: ${jsonPath}`);
  console.log(`Text: ${textPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
