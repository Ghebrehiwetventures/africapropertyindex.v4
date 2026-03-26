// =============================================================================
// arei-sdk/src/transforms.ts
// Convert raw DB rows to UI-safe types
// =============================================================================

import {
  PRICE_CEILING,
  PRICE_FLOOR,
  type ListingRow,
  type ListingCard,
  type ListingDetail,
} from "./types.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isNew(firstSeenAt: string): boolean {
  const seen = new Date(firstSeenAt).getTime();
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  return seen > cutoff;
}

function sanitizePrice(price: number | null): number | null {
  if (price == null) return null;
  if (price < PRICE_FLOOR || price > PRICE_CEILING) return null;
  return price;
}

function getDisplayTitle(row: ListingRow): string {
  return row.rendered_title_en?.trim() || row.title;
}

function getDisplayDescription(row: ListingRow): string | null {
  return row.rendered_description_en ?? row.description;
}

function getDisplayDescriptionHtml(row: ListingRow): string | null {
  return row.rendered_description_html_en ?? row.description_html;
}

/** Raw row → ListingCard (for grids) */
export function toListingCard(row: ListingRow): ListingCard {
  return {
    id: row.id,
    title: getDisplayTitle(row),
    island: row.island,
    city: row.city,
    price: sanitizePrice(row.price),
    currency: row.currency,
    property_type: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    land_area_sqm: row.land_area_sqm,
    image_url: row.image_urls?.[0] ?? null,
    source_id: row.source_id,
    first_seen_at: row.first_seen_at,
    is_new: isNew(row.first_seen_at),
  };
}

/** Raw row → ListingDetail (for detail page) */
export function toListingDetail(row: ListingRow): ListingDetail {
  return {
    id: row.id,
    title: getDisplayTitle(row),
    source_title: row.title,
    rendered_title_en: row.rendered_title_en,
    island: row.island,
    city: row.city,
    price: sanitizePrice(row.price),
    currency: row.currency,
    property_type: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    land_area_sqm: row.land_area_sqm,
    property_size_sqm: row.property_size_sqm,
    description: getDisplayDescription(row),
    description_html: getDisplayDescriptionHtml(row),
    source_description: row.description,
    source_description_html: row.description_html,
    rendered_description_en: row.rendered_description_en,
    rendered_description_html_en: row.rendered_description_html_en,
    image_urls: row.image_urls ?? [],
    source_id: row.source_id,
    source_url: row.source_url,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    is_new: isNew(row.first_seen_at),
    rendered_translation_source: row.rendered_translation_source,
    rendered_translation_source_language: row.rendered_translation_source_language,
    rendered_translation_target_language: row.rendered_translation_target_language,
    rendered_translation_is_source_truth: row.rendered_translation_is_source_truth,
    rendered_translation_updated_at: row.rendered_translation_updated_at,
  };
}
