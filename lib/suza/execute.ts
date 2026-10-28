import { router } from "expo-router";
import type { SuzaAction } from "./actions";
import { useDiscovery } from "../store/discovery";
import { mapController } from "../map/controller";

/**
 * Applies validated actions to the app: the store (criteria, intent, view
 * mode, selection), the map camera, and navigation. Search itself is not
 * an action — changing criteria triggers it through useSearchSync.
 */
export function executeActions(actions: SuzaAction[]) {
  const s = useDiscovery.getState();
  for (const a of actions) {
    switch (a.type) {
      case "setIntent":
        s.setIntent(a.intent);
        if (a.intent !== "list") s.setCriteria({ intent: a.intent });
        break;
      case "setTarget":
        s.setTarget(a.target);
        break;
      case "clearTarget":
        s.setTarget(undefined);
        break;
      case "setFilters":
        s.setCriteria(a.patch);
        break;
      case "clearFilters":
        s.clearFilters();
        s.setShowAll(false);
        break;
      case "moveMap":
        if (a.bounds) mapController.flyToBounds(a.bounds, 1400);
        else if (a.point) mapController.flyToPoint(a.point, a.halfSizeKm ?? 3, 1400);
        break;
      case "zoom":
        mapController.zoomBy(a.factor);
        break;
      case "selectListing":
        s.select(a.id);
        mapController.focusListing(a.id);
        break;
      case "openListing":
        router.push(`/listing/${a.id}`);
        break;
      case "openUpload":
        router.push({ pathname: "/create-listing", params: { purpose: a.purpose, duration: a.duration ?? "" } });
        break;
      case "setViewMode":
        s.setViewMode(a.mode);
        break;
      case "showSaved":
        router.push("/wishlists/saved");
        break;
      case "saveSearch":
        // Criteria are persisted continuously; nothing else to do yet.
        break;
      case "showAll":
        s.setShowAll(true);
        break;
    }
  }
}
