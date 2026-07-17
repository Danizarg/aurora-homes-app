// Real Supabase-backed reads/writes for listings, used once
// EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are configured
// (see lib/supabase/client.ts). Falls back to no-ops when not configured —
// callers should check `isSupabaseConfigured` first.
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./client";
import type { Listing } from "../../types";

const BUCKET = "listing-images";

/** Uploads local photo URIs to Supabase Storage and returns their public URLs. */
export async function uploadListingImages(
  ownerId: string,
  listingId: string,
  localUris: string[]
): Promise<string[]> {
  if (!supabase) return localUris;

  const urls: string[] = [];
  for (let i = 0; i < localUris.length; i++) {
    const uri = localUris[i];
    const path = `${ownerId}/${listingId}/${i}.jpg`;
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      const { error } = await supabase.storage.from(BUCKET).upload(path, decode(base64), {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) {
        urls.push(uri);
        continue;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    } catch {
      urls.push(uri);
    }
  }
  return urls;
}

/** Inserts a listing (and its images) into Supabase. */
export async function createListingInSupabase(listing: Listing, ownerId: string): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("listings")
    .insert({
      owner_id: ownerId,
      mode: listing.mode,
      intent: listing.intent,
      title: listing.title,
      description: listing.description,
      city: listing.city,
      country: listing.country,
      address_area: listing.address_area,
      property_type: listing.property_type,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      size_m2: listing.size_m2,
      price_monthly: listing.price_monthly,
      price_sale: listing.price_sale,
      utilities_monthly: listing.utilities_monthly,
      deposit: listing.deposit,
      platform_fee_percent: listing.platform_fee_percent,
      total_move_in_cost: listing.total_move_in_cost,
      pets_allowed: listing.pets_allowed,
      pool: listing.pool,
      sea_view: listing.sea_view,
      garage: listing.garage,
      furnished: listing.furnished,
      faq: listing.faq,
      verified_owner: listing.verified_owner,
      verified_property: listing.verified_property,
      status: listing.status,
    })
    .select("id")
    .single();

  if (error || !data) return null;

  const listingId = data.id as string;

  if (listing.images.length > 0) {
    await supabase.from("listing_images").insert(
      listing.images.map((img, i) => ({ listing_id: listingId, uri: img.uri, position: i }))
    );
  }

  return listingId;
}

interface ListingRow {
  id: string;
  owner_id: string;
  mode: Listing["mode"];
  intent: Listing["intent"];
  title: string;
  description: string;
  city: string;
  country: string;
  address_area: string;
  property_type: Listing["property_type"];
  bedrooms: number;
  bathrooms: number;
  size_m2: number;
  price_monthly: number | null;
  price_sale: number | null;
  utilities_monthly: number | null;
  deposit: number | null;
  platform_fee_percent: number;
  total_move_in_cost: number | null;
  pets_allowed: boolean;
  pool: boolean;
  sea_view: boolean;
  garage: boolean;
  furnished: boolean;
  faq: Listing["faq"];
  verified_owner: boolean;
  verified_property: boolean;
  last_verified_at: string | null;
  status: Listing["status"];
  created_at: string;
  updated_at: string;
  listing_images: { id: string; uri: string; position: number }[];
}

function mapRow(row: ListingRow): Listing {
  return {
    id: row.id,
    owner_id: row.owner_id,
    mode: row.mode,
    intent: row.intent,
    title: row.title,
    description: row.description,
    city: row.city,
    country: row.country,
    address_area: row.address_area,
    property_type: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    size_m2: row.size_m2,
    price_monthly: row.price_monthly ?? undefined,
    price_sale: row.price_sale ?? undefined,
    utilities_monthly: row.utilities_monthly ?? undefined,
    deposit: row.deposit ?? undefined,
    platform_fee_percent: row.platform_fee_percent,
    total_move_in_cost: row.total_move_in_cost ?? undefined,
    pets_allowed: row.pets_allowed,
    pool: row.pool,
    sea_view: row.sea_view,
    garage: row.garage,
    furnished: row.furnished,
    verified_owner: row.verified_owner,
    verified_property: row.verified_property,
    last_verified_at: row.last_verified_at ?? undefined,
    status: row.status,
    images: (row.listing_images ?? [])
      .sort((a, b) => a.position - b.position)
      .map((img) => ({ id: img.id, listing_id: row.id, uri: img.uri, position: img.position })),
    faq: row.faq ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Fetches all published listings from Supabase (for Search/Home alongside the mock catalog). */
export async function fetchPublishedListings(): Promise<Listing[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(*)")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ListingRow[]).map(mapRow);
}

/** Fetches listings owned by the given user (for the owner dashboard). */
export async function fetchMyListings(ownerId: string): Promise<Listing[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ListingRow[]).map(mapRow);
}
