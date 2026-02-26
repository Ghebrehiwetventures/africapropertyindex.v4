// =============================================================================
// arei-sdk/src/client.ts
// AREI client for consumer sites
// All reads go through v1_feed_* views. Never reads public.listings directly.
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  AREIConfig,
  GetListingsParams,
  PaginatedListings,
  IslandOption,
  IslandMedianStat,
  ListingRow,
  ListingDetail,
  PriceBucket,
} from "./types.js";
import {
  PRICE_BUCKETS,
  MIN_MEDIAN_SAMPLE,
  PRICE_FLOOR,
  PRICE_CEILING,
} from "./types.js";
import { toListingCard, toListingDetail } from "./transforms.js";

// ---------------------------------------------------------------------------
// View name — change per market
// ---------------------------------------------------------------------------
const VIEW = "v1_feed_cv";

// ---------------------------------------------------------------------------
// Card columns — only fetch what the card needs
// ---------------------------------------------------------------------------
const CARD_COLUMNS = [
  "id",
  "title",
  "island",
  "city",
  "price",
  "currency",
  "property_type",
  "bedrooms",
  "bathrooms",
  "land_area_sqm",
  "image_urls",
  "source_id",
  "first_seen_at",
].join(",");

// ---------------------------------------------------------------------------
// Detail columns — full row
// ---------------------------------------------------------------------------
const DETAIL_COLUMNS = [
  "id",
  "title",
  "island",
  "city",
  "price",
  "currency",
  "property_type",
  "bedrooms",
  "bathrooms",
  "land_area_sqm",
  "description",
  "image_urls",
  "source_id",
  "source_url",
  "first_seen_at",
  "last_seen_at",
].join(",");

// ---------------------------------------------------------------------------
// Client class
// ---------------------------------------------------------------------------
export class AREIClient {
  private sb: SupabaseClient;

  constructor(config: AREIConfig);
  constructor(client: SupabaseClient);
  constructor(configOrClient: AREIConfig | SupabaseClient) {
    const config = configOrClient as AREIConfig;
    if (config && "supabaseUrl" in config && "supabaseAnonKey" in config) {
      this.sb = createClient(config.supabaseUrl, config.supabaseAnonKey);
    } else {
      this.sb = configOrClient as SupabaseClient;
    }
  }

  // =========================================================================
  // getListings — paginated, filterable
  // =========================================================================
  async getListings(
    params: GetListingsParams = {}
  ): Promise<PaginatedListings> {
    const { page = 1, pageSize = 12, island, priceBucket } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.sb
      .from(VIEW)
      .select(CARD_COLUMNS, { count: "exact" });

    // Island filter
    if (island) {
      query = query.eq("island", island);
    }

    // Price bucket filter
    if (priceBucket) {
      const bucket = PRICE_BUCKETS[priceBucket];
      query = query
        .gt("price", 0)
        .gte("price", bucket.min)
        .lte("price", bucket.max);
    }

    // Sort and paginate
    query = query
      .order("first_seen_at", { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) throw new Error(`getListings failed: ${error.message}`);

    const rows = (data ?? []) as unknown as ListingRow[];
    const total = count ?? 0;

    return {
      data: rows.map(toListingCard),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // =========================================================================
  // getListing — single listing for detail page
  // =========================================================================
  async getListing(id: string): Promise<ListingDetail | null> {
    const { data, error } = await this.sb
      .from(VIEW)
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // not found
      throw new Error(`getListing failed: ${error.message}`);
    }

    return toListingDetail(data as unknown as ListingRow);
  }

  // =========================================================================
  // getIslandOptions — for filter dropdown
  // =========================================================================
  async getIslandOptions(): Promise<IslandOption[]> {
    // Supabase JS doesn't support GROUP BY natively,
    // so we fetch distinct islands and count via RPC or a simple approach.
    // Using a raw query via rpc would be ideal, but for v1 we fetch all
    // island values and count client-side. With 377 rows this is fine.

    const { data, error } = await this.sb
      .from(VIEW)
      .select("island");

    if (error) throw new Error(`getIslandOptions failed: ${error.message}`);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const island = (row as { island: string }).island;
      counts.set(island, (counts.get(island) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([island, count]) => ({ island, count }))
      .sort((a, b) => b.count - a.count);
  }

  // =========================================================================
  // getMarketStats — per-island median price
  // =========================================================================
  async getMarketStats(): Promise<{
    total: number;
    islands: IslandMedianStat[];
  }> {
    // Fetch all prices + islands for stats computation.
    // With ~400 rows this is efficient. For larger feeds, move to an RPC.

    const { data, error } = await this.sb
      .from(VIEW)
      .select("island, price");

    if (error) throw new Error(`getMarketStats failed: ${error.message}`);

    const rows = (data ?? []) as { island: string; price: number | null }[];
    const total = rows.length;

    // Group prices by island, applying outlier filter
    const byIsland = new Map<string, number[]>();
    for (const row of rows) {
      if (!byIsland.has(row.island)) byIsland.set(row.island, []);
      if (
        row.price != null &&
        row.price >= PRICE_FLOOR &&
        row.price <= PRICE_CEILING
      ) {
        byIsland.get(row.island)!.push(row.price);
      }
    }

    // Compute medians
    const islands: IslandMedianStat[] = [];
    for (const [island, prices] of byIsland) {
      prices.sort((a, b) => a - b);
      const n = prices.length;
      const median =
        n >= MIN_MEDIAN_SAMPLE
          ? n % 2 === 0
            ? (prices[n / 2 - 1] + prices[n / 2]) / 2
            : prices[Math.floor(n / 2)]
          : null;

      islands.push({
        island,
        n_price: n,
        median_price: median,
      });
    }

    // Sort by count descending
    islands.sort((a, b) => b.n_price - a.n_price);

    return { total, islands };
  }
}
