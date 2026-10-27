import { Pressable, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { motion } from "../../constants/theme";
import { haptic } from "../../lib/ui/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  /** Scale while pressed; 0.97 for cards, 0.96 for buttons, 0.9 for icons. */
  pressedScale?: number;
  /** Fire a light haptic on press-in. */
  haptics?: boolean;
}

/**
 * The one press feedback for the whole app: a quick spring squeeze on
 * press-in, a soft spring back on release. Replaces opacity flashes so taps
 * feel physical rather than flickery.
 */
export function PressableScale({ pressedScale = 0.97, haptics = false, onPressIn, onPressOut, style, disabled, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        scale.set(withSpring(pressedScale, motion.springPress));
        if (haptics) haptic.light();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, motion.springWater));
        onPressOut?.(e);
      }}
      style={[animatedStyle, typeof style === "function" ? undefined : style]}
      {...rest}
    />
  );
}
