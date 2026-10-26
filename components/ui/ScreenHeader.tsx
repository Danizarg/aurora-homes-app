import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, spacing, typography } from "../../constants/theme";

interface ScreenHeaderProps {
  /** Centered title (Airbnb modal / pushed-screen header). Omit for a bare back row. */
  title?: string;
  /** "back" renders a chevron, "close" an X. */
  leading?: "back" | "close" | "none";
  onLeading?: () => void;
  right?: React.ReactNode;
  /** Draw the hairline under the header. */
  border?: boolean;
}

export function ScreenHeader({ title, leading = "back", onLeading, right, border = !!title }: ScreenHeaderProps) {
  const icon = leading === "close" ? "close" : "chevron-back";
  return (
    <View style={[styles.row, border && styles.border]}>
      <View style={styles.side}>
        {leading !== "none" ? (
          <Pressable onPress={onLeading ?? (() => router.back())} hitSlop={10} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Ionicons name={icon} size={leading === "close" ? 22 : 24} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
      {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : <View style={{ flex: 1 }} />}
      <View style={[styles.side, { alignItems: "flex-end" }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  border: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  side: { width: 48, justifyContent: "center" },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: colors.bgSecondary },
  title: { flex: 1, textAlign: "center", ...typography.h4, color: colors.text },
});
