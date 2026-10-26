import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../constants/theme";
import type { Listing } from "../../types";

export interface ListingsMapProps {
  listings: Listing[];
  selectedId?: string;
  onSelect: (listing: Listing) => void;
  /** When true the map opens zoomed out to the whole globe before flying in. */
  startFromGlobe?: boolean;
}

/** Web build: the interactive globe map needs the mobile app; the list below the map stays usable. */
export function ListingsMap({ listings }: ListingsMapProps) {
  return (
    <View style={styles.fallback}>
      <Ionicons name="earth-outline" size={40} color={colors.text} />
      <Text style={styles.title}>Open the app to explore the map</Text>
      <Text style={styles.body}>
        {listings.length} {listings.length === 1 ? "home" : "homes"} are pinned on the interactive globe in the iOS and Android app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.bgSecondary },
  title: { ...typography.h3, color: colors.text, marginTop: spacing.md, textAlign: "center" },
  body: { ...typography.small, color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" },
});
