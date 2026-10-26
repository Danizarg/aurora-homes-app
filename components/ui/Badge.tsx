import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";

interface BadgeProps {
  label: string;
  /**
   * light   — white pill with shadow, used on photos ("Guest favourite")
   * dark    — near-black pill
   * brand   — brand tint
   * success — green tint
   * muted   — light grey
   * outline — hairline border, no fill
   */
  tone?: "light" | "dark" | "brand" | "success" | "muted" | "outline";
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

const toneStyles: Record<NonNullable<BadgeProps["tone"]>, { bg: string; fg: string; border?: string }> = {
  light: { bg: colors.white, fg: colors.text },
  dark: { bg: colors.text, fg: colors.white },
  brand: { bg: colors.primaryLight, fg: colors.primaryDark },
  success: { bg: "#E6F4E7", fg: colors.success },
  muted: { bg: colors.bgSecondary, fg: colors.textSecondary },
  outline: { bg: "transparent", fg: colors.text, border: colors.border },
};

export function Badge({ label, tone = "light", icon, style }: BadgeProps) {
  const t = toneStyles[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: t.bg },
        t.border ? { borderWidth: 1, borderColor: t.border } : null,
        tone === "light" && shadow.float,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  label: { ...typography.microBold },
});
