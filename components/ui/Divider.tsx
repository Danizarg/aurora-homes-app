import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, spacing } from "../../constants/theme";

interface DividerProps {
  style?: ViewStyle;
  /** Vertical spacing around the hairline. Defaults to 24 (Airbnb section rhythm). */
  gap?: number;
}

export function Divider({ style, gap = spacing.lg }: DividerProps) {
  return <View style={[styles.line, { marginVertical: gap }, style]} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth > 0.9 ? 1 : StyleSheet.hairlineWidth, backgroundColor: colors.divider, alignSelf: "stretch" },
});
