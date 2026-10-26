import { StyleSheet, View, ViewProps } from "react-native";
import { colors, radius, shadow, spacing } from "../../constants/theme";

interface CardProps extends ViewProps {
  /** outlined (default) — 1px hairline border; elevated — soft shadow, no border; flat — light grey fill */
  variant?: "outlined" | "elevated" | "flat";
}

export function Card({ style, children, variant = "outlined", ...rest }: CardProps) {
  return (
    <View style={[styles.card, variantStyles[variant], style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});

const variantStyles = {
  outlined: { borderWidth: 1, borderColor: colors.border },
  elevated: { ...shadow.card },
  flat: { backgroundColor: colors.bgSecondary },
};
