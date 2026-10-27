import { useState, type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";

interface CollapsibleProps extends PropsWithChildren {
  open: boolean;
  /** Glide duration in ms. */
  duration?: number;
}

/**
 * Content that glides open and closed instead of popping: the natural
 * height is measured once, then height and opacity ease between 0 and it.
 */
export function Collapsible({ open, duration = 380, children }: CollapsibleProps) {
  const [contentHeight, setContentHeight] = useState(0);

  const progress = useDerivedValue(
    () => withTiming(open ? 1 : 0, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
    [open, duration]
  );

  const frame = useAnimatedStyle(() => ({
    height: contentHeight * progress.get(),
    opacity: progress.get(),
  }));

  return (
    <Animated.View style={[styles.frame, frame]}>
      <View style={styles.content} onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", width: "100%" },
  // Absolute so the measured height is the content's own, not the animated frame's.
  content: { position: "absolute", left: 0, right: 0, top: 0 },
});
