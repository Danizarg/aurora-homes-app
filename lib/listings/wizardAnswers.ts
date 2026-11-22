// Small rules behind the listing wizard's room and price answers. Pure module (Node-testable).

export type Positioning = "rent_long" | "rent_holiday" | "sale";
export type PriceMode = "rent" | "sale";

/** Highest bedroom or bathroom count the app accepts; the same limit /api/suzi/generate enforces. */
export const MAX_ROOMS = 50;

/** A whole number from 0 to MAX_ROOMS typed on the keypad, or null. */
export function parseCount(text: string): number | null {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n <= MAX_ROOMS ? n : null;
}

export function priceModeOf(positioning: Positioning | undefined): PriceMode {
  return positioning === "sale" ? "sale" : "rent";
}

/** The positioning after the Rent / Sale switch on the price step; a holiday let stays one. */
export function positioningForPriceMode(mode: PriceMode, current: Positioning | undefined): Positioning {
  if (mode === "sale") return "sale";
  return current === "rent_holiday" ? "rent_holiday" : "rent_long";
}

/** The chat asks "long-term or holiday stay?" only for a rental whose kind wasn't decided before the wizard. */
export function asksRentKind(mode: PriceMode, preset: Positioning | undefined): boolean {
  return mode === "rent" && !preset;
}
