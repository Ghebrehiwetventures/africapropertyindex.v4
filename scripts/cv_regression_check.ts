import {
  CV_MARKET,
  FeedCounts,
  SOLD_RESERVED_SOURCES,
  getFeedCounts,
  getLatestScopeReasonCounts,
  getRunPair,
  getSoldReservedCountsBySource,
  writeArtifactPair,
  withClient,
} from "./lib/cvOps";

const SPIKE_REASONS = ["NO_VALID_IMAGE", "MISSING_PRICE_SIGNAL"] as const;

type Severity = "info" | "warning" | "critical";

interface Alert {
  code: string;
  severity: Severity;
  message: string;
  current?: number;
  previous?: number;
  deltaPct?: number | null;
  metadata?: Record<string, unknown>;
}

interface RegressionReport {
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
  };
  previousRun: null | {
    id: number;
    startedAt: string;
    publicCount: number;
    indexableCount: number;
    tierA: number;
    tierB: number;
    tierC: number;
  };
  feed: FeedCounts & {
    feedSyncHealthy: boolean;
  };
  soldReservedBySource: {
    current: Record<string, number>;
    previous: Record<string, number>;
  };
  reviewReasonCounts: {
    current: Record<string, number>;
    previous: Record<string, number>;
  };
  alerts: Alert[];
  ok: boolean;
}

function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return Math.round((((current - previous) / previous) * 100) * 100) / 100;
}

function maybeAddCountDropAlert(
  alerts: Alert[],
  code: string,
  label: string,
  current: number,
  previous: number
): void {
  const deltaPct = pctDelta(current, previous);
  if (deltaPct != null && deltaPct < -10) {
    alerts.push({
      code,
      severity: "critical",
      message: `${label} fell more than 10% (${previous} -> ${current}, ${deltaPct}%).`,
      current,
      previous,
      deltaPct,
    });
  }
}

function maybeAddSpikeAlert(
  alerts: Alert[],
  reason: string,
  current: number,
  previous: number
): void {
  const doubled = previous > 0 && current >= previous * 2 && current - previous >= 5;
  const zeroToFive = previous === 0 && current >= 5;
  if (doubled || zeroToFive) {
    alerts.push({
      code: `${reason}_SPIKE`,
      severity: "warning",
      message: `${reason} spiked (${previous} -> ${current}).`,
      current,
      previous,
      deltaPct: pctDelta(current, previous),
    });
  }
}

async function main(): Promise<void> {
  const failOnAlert = process.argv.includes("--fail-on-alert");
  const generatedAt = new Date().toISOString();

  const report = await withClient<RegressionReport>(async (client) => {
    const { latest, previous } = await getRunPair(client, CV_MARKET);
    const feed = await getFeedCounts(client);
    const currentReasonCounts = await getLatestScopeReasonCounts(client, latest.started_at, [...SPIKE_REASONS]);
    const previousReasonCounts = previous
      ? await getLatestScopeReasonCounts(client, previous.started_at, [...SPIKE_REASONS])
      : Object.fromEntries(SPIKE_REASONS.map((reason) => [reason, 0]));
    const currentSoldReserved = await getSoldReservedCountsBySource(client, latest.started_at);
    const previousSoldReserved = previous
      ? await getSoldReservedCountsBySource(client, previous.started_at)
      : Object.fromEntries(SOLD_RESERVED_SOURCES.map((sourceId) => [sourceId, 0]));

    const alerts: Alert[] = [];
    if (previous) {
      maybeAddCountDropAlert(
        alerts,
        "PUBLIC_COUNT_DROP",
        "public_count",
        latest.public_count,
        previous.public_count
      );
      maybeAddCountDropAlert(
        alerts,
        "INDEXABLE_COUNT_DROP",
        "indexable_count",
        latest.indexable_count,
        previous.indexable_count
      );
    }

    if (feed.islandsCount !== 7) {
      alerts.push({
        code: "ISLANDS_COUNT_MISMATCH",
        severity: "critical",
        message: `islands_count expected 7 but got ${feed.islandsCount}.`,
        current: feed.islandsCount,
        previous: 7,
        metadata: { islands: feed.islands },
      });
    }

    const feedSyncHealthy =
      feed.publicCount === latest.public_count && feed.indexableCount === latest.indexable_count;
    if (!feedSyncHealthy) {
      alerts.push({
        code: "FEED_SYNC_BROKEN",
        severity: "critical",
        message: `Feed sync mismatch. feed public/indexable=${feed.publicCount}/${feed.indexableCount}, latest run=${latest.public_count}/${latest.indexable_count}.`,
        metadata: {
          feedPublicCount: feed.publicCount,
          feedIndexableCount: feed.indexableCount,
          latestPublicCount: latest.public_count,
          latestIndexableCount: latest.indexable_count,
        },
      });
    }

    for (const sourceId of SOLD_RESERVED_SOURCES) {
      const previousCount = previousSoldReserved[sourceId] ?? 0;
      const currentCount = currentSoldReserved[sourceId] ?? 0;
      if (previousCount === 0 && currentCount > 2) {
        alerts.push({
          code: `SOLD_RESERVED_JUMP_${sourceId.toUpperCase()}`,
          severity: "warning",
          message: `${sourceId} SOLD_OR_RESERVED jumped from 0 to ${currentCount}.`,
          current: currentCount,
          previous: previousCount,
        });
      }
    }

    for (const reason of SPIKE_REASONS) {
      maybeAddSpikeAlert(
        alerts,
        reason,
        currentReasonCounts[reason] ?? 0,
        previousReasonCounts[reason] ?? 0
      );
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
      },
      previousRun: previous
        ? {
            id: previous.id,
            startedAt: previous.started_at,
            publicCount: previous.public_count,
            indexableCount: previous.indexable_count,
            tierA: previous.tier_a_count,
            tierB: previous.tier_b_count,
            tierC: previous.tier_c_count,
          }
        : null,
      feed: {
        ...feed,
        feedSyncHealthy,
      },
      soldReservedBySource: {
        current: currentSoldReserved,
        previous: previousSoldReserved,
      },
      reviewReasonCounts: {
        current: currentReasonCounts,
        previous: previousReasonCounts,
      },
      alerts,
      ok: alerts.length === 0,
    };
  });

  const lines = [
    "CV regression check",
    "",
    `Latest run: public=${report.latestRun.publicCount}, indexable=${report.latestRun.indexableCount}, tiers=${report.latestRun.tierA}/${report.latestRun.tierB}/${report.latestRun.tierC}`,
    `Feed: public=${report.feed.publicCount}, indexable=${report.feed.indexableCount}, islands=${report.feed.islandsCount}, sync=${report.feed.feedSyncHealthy ? "OK" : "BROKEN"}`,
  ];

  if (report.alerts.length === 0) {
    lines.push("", "Status: OK");
  } else {
    lines.push("", "Alerts:");
    for (const alert of report.alerts) {
      lines.push(`- [${alert.severity}] ${alert.code}: ${alert.message}`);
    }
  }

  const text = lines.join("\n");
  const { jsonPath, textPath } = writeArtifactPair("cv_regression_alert", report, text);

  console.log(text);
  console.log(`\nJSON: ${jsonPath}`);
  console.log(`Text: ${textPath}`);

  if (failOnAlert && report.alerts.some((alert) => alert.severity === "critical")) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
