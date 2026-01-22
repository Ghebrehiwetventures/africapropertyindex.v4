import { SourceStatus } from "./status";

// ============================================
// GOLDEN FLOOR CONTRACT V1 - CONSTANTS
// ============================================

export const GOLDEN_RULES_V1 = {
  minImages: 3,              // Blocker threshold
  minDescriptionLength: 50,  // Blocker threshold
  thinDescriptionLength: 30, // Scrap signature threshold
  genericTitles: [
    "listing",
    "property",
    "for sale",
    "for rent",
    "untitled",
    "no title",
    "n/a",
    "na",
    "-",
    "...",
  ],
} as const;

// ============================================
// GOLDEN FLOOR CONTRACT V1 - TYPES
// ============================================

export type Tier = "gold" | "silver" | "raw";

export interface TierInput {
  title?: string;
  price?: number | string | null;
  description?: string;
  imageUrls?: string[];
  bedrooms?: number | null;
  size?: number | null;        // terraceArea or similar
  propertyType?: string | null;
  location?: string;
}

// ============================================
// GOLDEN FLOOR CONTRACT V1 - HELPER FUNCTIONS
// ============================================

/** Returns true if title matches a generic/placeholder pattern */
export function is_generic_title(title: string | undefined): boolean {
  if (!title || typeof title !== "string") return true;
  const normalized = title.trim().toLowerCase();
  if (normalized === "") return true;
  return GOLDEN_RULES_V1.genericTitles.some(
    (generic) => normalized === generic || normalized.startsWith(generic + " ")
  );
}

/** Returns true if description is too short (scrap signature threshold) */
export function is_thin_description(description: string | undefined): boolean {
  if (!description || typeof description !== "string") return true;
  return description.trim().length < GOLDEN_RULES_V1.thinDescriptionLength;
}

/** Content-based scrap signature: generic title AND few images AND thin description */
export function is_scrap_signature(input: TierInput): boolean {
  const genericTitle = is_generic_title(input.title);
  const fewImages = !input.imageUrls || input.imageUrls.length <= 2;
  const thinDesc = is_thin_description(input.description);
  return genericTitle && fewImages && thinDesc;
}

// ============================================
// GOLDEN FLOOR CONTRACT V1 - BLOCKERS
// ============================================

/** Blocker: title exists AND is not generic */
export function title_ok(title: string | undefined): boolean {
  if (!title || typeof title !== "string" || title.trim() === "") return false;
  return !is_generic_title(title);
}

/** Blocker: numeric price > 0 */
export function price_ok(price: number | string | null | undefined): boolean {
  if (price === null || price === undefined || price === "") return false;
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(numPrice)) return false;
  return numPrice > 0;
}

/** Blocker: at least 3 images */
export function images_ok(imageUrls: string[] | undefined): boolean {
  if (!imageUrls || !Array.isArray(imageUrls)) return false;
  return imageUrls.length >= GOLDEN_RULES_V1.minImages;
}

/** Blocker: description at least 50 characters */
export function description_ok(description: string | undefined): boolean {
  if (!description || typeof description !== "string") return false;
  return description.trim().length >= GOLDEN_RULES_V1.minDescriptionLength;
}

// ============================================
// GOLDEN FLOOR CONTRACT V1 - ATTRIBUTES
// ============================================

/** Attribute: bedrooms >= 1 */
export function has_bedrooms(bedrooms: number | null | undefined): boolean {
  if (bedrooms === null || bedrooms === undefined) return false;
  return bedrooms >= 1;
}

/** Attribute: size/area > 0 */
export function has_size(size: number | null | undefined): boolean {
  if (size === null || size === undefined) return false;
  return size > 0;
}

/** Attribute: propertyType exists */
export function has_property_type(propertyType: string | null | undefined): boolean {
  if (propertyType === null || propertyType === undefined) return false;
  return typeof propertyType === "string" && propertyType.trim() !== "";
}

/** Attribute: location exists */
export function has_location(location: string | undefined): boolean {
  if (!location) return false;
  return typeof location === "string" && location.trim() !== "";
}

// ============================================
// GOLDEN FLOOR CONTRACT V1 - TIER ASSIGNMENT
// ============================================

/**
 * Deterministic tier assignment per Golden Floor Contract v1
 *
 * Decision logic:
 * 1. If is_scrap_signature === true → 'raw'
 * 2. Else if all blockers pass AND at least one attribute → 'gold'
 * 3. Else if at least one blocker passes → 'silver'
 * 4. Else → 'raw'
 */
export function assignTier(input: TierInput): Tier {
  // Step 1: Check scrap signature (content-based)
  if (is_scrap_signature(input)) {
    return "raw";
  }

  // Evaluate blockers
  const titlePass = title_ok(input.title);
  const pricePass = price_ok(input.price);
  const imagesPass = images_ok(input.imageUrls);
  const descriptionPass = description_ok(input.description);

  const allBlockersPass = titlePass && pricePass && imagesPass && descriptionPass;
  const atLeastOneBlockerPasses = titlePass || pricePass || imagesPass || descriptionPass;

  // Evaluate attributes
  const hasAnyAttribute =
    has_bedrooms(input.bedrooms) ||
    has_size(input.size) ||
    has_property_type(input.propertyType) ||
    has_location(input.location);

  // Step 2: Gold if all blockers pass AND at least one attribute
  if (allBlockersPass && hasAnyAttribute) {
    return "gold";
  }

  // Step 3: Silver if at least one blocker passes
  if (atLeastOneBlockerPasses) {
    return "silver";
  }

  // Step 4: Otherwise raw
  return "raw";
}

export enum RuleViolation {
  INSUFFICIENT_IMAGES = "INSUFFICIENT_IMAGES",
  INVALID_PRICE = "INVALID_PRICE",
  MISSING_TITLE = "MISSING_TITLE",
  GENERIC_TITLE = "GENERIC_TITLE",
  DESCRIPTION_TOO_SHORT = "DESCRIPTION_TOO_SHORT",
  BROKEN_SOURCE = "BROKEN_SOURCE",
  DUPLICATE = "DUPLICATE",
}

export interface ListingInput {
  id: string;
  title?: string;
  price?: number | string | null;
  description?: string;
  imageUrls?: string[];
  location?: string;
  sourceStatus: SourceStatus;
}

export function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed === "") return false;
  if (trimmed.includes("placeholder")) return false;
  if (trimmed.includes("no-image")) return false;
  if (trimmed.includes("noimage")) return false;
  if (trimmed.includes("default")) return false;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  return true;
}

export function countValidImages(imageUrls: string[] | undefined): number {
  if (!imageUrls || !Array.isArray(imageUrls)) return 0;
  return imageUrls.filter(isValidImageUrl).length;
}

export function checkImages(imageUrls: string[] | undefined): RuleViolation | null {
  const validCount = countValidImages(imageUrls);
  if (validCount < GOLDEN_RULES_V1.minImages) {
    return RuleViolation.INSUFFICIENT_IMAGES;
  }
  return null;
}

export function isValidPrice(price: number | string | null | undefined): boolean {
  if (price === null || price === undefined) return false;
  if (price === "") return false;
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(numPrice)) return false;
  if (numPrice <= 0) return false;
  return true;
}

export function checkPrice(price: number | string | null | undefined): RuleViolation | null {
  if (!isValidPrice(price)) {
    return RuleViolation.INVALID_PRICE;
  }
  return null;
}

export function isGenericTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return GOLDEN_RULES_V1.genericTitles.some(
    (generic) => normalized === generic || normalized.startsWith(generic + " ")
  );
}

export function checkTitle(title: string | undefined): RuleViolation | null {
  if (!title || typeof title !== "string" || title.trim() === "") {
    return RuleViolation.MISSING_TITLE;
  }
  if (isGenericTitle(title)) {
    return RuleViolation.GENERIC_TITLE;
  }
  return null;
}

export function checkDescription(description: string | undefined): RuleViolation | null {
  if (!description || typeof description !== "string") {
    return RuleViolation.DESCRIPTION_TOO_SHORT;
  }
  if (description.trim().length < GOLDEN_RULES_V1.minDescriptionLength) {
    return RuleViolation.DESCRIPTION_TOO_SHORT;
  }
  return null;
}

export function checkSourceStatus(status: SourceStatus): RuleViolation | null {
  if (status === SourceStatus.BROKEN_SOURCE) {
    return RuleViolation.BROKEN_SOURCE;
  }
  return null;
}

export function evaluateGoldenRules(listing: ListingInput): RuleViolation[] {
  const violations: RuleViolation[] = [];

  const sourceViolation = checkSourceStatus(listing.sourceStatus);
  if (sourceViolation) violations.push(sourceViolation);

  const imageViolation = checkImages(listing.imageUrls);
  if (imageViolation) violations.push(imageViolation);

  const priceViolation = checkPrice(listing.price);
  if (priceViolation) violations.push(priceViolation);

  const titleViolation = checkTitle(listing.title);
  if (titleViolation) violations.push(titleViolation);

  const descViolation = checkDescription(listing.description);
  if (descViolation) violations.push(descViolation);

  return violations;
}

export function generateDuplicateKey(listing: ListingInput): string {
  const title = (listing.title || "").trim().toLowerCase();
  const price = isValidPrice(listing.price) ? String(listing.price) : "";
  const location = (listing.location || "").trim().toLowerCase();
  return `${title}|${price}|${location}`;
}
