import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../constants/theme";
import { Card } from "../components/ui/Card";
import { ScreenHeader } from "../components/ui/ScreenHeader";

// Only what is true today. Zouza has no ownership checks yet, so this page
// describes how Zouza works and what to check yourself, not a verification
// process. When verification exists, it can come back here.
const sections: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: "people-outline", title: "Zouza is a go-between", body: "Agreements, rent, deposits and purchase payments are made directly between you and the owner, outside Zouza. Zouza isn't a party to them and never holds your money." },
  { icon: "home-outline", title: "Listings come from owners", body: "Owners provide the facts and photos, and Zouza helps write the listing from them. Check the details that matter to you, and ask the owner about anything that's missing." },
  { icon: "chatbubble-ellipses-outline", title: "Answers can be wrong", body: "Zouza's answers about a home come from what the owner provided. They can be incomplete or, occasionally, incorrect, so confirm anything important with the owner." },
  { icon: "key-outline", title: "Before you pay anything", body: "See the home in person or on a live video call, ask for proof that the owner can rent or sell it, and never send a deposit to someone you haven't checked." },
  { icon: "flag-outline", title: "Something looks wrong?", body: "If a listing seems fake or misleading, tell us through Contact Zouza in your profile." },
];

export default function TrustScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader leading="back" border={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Staying safe on Zouza</Text>
        <Text style={styles.subtitle}>How Zouza works, and what to check before you commit to a home.</Text>

        {sections.map((s, i) => (
          <View key={s.title} style={[styles.row, i === sections.length - 1 && { borderBottomWidth: 0 }]}>
            <Ionicons name={s.icon} size={26} color={colors.text} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{s.title}</Text>
              <Text style={styles.rowBody}>{s.body}</Text>
            </View>
          </View>
        ))}

        <Card variant="flat" style={{ marginTop: spacing.lg }}>
          <Text style={styles.rowTitle}>No guarantees</Text>
          <Text style={styles.rowBody}>
            Zouza doesn’t guarantee tenants, buyers, contracts, rent payments or legal outcomes. Always do your own
            checks before you commit.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowTitle: { ...typography.bodyBold, color: colors.text },
  rowBody: { ...typography.small, lineHeight: 20, color: colors.textSecondary, marginTop: spacing.xs },
});
