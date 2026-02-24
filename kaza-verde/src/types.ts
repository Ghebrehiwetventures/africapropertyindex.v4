export interface Listing {
  id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string;
  island: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_size_sqm: number | null;
  land_area_sqm: number | null;
  property_type: string | null;
  image_urls: string[];
  source_id: string;
  source_url: string | null;
  approved: boolean;
  amenities: string[] | null;
  price_period: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ListingsFilters {
  island?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  propertyType?: string;
  sort?: "newest" | "price_asc" | "price_desc";
}
