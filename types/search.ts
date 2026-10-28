import type { Listing, PropertyType } from "./index";

/** What the user is here to do. "list" means sell or rent out their own property. */
export type Intent = "buy" | "rent" | "stay" | "list";

export type RentalDuration = "short" | "seasonal" | "long";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Where a geographic answer came from, so the UI never presents demo data as real. */
export type GeoSource = "photon" | "local" | "device" | "user";

export interface SearchTarget {
  label: string;
  point: GeoPoint;
  bounds: GeoBounds;
  /** "city" | "suburb" | "street" | "address" | "poi" | "country" ... from the geocoder */
  kind: string;
  source: GeoSource;
}

/** Things a listing can be asked to be near. */
export type ProximityKind =
  | "sea"
  | "beach"
  | "airport"
  | "school"
  | "supermarket"
  | "gym"
  | "restaurants"
  | "transport"
  | "hospital"
  | "center"
  | "place";

export interface DistanceConstraint {
  to: ProximityKind;
  /** Straight-line maximum in km. */
  maxKm: number;
  /** For "place"/"center": the point to measure from. */
  point?: GeoPoint;
  label?: string;
}

export interface SearchCriteria {
  intent?: Exclude<Intent, "list">;
  /** The map viewport when the user is browsing by panning. */
  bounds?: GeoBounds;
  /** The destination Suza or the search bar resolved. */
  target?: SearchTarget;
  propertyTypes?: PropertyType[];
  budgetMin?: number;
  budgetMax?: number;
  currency: "EUR";
  bedroomsMin?: number;
  bathroomsMin?: number;
  areaMin?: number;
  areaMax?: number;
  pool?: boolean;
  garage?: boolean;
  furnished?: boolean;
  seaView?: boolean;
  pets?: boolean;
  verifiedOnly?: boolean;
  /** ISO dates for stays / move-in. */
  dateStart?: string;
  dateEnd?: string;
  guests?: number;
  rentalDuration?: RentalDuration;
  distance?: DistanceConstraint[];
  /** Free text matched against title/area/city. */
  queryText?: string;
  sort?: "recommended" | "price_asc" | "price_desc";
}

export const emptyCriteria: SearchCriteria = { currency: "EUR" };

/** Per-listing distances the search computed, in km; undefined = not needed, null = unknown. */
export type Distances = Partial<Record<ProximityKind, number | null>>;

export interface ScoredListing {
  listing: Listing;
  distances: Distances;
  /** True when the listing comes from the demo catalogue rather than a published record. */
  demo: boolean;
}

export interface SearchResult {
  items: ScoredListing[];
  /** How many matched before the distance pass (so the UI can say "3 of 12 within 500 m"). */
  matchedBeforeDistance: number;
  /** Listings that matched everything else but whose distance could not be determined. */
  unknownDistance: number;
  /** True when any item is a demo listing. */
  includesDemo: boolean;
  /**
   * Set when nothing matched inside the named destination and the search was
   * widened to this radius (km) around it instead — the UI says so.
   */
  widenedKm?: number;
}
