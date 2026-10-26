import type { Review } from "../../types";

/** Demo reviews for the catalogue listings. Conversations, messages and bookings are never seeded — see lib/mock/storage.ts. */
export const mockReviews: Review[] = [
  { id: "r1", listing_id: "l1", author_name: "Marc D.", rating: 5, text: "Beautiful apartment, exactly as described. Suzi answered all our questions before we even arrived.", created_at: "2026-05-01T00:00:00Z" },
  { id: "r2", listing_id: "l1", author_name: "Sophie R.", rating: 4, text: "Great location, minor issue with the pool schedule but the owner sorted it quickly.", created_at: "2026-04-10T00:00:00Z" },
];
