import type { GeoBounds, GeoPoint, Intent, SearchCriteria, SearchTarget } from "../../types/search";
import type { ViewMode } from "../store/discovery";

/**
 * Everything Suza is allowed to do to the app, as data. The planner (local
 * or remote) returns a list of these; `validateActions` drops anything
 * malformed before the executor touches the store, the map or navigation.
 */
export type SuzaAction =
  | { type: "setIntent"; intent: Intent }
  | { type: "setTarget"; target: SearchTarget }
  | { type: "clearTarget" }
  | { type: "setFilters"; patch: Partial<SearchCriteria> }
  | { type: "clearFilters" }
  | { type: "moveMap"; bounds?: GeoBounds; point?: GeoPoint; halfSizeKm?: number }
  | { type: "zoom"; factor: number }
  | { type: "selectListing"; id: string }
  | { type: "openListing"; id: string }
  | { type: "openUpload"; purpose: "sell" | "rent_out"; duration?: "short" | "seasonal" | "long" }
  | { type: "setViewMode"; mode: ViewMode }
  | { type: "showSaved" }
  | { type: "saveSearch" }
  | { type: "showAll" };

export interface SuzaPlan {
  /** What Suza says (and speaks). */
  reply: string;
  actions: SuzaAction[];
  /** A single follow-up question, with optional tap-to-answer options. */
  question?: { key: string; text: string; options?: { label: string; value: string }[] };
}

const intents: Intent[] = ["buy", "rent", "stay", "list"];
const viewModes: ViewMode[] = ["map", "list"];

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isPoint(v: unknown): v is GeoPoint {
  const p = v as GeoPoint;
  return !!p && isNum(p.lat) && isNum(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}

function isBounds(v: unknown): v is GeoBounds {
  const b = v as GeoBounds;
  return !!b && isNum(b.north) && isNum(b.south) && isNum(b.east) && isNum(b.west) && b.north >= b.south;
}

function isTarget(v: unknown): v is SearchTarget {
  const t = v as SearchTarget;
  return !!t && typeof t.label === "string" && isPoint(t.point) && isBounds(t.bounds) && typeof t.kind === "string";
}

const allowedFilterKeys = new Set<keyof SearchCriteria>([
  "intent", "propertyTypes", "budgetMin", "budgetMax", "bedroomsMin", "bathroomsMin", "areaMin", "areaMax",
  "pool", "garage", "furnished", "seaView", "pets", "verifiedOnly", "dateStart", "dateEnd", "guests",
  "rentalDuration", "distance", "queryText", "sort",
]);

function cleanPatch(patch: unknown): Partial<SearchCriteria> | null {
  if (!patch || typeof patch !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (!allowedFilterKeys.has(k as keyof SearchCriteria)) continue;
    if (k === "distance") {
      if (!Array.isArray(v)) continue;
      const list = v.filter((d) => d && typeof d.to === "string" && isNum(d.maxKm) && d.maxKm > 0 && (d.point === undefined || isPoint(d.point)));
      out[k] = list;
      continue;
    }
    if (k === "propertyTypes") {
      if (!Array.isArray(v)) continue;
      out[k] = v.filter((t) => typeof t === "string");
      continue;
    }
    if (["budgetMin", "budgetMax", "bedroomsMin", "bathroomsMin", "areaMin", "areaMax", "guests"].includes(k)) {
      if (v === undefined || isNum(v)) out[k] = v;
      continue;
    }
    out[k] = v;
  }
  return out as Partial<SearchCriteria>;
}

/** Keep only well-formed actions; never throw on bad planner output. */
export function validateActions(input: unknown): SuzaAction[] {
  if (!Array.isArray(input)) return [];
  const out: SuzaAction[] = [];
  for (const raw of input) {
    const a = raw as SuzaAction;
    if (!a || typeof a !== "object" || typeof a.type !== "string") continue;
    switch (a.type) {
      case "setIntent":
        if (intents.includes(a.intent)) out.push(a);
        break;
      case "setTarget":
        if (isTarget(a.target)) out.push(a);
        break;
      case "setFilters": {
        const patch = cleanPatch(a.patch);
        if (patch) out.push({ type: "setFilters", patch });
        break;
      }
      case "moveMap":
        if ((a.bounds && isBounds(a.bounds)) || (a.point && isPoint(a.point))) out.push(a);
        break;
      case "zoom":
        if (isNum(a.factor) && a.factor > 0) out.push(a);
        break;
      case "selectListing":
      case "openListing":
        if (typeof a.id === "string" && a.id) out.push(a);
        break;
      case "openUpload":
        if (a.purpose === "sell" || a.purpose === "rent_out") out.push(a);
        break;
      case "setViewMode":
        if (viewModes.includes(a.mode)) out.push(a);
        break;
      case "clearTarget":
      case "clearFilters":
      case "showSaved":
      case "saveSearch":
      case "showAll":
        out.push(a);
        break;
      default:
        break;
    }
  }
  return out;
}
