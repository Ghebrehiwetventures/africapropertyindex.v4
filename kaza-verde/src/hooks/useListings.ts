/**
 * React Query hooks — thin wrappers around the arei-sdk.
 * All listing data comes from v1_feed_cv via AREIClient (no direct public.listings access).
 */

import { useQuery } from "@tanstack/react-query";
import type { ListingCard, ListingDetail } from "arei-sdk";
import type { PriceBucket } from "arei-sdk";
import { PRICE_BUCKETS } from "arei-sdk";
import { arei } from "../lib/arei";
import type { ListingsFilters } from "../types";
import type { Listing } from "../types";

export const PAGE_SIZE = 12;

// Map SDK ListingCard → app Listing (for PropertyCard and existing UI)
function cardToListing(card: ListingCard): Listing {
  return {
    id: card.id,
    title: card.title,
    description: null,
    price: card.price,
    currency: card.currency ?? "",
    island: card.island,
    city: card.city,
    bedrooms: card.bedrooms,
    bathrooms: card.bathrooms,
    property_size_sqm: card.land_area_sqm,
    land_area_sqm: card.land_area_sqm,
    property_type: card.property_type,
    image_urls: card.image_url ? [card.image_url] : [],
    source_id: card.source_id,
    source_url: null,
    approved: true,
    amenities: null,
    price_period: null,
    created_at: card.first_seen_at,
    updated_at: null,
  };
}

// Map SDK ListingDetail → app Listing (for PropertyDetailPage)
function detailToListing(detail: ListingDetail): Listing {
  return {
    id: detail.id,
    title: detail.title,
    description: detail.description,
    price: detail.price,
    currency: detail.currency ?? "",
    island: detail.island,
    city: detail.city,
    bedrooms: detail.bedrooms,
    bathrooms: detail.bathrooms,
    property_size_sqm: detail.land_area_sqm,
    land_area_sqm: detail.land_area_sqm,
    property_type: detail.property_type,
    image_urls: detail.image_urls ?? [],
    source_id: detail.source_id,
    source_url: detail.source_url,
    approved: true,
    amenities: null,
    price_period: null,
    created_at: detail.first_seen_at,
    updated_at: detail.last_seen_at,
  };
}

// Derive priceBucket from filters when range exactly matches a bucket
function filtersToPriceBucket(filters: ListingsFilters): PriceBucket | undefined {
  const { priceMin, priceMax } = filters;
  if (priceMin == null || priceMax == null) return undefined;
  for (const [bucket, range] of Object.entries(PRICE_BUCKETS)) {
    if (priceMin === range.min && priceMax === range.max) return bucket as PriceBucket;
  }
  return undefined;
}

// ─── Listings (paginated + filtered) ─────────────────────────────────────────

export function useListings(page: number, filters: ListingsFilters) {
  return useQuery({
    queryKey: ["listings", page, filters],
    queryFn: async () => {
      const priceBucket = filtersToPriceBucket(filters);
      const result = await arei.getListings({
        page,
        pageSize: PAGE_SIZE,
        island: filters.island,
        priceBucket,
      });
      return {
        data: result.data.map(cardToListing),
        totalCount: result.total,
        totalPages: result.totalPages,
      };
    },
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

// ─── Single listing ──────────────────────────────────────────────────────────

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      if (!id) return null;
      const detail = await arei.getListing(id);
      return detail ? detailToListing(detail) : null;
    },
    enabled: !!id,
    staleTime: 120_000,
  });
}

// ─── Stats (from v1_feed_cv via getMarketStats) ──────────────────────────────

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { total, islands } = await arei.getMarketStats();
      const medianPrice =
        islands.length > 0 && islands[0].median_price != null
          ? islands[0].median_price
          : null;
      return {
        totalListings: total,
        totalIslands: islands.length,
        totalSources: 0,
        medianPrice,
      };
    },
    staleTime: 300_000,
  });
}

// ─── Quality ratio (from v1_feed_cv only; no public.listings) ─────────────────

export interface QualityRatio {
  raw: number;
  quality: number;
  ratio: number;
}

export function useQualityRatio() {
  return useQuery({
    queryKey: ["qualityRatio"],
    queryFn: async (): Promise<QualityRatio> => {
      const { total } = await arei.getMarketStats();
      return { raw: total, quality: total, ratio: total > 0 ? 100 : 0 };
    },
    staleTime: 300_000,
  });
}

// ─── Island options (for filter dropdown, from v1_feed_cv) ─────────────────────

export function useIslandOptions() {
  return useQuery({
    queryKey: ["islandOptions"],
    queryFn: () => arei.getIslandOptions(),
    staleTime: 300_000,
  });
}

// ─── Featured (first page of listings from v1_feed_cv) ─────────────────────────

export function useFeatured() {
  return useQuery({
    queryKey: ["featured"],
    queryFn: async () => {
      const result = await arei.getListings({ page: 1, pageSize: 8 });
      return result.data.map(cardToListing);
    },
    staleTime: 120_000,
  });
}
