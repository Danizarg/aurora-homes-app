import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { brand, colors, layout, radius, spacing, typography } from "../../constants/theme";
import { PressableScale } from "./PressableScale";

type Variant = "primary" | "dark" | "outline" | "ghost" | "link";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  /**
   * primary — brand gradient (Airbnb "Reserve" style)
   * dark    — solid near-black (Airbnb "Show results" style)
   * outline — 1px near-black border
   * ghost   — transparent, text only
   * link    — underlined text, inline sized
   */
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  loading,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textColor = textColors[variant];

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <View style={styles.inner}>
      {icon ? <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: spacing.sm }} /> : null}
      <Text style={[styles.label, sizeText[size], { color: textColor }, variant === "link" && styles.linkLabel]}>
        {label}
      </Text>
    </View>
  );

  if (variant === "link") {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} hitSlop={6} style={({ pressed }) => [pressed && styles.pressed, style]}>
        {content}
      </Pressable>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      pressedScale={0.96}
      haptics
      style={[styles.base, sizeStyles[size], variantStyles[variant], isDisabled && styles.disabled, style]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={[...brand.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: layout.buttonHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  inner: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  label: { ...typography.bodyBold },
  linkLabel: { textDecorationLine: "underline" },
});

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, ViewStyle> = {
  sm: { height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  md: { height: layout.buttonHeight },
  lg: { height: 56, paddingHorizontal: spacing.xl },
};

const sizeText: Record<NonNullable<ButtonProps["size"]>, { fontSize: number }> = {
  sm: { fontSize: 14 },
  md: { fontSize: 16 },
  lg: { fontSize: 16 },
};

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  dark: { backgroundColor: colors.text },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong },
  ghost: { backgroundColor: "transparent" },
  link: {},
};

const textColors: Record<Variant, string> = {
  primary: colors.white,
  dark: colors.white,
  outline: colors.text,
  ghost: colors.text,
  link: colors.text,
};
