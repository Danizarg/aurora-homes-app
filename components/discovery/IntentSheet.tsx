import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { PressableScale } from "../ui/PressableScale";
import { useDiscovery } from "../../lib/store/discovery";
import { haptic } from "../../lib/ui/haptics";
import type { Intent } from "../../types/search";

const choices: { intent: Intent; title: string; body: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { intent: "buy", title: "Buy a property", body: "Homes for sale, direct from owners", icon: "key-outline" },
  { intent: "rent", title: "Rent a property", body: "Long-term and seasonal rentals", icon: "home-outline" },
  { intent: "stay", title: "Find a short stay", body: "Weeks or months, furnished", icon: "bed-outline" },
  { intent: "list", title: "Sell or rent out mine", body: "Suza writes the listing from your photos", icon: "camera-outline" },
];

interface IntentSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** The compact intent selector behind the chip in the search bar (the full version lives in onboarding). */
export function IntentSheet({ visible, onClose }: IntentSheetProps) {
  const intent = useDiscovery((s) => s.intent);
  const setIntent = useDiscovery((s) => s.setIntent);
  const setCriteria = useDiscovery((s) => s.setCriteria);

  function choose(next: Intent) {
    haptic.select();
    if (next === "list") {
      // Straight into the AI listing builder; it asks sell / rent out itself when the purpose isn't known yet.
      onClose();
      router.push({ pathname: "/create-listing", params: { from: "intent" } });
      return;
    }
    setIntent(next);
    setCriteria({ intent: next });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>What are you here to do?</Text>
          {choices.map((c) => (
            <PressableScale key={c.intent} pressedScale={0.98} onPress={() => choose(c.intent)} style={[styles.row, intent === c.intent && styles.rowActive]}>
              <View style={styles.iconWrap}><Ionicons name={c.icon} size={22} color={colors.text} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{c.title}</Text>
                <Text style={styles.rowBody}>{c.body}</Text>
              </View>
              {intent === c.intent ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
            </PressableScale>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, ...shadow.card },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  rowActive: { backgroundColor: colors.bgSecondary },
  iconWrap: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center" },
  rowTitle: { ...typography.bodyBold, color: colors.text },
  rowBody: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
});
