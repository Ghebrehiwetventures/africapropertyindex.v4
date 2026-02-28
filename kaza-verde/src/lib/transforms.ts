import type { ListingCard } from "arei-sdk";
import type { DemoListing } from "./demo-data";

const DEFAULT_BG = "linear-gradient(145deg,#5B8A72,#1A4A32)";

/** Convert SDK ListingCard → DemoListing for PropertyCard component */
export function cardToDemoListing(card: ListingCard): DemoListing {
  return {
    id: card.id,
    title: card.title,
    island: card.island,
    city: card.city,
    price: card.price,
    currency: card.currency ?? "",
    image_urls: card.image_url ? [card.image_url] : [],
    bedrooms: card.bedrooms,
    bathrooms: card.bathrooms,
    property_type: card.property_type,
    land_area_sqm: card.land_area_sqm,
    property_size_sqm: null,
    description: null,
    first_seen_at: card.first_seen_at,
    source_id: card.source_id,
    source_url: "",
    last_seen_at: null,
    _bg: DEFAULT_BG,
  };
}
