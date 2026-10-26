import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../constants/theme";
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

/** Airbnb's icon + label category strip with a 2px underline on the active item. */
export function CategoryTabs({ value, onChange }: CategoryTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((c) => {
        const active = c.key === value;
        return (
          <Pressable key={c.key} onPress={() => onChange(c.key)} style={styles.item}>
            <Ionicons name={c.icon} size={24} color={active ? colors.text : colors.textSecondary} />
            <Text style={[styles.label, active && styles.labelActive]}>{c.label}</Text>
            <View style={[styles.underline, active && styles.underlineActive]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, gap: spacing.lg },
  item: { alignItems: "center", paddingTop: spacing.sm, paddingHorizontal: spacing.xs },
  label: { ...typography.micro, fontWeight: "500", color: colors.textSecondary, marginTop: 6 },
  labelActive: { color: colors.text },
  underline: { height: 2, alignSelf: "stretch", marginTop: 8, backgroundColor: "transparent", borderRadius: 1 },
  underlineActive: { backgroundColor: colors.text },
});
