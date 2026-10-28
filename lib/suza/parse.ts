import type { PropertyType } from "../../types";
import type { DistanceConstraint, Intent, ProximityKind, RentalDuration, SearchCriteria } from "../../types/search";

/**
 * Deterministic understanding of what people say to Suza. It runs on the
 * device with no keys and is the permanent fallback behind the optional
 * server planner. It extracts structured facts; it never invents places —
 * location phrases are returned as text for the geocoder to resolve.
 */
export interface ParsedUtterance {
  intent?: Intent;
  /** For "list": sell or rent out, and the rental category if said. */
  listing?: { purpose: "sell" | "rent_out"; duration?: RentalDuration };
  /** A place name to geocode, e.g. "Marbella" or "Puerto Banús". */
  locationQuery?: string;
  flexibleLocation?: boolean;
  patch: Partial<SearchCriteria>;
  /** Distance constraints that need a geocoded anchor ("within 15 minutes of Puerto Banús"). */
  anchoredDistance?: { query: string; maxKm: number; note?: string };
  showAll?: boolean;
  clearFilters?: boolean;
  showSaved?: boolean;
  saveSearch?: boolean;
  openFirst?: boolean;
  zoom?: "in" | "out";
  viewMode?: "map" | "list";
  /** Things the user mentioned that have no filter yet (quiet, office, fast internet…). */
  notes: string[];
  /** Short affirmative / negative answers, for yes/no follow-ups. */
  yesNo?: boolean;
}

const numberWords: Record<string, number> = {
  one: 1, a: 1, an: 1, single: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
};

function toNumber(raw: string): number | undefined {
  const w = raw.toLowerCase();
  if (numberWords[w] != null) return numberWords[w];
  const cleaned = w.replace(/[,.](?=\d{3}\b)/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function money(raw: string, suffix?: string): number | undefined {
  const n = toNumber(raw);
  if (n == null) return undefined;
  const s = (suffix ?? "").toLowerCase();
  if (s === "k") return n * 1000;
  if (s === "m") return n * 1_000_000;
  return n;
}

const typeWords: [RegExp, PropertyType][] = [
  [/\b(apartments?|flats?|apartamento)\b/i, "apartment"],
  [/\b(villas?)\b/i, "villa"],
  [/\b(townhouses?|town houses?)\b/i, "townhouse"],
  [/\b(studios?)\b/i, "studio"],
  [/\b(lofts?)\b/i, "loft"],
  [/\b(houses?|casa|chalet)\b/i, "house"],
];

const proximityWords: [RegExp, ProximityKind, number][] = [
  [/\b(beach|beaches|playa)\b/i, "beach", 1.5],
  [/\b(sea|ocean|coast|coastline|seaside|waterfront)\b/i, "sea", 1.5],
  [/\b(airport)\b/i, "airport", 12],
  [/\b(international schools?|schools?|colegio)\b/i, "school", 2],
  [/\b(supermarkets?|groceries|grocery|shops?|shopping)\b/i, "supermarket", 1],
  [/\b(gym|gyms|fitness)\b/i, "gym", 1.5],
  [/\b(restaurants?|bars?|caf[eé]s?|nightlife)\b/i, "restaurants", 1],
  [/\b(public transport|transport|metro|train|bus|station)\b/i, "transport", 1],
  [/\b(hospitals?|clinics?)\b/i, "hospital", 3],
  [/\b(city cent(?:er|re)|downtown|old town|centro)\b/i, "center", 2],
];

const nearWords = /\b(near|close to|next to|by the|beside|walking distance (?:of|to|from)|nearby|around the|on the)\b/i;

/** "within 500 m", "within 2 km", "within 15 minutes" → km, with a note about how minutes were read. */
function withinKm(text: string): { km: number; note?: string; rest: string } | null {
  const m = text.match(/within\s+(\d+(?:[.,]\d+)?)\s*(m|meters|metres|km|kilometers|kilometres|min|mins|minutes?)\b(?:\s*(walk|walking|drive|driving|by car))?\s*(?:of|from|to)?\s*/i);
  if (!m) return null;
  const n = toNumber(m[1]) ?? 0;
  const unit = m[2].toLowerCase();
  const mode = (m[3] ?? "").toLowerCase();
  let km: number;
  let note: string | undefined;
  if (unit.startsWith("km") || unit.startsWith("kilo")) km = n;
  else if (unit.startsWith("m")) {
    if (unit === "m" || unit.startsWith("met")) km = n / 1000;
    else {
      // minutes: no routing API, so convert to a straight-line radius and say so.
      const perMin = mode.includes("walk") ? 0.075 : mode.includes("driv") || mode.includes("car") ? 0.6 : 0.3;
      km = n * perMin;
      note = `${n} min read as roughly ${km.toFixed(1)} km in a straight line${mode ? "" : " (say walking or driving to narrow it)"}.`;
    }
  } else km = n;
  return { km: Math.max(0.1, km), note, rest: text.slice(m.index! + m[0].length) };
}

/** Everything after "in/to/around/at" up to a clause break. */
function locationPhrase(text: string): string | undefined {
  const m = text.match(/\b(?:in|to|around|at|move to|looking in|live in|somewhere in)\s+([A-ZÀ-Ý][\p{L}'’.-]*(?:\s+(?:de|del|la|las|los|el|of)\s+[A-ZÀ-Ý][\p{L}'’.-]*|\s+[A-ZÀ-Ý][\p{L}'’.-]*){0,3})/u);
  if (m) return m[1].trim();
  return undefined;
}

export function parseUtterance(raw: string): ParsedUtterance {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const patch: Partial<SearchCriteria> = {};
  const notes: string[] = [];
  const result: ParsedUtterance = { patch, notes };

  // ---- yes / no
  if (/^(yes|yeah|yep|sure|ok|okay|please|correct|right)\b/i.test(text)) result.yesNo = true;
  if (/^(no|nope|nah|not really|none)\b/i.test(text)) result.yesNo = false;

  // ---- intent
  if (/\b(sell|selling|sale of my|list my|rent out|renting out|let out|put .* on the market)\b/i.test(text) || /\bmy (apartment|flat|house|villa|home|property|place)\b/i.test(text) && /\b(list|rent|sell|upload|publish)\b/i.test(text)) {
    result.intent = "list";
    const purpose: "sell" | "rent_out" = /\b(sell|selling|sale)\b/i.test(text) ? "sell" : "rent_out";
    let duration: RentalDuration | undefined;
    if (/\b(short[- ]?term|holiday|vacation|nightly|weekly)\b/i.test(text)) duration = "short";
    else if (/\b(seasonal|season|winter|summer)\b/i.test(text)) duration = "seasonal";
    else if (/\b(long[- ]?term|yearly|annual|permanent)\b/i.test(text)) duration = "long";
    result.listing = { purpose, duration };
  } else if (/\b(buy|buying|purchase|purchasing|invest|investment|own)\b/i.test(text)) {
    result.intent = "buy";
  } else if (/\b(short stay|short-stay|holiday|vacation|weekend|getaway|a few nights|nights?)\b/i.test(text) || /\bstay\b/i.test(text) && !/\blong[- ]?term\b/i.test(text)) {
    result.intent = "stay";
  } else if (/\b(rent|renting|rental|lease|let|tenant|move in|monthly)\b/i.test(text)) {
    result.intent = "rent";
  }
  if (/\b(long[- ]?term|permanent|12 months|a year)\b/i.test(text) && result.intent !== "list") patch.rentalDuration = "long";
  if (/\b(seasonal|for the (summer|winter|season))\b/i.test(text) && result.intent !== "list") patch.rentalDuration = "seasonal";

  // ---- control phrases
  if (/\b(show (me )?(everything|all|all of them|what you have)|just show|skip the questions|no more questions)\b/i.test(text)) result.showAll = true;
  if (/\b(reset|start over|clear (the )?filters|remove (all )?filters|forget (all )?that)\b/i.test(text)) result.clearFilters = true;
  if (/\b(saved|favou?rites?|wishlist|wish list)\b/i.test(text) && /\b(show|open|see|my)\b/i.test(text)) result.showSaved = true;
  if (/\bsave (this |the |my )?(search|filters?)\b/i.test(text)) result.saveSearch = true;
  if (/\b(open|show) (it|that one|the first|the first one|number one)\b/i.test(text)) result.openFirst = true;
  if (/\bzoom (in|closer)\b/i.test(text)) result.zoom = "in";
  if (/\bzoom out\b/i.test(text)) result.zoom = "out";
  if (/\b(list view|as a list|show (me )?(the )?list)\b/i.test(text)) result.viewMode = "list";
  if (/\b(map view|on the map|show (me )?(the )?map)\b/i.test(text)) result.viewMode = "map";

  // ---- location
  if (/\b(anywhere|flexible (on|about) (the )?(location|area|place)|don'?t mind where|no preference)\b/i.test(text)) result.flexibleLocation = true;
  const phrase = locationPhrase(text);
  if (phrase && !/^(the|a|an)$/i.test(phrase)) result.locationQuery = phrase;
  // A bare place name ("Marbella", "Puerto Banús, Spain") as the whole message.
  if (!result.locationQuery && /^[\p{Lu}][\p{L}'’.\- ]{1,40}(,\s*[\p{Lu}][\p{L} ]+)?$/u.test(text) && !result.intent && text.split(" ").length <= 4) {
    result.locationQuery = text.replace(/\.$/, "");
  }

  // ---- budget
  const budgetMatch =
    text.match(/(?:€|eur|euros?)\s?(\d[\d.,]*)\s*(k|m)?\b/i) ?? text.match(/\b(\d[\d.,]*)\s*(k|m)?\s?(?:€|eur|euros?)\b/i) ?? text.match(/\b(?:budget|spend|pay|afford)(?: is| of| around| about| up to| max(?:imum)?)?\s*(?:€|eur)?\s*(\d[\d.,]*)\s*(k|m)?\b/i);
  if (budgetMatch) {
    const value = money(budgetMatch[1], budgetMatch[2]);
    if (value != null && value > 0) {
      const around = /\b(around|about|roughly|approximately|ish)\b/i.test(text) && !/\b(under|below|max|up to|less than|no more than)\b/i.test(text);
      patch.budgetMax = around ? Math.round(value * 1.1) : value;
      if (/\b(at least|minimum|min|from|more than|over)\b/i.test(text) && !/\b(under|below|max|up to)\b/i.test(text)) {
        patch.budgetMin = value;
        delete patch.budgetMax;
      }
    }
  }
  const between = text.match(/between\s*(?:€|eur)?\s*(\d[\d.,]*)\s*(k|m)?\s*(?:and|-|to)\s*(?:€|eur)?\s*(\d[\d.,]*)\s*(k|m)?/i);
  if (between) {
    const lo = money(between[1], between[2]);
    const hi = money(between[3], between[4]);
    if (lo != null && hi != null) {
      patch.budgetMin = Math.min(lo, hi);
      patch.budgetMax = Math.max(lo, hi);
    }
  }

  // ---- rooms and size
  const beds = text.match(/\b(\d+|one|two|three|four|five|six)[\s-]*(?:\+|plus)?[\s-]*(?:bed(?:room)?s?|br|habitaciones?)\b/i);
  if (beds) {
    const n = toNumber(beds[1]);
    if (n != null) patch.bedroomsMin = n;
  }
  const baths = text.match(/\b(\d+|one|two|three|four)[\s-]*(?:bath(?:room)?s?|ba)\b/i);
  if (baths) {
    const n = toNumber(baths[1]);
    if (n != null) patch.bathroomsMin = n;
  }
  const area = text.match(/\b(?:at least|minimum|min|over|more than)\s*(\d{2,4})\s*(?:m2|m²|sqm|square met(?:er|re)s?)\b/i) ?? text.match(/\b(\d{2,4})\s*(?:m2|m²|sqm|square met(?:er|re)s?)\b/i);
  if (area) patch.areaMin = Number(area[1]);
  const areaMax = text.match(/\b(?:up to|max(?:imum)?|under|no more than)\s*(\d{2,4})\s*(?:m2|m²|sqm|square met(?:er|re)s?)\b/i);
  if (areaMax) {
    patch.areaMax = Number(areaMax[1]);
    delete patch.areaMin;
  }

  // ---- property type
  const types: PropertyType[] = [];
  for (const [re, t] of typeWords) if (re.test(text)) types.push(t);
  if (types.length) patch.propertyTypes = [...new Set(types)];

  // ---- amenities & attributes
  if (/\b(pool|piscina|swimming)\b/i.test(text)) patch.pool = true;
  if (/\b(parking|garage|car space)\b/i.test(text)) patch.garage = true;
  if (/\bunfurnished\b/i.test(text)) patch.furnished = false;
  else if (/\bfurnished\b/i.test(text)) patch.furnished = true;
  if (/\b(sea views?|ocean views?|views? of the sea|views? of the ocean|vistas al mar)\b/i.test(text)) patch.seaView = true;
  if (/\b(dogs?|cats?|pets?|pet[- ]friendly)\b/i.test(text) && !/\bno pets?\b/i.test(text)) patch.pets = true;
  if (/\b(verified|checked|trusted)\b/i.test(text)) patch.verifiedOnly = true;
  if (/\b(pet[- ]?friendly|with my (dog|cat))\b/i.test(text)) patch.pets = true;

  // ---- guests
  const guests = text.match(/\b(\d+|one|two|three|four|five|six)\s*(?:guests?|people|persons?|adults?|of us)\b/i);
  if (guests) {
    const n = toNumber(guests[1]);
    if (n != null) patch.guests = n;
  }

  // ---- distances
  const distance: DistanceConstraint[] = [];
  const within = withinKm(text);
  let proximityText = text;
  let defaultKm: number | null = null;
  if (within) {
    defaultKm = within.km;
    proximityText = within.rest + " " + text; // the thing after "within … of" is what we're near
  }
  const walking = /\bwalking distance\b/i.test(text);
  if (nearWords.test(text) || within) {
    for (const [re, kind, km] of proximityWords) {
      if (re.test(proximityText)) {
        // Only count it as a proximity ask when a "near" word or "within" precedes it somewhere.
        distance.push({ to: kind, maxKm: defaultKm ?? (walking ? Math.min(km, 1.2) : km) });
      }
    }
    // "within 15 minutes of Puerto Banús" / "near Puerto Banús": an anchored place.
    const anchored = proximityText.match(/(?:near|close to|next to|around|of|from|to)\s+([A-ZÀ-Ý][\p{L}'’.-]*(?:\s+[A-ZÀ-Ý][\p{L}'’.-]*){0,3})/u);
    if (anchored && distance.length === 0 && !(result.locationQuery && anchored[1] === result.locationQuery)) {
      result.anchoredDistance = { query: anchored[1], maxKm: defaultKm ?? 5, note: within?.note };
    } else if (within?.note) {
      notes.push(within.note);
    }
  }
  // "sea view" is an attribute, not a proximity; don't double-count the word "sea" from it.
  if (patch.seaView && !nearWords.test(text) && !within) {
    const i = distance.findIndex((d) => d.to === "sea");
    if (i >= 0) distance.splice(i, 1);
  }
  if (distance.length) patch.distance = dedupe(distance);

  // ---- things we can acknowledge but not filter (yet)
  if (/\b(quiet|peaceful|calm)\b/i.test(text)) notes.push("a quiet area");
  if (/\b(lively|busy|buzzing|nightlife)\b/i.test(text)) notes.push("a lively area");
  if (/\b(work from home|remote work|home office|office)\b/i.test(text)) notes.push("space to work from home");
  if (/\b(fast internet|fibre|fiber|wifi|wi-fi)\b/i.test(text)) notes.push("fast internet");
  if (/\b(terrace|balcony|garden|outdoor space)\b/i.test(text)) notes.push("outdoor space");
  if (/\b(elevator|lift|step[- ]free|wheelchair|accessible)\b/i.test(text)) notes.push("step-free access");
  if (/\b(new build|new construction|newly built|brand new)\b/i.test(text)) notes.push("new construction");
  if (/\b(renovation|fixer[- ]upper|project)\b/i.test(text)) notes.push("renovation projects");
  if (/\b(family|kids|children)\b/i.test(text)) notes.push("family needs");

  return result;
}

function dedupe(list: DistanceConstraint[]) {
  const seen = new Map<string, DistanceConstraint>();
  for (const d of list) if (!seen.has(d.to) || seen.get(d.to)!.maxKm > d.maxKm) seen.set(d.to, d);
  return [...seen.values()];
}
