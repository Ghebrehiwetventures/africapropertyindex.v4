import { getSupabaseClient } from "./supabaseClient";

export interface SupabaseListing {
  id: string;
  source_id: string;
  source_url: string;
  title?: string;
  description?: string;
  price?: number;
  currency: string;
  island?: string;
  city?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_size_sqm?: number | null;
  land_area_sqm?: number | null;
  image_urls: string[];
  status: string;
}

export async function upsertListings(listings: SupabaseListing[]): Promise<void> {
  if (listings.length === 0) return;

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("listings")
    .upsert(listings, { onConflict: "id" });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  console.log(`[Supabase] Upserted ${listings.length} listings`);
}
