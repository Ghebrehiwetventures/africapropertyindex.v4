import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Listing, ListingsFilters } from "../types";

export const PAGE_SIZE = 12;

const COLUMNS =
  "id,title,description,price,currency,island,city,bedrooms,bathrooms,property_size_sqm,land_area_sqm,property_type,image_urls,source_id,source_url,approved,amenities,price_period,created_at,updated_at";

// CV is a low-volume market; 90 days is too aggressive.
// For high-volume markets (ZA, KE, NG) use 90.
const FRESHNESS_DAYS = 180;

function freshnessDate(): string {
  return new Date(Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Freshness column priority:
 *   updated_at  = last upsert = closest proxy for "source still alive"
 *   created_at  = first ingest = fallback only
 *
 * Supabase auto-sets updated_at on upsert if the table has a trigger.
 * We filter on created_at as the safe baseline (always exists) and
 * sort on created_at (Supabase can't do COALESCE in PostgREST).
 * TODO: migrate to last_seen_at column set explicitly by the scraper.
 */

async function fetchListings(page: number, filters: ListingsFilters) {
  let query = supabase
    .from("listings")
    .select(COLUMNS, { count: "exact" })
    .eq("approved", true)
    .ilike("source_id", "cv_%")
    .not("price", "is", null)
    .gt("price", 0)
    .not("image_urls", "eq", "{}")
    .not("source_url", "is", null)
    .gte("created_at", freshnessDate());

  if (filters.island) query = query.eq("island", filters.island);
  if (filters.priceMin != null) query = query.gte("price", filters.priceMin);
  if (filters.priceMax != null) query = query.lte("price", filters.priceMax);
  if (filters.bedrooms != null) query = query.gte("bedrooms", filters.bedrooms);
  if (filters.propertyType) query = query.eq("property_type", filters.propertyType);
  query = query.is("price_period", null);

  const sort = filters.sort ?? "newest";
  if (sort === "price_asc") query = query.order("price", { ascending: true, nullsFirst: false });
  else if (sort === "price_desc") query = query.order("price", { ascending: false, nullsFirst: false });
  else query = query.order("created_at", { ascending: false });

  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as Listing[], totalCount: count ?? 0 };
}

export function useListings(page: number, filters: ListingsFilters) {
  return useQuery({
    queryKey: ["listings", page, filters],
    queryFn: () => fetchListings(page, filters),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

async function fetchListing(id: string) {
  const { data, error } = await supabase
    .from("listings")
    .select(COLUMNS)
    .eq("id", id)
    .eq("approved", true)
    .ilike("source_id", "cv_%")
    .single();
  if (error) throw new Error(error.message);
  return data as Listing;
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id!),
    enabled: !!id,
    staleTime: 120_000,
  });
}

// ---------------------------------------------------------------------------
// Stats: quality-filtered counts (what users see)
// ---------------------------------------------------------------------------

async function fetchStats() {
  const cutoff = freshnessDate();

  const { count, error } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("approved", true)
    .ilike("source_id", "cv_%")
    .not("price", "is", null)
    .gt("price", 0)
    .not("image_urls", "eq", "{}")
    .not("source_url", "is", null)
    .gte("created_at", cutoff);
  if (error) throw new Error(error.message);

  const { data: islandData } = await supabase
    .from("listings")
    .select("island")
    .eq("approved", true)
    .ilike("source_id", "cv_%")
    .not("price", "is", null)
    .gt("price", 0)
    .not("image_urls", "eq", "{}")
    .not("source_url", "is", null)
    .gte("created_at", cutoff)
    .not("island", "is", null);

  const uniqueIslands = new Set((islandData ?? []).map((r) => r.island));

  const { data: sourceData } = await supabase
    .from("listings")
    .select("source_id")
    .eq("approved", true)
    .ilike("source_id", "cv_%")
    .not("price", "is", null)
    .gt("price", 0)
    .not("image_urls", "eq", "{}")
    .not("source_url", "is", null)
    .gte("created_at", cutoff);

  const uniqueSources = new Set((sourceData ?? []).map((r) => r.source_id));

  return {
    totalListings: count ?? 0,
    totalIslands: uniqueIslands.size,
    totalSources: uniqueSources.size,
  };
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    staleTime: 300_000,
  });
}

// ---------------------------------------------------------------------------
// Quality ratio: raw vs quality-filtered  (investor KPI)
// ---------------------------------------------------------------------------

export interface QualityRatio {
  raw: number;
  quality: number;
  ratio: number;
}

async function fetchQualityRatio(): Promise<QualityRatio> {
  const { count: raw, error: e1 } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("approved", true)
    .ilike("source_id", "cv_%");
  if (e1) throw new Error(e1.message);

  const { count: quality, error: e2 } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("approved", true)
    .ilike("source_id", "cv_%")
    .not("price", "is", null)
    .gt("price", 0)
    .not("image_urls", "eq", "{}")
    .not("source_url", "is", null)
    .gte("created_at", freshnessDate());
  if (e2) throw new Error(e2.message);

  const r = raw ?? 0;
  const q = quality ?? 0;
  return { raw: r, quality: q, ratio: r > 0 ? Math.round((q / r) * 100) : 0 };
}

export function useQualityRatio() {
  return useQuery({
    queryKey: ["qualityRatio"],
    queryFn: fetchQualityRatio,
    staleTime: 300_000,
  });
}

// ---------------------------------------------------------------------------
// Featured: strictest quality gate — "clean data" only
// ---------------------------------------------------------------------------

const MIN_FEATURED_IMAGES = 3;
const MIN_FEATURED_DESC = 150;

async function fetchFeatured() {
  const { data, error } = await supabase
    .from("listings")
    .select(COLUMNS)
    .eq("approved", true)
    .ilike("source_id", "cv_%")
    .not("price", "is", null)
    .gt("price", 0)
    .not("image_urls", "eq", "{}")
    .not("source_url", "is", null)
    .not("property_type", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Listing[])
    .filter(
      (l) =>
        (l.image_urls?.length ?? 0) >= MIN_FEATURED_IMAGES &&
        (l.description?.length ?? 0) >= MIN_FEATURED_DESC &&
        (l.bedrooms != null || l.property_size_sqm != null),
    )
    .slice(0, 8);
}

export function useFeatured() {
  return useQuery({
    queryKey: ["featured"],
    queryFn: fetchFeatured,
    staleTime: 120_000,
  });
}
