/**
 * Health-check for source_url per CV source.
 *
 * Samples N listings per active source_id, performs HTTP HEAD on each
 * source_url, and reports reachability per source.
 *
 * Usage:
 *   npx ts-node scripts/healthcheck_source_urls.ts
 *   SAMPLE_SIZE=10 npx ts-node scripts/healthcheck_source_urls.ts
 */
import { getSupabaseClient } from "../core/supabaseClient";

const SAMPLE_SIZE = parseInt(process.env.SAMPLE_SIZE || "5", 10);
const TIMEOUT_MS = 10_000;
const MARKET_PREFIX = "cv_%";

type Status = "alive" | "redirect" | "blocked" | "dead" | "timeout" | "invalid_url" | "error";

interface ProbeResult {
  url: string;
  status: Status;
  httpCode?: number;
  elapsed_ms: number;
}

interface SourceReport {
  source_id: string;
  sampled: number;
  alive: number;
  redirect: number;
  blocked: number;
  dead: number;
  timeout: number;
  invalid_url: number;
  error: number;
  details: ProbeResult[];
}

function classify(httpCode: number): Status {
  if (httpCode >= 200 && httpCode < 300) return "alive";
  if (httpCode === 301 || httpCode === 302 || httpCode === 307 || httpCode === 308) return "redirect";
  if (httpCode === 403) return "blocked";
  if (httpCode === 404 || httpCode === 410) return "dead";
  if (httpCode >= 500) return "error";
  return "error";
}

async function probe(url: string): Promise<ProbeResult> {
  const start = Date.now();

  if (!url || !url.startsWith("http")) {
    return { url, status: "invalid_url", elapsed_ms: 0 };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "AREI-HealthCheck/1.0" },
    });

    clearTimeout(timer);
    const elapsed_ms = Date.now() - start;
    const status = classify(res.status);
    return { url, status, httpCode: res.status, elapsed_ms };
  } catch (err: any) {
    clearTimeout(timer);
    const elapsed_ms = Date.now() - start;

    if (err.name === "AbortError" || err.code === "ABORT_ERR") {
      return { url, status: "timeout", elapsed_ms };
    }
    return { url, status: "error", elapsed_ms };
  }
}

async function main() {
  const sb = getSupabaseClient();

  // Get distinct source_ids for CV market
  const { data: sourceRows, error: srcErr } = await sb
    .from("listings")
    .select("source_id")
    .eq("approved", true)
    .ilike("source_id", MARKET_PREFIX);

  if (srcErr) throw srcErr;

  const sourceIds = [...new Set((sourceRows ?? []).map((r) => r.source_id))].sort();
  console.log(`\nFound ${sourceIds.length} active CV sources.\n`);

  const reports: SourceReport[] = [];

  for (const sourceId of sourceIds) {
    // Sample N listings with non-null source_url
    const { data: listings, error: lErr } = await sb
      .from("listings")
      .select("id, source_url")
      .eq("approved", true)
      .eq("source_id", sourceId)
      .not("source_url", "is", null)
      .order("id", { ascending: false })
      .limit(SAMPLE_SIZE);

    if (lErr) {
      console.error(`  [${sourceId}] query error: ${lErr.message}`);
      continue;
    }

    const urls = (listings ?? []).map((l) => l.source_url as string);

    if (urls.length === 0) {
      console.log(`  [${sourceId}] 0 listings with source_url — skipping`);
      reports.push({
        source_id: sourceId,
        sampled: 0,
        alive: 0, redirect: 0, blocked: 0, dead: 0, timeout: 0, invalid_url: 0, error: 0,
        details: [],
      });
      continue;
    }

    console.log(`  [${sourceId}] probing ${urls.length} URLs...`);

    const results: ProbeResult[] = [];
    for (const url of urls) {
      const r = await probe(url);
      results.push(r);
    }

    const report: SourceReport = {
      source_id: sourceId,
      sampled: results.length,
      alive: results.filter((r) => r.status === "alive").length,
      redirect: results.filter((r) => r.status === "redirect").length,
      blocked: results.filter((r) => r.status === "blocked").length,
      dead: results.filter((r) => r.status === "dead").length,
      timeout: results.filter((r) => r.status === "timeout").length,
      invalid_url: results.filter((r) => r.status === "invalid_url").length,
      error: results.filter((r) => r.status === "error").length,
      details: results,
    };

    reports.push(report);
  }

  // Summary table
  console.log("\n" + "=".repeat(90));
  console.log("SOURCE URL HEALTH CHECK — CAPE VERDE");
  console.log("=".repeat(90));
  console.log(
    padR("Source", 28) +
    padR("Sampled", 9) +
    padR("Alive", 7) +
    padR("Redir", 7) +
    padR("Blocked", 9) +
    padR("Dead", 7) +
    padR("Timeout", 9) +
    padR("Error", 7) +
    "Health"
  );
  console.log("-".repeat(90));

  let totalSampled = 0;
  let totalAlive = 0;
  let totalDead = 0;

  for (const r of reports) {
    totalSampled += r.sampled;
    totalAlive += r.alive + r.redirect;
    totalDead += r.dead;

    const healthPct = r.sampled > 0
      ? Math.round(((r.alive + r.redirect) / r.sampled) * 100)
      : 0;

    const healthLabel = healthPct >= 80 ? "OK" : healthPct >= 50 ? "WARN" : r.sampled === 0 ? "N/A" : "FAIL";

    console.log(
      padR(r.source_id, 28) +
      padR(String(r.sampled), 9) +
      padR(String(r.alive), 7) +
      padR(String(r.redirect), 7) +
      padR(String(r.blocked), 9) +
      padR(String(r.dead), 7) +
      padR(String(r.timeout), 9) +
      padR(String(r.error), 7) +
      `${healthPct}% ${healthLabel}`
    );
  }

  console.log("-".repeat(90));
  const overallPct = totalSampled > 0 ? Math.round((totalAlive / totalSampled) * 100) : 0;
  console.log(`TOTAL: ${totalSampled} sampled, ${totalAlive} reachable, ${totalDead} dead → ${overallPct}% overall health\n`);

  // Detail: show broken URLs
  const broken = reports.flatMap((r) =>
    r.details.filter((d) => d.status === "dead" || d.status === "blocked")
  );

  if (broken.length > 0) {
    console.log("BROKEN / BLOCKED URLs:");
    for (const b of broken) {
      console.log(`  [${b.status}] ${b.httpCode ?? "—"} ${b.url}`);
    }
    console.log();
  }

  process.exit(broken.length > 0 ? 1 : 0);
}

function padR(s: string, len: number): string {
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

main().catch((err) => {
  console.error("Health check failed:", err);
  process.exit(2);
});
