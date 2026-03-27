import * as cheerio from "cheerio";
import * as crypto from "crypto";
import { fetchHtml } from "./fetchHtml";
import { SourceConfig } from "./configLoader";
import { dedupeImageUrls } from "./genericFetcher";
import { loadLocationsConfig, parseLocation } from "./locationMapper";

export interface CvCustomListing {
  id: string;
  sourceId: string;
  sourceName: string;
  title?: string;
  price?: number;
  description?: string;
  imageUrls: string[];
  location?: string;
  detailUrl?: string;
  createdAt: Date;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  property_type?: string;
  source_ref?: string;
  project_flag?: boolean;
}

function normalizeWhitespace(value: string | undefined | null): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function makeAbsoluteUrl(url: string | undefined | null, baseUrl: string): string | undefined {
  const raw = normalizeWhitespace(url);
  if (!raw) return undefined;
  if (raw.startsWith("data:")) return undefined;
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return undefined;
  }
}

function parsePrice(text: string | undefined | null): number | undefined {
  const raw = normalizeWhitespace(text);
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower.includes("price on request") || lower.includes("call")) return undefined;

  let cleaned = raw.replace(/[€$£]/g, "").trim();
  cleaned = cleaned.replace(/[\u00a0\s]/g, "");

  if (cleaned.includes(".") && cleaned.includes(",")) {
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    const tail = cleaned.split(",").pop() || "";
    cleaned = tail.length <= 2 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(".")) {
    const tail = cleaned.split(".").pop() || "";
    if (tail.length === 3 && /^\d{1,3}\.\d{3}(\.\d{3})*$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  cleaned = cleaned.replace(/[^\d.]/g, "");
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value);
}

function parseInteger(text: string | undefined | null): number | undefined {
  const match = normalizeWhitespace(text).match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return undefined;
  return Math.round(Number.parseFloat(match[1].replace(",", ".")));
}

function parseArea(text: string | undefined | null): number | undefined {
  const match = normalizeWhitespace(text).match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/i);
  if (!match) return undefined;
  return Math.round(Number.parseFloat(match[1].replace(",", ".")));
}

function humanizeSlug(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const slug = new URL(url).pathname.split("/").filter(Boolean).pop();
    if (!slug) return undefined;
    return slug
      .replace(/-/g, " ")
      .replace(/\bref\b/gi, "ref")
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());
  } catch {
    return undefined;
  }
}

function makeStableId(sourceId: string, detailUrl: string, sourceRef?: string): string {
  const input = `${sourceId}|${detailUrl}|${sourceRef || ""}`;
  return `${sourceId}_${crypto.createHash("md5").update(input).digest("hex").slice(0, 12)}`;
}

function normalizePropertyType(value: string | undefined | null): string | undefined {
  const text = normalizeWhitespace(value).toLowerCase();
  if (!text) return undefined;
  if (/\bproject\b/.test(text)) return "project";
  if (/\bmultiple apartments?\b/.test(text)) return "project";
  if (/\bvilla\b/.test(text)) return "villa";
  if (/\bpenthouse\b/.test(text)) return "penthouse";
  if (/\bapartment|condo|flat\b/.test(text)) return "apartment";
  if (/\bhouse|home\b/.test(text)) return "house";
  if (/\bduplex\b/.test(text)) return "duplex";
  if (/\bstudio\b/.test(text)) return "studio";
  if (/\bcommercial|office|shop|warehouse\b/.test(text)) return "commercial";
  if (/\bground|land|plot|lot|terrain\b/.test(text)) return "land";
  return text;
}

function extractSrcsetImages($img: cheerio.Cheerio<any>, baseUrl: string): string[] {
  const urls: string[] = [];
  const add = (candidate: string | undefined | null) => {
    const absolute = makeAbsoluteUrl(candidate, baseUrl);
    if (absolute) urls.push(absolute);
  };

  add($img.attr("src"));
  add($img.attr("data-src"));
  add($img.attr("data-lazy"));
  add($img.attr("data-lazy-src"));
  const srcset = $img.attr("srcset") || $img.attr("data-srcset");
  if (srcset) {
    for (const part of srcset.split(",")) {
      add(part.trim().split(/\s+/)[0]);
    }
  }
  return urls;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function isBuyInCapeVerdeImage(url: string): boolean {
  return /https:\/\/(?:ik\.imagekit\.io\/cabvert|usc1\.contabostorage\.com\/[^/]+:capvertimmo)\/img\/terrenos\/.+\.(?:avif|gif|jpe?g|png|webp)(?:\?.*)?$/i.test(url);
}

function normalizeCvLocationText(location: string | undefined): string | undefined {
  const value = normalizeWhitespace(location);
  if (!value) return undefined;

  const config = loadLocationsConfig("cv");
  if (!config?.islands?.length) return value;

  const segments = value
    .split(",")
    .map((part) => normalizeWhitespace(part).toLowerCase())
    .filter(Boolean);

  const explicitIsland = config.islands.find((island) =>
    island.aliases.some((alias) => segments.includes(alias.toLowerCase()))
  );
  if (!explicitIsland) return value;

  const parsed = parseLocation(value, "cv");
  if (parsed.island && parsed.island !== explicitIsland.name) {
    return explicitIsland.name;
  }

  return value;
}

async function fetchBuyInCapeVerde(source: SourceConfig): Promise<CvCustomListing[]> {
  const listings: CvCustomListing[] = [];
  const maxPages = source.max_pages || 10;
  const now = new Date();

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1 ? source.url : `${source.url}?page=${page}`;
    const pageResult = await fetchHtml(pageUrl);
    if (!pageResult.success || !pageResult.html) break;

    const $ = cheerio.load(pageResult.html);
    const cards = $(".single-container");
    if (cards.length === 0) break;

    let pageCount = 0;

    for (const el of cards.toArray()) {
      const card = $(el);
      const href = card.find("a[href^='/properties/']").first().attr("href");
      const detailUrl = makeAbsoluteUrl(href, source.url);
      if (!detailUrl) continue;

      const sourceRef = normalizeWhitespace(card.find(".ref-line").text()).replace(/^Ref:\s*/i, "");
      const location = normalizeCvLocationText(card.find(".location-line").text());
      const propertyType = normalizePropertyType(card.find(".ground-type").text());
      const title = humanizeSlug(detailUrl);
      const price = parsePrice(card.find(".ground-price").text());
      const imageUrls = dedupeImageUrls(
        card
          .find(".image-container img")
          .toArray()
          .flatMap((img) => [makeAbsoluteUrl($(img).attr("src") || $(img).attr("data-src"), source.url)])
          .filter((url): url is string => Boolean(url))
          .filter((url) => isBuyInCapeVerdeImage(url))
      );

      const details = card.find(".detail-item").toArray();
      let area: number | undefined;
      let bedrooms: number | undefined;
      let bathrooms: number | undefined;
      for (const item of details) {
        const text = normalizeWhitespace($(item).text());
        const alt = normalizeWhitespace($(item).find("img").attr("alt")).toLowerCase();
        if (alt.includes("surface")) area = parseArea(text);
        if (alt.includes("bed")) bedrooms = parseInteger(text);
        if (alt.includes("bath")) bathrooms = parseInteger(text);
      }

      let description: string | undefined;
      let finalTitle = title;
      let finalLocation = location;
      let projectFlag = false;
      let finalImages = imageUrls;

      const detailResult = await fetchHtml(detailUrl);
      if (detailResult.success && detailResult.html) {
        const detail$ = cheerio.load(detailResult.html);
        finalTitle =
          normalizeWhitespace(detail$("h1").first().text()) ||
          normalizeWhitespace(detail$('meta[property="og:title"]').attr("content")) ||
          title;
        description =
          normalizeWhitespace(detail$(".long-description").first().text()) ||
          normalizeWhitespace(detail$('meta[name="description"]').attr("content")) ||
          undefined;
        finalLocation =
          normalizeCvLocationText(detail$(".comune-region-title").first().text()) ||
          location;
        projectFlag =
          /Other properties available from the Project/i.test(detailResult.html) ||
          detail$("app-relevant-projects .project-card").length > 0;

        const heroImages = detail$(".ground-detail-container img[src*='ik.imagekit.io/cabvert/img/terrenos/']")
          .toArray()
          .flatMap((img) => [makeAbsoluteUrl(detail$(img).attr("src") || detail$(img).attr("data-src"), detailUrl)])
          .filter((url): url is string => Boolean(url))
          .filter((url) => isBuyInCapeVerdeImage(url));
        finalImages = dedupeImageUrls([...finalImages, ...heroImages]).slice(0, 10);
      }

      listings.push({
        id: makeStableId(source.id, detailUrl, sourceRef || undefined),
        sourceId: source.id,
        sourceName: source.name,
        title: finalTitle,
        price,
        description,
        imageUrls: finalImages,
        location: finalLocation,
        detailUrl,
        createdAt: now,
        bedrooms: bedrooms ?? null,
        bathrooms: bathrooms ?? null,
        area_sqm: area ?? null,
        property_type: propertyType,
        source_ref: sourceRef || undefined,
        project_flag: projectFlag,
      });
      pageCount++;
    }

    if (pageCount === 0) break;
  }

  return listings;
}

function extractNosIlhasProjectLocation($: cheerio.CheerioAPI): string | undefined {
  const sliderText = normalizeWhitespace($("rs-layer").first().text());
  if (sliderText) return sliderText;
  const headingText = normalizeWhitespace($("h2").filter((_, el) => /Cabo Verde/i.test($(el).text())).first().text());
  return headingText || undefined;
}

function extractNosIlhasProjectImages($: cheerio.CheerioAPI, pageUrl: string): string[] {
  const images = [
    $('meta[property="og:image"]').attr("content"),
    ...$(".rev-slidebg, .vc_single_image-img, .slick-slide img, .vc_column-inner img")
      .toArray()
      .flatMap((img) => extractSrcsetImages($(img), pageUrl)),
  ]
    .map((url) => makeAbsoluteUrl(url, pageUrl))
    .filter((url): url is string => Boolean(url))
    .filter((url) => !/dummy\.png|40x40|icon|logo/i.test(url));

  return dedupeImageUrls(images).slice(0, 12);
}

function extractNosIlhasProjectDescription($: cheerio.CheerioAPI): string | undefined {
  const paragraphs = $("article .elegant-text-block p, article .elegant-text-block")
    .toArray()
    .map((el) => normalizeWhitespace($(el).text()))
    .filter((text) => text.length >= 40);
  return paragraphs[0];
}

function extractNosIlhasStartPrice($: cheerio.CheerioAPI): number | undefined {
  const text = normalizeWhitespace($.root().text());
  const match = text.match(/Start(?:s)? from\s*([0-9 .,\u00a0]+€)/i);
  return parsePrice(match?.[1]);
}

async function fetchNosIlhasProjects(source: SourceConfig): Promise<CvCustomListing[]> {
  const hubResult = await fetchHtml(source.url);
  if (!hubResult.success || !hubResult.html) return [];

  const $ = cheerio.load(hubResult.html);
  const projectUrls = unique(
    $("a[href*='/new-developments/']")
      .toArray()
      .map((el) => makeAbsoluteUrl($(el).attr("href"), source.url))
      .filter((url): url is string => Boolean(url))
      .filter((url) => url !== source.url)
  );

  const listings: CvCustomListing[] = [];
  const now = new Date();

  for (const projectUrl of projectUrls) {
    const detailResult = await fetchHtml(projectUrl);
    if (!detailResult.success || !detailResult.html) continue;

    const detail$ = cheerio.load(detailResult.html);
    const projectTitle =
      normalizeWhitespace(detail$("h1").first().text()) ||
      normalizeWhitespace(detail$("title").text()).replace(/\s*-\s*Nos Ilhas Real Estate\s*$/i, "");
    const projectLocation = extractNosIlhasProjectLocation(detail$);
    const projectDescription = extractNosIlhasProjectDescription(detail$);
    const projectImages = extractNosIlhasProjectImages(detail$, projectUrl);
    const startPrice = extractNosIlhasStartPrice(detail$);

    listings.push({
      id: makeStableId(source.id, projectUrl),
      sourceId: source.id,
      sourceName: source.name,
      title: projectTitle || humanizeSlug(projectUrl),
      price: startPrice,
      description: projectDescription,
      imageUrls: projectImages,
      location: projectLocation,
      detailUrl: projectUrl,
      createdAt: now,
      bedrooms: null,
      bathrooms: null,
      area_sqm: null,
      property_type: "project",
      project_flag: true,
    });

    const unitCards = detail$("#properties_module_section .item-listing-wrap");
    for (const el of unitCards.toArray()) {
      const card = detail$(el);
      const status = normalizeWhitespace(card.find(".label-status").text()).toLowerCase();
      if (status.includes("sold")) continue;

      const href = makeAbsoluteUrl(card.find("a.listing-featured-thumb").attr("href"), projectUrl);
      if (!href) continue;

      const unitTitle = normalizeWhitespace(card.find(".item-title a, .item-title").first().text()) || humanizeSlug(href);
      const unitLocation = normalizeWhitespace(card.find("address.item-address").text()) || projectLocation;
      const unitPrice = parsePrice(card.find(".item-price").text());
      const unitBedrooms = parseInteger(card.find(".h-beds .hz-figure").first().text());
      const unitBathrooms = parseInteger(card.find(".h-baths .hz-figure").first().text());
      const unitArea = parseArea(card.find(".h-area").text()) ?? parseInteger(card.find(".h-area .hz-figure").first().text());
      const unitType = normalizePropertyType(card.find(".h-type span").text()) || "apartment";

      const unitImages = dedupeImageUrls([
        ...extractSrcsetImages(card.find("img").first(), projectUrl),
        ...(() => {
          const dataImages = card.attr("data-images");
          if (!dataImages) return [];
          try {
            const parsed = JSON.parse(dataImages) as Array<{ image?: string }>;
            return parsed
              .map((item) => makeAbsoluteUrl(item.image, projectUrl))
              .filter((url): url is string => Boolean(url));
          } catch {
            return [];
          }
        })(),
      ]).slice(0, 12);

      listings.push({
        id: makeStableId(source.id, href),
        sourceId: source.id,
        sourceName: source.name,
        title: unitTitle,
        price: unitPrice,
        description: projectDescription,
        imageUrls: unitImages,
        location: unitLocation,
        detailUrl: href,
        createdAt: now,
        bedrooms: unitBedrooms ?? null,
        bathrooms: unitBathrooms ?? null,
        area_sqm: unitArea ?? null,
        property_type: unitType,
        project_flag: true,
      });
    }
  }

  return listings;
}

export async function fetchCvCustomSource(source: SourceConfig): Promise<CvCustomListing[] | null> {
  if (source.id === "cv_buyincapeverde") {
    return fetchBuyInCapeVerde(source);
  }
  if (source.id === "cv_nosilhasprojects") {
    return fetchNosIlhasProjects(source);
  }
  return null;
}
