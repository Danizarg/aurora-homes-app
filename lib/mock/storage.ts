// Local fallback persistence used whenever Supabase is not configured, or
// for on-device state (drafts, saved listings, session) that never needs a
// backend. Backed by AsyncStorage so it survives app restarts in Expo Go.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Listing } from "../../types";

const KEYS = {
  listings: "aurora.mock.listings",
  savedListings: "aurora.mock.savedListings",
  session: "aurora.mock.session",
  draft: "aurora.mock.draft",
};

export async function getStoredListings(): Promise<Listing[]> {
  const raw = await AsyncStorage.getItem(KEYS.listings);
  return raw ? JSON.parse(raw) : [];
}

export async function addStoredListing(listing: Listing): Promise<void> {
  const existing = await getStoredListings();
  existing.unshift(listing);
  await AsyncStorage.setItem(KEYS.listings, JSON.stringify(existing));
}

export async function getSavedListingIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.savedListings);
  return raw ? JSON.parse(raw) : [];
}

export async function toggleSavedListing(listingId: string): Promise<string[]> {
  const current = await getSavedListingIds();
  const next = current.includes(listingId)
    ? current.filter((id) => id !== listingId)
    : [...current, listingId];
  await AsyncStorage.setItem(KEYS.savedListings, JSON.stringify(next));
  return next;
}

export interface MockSession {
  fullName: string;
  email: string;
}

export async function getMockSession(): Promise<MockSession | null> {
  const raw = await AsyncStorage.getItem(KEYS.session);
  return raw ? JSON.parse(raw) : null;
}

export async function setMockSession(session: MockSession | null): Promise<void> {
  if (session) {
    await AsyncStorage.setItem(KEYS.session, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(KEYS.session);
  }
}
