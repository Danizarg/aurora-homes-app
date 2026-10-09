import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = "home-outline", title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={30} color={colors.gold} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  iconWrap: {
    width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.sand,
    alignItems: "center", justifyContent: "center",
  },
  title: { ...typography.h3, color: colors.navy, marginTop: spacing.lg, textAlign: "center" },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.xs, textAlign: "center" },
});
