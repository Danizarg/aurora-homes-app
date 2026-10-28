import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../constants/theme";
import type { Listing } from "../../types";

interface DiscoveryMapProps {
  listings: Listing[];
  onUnpinnedCount?: (n: number) => void;
}

/**
 * Web build: react-native-maps has no web renderer, so the discovery screen
 * falls back to list mode. The native build (DiscoveryMap.native.tsx) is the
 * real clustered map.
 */
export function DiscoveryMap({ onUnpinnedCount }: DiscoveryMapProps) {
  useEffect(() => onUnpinnedCount?.(0), [onUnpinnedCount]);
  return (
    <View style={styles.fallback}>
      <Ionicons name="earth-outline" size={36} color={colors.text} />
      <Text style={styles.title}>The interactive map lives in the mobile app</Text>
      <Text style={styles.body}>Switch to List to browse the same results here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.bgSecondary },
  title: { ...typography.h3, color: colors.text, marginTop: spacing.md, textAlign: "center" },
  body: { ...typography.small, color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" },
});
