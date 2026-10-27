import { useEffect } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, motion, spacing, typography } from "../../constants/theme";
import { PressableScale } from "../ui/PressableScale";
import { haptic } from "../../lib/ui/haptics";
import type { ListingMode } from "../../types";

export type Category = ListingMode | "all";

export const categories: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "Homes", icon: "home-outline" },
  { key: "stay", label: "Stay", icon: "bed-outline" },
  { key: "rent", label: "Rent", icon: "key-outline" },
  { key: "buy", label: "Buy", icon: "business-outline" },
  { key: "live", label: "Live", icon: "leaf-outline" },
];

interface CategoryTabsProps {
  value: Category;
  onChange: (c: Category) => void;
}

/** Airbnb's icon + label category strip; the underline springs in under the active item. */
export function CategoryTabs({ value, onChange }: CategoryTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((c) => (
        <Tab
          key={c.key}
          label={c.label}
          icon={c.icon}
          active={c.key === value}
          onPress={() => {
            haptic.select();
            onChange(c.key);
          }}
        />
      ))}
    </ScrollView>
  );
}

function Tab({ label, icon, active, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) {
  const grow = useSharedValue(active ? 1 : 0);
  const lift = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    grow.set(withSpring(active ? 1 : 0, motion.springWater));
    lift.set(withTiming(active ? 1 : 0, { duration: 200 }));
  }, [active, grow, lift]);

  const underline = useAnimatedStyle(() => ({
    transform: [{ scaleX: grow.get() }],
    opacity: grow.get(),
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * lift.get() }],
  }));

  return (
    <PressableScale onPress={onPress} pressedScale={0.92} style={styles.item}>
      <Animated.View style={iconStyle}>
        <Ionicons name={icon} size={24} color={active ? colors.text : colors.textSecondary} />
      </Animated.View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      <Animated.View style={[styles.underline, underline]} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, gap: spacing.lg },
  item: { alignItems: "center", paddingTop: spacing.sm, paddingHorizontal: spacing.xs },
  label: { ...typography.micro, fontWeight: "500", color: colors.textSecondary, marginTop: 6 },
  labelActive: { color: colors.text },
  underline: { height: 2, alignSelf: "stretch", marginTop: 8, backgroundColor: colors.text, borderRadius: 1 },
});
