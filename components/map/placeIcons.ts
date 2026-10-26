import type { Ionicons } from "@expo/vector-icons";
import type { PlaceCategory } from "../../lib/geo/places";

export const placeIcon: Record<PlaceCategory, keyof typeof Ionicons.glyphMap> = {
  supermarket: "cart-outline",
  shopping: "bag-handle-outline",
  food: "restaurant-outline",
  health: "medkit-outline",
  transport: "bus-outline",
  beach: "sunny-outline",
  education: "school-outline",
  leisure: "leaf-outline",
};
