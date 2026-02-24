/**
 * Canonical ID for listings: stable identity per source + URL (or fallback to id).
 * No DB access.
 */
import * as crypto from "crypto";
import { normalizeUrl } from "./normalizeUrl";

/**
 * Returns canonical_id for a listing.
 * - If source_url is present and valid: source_id + ":" + sha256(normalized_url).slice(0, 16).
 * - If source_url is missing: source_id + ":" + sha256(id).slice(0, 16).
 */
export function getCanonicalId(
  sourceId: string,
  sourceUrl: string | null | undefined,
  fallbackId: string
): string {
  const prefix = sourceId + ":";
  if (sourceUrl && typeof sourceUrl === "string") {
    const normalized = normalizeUrl(sourceUrl);
    if (normalized) {
      const hash = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
      return prefix + hash;
    }
  }
  const hash = crypto.createHash("sha256").update(fallbackId).digest("hex").slice(0, 16);
  return prefix + hash;
}
