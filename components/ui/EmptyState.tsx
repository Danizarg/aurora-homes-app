import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../constants/theme";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = "home-outline", title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={36} color={colors.gold} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.navy, marginTop: spacing.md, textAlign: "center" },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.xs, textAlign: "center" },
});
