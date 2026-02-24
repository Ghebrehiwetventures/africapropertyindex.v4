/**
 * Deterministic URL normalization for canonical identity.
 * No DB access, no side effects.
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  let u = url.trim();
  if (!u) return "";

  try {
    const parsed = new URL(u);

    // Force https
    parsed.protocol = "https:";

    // Remove www from host
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    parsed.hostname = host;

    // Remove fragment and query
    parsed.hash = "";
    parsed.search = "";

    // Path: remove trailing slash (except for root "/")
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    parsed.pathname = path;

    return parsed.toString();
  } catch {
    return "";
  }
}
