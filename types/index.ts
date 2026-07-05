// Core domain types for Aurora Homes.

export type ListingMode = "rent" | "buy" | "stay" | "live";
export type ListingIntent = "rent_out" | "sell";
export type ListingStatus = "draft" | "published" | "archived";
export type PropertyType =
  | "apartment"
  | "villa"
  | "townhouse"
  | "studio"
  | "loft"
  | "house";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  is_owner: boolean;
  verified_owner: boolean;
  created_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  uri: string;
  position: number;
}

export interface Listing {
  id: string;
  owner_id: string;
  mode: ListingMode;
  intent: ListingIntent;
  title: string;
  description: string;
  city: string;
  country: string;
  address_area: string;
  property_type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  size_m2: number;
  price_monthly?: number;
  price_sale?: number;
  utilities_monthly?: number;
  deposit?: number;
  platform_fee_percent: number;
  total_move_in_cost?: number;
  available_from?: string;
  minimum_stay?: string;
  maximum_stay?: string;
  pets_allowed: boolean;
  pool: boolean;
  sea_view: boolean;
  garage: boolean;
  furnished: boolean;
  verified_owner: boolean;
  verified_property: boolean;
  last_verified_at?: string;
  status: ListingStatus;
  images: ListingImage[];
  faq: FaqItem[];
  created_at: string;
  updated_at: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  listing_title: string;
  participant_name: string;
  participant_avatar?: string;
  last_message: string;
  last_message_at: string;
  unread: boolean;
  qualified_lead: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: "me" | "them" | "ai";
  text: string;
  created_at: string;
}

export interface ViewingRequest {
  id: string;
  listing_id: string;
  listing_title: string;
  requester_name: string;
  requested_date: string;
  status: "pending" | "confirmed" | "declined";
}

export interface Review {
  id: string;
  listing_id: string;
  author_name: string;
  rating: number;
  text: string;
  created_at: string;
}

export interface SavedListing {
  id: string;
  listing_id: string;
  saved_at: string;
}

export interface VerificationRecord {
  id: string;
  listing_id: string;
  owner_verified: boolean;
  property_verified: boolean;
  last_checked_at: string;
  notes?: string;
}

export interface AiGeneratedContent {
  id: string;
  listing_id: string;
  title: string;
  short_summary: string;
  long_description: string;
  feature_bullets: string[];
  lifestyle_paragraph: string;
  location_paragraph: string;
  ideal_profile: string;
  price_explanation: string;
  faq: FaqItem[];
  agent_knowledge_base: string[];
  translations: Record<string, string>;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  reason: string;
  message: string;
  created_at: string;
}

export type ContactReason =
  | "rent"
  | "list_property"
  | "sell"
  | "buy"
  | "partnership"
  | "support";
