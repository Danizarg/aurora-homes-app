import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../constants/theme";
import { Card } from "../components/ui/Card";
import { ScreenHeader } from "../components/ui/ScreenHeader";

const sections: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: "person-circle-outline", title: "Owner verification", body: "Owners can verify their identity so renters and buyers know who they are dealing with. Verified owners display an 'Owner verified' badge on their listings." },
  { icon: "home-outline", title: "Property verification", body: "Properties can be verified through submitted proof of ownership or listing authorization, reviewed periodically to keep listings accurate." },
  { icon: "document-text-outline", title: "Proof of ownership", body: "Owners may be asked to provide a deed, utility bill, or signed authorization confirming they have the right to list the property." },
  { icon: "videocam-outline", title: "Video walkthrough", body: "For an extra layer of trust, owners can optionally record a short video walkthrough confirming the property matches its listing." },
  { icon: "time-outline", title: "Last verified date", body: "Every verified listing shows the date it was last checked, so buyers and renters know how current the information is." },
  { icon: "flag-outline", title: "Report a listing", body: "Any user can report a listing that looks fake, outdated, or misleading. Reports are reviewed and acted on promptly." },
];

export default function TrustScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader leading="back" border={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How verification works</Text>
        <Text style={styles.subtitle}>Every verified home on Zouza is checked against ownership documents and re-checked over time.</Text>

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
          <Text style={styles.rowTitle}>No guarantee disclaimer</Text>
          <Text style={styles.rowBody}>
            Verification improves confidence but is not a guarantee. Zouza does not guarantee tenants, buyers,
            contracts, rent payments, or legal outcomes. Always exercise your own diligence before transacting.
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
