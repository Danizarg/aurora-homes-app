import type { GeoBounds, GeoPoint } from "../../types/search";

/**
 * The map screen registers itself here so Suza's actions (and the search
 * bar) can move the camera without reaching into component refs. When no
 * map is mounted (list mode, web) the calls are no-ops and the store still
 * carries the intent, so the map catches up when it mounts.
 */
export interface MapController {
  flyToBounds(bounds: GeoBounds, durationMs?: number): void;
  flyToPoint(point: GeoPoint, zoomKmHalfSize?: number, durationMs?: number): void;
  zoomBy(factor: number): void;
  focusListing(id: string): void;
}

let current: MapController | null = null;
let pending: ((c: MapController) => void) | null = null;

export function registerMapController(controller: MapController | null) {
  current = controller;
  if (controller && pending) {
    const run = pending;
    pending = null;
    run(controller);
  }
}

export const mapController = {
  flyToBounds(bounds: GeoBounds, durationMs?: number) {
    if (current) current.flyToBounds(bounds, durationMs);
    else pending = (c) => c.flyToBounds(bounds, durationMs);
  },
  flyToPoint(point: GeoPoint, zoomKmHalfSize?: number, durationMs?: number) {
    if (current) current.flyToPoint(point, zoomKmHalfSize, durationMs);
    else pending = (c) => c.flyToPoint(point, zoomKmHalfSize, durationMs);
  },
  zoomBy(factor: number) {
    current?.zoomBy(factor);
  },
  focusListing(id: string) {
    if (current) current.focusListing(id);
    else pending = (c) => c.focusListing(id);
  },
  get mounted() {
    return current !== null;
  },
};
