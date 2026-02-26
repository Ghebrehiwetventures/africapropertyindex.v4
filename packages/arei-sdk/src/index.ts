// =============================================================================
// arei-sdk/src/index.ts
// Public API
// =============================================================================

export { AREIClient } from "./client.js";

export type {
  ListingCard,
  ListingDetail,
  ListingRow,
  IslandOption,
  IslandMedianStat,
  PriceBucket,
  GetListingsParams,
  PaginatedListings,
  AREIConfig,
} from "./types.js";

export {
  PRICE_BUCKETS,
  MIN_MEDIAN_SAMPLE,
  PRICE_FLOOR,
  PRICE_CEILING,
} from "./types.js";

export { toListingCard, toListingDetail } from "./transforms.js";
