import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === "lg" && styles.lg,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.navy} />
      ) : (
        <Text style={[styles.label, textVariantStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.bodyMedium,
  },
});

const variantStyles: Record<string, ViewStyle> = {
  primary: { backgroundColor: colors.navy },
  secondary: { backgroundColor: colors.gold },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.navy },
  ghost: { backgroundColor: "transparent" },
};

const textVariantStyles: Record<string, { color: string }> = {
  primary: { color: colors.white },
  secondary: { color: colors.navy },
  outline: { color: colors.navy },
  ghost: { color: colors.navy },
};
