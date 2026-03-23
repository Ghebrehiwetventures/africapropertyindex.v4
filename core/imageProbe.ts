import { getDomain } from "tldts";
import { imageSize } from "image-size";
import { computeImageFingerprint } from "./imageFingerprint";

export interface ImageProbeResult {
  url: string;
  image_domain: string | null;
  content_type: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  aspect_ratio: number | null;
  white_background_ratio: number | null;
  visual_complexity: number | null;
  perceptual_hash: string | null;
  probe_error?: string;
}

const probeCache = new Map<string, Promise<ImageProbeResult>>();

function getRegistrableDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return getDomain(parsed.hostname, { allowPrivateDomains: true }) || parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

async function fetchImageBuffer(url: string): Promise<{
  buffer: Buffer;
  contentType: string | null;
}> {
  const controller = new AbortController();
  const timeoutMs = Number.parseInt(process.env.IMAGE_PROBE_TIMEOUT_MS || "15000", 10);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "image/jpeg,image/png,image/apng,image/*;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`image fetch failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get("content-type"),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runProbe(url: string): Promise<ImageProbeResult> {
  const image_domain = getRegistrableDomain(url);

  try {
    const { buffer, contentType } = await fetchImageBuffer(url);
    const fingerprint = await computeImageFingerprint(buffer);

    let width: number | null = null;
    let height: number | null = null;
    try {
      const dimensions = imageSize(buffer);
      width = dimensions.width ?? null;
      height = dimensions.height ?? null;
    } catch {
      width = null;
      height = null;
    }

    if (width == null || height == null) {
      try {
        const { Jimp } = require("jimp");
        const image = await Jimp.read(buffer);
        width = image.bitmap.width ?? null;
        height = image.bitmap.height ?? null;
      } catch {
        width = null;
        height = null;
      }
    }

    return {
      url,
      image_domain,
      content_type: contentType,
      bytes: buffer.length,
      width,
      height,
      aspect_ratio:
        width != null && height != null && height > 0
          ? Number((width / height).toFixed(4))
          : null,
      white_background_ratio:
        fingerprint.whiteBackgroundRatio != null
          ? Number(fingerprint.whiteBackgroundRatio.toFixed(4))
          : null,
      visual_complexity:
        fingerprint.visualComplexity != null
          ? Number(fingerprint.visualComplexity.toFixed(4))
          : null,
      perceptual_hash: fingerprint.perceptualHash,
    };
  } catch (error) {
    return {
      url,
      image_domain,
      content_type: null,
      bytes: null,
      width: null,
      height: null,
      aspect_ratio: null,
      white_background_ratio: null,
      visual_complexity: null,
      perceptual_hash: null,
      probe_error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function probeImage(url: string): Promise<ImageProbeResult> {
  const cached = probeCache.get(url);
  if (cached) {
    return cached;
  }

  const pending = runProbe(url);
  probeCache.set(url, pending);
  return pending;
}
