// Local fallback persistence used whenever Supabase is not configured, or
// for on-device state (drafts, saved listings, session, bookings and chats)
// that never needs a backend. Backed by AsyncStorage so it survives app
// restarts in Expo Go.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BookingRequest, BookingStatus, Conversation, Listing, Message } from "../../types";

const KEYS = {
  listings: "aurora.mock.listings",
  savedListings: "aurora.mock.savedListings",
  session: "aurora.mock.session",
  draft: "aurora.mock.draft",
  bookings: "zouza.bookings",
  conversations: "zouza.conversations",
  messages: "zouza.messages",
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// ---------------------------------------------------------------- listings

export async function getStoredListings(): Promise<Listing[]> {
  return readJson<Listing[]>(KEYS.listings, []);
}

export async function addStoredListing(listing: Listing): Promise<void> {
  const existing = await getStoredListings();
  existing.unshift(listing);
  await writeJson(KEYS.listings, existing);
}

export async function getSavedListingIds(): Promise<string[]> {
  return readJson<string[]>(KEYS.savedListings, []);
}

export async function toggleSavedListing(listingId: string): Promise<string[]> {
  const current = await getSavedListingIds();
  const next = current.includes(listingId)
    ? current.filter((id) => id !== listingId)
    : [...current, listingId];
  await writeJson(KEYS.savedListings, next);
  return next;
}

// ---------------------------------------------------------------- session

export interface MockSession {
  fullName: string;
  email: string;
}

export async function getMockSession(): Promise<MockSession | null> {
  return readJson<MockSession | null>(KEYS.session, null);
}

export async function setMockSession(session: MockSession | null): Promise<void> {
  if (session) {
    await writeJson(KEYS.session, session);
  } else {
    await AsyncStorage.removeItem(KEYS.session);
  }
}

// ---------------------------------------------------------------- bookings

export async function getBookingRequests(): Promise<BookingRequest[]> {
  return readJson<BookingRequest[]>(KEYS.bookings, []);
}

export async function getBookingsForListing(listingId: string): Promise<BookingRequest[]> {
  return (await getBookingRequests()).filter((b) => b.listing_id === listingId && b.status !== "declined");
}

export async function addBookingRequest(
  input: Omit<BookingRequest, "id" | "status" | "created_at">
): Promise<BookingRequest> {
  const booking: BookingRequest = {
    ...input,
    id: newId("booking"),
    status: "pending",
    created_at: new Date().toISOString(),
  };
  const all = await getBookingRequests();
  all.unshift(booking);
  await writeJson(KEYS.bookings, all);
  return booking;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<BookingRequest[]> {
  const all = await getBookingRequests();
  const next = all.map((b) => (b.id === id ? { ...b, status } : b));
  await writeJson(KEYS.bookings, next);
  return next;
}

// ---------------------------------------------------------------- conversations

export async function getConversations(): Promise<Conversation[]> {
  const all = await readJson<Conversation[]>(KEYS.conversations, []);
  return all.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return (await getConversations()).find((c) => c.id === id);
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const all = await readJson<Record<string, Message[]>>(KEYS.messages, {});
  return all[conversationId] ?? [];
}

export async function addMessage(
  conversationId: string,
  sender: Message["sender"],
  text: string
): Promise<Message> {
  const message: Message = {
    id: newId("msg"),
    conversation_id: conversationId,
    sender,
    text,
    created_at: new Date().toISOString(),
  };
  const all = await readJson<Record<string, Message[]>>(KEYS.messages, {});
  all[conversationId] = [...(all[conversationId] ?? []), message];
  await writeJson(KEYS.messages, all);

  const conversations = await readJson<Conversation[]>(KEYS.conversations, []);
  await writeJson(
    KEYS.conversations,
    conversations.map((c) =>
      c.id === conversationId
        ? { ...c, last_message: text, last_message_at: message.created_at, unread: sender !== "me" }
        : c
    )
  );
  return message;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const conversations = await readJson<Conversation[]>(KEYS.conversations, []);
  await writeJson(
    KEYS.conversations,
    conversations.map((c) => (c.id === conversationId ? { ...c, unread: false } : c))
  );
}

/**
 * Finds the conversation for a listing or starts one with the owner. The
 * first message is stored as "me"; nothing is sent anywhere until a backend
 * exists, but the thread persists on the device.
 */
export async function startConversation(
  listing: Pick<Listing, "id" | "title">,
  firstMessage: string,
  options: { bookingId?: string; qualifiedLead?: boolean } = {}
): Promise<Conversation> {
  const conversations = await readJson<Conversation[]>(KEYS.conversations, []);
  let conversation = conversations.find((c) => c.listing_id === listing.id);
  if (!conversation) {
    conversation = {
      id: newId("conv"),
      listing_id: listing.id,
      listing_title: listing.title,
      participant_name: "Owner",
      last_message: firstMessage,
      last_message_at: new Date().toISOString(),
      unread: false,
      qualified_lead: options.qualifiedLead ?? false,
      booking_id: options.bookingId,
    };
    conversations.unshift(conversation);
    await writeJson(KEYS.conversations, conversations);
  } else if (options.bookingId && !conversation.booking_id) {
    conversation = { ...conversation, booking_id: options.bookingId, qualified_lead: true };
    await writeJson(
      KEYS.conversations,
      conversations.map((c) => (c.id === conversation!.id ? conversation! : c))
    );
  }
  await addMessage(conversation.id, "me", firstMessage);
  return conversation;
}
