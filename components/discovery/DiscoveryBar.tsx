import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { PressableScale } from "../ui/PressableScale";
import { haptic } from "../../lib/ui/haptics";
import { useDiscovery, type ViewMode } from "../../lib/store/discovery";
import type { Intent } from "../../types/search";

const intentLabel: Record<Exclude<Intent, "list">, string> = { buy: "Buy", rent: "Rent", stay: "Stay" };

interface DiscoveryBarProps {
  filterCount: number;
  onOpenFilters: () => void;
  onOpenIntent: () => void;
}

/**
 * The floating header over the map: destination pill (opens the search
 * sheet), a compact intent chip, the filter button, and the Map / List
 * toggle. Translucent so the map reads through it.
 */
export function DiscoveryBar({ filterCount, onOpenFilters, onOpenIntent }: DiscoveryBarProps) {
  const target = useDiscovery((s) => s.criteria.target);
  const intent = useDiscovery((s) => s.intent);
  const viewMode = useDiscovery((s) => s.viewMode);
  const setViewMode = useDiscovery((s) => s.setViewMode);
  const count = useDiscovery((s) => s.result?.items.length ?? null);
  const searching = useDiscovery((s) => s.searching);

  function toggle(mode: ViewMode) {
    if (mode === viewMode) return;
    haptic.select();
    setViewMode(mode);
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.row}>
        <PressableScale pressedScale={0.98} style={styles.pill} onPress={() => router.push("/search-modal")}>
          <BlurView tint="light" intensity={40} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
          <View style={styles.pillTint} />
          <Ionicons name="search" size={18} color={colors.text} />
          <View style={{ flex: 1, marginLeft: spacing.sm + 2 }}>
            <Text style={styles.pillTitle} numberOfLines={1}>{target ? target.label.split(",")[0] : "Where to?"}</Text>
            <Text style={styles.pillSub} numberOfLines={1}>
              {intent && intent !== "list" ? intentLabel[intent] : "Any"}
              {" · "}
              {searching && count === null ? "Searching…" : count === null ? "Tap to search" : count === 1 ? "1 home" : `${count} homes`}
            </Text>
          </View>
          <PressableScale pressedScale={0.9} onPress={onOpenIntent} hitSlop={6} style={styles.intentChip}>
            <Text style={styles.intentText}>{intent && intent !== "list" ? intentLabel[intent] : "Intent"}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.text} />
          </PressableScale>
        </PressableScale>

        <PressableScale pressedScale={0.9} onPress={onOpenFilters} style={styles.round}>
          <Ionicons name="options-outline" size={20} color={colors.text} />
          {filterCount > 0 ? (
            <View style={styles.badge}><Text style={styles.badgeText}>{filterCount}</Text></View>
          ) : null}
        </PressableScale>
      </View>

      {Platform.OS === "web" ? null : (
      <View style={styles.toggleRow}>
        <View style={styles.toggle}>
          {(["map", "list"] as ViewMode[]).map((mode) => (
            <PressableScale key={mode} pressedScale={0.95} onPress={() => toggle(mode)} style={[styles.toggleItem, viewMode === mode && styles.toggleItemActive]}>
              <Ionicons name={mode === "map" ? "map-outline" : "list-outline"} size={14} color={viewMode === mode ? colors.white : colors.text} />
              <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>{mode === "map" ? "Map" : "List"}</Text>
            </PressableScale>
          ))}
        </View>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, top: 0, paddingHorizontal: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pill: {
    flex: 1, height: 56, flexDirection: "row", alignItems: "center", paddingLeft: spacing.md + 2, paddingRight: spacing.sm,
    borderRadius: radius.pill, overflow: "hidden", ...shadow.search,
  },
  pillTint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.82)" },
  pillTitle: { ...typography.smallBold, color: colors.text },
  pillSub: { ...typography.micro, color: colors.textSecondary, marginTop: 1 },
  intentChip: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: colors.bgSecondary, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
  intentText: { ...typography.microBold, color: colors.text },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...shadow.search },
  badge: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.text, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  toggleRow: { alignItems: "center", marginTop: spacing.sm },
  toggle: { flexDirection: "row", backgroundColor: colors.white, borderRadius: radius.pill, padding: 3, ...shadow.float },
  toggleItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill },
  toggleItemActive: { backgroundColor: colors.text },
  toggleText: { ...typography.microBold, color: colors.text },
  toggleTextActive: { color: colors.white },
});
