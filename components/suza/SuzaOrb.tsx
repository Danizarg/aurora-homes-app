import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { brand, colors, shadow } from "../../constants/theme";
import { ZMark } from "../brand/ZMark";
import { PressableScale } from "../ui/PressableScale";
import type { SuzaState } from "../../lib/suza/useSuza";

interface SuzaOrbProps {
  state: SuzaState;
  onPress: () => void;
  size?: number;
}

/**
 * The persistent assistant control: a soft gradient orb with the Z mark.
 * Idle breathes slowly; listening pulses a ring outward; thinking shimmers;
 * speaking pulses in time, quick and gentle.
 */
export function SuzaOrb({ state, onPress, size = 60 }: SuzaOrbProps) {
  const breathe = useSharedValue(1);
  const ring = useSharedValue(0);

  useEffect(() => {
    if (state === "listening") {
      breathe.set(withRepeat(withSequence(withTiming(1.06, { duration: 500 }), withTiming(1, { duration: 500 })), -1));
      ring.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, false));
    } else if (state === "speaking") {
      breathe.set(withRepeat(withSequence(withTiming(1.1, { duration: 260 }), withTiming(0.96, { duration: 260 })), -1));
      ring.set(withTiming(0, { duration: 200 }));
    } else if (state === "thinking") {
      breathe.set(withRepeat(withSequence(withTiming(0.94, { duration: 400 }), withTiming(1.02, { duration: 400 })), -1));
      ring.set(withTiming(0, { duration: 200 }));
    } else {
      breathe.set(withRepeat(withSequence(withTiming(1.03, { duration: 1800, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) })), -1));
      ring.set(withTiming(0, { duration: 300 }));
    }
  }, [state, breathe, ring]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.get() === 0 ? 0 : 0.5 * (1 - ring.get()),
    transform: [{ scale: 1 + ring.get() * 0.9 }],
  }));

  return (
    <View style={[styles.wrap, { width: size * 2, height: size * 2 }]} pointerEvents="box-none">
      <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, ringStyle]} />
      <PressableScale pressedScale={0.92} haptics onPress={onPress} style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: "hidden" }, orbStyle]}>
          <LinearGradient colors={[...brand.gradient]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.sheen} />
        </Animated.View>
        <ZMark size={size * 0.42} color={colors.white} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", backgroundColor: brand.primary },
  orb: { alignItems: "center", justifyContent: "center", ...shadow.card, shadowColor: brand.primary, shadowOpacity: 0.35 },
  sheen: { position: "absolute", top: -10, left: -10, width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.22)" },
});
