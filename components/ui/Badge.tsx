import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

interface BadgeProps {
  label: string;
  tone?: "gold" | "navy" | "terracotta" | "success" | "muted";
}

const toneStyles: Record<string, { bg: string; fg: string }> = {
  gold: { bg: colors.sand, fg: colors.gold },
  navy: { bg: colors.navy, fg: colors.white },
  terracotta: { bg: colors.terracottaSoft, fg: colors.navy },
  success: { bg: "#E1EDE4", fg: colors.success },
  muted: { bg: colors.ivoryDeep, fg: colors.muted },
};

export function Badge({ label, tone = "gold" }: BadgeProps) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  label: {
    ...typography.micro,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
