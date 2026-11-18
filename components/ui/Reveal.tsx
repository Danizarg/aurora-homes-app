import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { motion } from "../../constants/theme";

interface RevealProps extends PropsWithChildren {
  /** Position in a list; each step adds a short stagger. */
  index?: number;
  /**
   * "rise" eases up while it fades in, for rows arriving in a feed.
   * "fade" only fades, for content taking the place of a placeholder, where
   * nothing around it should move.
   */
  variant?: "rise" | "fade";
  style?: StyleProp<ViewStyle>;
}

/** Content arrives softly as it mounts, staggered by index — the soft arrival Airbnb's feeds have. */
export function Reveal({ index = 0, variant = "rise", style, children }: RevealProps) {
  const delay = Math.min(index, 6) * motion.stagger;
  const entering =
    variant === "fade"
      ? FadeIn.duration(motion.reveal).delay(delay)
      : FadeInDown.springify().damping(motion.springWater.damping).stiffness(motion.springWater.stiffness).mass(motion.springWater.mass).delay(delay);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
