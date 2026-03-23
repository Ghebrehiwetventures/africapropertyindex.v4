const SOURCE_LABELS: Record<string, string> = {
  cv_estatecv: "EstateCV",
  cv_terracaboverde: "Terra Cabo Verde",
  cv_simplycapeverde: "Simply Cape Verde",
  cv_homescasaverde: "Homes Casa Verde",
  cv_capeverdeproperty24: "Cape Verde Property 24",
  cv_cabohouseproperty: "Cabo House Property",
  cv_oceanproperty24: "Ocean Property 24",
};

function titleCaseFallback(value: string): string {
  return value
    .replace(/^cv_/, "")
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatSourceLabel(sourceId: string, sourceUrl?: string | null): string {
  const mapped = SOURCE_LABELS[sourceId];
  if (mapped) return mapped;

  if (sourceUrl) {
    try {
      const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
      if (hostname === "estatecv.com") return "EstateCV";
      if (hostname === "terracaboverde.com") return "Terra Cabo Verde";
      if (hostname === "simplycapeverde.com") return "Simply Cape Verde";
      if (hostname === "homescasaverde.com") return "Homes Casa Verde";
      if (hostname === "capeverdeproperty24.com") return "Cape Verde Property 24";
      if (hostname === "cabohouseproperty.com") return "Cabo House Property";
      if (hostname === "oceanproperty24.com") return "Ocean Property 24";
    } catch {
      // Fall back to the source id formatting below.
    }
  }

  return titleCaseFallback(sourceId);
}
