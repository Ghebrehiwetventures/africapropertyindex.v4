import * as fs from "fs";
import * as path from "path";
import { sanitizeArtifactPayload } from "./redactSecrets";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  buildDedupeObserveOutput,
  DedupeObserveListing,
} from "./dedupeObserve";

dotenv.config();

interface ReportListing {
  id: string;
}

interface IngestReportFile {
  visibleListings?: ReportListing[];
  hiddenListings?: ReportListing[];
}

function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    result.push(values.slice(i, i + size));
  }
  return result;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials");
  }

  const artifactsDir = path.resolve(__dirname, "../artifacts");
  const reportPath = path.join(artifactsDir, "cv_ingest_report.json");
  const outputPath = path.join(artifactsDir, "cv_dedupe_observe_report.json");

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as IngestReportFile;
  const listingIds = Array.from(
    new Set([
      ...(report.visibleListings || []).map((listing) => listing.id),
      ...(report.hiddenListings || []).map((listing) => listing.id),
    ])
  );

  const supabase = createClient(supabaseUrl, supabaseKey);
  const rows: DedupeObserveListing[] = [];

  for (const batch of chunk(listingIds, 200)) {
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,source_id,source_url,title,price,price_status,island,city,bedrooms,bathrooms,cover_image_hash,trust_tier,review_reasons"
      )
      .in("id", batch);

    if (error) {
      throw new Error(`Failed to read current-run listings: ${error.message}`);
    }

    rows.push(...((data || []) as DedupeObserveListing[]));
  }

  const output = buildDedupeObserveOutput(rows);
  fs.writeFileSync(outputPath, JSON.stringify(sanitizeArtifactPayload(output), null, 2));

  console.log(
    JSON.stringify(
      {
        outputPath,
        listing_count: output.listing_count,
        candidate_count: output.candidate_count,
        strong_count: output.strong_count,
        review_count: output.review_count,
        uncertain_count: output.uncertain_count,
        top_candidates: output.candidates.slice(0, 10).map((candidate) => ({
          score: candidate.score,
          confidence: candidate.confidence,
          pair: [
            `${candidate.listing_a.source_id}:${candidate.listing_a.title}`,
            `${candidate.listing_b.source_id}:${candidate.listing_b.title}`,
          ],
        })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
