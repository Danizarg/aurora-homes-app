import { StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadow } from "../../constants/theme";
import { PressableScale } from "./PressableScale";

/** Apple's minimum tap target, in points. */
const MIN_TARGET = 44;

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** What VoiceOver says. Required: an icon on its own tells a screen reader nothing. */
  accessibilityLabel: string;
  onPress?: () => void;
  /** For toggles such as a saved heart, so VoiceOver can say "selected". */
  selected?: boolean;
  disabled?: boolean;
  size?: number;
  /** "overlay" — white circle with shadow for photo overlays; "outline" — hairline border; "plain" — no chrome */
  variant?: "overlay" | "outline" | "plain";
  color?: string;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  selected,
  disabled,
  size = 32,
  variant = "outline",
  color = colors.text,
  style,
}: IconButtonProps) {
  // The circle can be smaller than a fingertip; the area that takes the tap never is.
  const slop = Math.max(6, Math.ceil((MIN_TARGET - size) / 2));
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop}
      pressedScale={0.88}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, selected }}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === "overlay" && styles.overlay,
        variant === "outline" && styles.outline,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.55)} color={color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  overlay: { backgroundColor: colors.white, ...shadow.float },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.4 },
});
