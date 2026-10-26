import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../constants/theme";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Renders a trailing chevron and makes the header pressable (Airbnb "Popular homes in Marbella ›"). */
  onPress?: () => void;
  /** Optional right-aligned action label, e.g. "Show all". */
  actionLabel?: string;
  onAction?: () => void;
  size?: "md" | "lg";
}

export function SectionHeader({ title, subtitle, onPress, actionLabel, onAction, size = "md" }: SectionHeaderProps) {
  const titleStyle = size === "lg" ? typography.h2 : typography.h3;
  const Wrapper = onPress ? Pressable : View;
  return (
    <View style={styles.wrap}>
      <Wrapper onPress={onPress} style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[titleStyle, styles.title]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.text} /> : null}
        {actionLabel ? (
          <Pressable onPress={onAction} hitSlop={6}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </Wrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center" },
  title: { color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  action: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline" },
});
