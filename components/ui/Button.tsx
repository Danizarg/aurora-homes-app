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
  // While loading the label is swapped for a spinner, so VoiceOver needs the
  // label and the busy state spelled out rather than read from the children.
  const a11y = {
    accessibilityRole: "button" as const,
    accessibilityLabel: label,
    accessibilityState: { disabled: !!isDisabled, busy: !!loading },
  };

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <View style={styles.inner}>
      {icon ? <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: spacing.sm }} /> : null}
      <Text numberOfLines={1} style={[styles.label, sizeText[size], { color: textColor }, variant === "link" && styles.linkLabel]}>
        {label}
      </Text>
    </View>
  );

  if (variant === "link") {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} hitSlop={6} {...a11y} style={({ pressed }) => [pressed && styles.pressed, style]}>
        {content}
      </Pressable>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={sizeSlop[size]}
      pressedScale={0.96}
      haptics
      {...a11y}
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

// sm draws at 36pt; 4pt of slop above and below makes the tap target Apple's 44.
const sizeSlop: Record<NonNullable<ButtonProps["size"]>, number | undefined> = {
  sm: 4,
  md: undefined,
  lg: undefined,
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
