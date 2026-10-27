import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Haptics with intent, Airbnb-style:
 * - select: the faintest tick, for choosing among options (chips, tabs, days)
 * - light:  a soft tap, for pressing a button
 * - medium: a clear thump, for saving a heart or confirming something
 * - success / warning: system notification patterns for sent requests and errors
 * No-ops on web; any device that can't vibrate is ignored.
 */
export const haptic = {
  select() {
    if (Platform.OS === "web") return;
    Haptics.selectionAsync().catch(() => {});
  },
  light() {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  heavy() {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  success() {
    if (Platform.OS === "web") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning() {
    if (Platform.OS === "web") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
