import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { PressableScale } from "./PressableScale";
import { haptic } from "../../lib/ui/haptics";

interface ChipProps {
  label: string;
  active?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

/** Airbnb filter pill: hairline border, fills near-black when active, squeezes softly on tap. */
export function Chip({ label, active, icon, onPress }: ChipProps) {
  const fg = active ? colors.white : colors.text;
  return (
    <PressableScale
      pressedScale={0.95}
      onPress={() => {
        haptic.select();
        onPress?.();
      }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <View style={styles.inner}>
        {icon ? <Ionicons name={icon} size={16} color={fg} style={{ marginRight: 6 }} /> : null}
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  inner: { flexDirection: "row", alignItems: "center" },
  label: { ...typography.smallMedium },
});
