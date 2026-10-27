import type { PropsWithChildren } from "react";
import type { ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { motion } from "../../constants/theme";

interface RevealProps extends PropsWithChildren {
  /** Position in a list; each step adds a short stagger. */
  index?: number;
  style?: ViewStyle;
}

/** Content eases up and fades in as it mounts, staggered by index — the soft arrival Airbnb's feeds have. */
export function Reveal({ index = 0, style, children }: RevealProps) {
  return (
    <Animated.View entering={FadeInDown.duration(motion.reveal).delay(Math.min(index, 6) * motion.stagger)} style={style}>
      {children}
    </Animated.View>
  );
}
