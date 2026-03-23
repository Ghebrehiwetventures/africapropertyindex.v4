import { comparePerceptualHashes, hashString } from "./imageFingerprint";

export interface DedupeObserveListing {
  id: string;
  source_id: string;
  source_url: string | null;
  title: string | null;
  price: number | null;
  price_status?: string | null;
  island: string | null;
  city: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  cover_image_hash?: string | null;
  trust_tier?: string | null;
  review_reasons?: string[] | null;
}

type PropertyKind = "land" | "apartment" | "house" | "commercial" | "unknown";

export interface DedupeObserveCandidate {
  pair_key: string;
  cluster_key: string;
  score: number;
  confidence: "strong" | "review" | "uncertain";
  proposed_canonical_listing_id: string;
  why: string[];
  unsafe_reasons: string[];
  signals: {
    title_overlap: number;
    significant_title_overlap: number;
    price_similarity: number;
    city_similarity: number;
    bedroom_similarity: number;
    cover_similarity: number;
  };
  listing_a: {
    id: string;
    source_id: string;
    title: string | null;
    price: number | null;
    price_status: string | null;
    island: string | null;
    city: string | null;
    bedrooms: number | null;
    cover_image_hash: string | null;
    source_url: string | null;
    trust_tier: string | null;
  };
  listing_b: {
    id: string;
    source_id: string;
    title: string | null;
    price: number | null;
    price_status: string | null;
    island: string | null;
    city: string | null;
    bedrooms: number | null;
    cover_image_hash: string | null;
    source_url: string | null;
    trust_tier: string | null;
  };
}

export interface DedupeObserveCluster {
  cluster_key: string;
  confidence: "strong" | "review" | "uncertain";
  member_ids: string[];
  sources: string[];
  max_score: number;
  candidate_count: number;
}

export interface DedupeObserveOutput {
  generated_at: string;
  listing_count: number;
  candidate_count: number;
  strong_count: number;
  review_count: number;
  uncertain_count: number;
  clusters: DedupeObserveCluster[];
  candidates: DedupeObserveCandidate[];
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "de",
  "del",
  "do",
  "for",
  "in",
  "is",
  "la",
  "of",
  "on",
  "para",
  "the",
  "to",
  "with",
]);

const GENERIC_PROPERTY_TOKENS = new Set([
  "apartment",
  "apartments",
  "bed",
  "beds",
  "bedroom",
  "bedrooms",
  "cabo",
  "cape",
  "complex",
  "condo",
  "condominium",
  "flat",
  "home",
  "homes",
  "house",
  "island",
  "new",
  "project",
  "properties",
  "property",
  "resort",
  "sale",
  "sal",
  "santa",
  "studio",
  "suite",
  "suites",
  "t1",
  "t2",
  "t3",
  "vila",
  "verde",
]);

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeText(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string | null | undefined): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function significantTokens(value: string | null | undefined): string[] {
  return tokenize(value).filter(
    (token) => token.length >= 3 && !GENERIC_PROPERTY_TOKENS.has(token)
  );
}

function inferPropertyKind(title: string | null | undefined): PropertyKind {
  const text = normalizeText(title);
  if (!text) return "unknown";
  if (/\b(plot|land|parcel|parcela|terrain|lote)\b/.test(text)) return "land";
  if (/\b(apartment|flat|penthouse|studio|condominium|condo|t1|t2|t3)\b/.test(text)) return "apartment";
  if (/\b(villa|house|townhouse|duplex|detached)\b/.test(text)) return "house";
  if (/\b(shop|commercial|restaurant|bar|office)\b/.test(text)) return "commercial";
  return "unknown";
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }

  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

function priceSimilarity(a: number | null, b: number | null): number {
  if (a == null || b == null || a <= 0 || b <= 0) return 0;
  const ratio = Math.abs(a - b) / Math.max(a, b);
  if (ratio <= 0.02) return 1;
  if (ratio <= 0.05) return 0.9;
  if (ratio <= 0.1) return 0.78;
  if (ratio <= 0.15) return 0.62;
  if (ratio <= 0.25) return 0.35;
  return 0;
}

function citySimilarity(a: string | null, b: string | null): number {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) return 0.7;
  return jaccard(tokenize(normalizedA), tokenize(normalizedB));
}

function bedroomSimilarity(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null || b == null) return 0;
  if (a === b) return 1;
  if (Math.abs(a - b) === 1) return 0.55;
  return 0;
}

function propertyKindPenalty(a: DedupeObserveListing, b: DedupeObserveListing): number {
  const kindA = inferPropertyKind(a.title);
  const kindB = inferPropertyKind(b.title);
  if (kindA === "unknown" || kindB === "unknown") return 0;
  if (kindA === kindB) return 0;
  if (kindA === "land" || kindB === "land") return 0.18;
  return 0.12;
}

function bedroomPenalty(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null || b == null) return 0;
  const diff = Math.abs(a - b);
  if (diff === 0) return 0;
  if (diff === 1) return 0.04;
  return 0.12;
}

function coverSimilarity(hashA: string | null | undefined, hashB: string | null | undefined): number {
  if (!hashA || !hashB) return 0;
  const distance = comparePerceptualHashes(hashA, hashB);
  if (distance == null) return 0;
  if (distance <= 0.08) return 1;
  if (distance <= 0.12) return 0.8;
  if (distance <= 0.18) return 0.55;
  return 0;
}

function tierScore(tier: string | null | undefined): number {
  if (tier === "A") return 3;
  if (tier === "B") return 2;
  return 1;
}

function listingQualityScore(listing: DedupeObserveListing): number {
  let score = 0;
  score += tierScore(listing.trust_tier);
  score += listing.price != null && listing.price > 0 ? 2 : listing.price_status === "on_request" ? 1 : 0;
  score += listing.city ? 1 : 0;
  score += listing.bedrooms != null ? 1 : 0;
  score += listing.cover_image_hash ? 1 : 0;
  score += normalizeText(listing.title).length / 100;
  return score;
}

function pickCanonical(listingA: DedupeObserveListing, listingB: DedupeObserveListing): string {
  const scoreA = listingQualityScore(listingA);
  const scoreB = listingQualityScore(listingB);
  if (scoreA !== scoreB) {
    return scoreA > scoreB ? listingA.id : listingB.id;
  }
  return listingA.id < listingB.id ? listingA.id : listingB.id;
}

function isPairEligible(
  titleOverlap: number,
  significantOverlap: number,
  priceScore: number,
  cityScore: number,
  bedroomScore: number,
  coverScore: number
): boolean {
  if (coverScore >= 0.8) return true;
  if (priceScore >= 0.78 && titleOverlap >= 0.3) return true;
  if (significantOverlap >= 0.4 && (priceScore >= 0.35 || cityScore >= 0.7 || bedroomScore >= 0.55)) {
    return true;
  }
  if (titleOverlap >= 0.42 && cityScore >= 0.7 && bedroomScore >= 0.55) return true;
  if (titleOverlap >= 0.5 && cityScore >= 0.7 && priceScore >= 0.2) return true;
  if (cityScore >= 0.7 && significantOverlap >= 0.25 && (priceScore >= 0.2 || bedroomScore >= 0.55 || coverScore >= 0.55)) {
    return true;
  }
  if (cityScore >= 0.7 && titleOverlap >= 0.35 && priceScore >= 0.35) return true;
  return false;
}

function confidenceFromScore(score: number, unsafeReasons: string[]): "strong" | "review" | "uncertain" {
  if (score >= 0.88 && unsafeReasons.length === 0) return "strong";
  if (score >= 0.64) return "review";
  return "uncertain";
}

export function buildDedupeObserveOutput(
  listings: DedupeObserveListing[]
): DedupeObserveOutput {
  const current = listings
    .filter((listing) => listing.source_id.startsWith("cv_"))
    .filter((listing) => !["cv_source_1", "cv_source_2"].includes(listing.source_id));

  const candidates: DedupeObserveCandidate[] = [];

  for (let i = 0; i < current.length; i++) {
    for (let j = i + 1; j < current.length; j++) {
      const a = current[i];
      const b = current[j];
      if (a.source_id === b.source_id) continue;
      if (!a.island || !b.island || normalizeText(a.island) !== normalizeText(b.island)) continue;

      const titleOverlap = jaccard(tokenize(a.title), tokenize(b.title));
      const significantOverlap = jaccard(significantTokens(a.title), significantTokens(b.title));
      const priceScore = priceSimilarity(a.price, b.price);
      const cityScore = citySimilarity(a.city, b.city);
      const bedroomScore = bedroomSimilarity(a.bedrooms, b.bedrooms);
      const coverScore = coverSimilarity(a.cover_image_hash, b.cover_image_hash);

      if (!isPairEligible(titleOverlap, significantOverlap, priceScore, cityScore, bedroomScore, coverScore)) {
        continue;
      }

      const genericWeakMatch =
        cityScore >= 0.7 &&
        priceScore >= 0.62 &&
        significantOverlap < 0.3 &&
        titleOverlap < 0.35 &&
        coverScore < 0.55;
      const penalty =
        propertyKindPenalty(a, b) +
        bedroomPenalty(a.bedrooms, b.bedrooms) +
        (genericWeakMatch ? 0.08 : 0);

      const score = round(
        significantOverlap * 0.25 +
          titleOverlap * 0.2 +
          priceScore * 0.25 +
          cityScore * 0.15 +
          bedroomScore * 0.05 +
          coverScore * 0.1 -
          penalty
      );

      if (score < 0.46) continue;

      const why: string[] = [`same island: ${a.island}`];
      if (significantOverlap >= 0.45) {
        why.push(`strong title token overlap (${round(significantOverlap)})`);
      } else if (titleOverlap >= 0.45) {
        why.push(`title overlap (${round(titleOverlap)})`);
      }
      if (priceScore >= 0.62 && a.price != null && b.price != null) {
        why.push(`price within 15% (${a.price} vs ${b.price})`);
      } else if (a.price != null && b.price != null && priceScore > 0) {
        why.push(`price roughly aligned (${a.price} vs ${b.price})`);
      }
      if (cityScore >= 0.7 && a.city && b.city) {
        why.push(`same city signal (${a.city} / ${b.city})`);
      }
      if (bedroomScore >= 0.55 && a.bedrooms != null && b.bedrooms != null) {
        why.push(`bedrooms aligned (${a.bedrooms} / ${b.bedrooms})`);
      }
      if (coverScore >= 0.8) {
        why.push("cover image hash is very close");
      }

      const unsafeReasons: string[] = [];
      if (priceScore === 0 && coverScore < 0.55) {
        unsafeReasons.push("no price corroboration");
      }
      if (cityScore === 0 && coverScore < 0.8) {
        unsafeReasons.push("city does not corroborate");
      }
      if (significantOverlap < 0.5 && coverScore < 0.8) {
        unsafeReasons.push("title similarity may be too generic");
      }

      const canonicalId = pickCanonical(a, b);
      const clusterKey = hashString(
        [normalizeText(a.island), canonicalId, normalizeText(a.city || b.city || ""), round(score).toString()].join("|")
      );

      candidates.push({
        pair_key: [a.id, b.id].sort().join("::"),
        cluster_key: clusterKey,
        score,
        confidence: confidenceFromScore(score, unsafeReasons),
        proposed_canonical_listing_id: canonicalId,
        why,
        unsafe_reasons: unsafeReasons,
        signals: {
          title_overlap: round(titleOverlap),
          significant_title_overlap: round(significantOverlap),
          price_similarity: round(priceScore),
          city_similarity: round(cityScore),
          bedroom_similarity: round(bedroomScore),
          cover_similarity: round(coverScore),
        },
        listing_a: {
          id: a.id,
          source_id: a.source_id,
          title: a.title,
          price: a.price,
          price_status: a.price_status || null,
          island: a.island,
          city: a.city,
          bedrooms: a.bedrooms ?? null,
          cover_image_hash: a.cover_image_hash || null,
          source_url: a.source_url,
          trust_tier: a.trust_tier || null,
        },
        listing_b: {
          id: b.id,
          source_id: b.source_id,
          title: b.title,
          price: b.price,
          price_status: b.price_status || null,
          island: b.island,
          city: b.city,
          bedrooms: b.bedrooms ?? null,
          cover_image_hash: b.cover_image_hash || null,
          source_url: b.source_url,
          trust_tier: b.trust_tier || null,
        },
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const clustersByKey = new Map<string, DedupeObserveCandidate[]>();
  for (const candidate of candidates.filter((entry) => entry.score >= 0.76)) {
    const group = clustersByKey.get(candidate.cluster_key) || [];
    group.push(candidate);
    clustersByKey.set(candidate.cluster_key, group);
  }

  const clusters: DedupeObserveCluster[] = Array.from(clustersByKey.entries())
    .map(([clusterKey, group]) => {
      const memberIds = new Set<string>();
      const sources = new Set<string>();
      let maxScore = 0;
      let confidence: "strong" | "review" | "uncertain" = "uncertain";

      for (const candidate of group) {
        memberIds.add(candidate.listing_a.id);
        memberIds.add(candidate.listing_b.id);
        sources.add(candidate.listing_a.source_id);
        sources.add(candidate.listing_b.source_id);
        maxScore = Math.max(maxScore, candidate.score);
        if (candidate.confidence === "strong") {
          confidence = "strong";
        } else if (candidate.confidence === "review" && confidence !== "strong") {
          confidence = "review";
        }
      }

      return {
        cluster_key: clusterKey,
        confidence,
        member_ids: Array.from(memberIds).sort(),
        sources: Array.from(sources).sort(),
        max_score: round(maxScore),
        candidate_count: group.length,
      };
    })
    .sort((a, b) => b.max_score - a.max_score);

  return {
    generated_at: new Date().toISOString(),
    listing_count: current.length,
    candidate_count: candidates.length,
    strong_count: candidates.filter((candidate) => candidate.confidence === "strong").length,
    review_count: candidates.filter((candidate) => candidate.confidence === "review").length,
    uncertain_count: candidates.filter((candidate) => candidate.confidence === "uncertain").length,
    clusters,
    candidates,
  };
}
