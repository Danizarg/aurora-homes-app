import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../constants/theme";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";

const sections = [
  {
    title: "Owner verification",
    body: "Owners can verify their identity so renters and buyers know who they are dealing with. Verified owners display an 'Owner verified' badge on their listings.",
  },
  {
    title: "Property verification",
    body: "Properties can be verified through submitted proof of ownership or listing authorization, reviewed periodically to keep listings accurate.",
  },
  {
    title: "Proof of ownership / listing authorization",
    body: "Owners may be asked to provide a deed, utility bill, or signed authorization confirming they have the right to list the property.",
  },
  {
    title: "Video proof concept",
    body: "For an extra layer of trust, owners can optionally record a short video walkthrough confirming the property matches its listing.",
  },
  {
    title: "Last verified date",
    body: "Every verified listing shows the date it was last checked, so buyers and renters know how current the information is.",
  },
  {
    title: "Anti-fake-listing reporting",
    body: "Any user can report a listing that looks fake, outdated, or misleading. Reports are reviewed and acted on promptly.",
  },
];

export default function TrustScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <SectionHeader eyebrow="Trust & safety" title="How Aurora Homes verification works" />

        {sections.map((s) => (
          <Card key={s.title} style={{ marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardBody}>{s.body}</Text>
          </Card>
        ))}

        <Card style={styles.disclaimer}>
          <Text style={styles.cardTitle}>No guarantee disclaimer</Text>
          <Text style={styles.cardBody}>
            Verification improves confidence but is not a guarantee. Aurora Homes does not guarantee tenants, buyers,
            contracts, rent payments, or legal outcomes. Always exercise your own diligence before transacting.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  cardTitle: { ...typography.h3, color: colors.navy, marginBottom: spacing.xs },
  cardBody: { ...typography.small, color: colors.muted },
  disclaimer: { backgroundColor: colors.ivoryDeep },
});
