import type { BookingKind, BookingRequest, Listing } from "../../types";

/** YYYY-MM-DD in local time. */
export function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromIsoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatDay(iso: string, withYear = false) {
  return fromIsoDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: withYear ? "numeric" : undefined });
}

export function nightsBetween(startIso: string, endIso: string) {
  return Math.round((fromIsoDate(endIso).getTime() - fromIsoDate(startIso).getTime()) / 86_400_000);
}

/** What the listing's calendar asks for: a stay range, a move-in date, or a viewing slot. */
export function bookingKindFor(listing: Pick<Listing, "mode">): BookingKind {
  if (listing.mode === "stay") return "stay";
  if (listing.mode === "buy") return "viewing";
  return "move_in";
}

export const bookingCopy: Record<BookingKind, { title: string; cta: string; hint: string }> = {
  stay: { title: "Select dates", cta: "Request to book", hint: "Minimum stay applies. The owner confirms within 24 hours." },
  move_in: { title: "Choose a move-in date", cta: "Request move-in", hint: "Pick the day you would like the tenancy to start." },
  viewing: { title: "Request a viewing", cta: "Request viewing", hint: "Pick a day; the owner suggests a time in the chat." },
};

/** Every ISO day covered by a non-declined booking, so the calendar can block it. */
export function blockedDaysFrom(bookings: BookingRequest[], listingId: string): Set<string> {
  const days = new Set<string>();
  for (const b of bookings) {
    if (b.listing_id !== listingId || b.status === "declined") continue;
    if (b.kind !== "stay") {
      days.add(b.start_date);
      continue;
    }
    const end = b.end_date ?? b.start_date;
    for (let d = fromIsoDate(b.start_date); toIsoDate(d) < end; d = addDays(d, 1)) days.add(toIsoDate(d));
  }
  return days;
}

/** The first date a listing accepts, honouring `available_from`. */
export function earliestDate(listing: Pick<Listing, "available_from">) {
  const today = startOfToday();
  if (!listing.available_from) return today;
  const from = fromIsoDate(listing.available_from);
  return Number.isNaN(from.getTime()) || from < today ? today : from;
}

export function describeBooking(b: BookingRequest) {
  if (b.kind === "stay" && b.end_date) return `${formatDay(b.start_date)} – ${formatDay(b.end_date, true)}`;
  if (b.kind === "move_in") return `Move in ${formatDay(b.start_date, true)}`;
  return `Viewing on ${formatDay(b.start_date, true)}`;
}
