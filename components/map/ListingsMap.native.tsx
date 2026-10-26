import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { colors, radius, shadow, typography } from "../../constants/theme";
import { coordsFor } from "../../lib/geo/cities";
import { priceParts } from "../../lib/listings/presentation";
import type { ListingsMapProps } from "./ListingsMap";

const GLOBE = { latitude: 30, longitude: 0, latitudeDelta: 120, longitudeDelta: 120 };

function regionFor(listings: ListingsMapProps["listings"]) {
  if (listings.length === 0) return { latitude: 40, longitude: -3.7, latitudeDelta: 12, longitudeDelta: 12 };
  const pts = listings.map(coordsFor);
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.6),
  };
}

/**
 * Airbnb's map of results: every home is a white price pill; the selected
 * one turns near-black. Opens on the whole earth, then flies to the homes.
 */
export function ListingsMap({ listings, selectedId, onSelect, startFromGlobe = true }: ListingsMapProps) {
  const ref = useRef<MapView>(null);

  useEffect(() => {
    const target = regionFor(listings);
    const timer = setTimeout(() => ref.current?.animateToRegion(target, startFromGlobe ? 2200 : 600), startFromGlobe ? 700 : 100);
    return () => clearTimeout(timer);
    // Fly once per result set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings.map((l) => l.id).join(",")]);

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={startFromGlobe ? GLOBE : regionFor(listings)}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
    >
      {listings.map((listing) => {
        const point = coordsFor(listing);
        const { amount } = priceParts(listing);
        const selected = listing.id === selectedId;
        return (
          <Marker
            key={listing.id}
            coordinate={{ latitude: point.lat, longitude: point.lng }}
            onPress={() => onSelect(listing)}
            tracksViewChanges={false}
            zIndex={selected ? 10 : 1}
          >
            <View style={[styles.pill, selected && styles.pillSelected]}>
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{amount}</Text>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 10,
    borderWidth: 1, borderColor: colors.divider, ...shadow.float,
  },
  pillSelected: { backgroundColor: colors.text, borderColor: colors.text, transform: [{ scale: 1.08 }] },
  pillText: { ...typography.smallBold, color: colors.text },
  pillTextSelected: { color: colors.white },
});
