import type { Conversation, Message, ViewingRequest, Review } from "../../types";

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    listing_id: "l1",
    listing_title: "Sunrise Apartment, Marbella",
    participant_name: "Laura Fischer",
    last_message: "Is the property still available for August?",
    last_message_at: "2026-07-04T10:30:00Z",
    unread: true,
    qualified_lead: true,
  },
  {
    id: "c2",
    listing_id: "l6",
    listing_title: "Sea View Villa, Marbella",
    participant_name: "Thomas Weber",
    last_message: "We would like to request a viewing next week.",
    last_message_at: "2026-07-03T15:12:00Z",
    unread: false,
    qualified_lead: true,
  },
  {
    id: "c3",
    listing_id: "l2",
    listing_title: "Old Town Loft, Sevilla",
    participant_name: "Elena Castillo",
    last_message: "Thank you, that answers my question about pets.",
    last_message_at: "2026-07-01T09:00:00Z",
    unread: false,
    qualified_lead: false,
  },
];

export const mockMessages: Record<string, Message[]> = {
  c1: [
    { id: "m1", conversation_id: "c1", sender: "them", text: "Hi, I saw your listing for the Sunrise Apartment.", created_at: "2026-07-04T10:00:00Z" },
    { id: "m2", conversation_id: "c1", sender: "ai", text: "Hello Laura, thanks for reaching out. This is Aurora, the AI assistant for this listing — happy to help while the owner joins.", created_at: "2026-07-04T10:05:00Z" },
    { id: "m3", conversation_id: "c1", sender: "them", text: "Is the property still available for August?", created_at: "2026-07-04T10:30:00Z" },
  ],
  c2: [
    { id: "m4", conversation_id: "c2", sender: "them", text: "We would like to request a viewing next week.", created_at: "2026-07-03T15:12:00Z" },
    { id: "m5", conversation_id: "c2", sender: "me", text: "Of course, Tuesday or Wednesday afternoon both work.", created_at: "2026-07-03T16:00:00Z" },
  ],
  c3: [
    { id: "m6", conversation_id: "c3", sender: "them", text: "Are dogs allowed in the loft?", created_at: "2026-06-30T12:00:00Z" },
    { id: "m7", conversation_id: "c3", sender: "ai", text: "Yes, pets are welcome at Old Town Loft, Sevilla.", created_at: "2026-06-30T12:01:00Z" },
    { id: "m8", conversation_id: "c3", sender: "them", text: "Thank you, that answers my question about pets.", created_at: "2026-07-01T09:00:00Z" },
  ],
};

export const mockViewingRequests: ViewingRequest[] = [
  { id: "v1", listing_id: "l6", listing_title: "Sea View Villa, Marbella", requester_name: "Thomas Weber", requested_date: "2026-07-09", status: "pending" },
  { id: "v2", listing_id: "l1", listing_title: "Sunrise Apartment, Marbella", requester_name: "Laura Fischer", requested_date: "2026-07-12", status: "confirmed" },
];

export const mockReviews: Review[] = [
  { id: "r1", listing_id: "l1", author_name: "Marc D.", rating: 5, text: "Beautiful apartment, exactly as described. The AI assistant answered all our questions before we even arrived.", created_at: "2026-05-01T00:00:00Z" },
  { id: "r2", listing_id: "l1", author_name: "Sophie R.", rating: 4, text: "Great location, minor issue with the pool schedule but the owner sorted it quickly.", created_at: "2026-04-10T00:00:00Z" },
];
