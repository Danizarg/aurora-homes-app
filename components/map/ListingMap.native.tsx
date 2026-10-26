import { StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { placeIcon } from "./placeIcons";
import type { ListingMapProps } from "./ListingMap";

/**
 * Native listing map (Apple Maps on iOS, Google Maps on Android — both ship
 * in Expo Go): Airbnb's tinted "approximate area" circle instead of an
 * exact pin, with small pins for the nearby places the user is reading about.
 */
export function ListingMap({ center, radiusMeters = 450, places = [], height = 240 }: ListingMapProps) {
  return (
    <View style={[styles.frame, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
        showsPointsOfInterests
        showsCompass={false}
        toolbarEnabled={false}
      >
        <Circle
          center={{ latitude: center.lat, longitude: center.lng }}
          radius={radiusMeters}
          fillColor="rgba(114,85,240,0.18)"
          strokeColor="rgba(114,85,240,0.6)"
          strokeWidth={2}
        />
        {places.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.point.lat, longitude: p.point.lng }} title={p.name} tracksViewChanges={false}>
            <View style={styles.pin}>
              <Ionicons name={placeIcon[p.category]} size={14} color={colors.text} />
            </View>
          </Marker>
        ))}
      </MapView>
      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.badgeText}>Approximate area</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.bgSecondary },
  pin: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  badge: {
    position: "absolute", top: spacing.sm, left: spacing.sm, backgroundColor: colors.white,
    borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: spacing.sm + 2,
  },
  badgeText: { ...typography.microBold, color: colors.text },
});
