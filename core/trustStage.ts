import { checkTitle, isValidSourceUrl } from "./goldenRules";
import { normalizeUrl } from "./normalizeUrl";
import {
  validateListingImages,
  ListingImageRecord,
} from "./listingImageValidator";
import {
  arePerceptualHashesNear,
  hashString,
} from "./imageFingerprint";

export type TrustTier = "A" | "B" | "C";
export type PriceStatus = "numeric" | "on_request" | "missing";
export type LocationConfidence = "mapped" | "recovered" | "missing";
export type DuplicateRisk = "low" | "medium" | "high";

export interface TrustStageInput {
  id: string;
  sourceId: string;
  sourceName: string;
  title?: string;
  description?: string;
  price?: number;
  priceText?: string;
  sourceUrl: string | null;
  imageUrls: string[];
  island?: string;
  city?: string;
  locationConfidence: LocationConfidence;
  createdAt: Date;
  availabilityStatus?: "available" | "sold_or_reserved";
  allowedImageHosts?: string[];
  allowedImageUrlPatterns?: string[];
}

export interface TrustStageListingResult {
  listingId: string;
  trust_tier: TrustTier;
  trust_gate_passed: boolean;
  indexable: boolean;
  review_reasons: string[];
  has_valid_image: boolean;
  cover_image_url: string | null;
  cover_image_hash: string | null;
  duplicate_risk: DuplicateRisk;
  identity_fingerprint: string | null;
  cross_source_match_key: string | null;
  canonical_listing_id: string;
  price_status: PriceStatus;
  location_confidence: LocationConfidence;
  multi_domain_gallery: boolean;
  valid_image_urls: string[];
}

export interface DuplicateMatchRow {
  source_listing_id: string;
  matched_listing_id: string;
  match_type: "identity" | "cross_source";
  match_score: number;
  canonical_listing_id: string;
  duplicate_risk: DuplicateRisk;
}

export interface TrustStageOutput {
  listings: TrustStageListingResult[];
  listingImages: ListingImageRecord[];
  duplicateMatches: DuplicateMatchRow[];
}

interface WorkingListingResult extends TrustStageListingResult {
  sourceId: string;
  createdAt: Date;
  title?: string;
  description?: string;
  price?: number;
  valid_image_records: ListingImageRecord[];
}

const ON_REQUEST_PATTERNS = [
  /price on request/i,
  /\bon request\b/i,
  /\bpoa\b/i,
  /\bnegotiated\b/i,
  /contact(?: us)?(?: for)?(?: .*?)?price/i,
  /request(?: .*?)?price/i,
  /call(?: for)?(?: .*?)?price/i,
  /call for details price/i,
];

const SOLD_RESERVED_PATTERNS = [
  /\bsold\b/i,
  /\breserved\b/i,
  /under offer/i,
  /not available/i,
];

const TARGETED_SOLD_RESERVED_SOURCES = new Set([
  "cv_terracaboverde",
  "cv_cabohouseproperty",
  "cv_oceanproperty24",
]);

const TARGETED_SOLD_RESERVED_URL_PATTERNS = [
  /\/sold\//i,
  /\/reserved\//i,
  /\/under-offer\//i,
];

const TARGETED_SOLD_RESERVED_STRONG_PATTERNS = [
  /\breserved\b/i,
  /under offer/i,
  /not available/i,
  /\b(?:status|availability|offer type)\s*[:\-]?\s*(?:sold|reserved)\b/i,
  /\b(?:sold|reserved)!+\b/i,
  /^\s*(?:sold|reserved)\b/i,
];

const TARGETED_SOLD_FALSE_POSITIVE_PATTERNS = [
  /\bis sold fully furnished\b/i,
  /\bis sold partially furnished\b/i,
  /\bis sold unfurnished\b/i,
  /\bis sold furnished\b/i,
  /\b(?:apartment|flat|unit|suite|property|villa|house|b&b)\s+is sold\b/i,
  /\bproperty,?\s+which\s+is\s+sold\b/i,
  /\bsold fully furnished\b/i,
  /\bsold partially furnished\b/i,
  /\bsold unfurnished\b/i,
  /\bsold furnished\b/i,
  /\bsold by notarised deed\b/i,
  /\bare sold by notarised deed\b/i,
];

function getTrustStageConcurrency(): number {
  const raw = Number.parseInt(process.env.TRUST_LISTING_CONCURRENCY || "", 10);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return 6;
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<U>
): Promise<U[]> {
  if (items.length === 0) return [];

  const results = new Array<U>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) {
        return;
      }
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  };

  const workerCount = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function normalizeText(value: string | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectPriceStatus(
  price: number | undefined,
  priceText: string | undefined,
  title: string | undefined,
  description: string | undefined,
  availabilityStatus: "available" | "sold_or_reserved" | undefined
): PriceStatus {
  if (price != null && price > 0) return "numeric";
  if (availabilityStatus === "sold_or_reserved") return "missing";
  const searchText = `${priceText || ""} ${title || ""} ${description || ""}`;
  if (ON_REQUEST_PATTERNS.some((pattern) => pattern.test(searchText))) {
    return "on_request";
  }
  return "missing";
}

function detectAvailabilityStatus(
  sourceId: string,
  sourceUrl: string | null,
  availabilityStatus: "available" | "sold_or_reserved" | undefined,
  priceText: string | undefined,
  title: string | undefined,
  description: string | undefined
): "available" | "sold_or_reserved" {
  if (availabilityStatus === "sold_or_reserved") {
    return "sold_or_reserved";
  }
  const searchText = `${priceText || ""} ${title || ""} ${description || ""}`;

  if (TARGETED_SOLD_RESERVED_SOURCES.has(sourceId)) {
    if (
      sourceUrl &&
      TARGETED_SOLD_RESERVED_URL_PATTERNS.some((pattern) => pattern.test(sourceUrl))
    ) {
      return "sold_or_reserved";
    }

    if (
      TARGETED_SOLD_RESERVED_STRONG_PATTERNS.some((pattern) => pattern.test(searchText))
    ) {
      return "sold_or_reserved";
    }

    if (/\bsold\b/i.test(searchText)) {
      if (
        TARGETED_SOLD_FALSE_POSITIVE_PATTERNS.some((pattern) => pattern.test(searchText))
      ) {
        return "available";
      }
    }

    return "available";
  }

  if (SOLD_RESERVED_PATTERNS.some((pattern) => pattern.test(searchText))) {
    return "sold_or_reserved";
  }
  return "available";
}

function computeIdentityFingerprint(input: TrustStageInput): string | null {
  if (isValidSourceUrl(input.sourceUrl)) {
    return hashString(`${input.sourceId}|${normalizeUrl(input.sourceUrl!)}`);
  }

  const normalizedTitle = normalizeText(input.title);
  if (!normalizedTitle) return null;

  return hashString(
    [
      input.sourceId,
      normalizedTitle,
      input.price != null && input.price > 0 ? Math.round(input.price).toString() : "",
      normalizeText(input.island),
      normalizeText(input.city),
    ].join("|")
  );
}

function computeCrossSourceMatchKey(input: TrustStageInput, priceStatus: PriceStatus): string | null {
  const normalizedTitle = normalizeText(input.title);
  const normalizedIsland = normalizeText(input.island);
  if (!normalizedTitle || !normalizedIsland) return null;

  const priceComponent =
    priceStatus === "numeric" && input.price != null && input.price > 0
      ? Math.round(input.price).toString()
      : priceStatus === "on_request"
        ? "on_request"
        : "";

  if (!priceComponent) return null;

  return hashString(
    [
      normalizedTitle,
      priceComponent,
      normalizedIsland,
      normalizeText(input.city),
    ].join("|")
  );
}

function trustScore(listing: WorkingListingResult): number {
  let score = 0;
  score += listing.has_valid_image ? 100 : 0;
  score += listing.valid_image_urls.length * 10;
  score += listing.price != null && listing.price > 0 ? 30 : listing.price_status === "on_request" ? 20 : 0;
  score += listing.location_confidence === "mapped" ? 20 : listing.location_confidence === "recovered" ? 10 : 0;
  score += listing.title ? Math.min(listing.title.length, 80) / 4 : 0;
  score += listing.description ? Math.min(listing.description.length, 400) / 20 : 0;
  return score;
}

function chooseCanonicalWinner(group: WorkingListingResult[]): WorkingListingResult {
  return group
    .slice()
    .sort((a, b) => {
      const scoreDelta = trustScore(b) - trustScore(a);
      if (scoreDelta !== 0) return scoreDelta;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })[0];
}

function hasHardPublicBlocker(reasons: string[]): boolean {
  return reasons.some((reason) =>
    [
      "MISSING_OR_GENERIC_TITLE",
      "INVALID_SOURCE_URL",
      "MISSING_PRICE_SIGNAL",
      "SOLD_OR_RESERVED",
      "MISSING_ISLAND_MAPPING",
      "NO_VALID_IMAGE",
      "IDENTITY_DUPLICATE",
      "CROSS_SOURCE_DUPLICATE_LOSER",
    ].includes(reason)
  );
}

function shouldBeNonIndexable(listing: WorkingListingResult): boolean {
  if (!listing.trust_gate_passed) return true;
  if (listing.location_confidence === "recovered") return true;
  if (listing.multi_domain_gallery) return true;
  if (listing.review_reasons.includes("DUPLICATE_COVER_IMAGE")) return true;
  return false;
}

function markDuplicateLosers(
  groups: Map<string, WorkingListingResult[]>,
  matchType: "identity" | "cross_source",
  duplicateMatches: DuplicateMatchRow[]
): void {
  for (const [, group] of groups) {
    if (group.length <= 1) continue;

    const winner = chooseCanonicalWinner(group);
    for (const listing of group) {
      listing.canonical_listing_id = winner.listingId;
      if (listing.listingId === winner.listingId) continue;

      if (matchType === "identity") {
        listing.review_reasons.push("IDENTITY_DUPLICATE");
      } else {
        listing.review_reasons.push("CROSS_SOURCE_DUPLICATE_LOSER");
      }
      listing.duplicate_risk = "high";

      duplicateMatches.push({
        source_listing_id: listing.listingId,
        matched_listing_id: winner.listingId,
        match_type: matchType,
        match_score: 1,
        canonical_listing_id: winner.listingId,
        duplicate_risk: "high",
      });
    }
  }
}

function pickAlternativeCover(
  listing: WorkingListingResult,
  takenCovers: Array<{ listingId: string; hash: string | null }>
): { url: string | null; hash: string | null; changed: boolean } {
  for (const candidate of listing.valid_image_records) {
    const rowHash = candidate.perceptual_hash;
    const conflicts = takenCovers.some(
      (taken) => rowHash != null && arePerceptualHashesNear(rowHash, taken.hash)
    );
    if (!conflicts) {
      return {
        url: candidate.image_url,
        hash: rowHash,
        changed: candidate.image_url !== listing.cover_image_url,
      };
    }
  }

  return {
    url: listing.cover_image_url,
    hash: listing.cover_image_hash,
    changed: false,
  };
}

export async function runTrustStage(inputs: TrustStageInput[]): Promise<TrustStageOutput> {
  const listingImages: ListingImageRecord[] = [];
  const duplicateMatches: DuplicateMatchRow[] = [];
  const prepared = await mapWithConcurrency(
    inputs,
    getTrustStageConcurrency(),
    async (input) => {
      const imageValidation = await validateListingImages({
        listingId: input.id,
        sourceUrl: input.sourceUrl,
        imageUrls: input.imageUrls,
        allowedImageHosts: input.allowedImageHosts,
        allowedImageUrlPatterns: input.allowedImageUrlPatterns,
      });

      const availabilityStatus = detectAvailabilityStatus(
        input.sourceId,
        input.sourceUrl,
        input.availabilityStatus,
        input.priceText,
        input.title,
        input.description
      );
      const priceStatus = detectPriceStatus(
        input.price,
        input.priceText,
        input.title,
        input.description,
        availabilityStatus
      );
      const reviewReasons: string[] = [];

      if (checkTitle(input.title)) {
        reviewReasons.push("MISSING_OR_GENERIC_TITLE");
      }
      if (!isValidSourceUrl(input.sourceUrl)) {
        reviewReasons.push("INVALID_SOURCE_URL");
      }
      if (availabilityStatus === "sold_or_reserved") {
        reviewReasons.push("SOLD_OR_RESERVED");
      } else if (priceStatus === "missing") {
        reviewReasons.push("MISSING_PRICE_SIGNAL");
      }
      if (!input.island) {
        reviewReasons.push("MISSING_ISLAND_MAPPING");
      }
      if (imageValidation.validImages.length === 0) {
        reviewReasons.push("NO_VALID_IMAGE");
      }
      if (imageValidation.multi_domain_gallery) {
        reviewReasons.push("MULTI_DOMAIN_GALLERY");
      }

      const sortedValidImages = imageValidation.validImages
        .slice()
        .sort((a, b) => a.position - b.position);

      return {
        listingImages: [
          ...sortedValidImages,
          ...imageValidation.invalidImages,
        ],
        working: {
          listingId: input.id,
          sourceId: input.sourceId,
          createdAt: input.createdAt,
          title: input.title,
          description: input.description,
          price: input.price,
          trust_tier: "C" as const,
          trust_gate_passed: false,
          indexable: false,
          review_reasons: reviewReasons,
          has_valid_image: sortedValidImages.length > 0,
          cover_image_url: imageValidation.coverCandidateUrl,
          cover_image_hash: imageValidation.coverCandidateHash,
          duplicate_risk: "low" as const,
          identity_fingerprint: computeIdentityFingerprint(input),
          cross_source_match_key: computeCrossSourceMatchKey(input, priceStatus),
          canonical_listing_id: input.id,
          price_status: priceStatus,
          location_confidence: input.locationConfidence,
          multi_domain_gallery: imageValidation.multi_domain_gallery,
          valid_image_records: sortedValidImages,
          valid_image_urls: sortedValidImages.map((record) => record.image_url),
        },
      };
    }
  );

  const working: WorkingListingResult[] = [];
  for (const result of prepared) {
    listingImages.push(...result.listingImages);
    working.push(result.working);
  }

  const identityGroups = new Map<string, WorkingListingResult[]>();
  for (const listing of working) {
    if (!listing.identity_fingerprint) continue;
    const group = identityGroups.get(listing.identity_fingerprint) || [];
    group.push(listing);
    identityGroups.set(listing.identity_fingerprint, group);
  }
  markDuplicateLosers(identityGroups, "identity", duplicateMatches);

  const crossSourceGroups = new Map<string, WorkingListingResult[]>();
  for (const listing of working) {
    if (listing.review_reasons.includes("IDENTITY_DUPLICATE")) continue;
    if (!listing.cross_source_match_key) continue;
    const group = crossSourceGroups.get(listing.cross_source_match_key) || [];
    group.push(listing);
    crossSourceGroups.set(listing.cross_source_match_key, group);
  }
  markDuplicateLosers(crossSourceGroups, "cross_source", duplicateMatches);

  const publicCandidates = working.filter(
    (listing) =>
      !listing.review_reasons.includes("IDENTITY_DUPLICATE") &&
      !listing.review_reasons.includes("CROSS_SOURCE_DUPLICATE_LOSER")
  );

  const takenCovers: Array<{ listingId: string; hash: string | null }> = [];
  for (const listing of publicCandidates) {
    if (!listing.cover_image_hash) continue;

    const duplicateCover = takenCovers.some((taken) =>
      arePerceptualHashesNear(listing.cover_image_hash, taken.hash)
    );

    if (!duplicateCover) {
      takenCovers.push({ listingId: listing.listingId, hash: listing.cover_image_hash });
      continue;
    }

    const fallback = pickAlternativeCover(listing, takenCovers);
    if (fallback.url && fallback.hash) {
      listing.cover_image_url = fallback.url;
      listing.cover_image_hash = fallback.hash;
      listing.valid_image_urls = [
        fallback.url,
        ...listing.valid_image_urls.filter((url) => url !== fallback.url),
      ];
      listing.valid_image_records = [
        ...listing.valid_image_records.filter((record) => record.image_url === fallback.url),
        ...listing.valid_image_records.filter((record) => record.image_url !== fallback.url),
      ];
      if (fallback.changed) {
        listing.review_reasons.push("COVER_IMAGE_FALLBACK_APPLIED");
      }
      takenCovers.push({ listingId: listing.listingId, hash: fallback.hash });
      continue;
    }

    listing.review_reasons.push("DUPLICATE_COVER_IMAGE");
    listing.duplicate_risk = "medium";
  }

  for (const record of listingImages) {
    const listing = working.find((candidate) => candidate.listingId === record.listing_id);
    record.is_cover = listing?.cover_image_url === record.image_url;
  }

  for (const listing of working) {
    listing.review_reasons = Array.from(new Set(listing.review_reasons));
    listing.trust_gate_passed = !hasHardPublicBlocker(listing.review_reasons);
    listing.indexable = listing.trust_gate_passed && !shouldBeNonIndexable(listing);
    listing.trust_tier = listing.trust_gate_passed
      ? listing.indexable
        ? "A"
        : "B"
      : "C";
  }

  return {
    listings: working.map((listing) => ({
      listingId: listing.listingId,
      trust_tier: listing.trust_tier,
      trust_gate_passed: listing.trust_gate_passed,
      indexable: listing.indexable,
      review_reasons: listing.review_reasons,
      has_valid_image: listing.has_valid_image,
      cover_image_url: listing.cover_image_url,
      cover_image_hash: listing.cover_image_hash,
      duplicate_risk: listing.duplicate_risk,
      identity_fingerprint: listing.identity_fingerprint,
      cross_source_match_key: listing.cross_source_match_key,
      canonical_listing_id: listing.canonical_listing_id,
      price_status: listing.price_status,
      location_confidence: listing.location_confidence,
      multi_domain_gallery: listing.multi_domain_gallery,
      valid_image_urls: listing.valid_image_urls,
    })),
    listingImages,
    duplicateMatches,
  };
}
