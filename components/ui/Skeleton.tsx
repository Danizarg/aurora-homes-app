import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors, radius, spacing } from "../../constants/theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  round?: boolean;
  style?: ViewStyle;
}

/** A softly pulsing placeholder block, Airbnb's loading state instead of a spinner. */
export function Skeleton({ width = "100%", height = 16, round, style }: SkeletonProps) {
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 900 }), -1, true));
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: round ? height / 2 : radius.sm }, animated, style]}
    />
  );
}

/** Icon-plus-two-lines row, matching the nearby-places and inbox rows. */
export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="62%" height={14} />
        <Skeleton width="38%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.bgTertiary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm + 2 },
});
