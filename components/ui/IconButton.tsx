import { StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadow } from "../../constants/theme";
import { PressableScale } from "./PressableScale";

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  /** "overlay" — white circle with shadow for photo overlays; "outline" — hairline border; "plain" — no chrome */
  variant?: "overlay" | "outline" | "plain";
  color?: string;
  style?: ViewStyle;
}

export function IconButton({ icon, onPress, size = 32, variant = "outline", color = colors.text, style }: IconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={6}
      pressedScale={0.88}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === "overlay" && styles.overlay,
        variant === "outline" && styles.outline,
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
});
