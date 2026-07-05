import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../constants/theme";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const benefits = [
  { icon: "time-outline" as const, title: "Save time", body: "Publish a professional listing in minutes instead of days." },
  { icon: "ribbon-outline" as const, title: "Look professional", body: "Agency-quality exposés without hiring an agency." },
  { icon: "chatbubbles-outline" as const, title: "More qualified enquiries", body: "The AI assistant pre-qualifies leads before they reach you." },
  { icon: "cash-outline" as const, title: "Lower agent costs", body: "A transparent, lower platform fee compared to traditional agents." },
  { icon: "leaf-outline" as const, title: "Less stress", body: "Aurora handles the writing, FAQ, and translations for you." },
  { icon: "happy-outline" as const, title: "Simple enough for anyone", body: "Designed so a first-time owner can publish confidently — no technical skill needed." },
];

export default function RentOutScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Rent out your property professionally in minutes.</Text>
        <Text style={styles.subtitle}>Upload photos. Aurora creates the listing, exposé, FAQ, translations, and AI assistant.</Text>

        <Button label="Start with photos" size="lg" style={{ marginVertical: spacing.lg }} onPress={() => router.push({ pathname: "/create-listing", params: { intent: "rent_out" } })} />

        {benefits.map((b) => (
          <Card key={b.title} style={styles.benefitCard}>
            <Ionicons name={b.icon} size={22} color={colors.gold} />
            <Text style={styles.benefitTitle}>{b.title}</Text>
            <Text style={styles.benefitBody}>{b.body}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.display, color: colors.navy },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.md },
  benefitCard: { marginBottom: spacing.md },
  benefitTitle: { ...typography.h3, color: colors.navy, marginTop: spacing.sm },
  benefitBody: { ...typography.small, color: colors.muted, marginTop: spacing.xs },
});
