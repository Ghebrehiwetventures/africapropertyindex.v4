import * as crypto from "crypto";

const { Jimp, compareHashes } = require("jimp");

export interface ImageFingerprintResult {
  perceptualHash: string | null;
  whiteBackgroundRatio: number | null;
  visualComplexity: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function analyzeVisuals(image: any): {
  whiteBackgroundRatio: number;
  visualComplexity: number;
} {
  const sample = image.clone().resize({ w: 16, h: 16 });
  const values: number[] = [];
  let whitePixels = 0;

  for (let y = 0; y < sample.bitmap.height; y++) {
    for (let x = 0; x < sample.bitmap.width; x++) {
      const rgba = Jimp.intToRGBA(sample.getPixelColor(x, y));
      const lum = luminance(rgba.r, rgba.g, rgba.b);
      values.push(lum);
      if (rgba.a >= 240 && lum >= 245) {
        whitePixels++;
      }
    }
  }

  let complexityAccumulator = 0;
  let complexitySamples = 0;
  for (let y = 0; y < sample.bitmap.height; y++) {
    for (let x = 0; x < sample.bitmap.width; x++) {
      const current = values[y * sample.bitmap.width + x];
      if (x + 1 < sample.bitmap.width) {
        const right = values[y * sample.bitmap.width + x + 1];
        complexityAccumulator += Math.abs(current - right);
        complexitySamples++;
      }
      if (y + 1 < sample.bitmap.height) {
        const down = values[(y + 1) * sample.bitmap.width + x];
        complexityAccumulator += Math.abs(current - down);
        complexitySamples++;
      }
    }
  }

  const whiteBackgroundRatio = whitePixels / values.length;
  const visualComplexity =
    complexitySamples > 0
      ? clamp((complexityAccumulator / complexitySamples) / 255, 0, 1)
      : 0;

  return {
    whiteBackgroundRatio,
    visualComplexity,
  };
}

export async function computeImageFingerprint(buffer: Buffer): Promise<ImageFingerprintResult> {
  try {
    const image = await Jimp.read(buffer);
    const perceptualHash = image.hash();
    const { whiteBackgroundRatio, visualComplexity } = analyzeVisuals(image);
    return {
      perceptualHash,
      whiteBackgroundRatio,
      visualComplexity,
    };
  } catch {
    return {
      perceptualHash: null,
      whiteBackgroundRatio: null,
      visualComplexity: null,
    };
  }
}

export function comparePerceptualHashes(
  hashA: string | null | undefined,
  hashB: string | null | undefined
): number | null {
  if (!hashA || !hashB) return null;
  try {
    return compareHashes(hashA, hashB);
  } catch {
    return null;
  }
}

export function arePerceptualHashesNear(
  hashA: string | null | undefined,
  hashB: string | null | undefined,
  threshold: number = 0.12
): boolean {
  const distance = comparePerceptualHashes(hashA, hashB);
  return distance != null && distance <= threshold;
}

export function hashString(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}
