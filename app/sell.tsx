import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../constants/theme";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const steps = [
  { icon: "camera-outline" as const, title: "Upload photos", body: "Add photos of the property — interior, exterior, and standout features." },
  { icon: "document-text-outline" as const, title: "Generate sales exposé", body: "Aurora writes a professional exposé built to attract serious buyers." },
  { icon: "help-circle-outline" as const, title: "Generate buyer FAQ", body: "Common buyer questions answered upfront, reducing back-and-forth." },
  { icon: "albums-outline" as const, title: "Prepare listing", body: "Your listing is formatted and ready to publish across Aurora Homes." },
  { icon: "calendar-outline" as const, title: "Request viewings", body: "Buyers can request a viewing directly from the listing." },
  { icon: "person-outline" as const, title: "Direct owner contact", body: "Buyers reach you directly — no middleman required." },
  { icon: "shield-checkmark-outline" as const, title: "Verification badge", body: "Optional owner and property verification builds buyer trust." },
];

export default function SellScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Sell your property with agency-level presentation, without the agency process.</Text>

        <Button label="Start with photos" size="lg" style={{ marginVertical: spacing.lg }} onPress={() => router.push({ pathname: "/create-listing", params: { intent: "sell" } })} />

        {steps.map((s) => (
          <Card key={s.title} style={styles.stepCard}>
            <Ionicons name={s.icon} size={22} color={colors.gold} />
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepBody}>{s.body}</Text>
          </Card>
        ))}

        <Card style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Legal disclaimer</Text>
          <Text style={styles.disclaimerBody}>
            Aurora Homes does not provide legal advice, payment processing, escrow, or contract negotiation. All
            sales are conducted directly between the owner and buyer; please engage a licensed professional for
            legal and tax matters.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.display, color: colors.navy },
  stepCard: { marginBottom: spacing.md },
  stepTitle: { ...typography.h3, color: colors.navy, marginTop: spacing.sm },
  stepBody: { ...typography.small, color: colors.muted, marginTop: spacing.xs },
  disclaimerCard: { marginTop: spacing.md, backgroundColor: colors.ivoryDeep },
  disclaimerTitle: { ...typography.bodyMedium, color: colors.navy, marginBottom: spacing.xs },
  disclaimerBody: { ...typography.small, color: colors.muted },
});
