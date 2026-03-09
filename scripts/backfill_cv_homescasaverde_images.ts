import * as fs from "fs";
import * as path from "path";
import { getSupabaseClient } from "../core/supabaseClient";
import {
  extractHomesCasaVerdeImages,
  type HomesCasaVerdeExtractionSource,
} from "../core/detail/plugins/homesCasaVerde";

process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;

type Mode = "dry-run" | "apply";

interface SourceRow {
  id: string;
  source_id: string;
  source_url: string | null;
  image_urls: string[] | null;
}

interface PlannedRow {
  id: string;
  source_id: string;
  source_url: string | null;
  previous_image_urls: string[];
  proposed_image_urls: string[];
  extracted_count: number;
  accepted_count: number;
  extraction_source: HomesCasaVerdeExtractionSource;
}

interface SkippedRow {
  id: string;
  source_id: string;
  source_url: string | null;
  previous_image_urls: string[];
  proposed_image_urls: string[];
  extracted_count: number;
  accepted_count: number;
  extraction_source: HomesCasaVerdeExtractionSource;
  reason: "missing_source_url" | "fetch_failed" | "zero_extracted" | "unchanged";
}

interface PlanArtifact {
  kind: "cv_homescasaverde_image_backfill_plan";
  createdAt: string;
  mode: Mode;
  totalRows: number;
  updateCount: number;
  skipCount: number;
  updates: PlannedRow[];
  skips: SkippedRow[];
}

interface BackupArtifact {
  kind: "cv_homescasaverde_image_backfill_backup";
  createdAt: string;
  mode: "apply";
  rowCount: number;
  rows: Array<{
    id: string;
    source_id: string;
    source_url: string | null;
    previous_image_urls: string[];
  }>;
}

function getMode(): Mode {
  return process.env.APPLY === "1" ? "apply" : "dry-run";
}

function ensureArtifactsDir(): string {
  const artifactsDir = path.resolve(__dirname, "../artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  return artifactsDir;
}

function artifactPath(prefix: string, createdAt: string): string {
  const safe = createdAt.replace(/[:.]/g, "-");
  return path.join(ensureArtifactsDir(), `${prefix}_${safe}.json`);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function loadRows(): Promise<SourceRow[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("listings")
    .select("id, source_id, source_url, image_urls")
    .eq("source_id", "cv_homescasaverde")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load rows: ${error.message}`);
  }

  return (data || []) as SourceRow[];
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function buildPlan(rows: SourceRow[]): Promise<PlanArtifact> {
  const updates: PlannedRow[] = [];
  const skips: SkippedRow[] = [];

  for (const row of rows) {
    const previous = Array.isArray(row.image_urls) ? row.image_urls : [];

    if (!row.source_url) {
      skips.push({
        id: row.id,
        source_id: row.source_id,
        source_url: row.source_url,
        previous_image_urls: previous,
        proposed_image_urls: [],
        extracted_count: 0,
        accepted_count: 0,
        extraction_source: "none",
        reason: "missing_source_url",
      });
      continue;
    }

    const html = await fetchHtml(row.source_url);
    if (!html) {
      skips.push({
        id: row.id,
        source_id: row.source_id,
        source_url: row.source_url,
        previous_image_urls: previous,
        proposed_image_urls: [],
        extracted_count: 0,
        accepted_count: 0,
        extraction_source: "none",
        reason: "fetch_failed",
      });
      continue;
    }

    const extracted = extractHomesCasaVerdeImages(html, row.source_url);
    if (extracted.acceptedCount === 0) {
      skips.push({
        id: row.id,
        source_id: row.source_id,
        source_url: row.source_url,
        previous_image_urls: previous,
        proposed_image_urls: extracted.imageUrls,
        extracted_count: extracted.extractedCount,
        accepted_count: extracted.acceptedCount,
        extraction_source: extracted.extractionSource,
        reason: "zero_extracted",
      });
      continue;
    }

    if (arraysEqual(previous, extracted.imageUrls)) {
      skips.push({
        id: row.id,
        source_id: row.source_id,
        source_url: row.source_url,
        previous_image_urls: previous,
        proposed_image_urls: extracted.imageUrls,
        extracted_count: extracted.extractedCount,
        accepted_count: extracted.acceptedCount,
        extraction_source: extracted.extractionSource,
        reason: "unchanged",
      });
      continue;
    }

    updates.push({
      id: row.id,
      source_id: row.source_id,
      source_url: row.source_url,
      previous_image_urls: previous,
      proposed_image_urls: extracted.imageUrls,
      extracted_count: extracted.extractedCount,
      accepted_count: extracted.acceptedCount,
      extraction_source: extracted.extractionSource,
    });
  }

  return {
    kind: "cv_homescasaverde_image_backfill_plan",
    createdAt: new Date().toISOString(),
    mode: getMode(),
    totalRows: rows.length,
    updateCount: updates.length,
    skipCount: skips.length,
    updates,
    skips,
  };
}

function writePlanArtifact(plan: PlanArtifact): string {
  const filePath = artifactPath("cv_homescasaverde_image_backfill_plan", plan.createdAt);
  fs.writeFileSync(filePath, JSON.stringify(plan, null, 2));
  return filePath;
}

function writeBackupArtifact(plan: PlanArtifact): string {
  const backup: BackupArtifact = {
    kind: "cv_homescasaverde_image_backfill_backup",
    createdAt: plan.createdAt,
    mode: "apply",
    rowCount: plan.updates.length,
    rows: plan.updates.map((row) => ({
      id: row.id,
      source_id: row.source_id,
      source_url: row.source_url,
      previous_image_urls: row.previous_image_urls,
    })),
  };
  const filePath = artifactPath("cv_homescasaverde_image_backfill_backup", plan.createdAt);
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
  return filePath;
}

async function applyPlan(plan: PlanArtifact): Promise<{ applied: number; failed: number }> {
  const sb = getSupabaseClient();
  let applied = 0;
  let failed = 0;

  for (const update of plan.updates) {
    const { error } = await sb
      .from("listings")
      .update({ image_urls: update.proposed_image_urls })
      .eq("id", update.id)
      .eq("source_id", "cv_homescasaverde");

    if (error) {
      failed += 1;
      console.error(`[apply] failed ${update.id}: ${error.message}`);
      continue;
    }

    applied += 1;
  }

  return { applied, failed };
}

async function main(): Promise<void> {
  const mode = getMode();
  const rows = await loadRows();
  const plan = await buildPlan(rows);
  const planPath = writePlanArtifact(plan);

  console.log(`mode=${mode}`);
  console.log(`rows=${plan.totalRows}`);
  console.log(`planned_updates=${plan.updateCount}`);
  console.log(`planned_skips=${plan.skipCount}`);
  console.log(`plan_artifact=${planPath}`);

  if (mode === "dry-run") return;

  const backupPath = writeBackupArtifact(plan);
  console.log(`backup_artifact=${backupPath}`);

  const result = await applyPlan(plan);
  console.log(`applied=${result.applied}`);
  console.log(`failed=${result.failed}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
