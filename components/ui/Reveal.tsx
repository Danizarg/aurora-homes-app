import type { PropsWithChildren } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { motion } from "../../constants/theme";

interface RevealProps extends PropsWithChildren {
  /** Position in a list; each step adds a short stagger. */
  index?: number;
  /**
   * "rise" eases up while it fades in, for rows arriving in a feed.
   * "fade" only fades, for content taking the place of a placeholder or of
   * another view, where nothing around it should move.
   */
  variant?: "rise" | "fade";
  /** How long a "fade" takes (ms). */
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * For `entering` and `exiting` on other animated views: the animation on the
 * phone, nothing on web, for the same reason Reveal stands still there.
 */
export function nativeOnly<T>(animation: T): T | undefined {
  return Platform.OS === "web" ? undefined : animation;
}

/** Content arrives softly as it mounts, staggered by index — the soft arrival Airbnb's feeds have. */
export function Reveal({ index = 0, variant = "rise", duration = motion.reveal, style, children }: RevealProps) {
  // The web build is a preview and test target only. There the animation waits
  // for a frame that a preview pane out of sight never draws, which leaves the
  // content hidden. So on web the content is simply there.
  if (Platform.OS === "web") return <View style={style}>{children}</View>;

  const delay = Math.min(index, 6) * motion.stagger;
  const entering =
    variant === "fade"
      ? FadeIn.duration(duration).delay(delay)
      : FadeInDown.springify().damping(motion.springWater.damping).stiffness(motion.springWater.stiffness).mass(motion.springWater.mass).delay(delay);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
