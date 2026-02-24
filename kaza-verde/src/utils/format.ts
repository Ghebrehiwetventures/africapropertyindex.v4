export function formatPrice(price: number | null | undefined, currency?: string): string | null {
  if (price == null) return null;
  const formatted = Math.round(price).toLocaleString();
  const c = (currency || "EUR").toUpperCase();
  if (c === "EUR") return `€${formatted}`;
  if (c === "CVE") return `${formatted} CVE`;
  return `${c} ${formatted}`;
}

const SOURCE_LABELS: Record<string, string> = {
  cv_casacom: "Casa.com",
  cv_imovirtual: "Imovirtual",
  cv_terracaboverde: "Terra Cabo Verde",
  cv_remax: "RE/MAX",
  cv_century21: "Century 21",
  cv_braavo: "Braavo",
  cv_caboverde_imoveis: "Cabo Verde Imóveis",
};

export function sourceLabel(sourceId: string): string {
  return SOURCE_LABELS[sourceId] ?? sourceId.replace(/^cv_/, "").replace(/_/g, " ");
}

export function plural(count: number, singular: string, pluralStr: string): string {
  return count === 1 ? singular : pluralStr;
}
