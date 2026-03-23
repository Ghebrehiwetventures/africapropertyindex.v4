import { getDomain } from "tldts";
import { probeImage, ImageProbeResult } from "./imageProbe";

export interface ListingImageValidationInput {
  listingId: string;
  sourceUrl: string | null | undefined;
  imageUrls: string[];
  allowedImageHosts?: string[];
  allowedImageUrlPatterns?: string[];
}

export interface ListingImageRecord {
  listing_id: string;
  image_url: string;
  position: number;
  image_domain: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  aspect_ratio: number | null;
  white_background_ratio: number | null;
  visual_complexity: number | null;
  perceptual_hash: string | null;
  is_valid: boolean;
  is_cover: boolean;
  invalid_reasons: string[];
}

export interface ListingImageValidationResult {
  listingId: string;
  multi_domain_gallery: boolean;
  raw_domains: string[];
  validImages: ListingImageRecord[];
  invalidImages: ListingImageRecord[];
  coverCandidateUrl: string | null;
  coverCandidateHash: string | null;
}

const MIN_IMAGE_BYTES = 20_000;
const MIN_IMAGE_WIDTH = 400;
const MIN_IMAGE_HEIGHT = 300;

function getImageValidationConcurrency(): number {
  const raw = Number.parseInt(process.env.TRUST_IMAGE_CONCURRENCY || "", 10);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return 8;
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

function registrableDomainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return getDomain(parsed.hostname, { allowPrivateDomains: true }) || parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isSquare(aspectRatio: number | null): boolean {
  if (aspectRatio == null) return false;
  return aspectRatio >= 0.95 && aspectRatio <= 1.05;
}

function isLikelyLogoOrFavicon(probe: ImageProbeResult): boolean {
  const square = isSquare(probe.aspect_ratio);
  const verySmallFile = probe.bytes != null && probe.bytes < 80_000;
  const highWhiteBackground =
    probe.white_background_ratio != null && probe.white_background_ratio >= 0.72;
  const lowComplexity =
    probe.visual_complexity != null && probe.visual_complexity <= 0.08;
  const tinyDimensions =
    probe.width != null &&
    probe.height != null &&
    probe.width <= 256 &&
    probe.height <= 256;

  return square && verySmallFile && (highWhiteBackground || lowComplexity || tinyDimensions);
}

function isAllowedDomain(
  imageUrl: string,
  imageDomain: string | null,
  sourceDomain: string | null,
  allowedDomains: Set<string>,
  allowedUrlPatterns: RegExp[]
): boolean {
  if (!imageDomain) return false;
  if (sourceDomain && imageDomain === sourceDomain) return true;
  if (allowedDomains.has(imageDomain)) return true;
  return allowedUrlPatterns.some((pattern) => pattern.test(imageUrl));
}

function buildImageRecord(
  listingId: string,
  url: string,
  position: number,
  probe: ImageProbeResult,
  invalidReasons: string[],
  isCover: boolean
): ListingImageRecord {
  return {
    listing_id: listingId,
    image_url: url,
    position,
    image_domain: probe.image_domain,
    bytes: probe.bytes,
    width: probe.width,
    height: probe.height,
    aspect_ratio: probe.aspect_ratio,
    white_background_ratio: probe.white_background_ratio,
    visual_complexity: probe.visual_complexity,
    perceptual_hash: probe.perceptual_hash,
    is_valid: invalidReasons.length === 0,
    is_cover: isCover,
    invalid_reasons: invalidReasons,
  };
}

export async function validateListingImages(
  input: ListingImageValidationInput
): Promise<ListingImageValidationResult> {
  const sourceDomain = registrableDomainFromUrl(input.sourceUrl);
  const allowedDomains = new Set<string>();
  const allowedUrlPatterns = (input.allowedImageUrlPatterns || [])
    .map((pattern) => {
      try {
        return new RegExp(pattern, "i");
      } catch {
        return null;
      }
    })
    .filter((pattern): pattern is RegExp => pattern != null);

  for (const host of input.allowedImageHosts || []) {
    const domain = registrableDomainFromUrl(host.startsWith("http") ? host : `https://${host}`);
    if (domain) {
      allowedDomains.add(domain);
    }
  }

  const allRecords = await mapWithConcurrency(
    input.imageUrls,
    getImageValidationConcurrency(),
    async (imageUrl, index) => {
      const probe = await probeImage(imageUrl);
      const invalidReasons: string[] = [];

      if (probe.probe_error) {
        invalidReasons.push("IMAGE_PROBE_FAILED");
      }
      if (!isAllowedDomain(imageUrl, probe.image_domain, sourceDomain, allowedDomains, allowedUrlPatterns)) {
        invalidReasons.push("CROSS_DOMAIN_IMAGE");
      }
      if (probe.bytes == null || probe.bytes < MIN_IMAGE_BYTES) {
        invalidReasons.push("IMAGE_TOO_SMALL_BYTES");
      }
      if (
        probe.width == null ||
        probe.height == null ||
        probe.width < MIN_IMAGE_WIDTH ||
        probe.height < MIN_IMAGE_HEIGHT
      ) {
        invalidReasons.push("IMAGE_TOO_SMALL_DIMENSIONS");
      }
      if (isLikelyLogoOrFavicon(probe)) {
        invalidReasons.push("PROBABLE_LOGO_OR_FAVICON");
      }

      return buildImageRecord(
        input.listingId,
        imageUrl,
        index,
        probe,
        invalidReasons,
        false
      );
    }
  );

  const rawDomains = Array.from(
    new Set(
      allRecords
        .map((record) => record.image_domain)
        .filter((domain): domain is string => Boolean(domain))
    )
  );
  const validImages = allRecords.filter((record) => record.is_valid);
  const invalidImages = allRecords.filter((record) => !record.is_valid);

  if (validImages[0]) {
    validImages[0] = {
      ...validImages[0],
      is_cover: true,
    };
  }

  const hasUnexpectedGalleryDomain = allRecords.some((record) => {
    if (!record.image_domain) return false;
    return !isAllowedDomain(
      record.image_url,
      record.image_domain,
      sourceDomain,
      allowedDomains,
      allowedUrlPatterns
    );
  });

  return {
    listingId: input.listingId,
    multi_domain_gallery: hasUnexpectedGalleryDomain,
    raw_domains: rawDomains.sort(),
    validImages,
    invalidImages,
    coverCandidateUrl: validImages[0]?.image_url ?? null,
    coverCandidateHash: validImages[0]?.perceptual_hash ?? null,
  };
}
