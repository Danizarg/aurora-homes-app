import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../constants/theme";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function SectionHeader({ eyebrow, title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  eyebrow: {
    ...typography.micro,
    color: colors.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  title: { ...typography.h2, color: colors.navy },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
});
