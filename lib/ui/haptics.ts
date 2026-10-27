import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Gentle haptics, Airbnb-style: a light tick on taps that change state
 * (save, select a date), a soft success on a sent request. No-ops on web
 * and swallow any device that can't vibrate.
 */
export const haptic = {
  light() {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  select() {
    if (Platform.OS === "web") return;
    Haptics.selectionAsync().catch(() => {});
  },
  success() {
    if (Platform.OS === "web") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
