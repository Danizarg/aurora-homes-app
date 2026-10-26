import { createElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import type { GeoPoint } from "../../lib/geo/distance";
import type { NearbyPlace } from "../../lib/geo/places";

export interface ListingMapProps {
  center: GeoPoint;
  /** Radius of the "approximate area" circle in metres. */
  radiusMeters?: number;
  places?: NearbyPlace[];
  height?: number;
  label?: string;
}

/**
 * Web build of the listing map: an OpenStreetMap embed with a marker. The
 * native build (ListingMap.native.tsx) uses react-native-maps with the
 * Airbnb-style approximate-area circle and nearby-place pins.
 */
export function ListingMap({ center, height = 240 }: ListingMapProps) {
  const span = 0.012;
  const bbox = [center.lng - span, center.lat - span * 0.6, center.lng + span, center.lat + span * 0.6].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${center.lat},${center.lng}`;
  return (
    <View style={[styles.frame, { height }]}>
      {createElement("iframe", {
        src,
        title: "Map",
        style: { border: 0, width: "100%", height: "100%" },
        loading: "lazy",
      })}
      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.badgeText}>Approximate area</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.bgSecondary },
  badge: {
    position: "absolute", top: spacing.sm, left: spacing.sm, backgroundColor: colors.white,
    borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: spacing.sm + 2,
  },
  badgeText: { ...typography.microBold, color: colors.text },
});
