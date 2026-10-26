import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Divider } from "../../components/ui/Divider";
import { ListingCard } from "../../components/listings/ListingCard";
import { PropertyAgentPanel } from "../../components/ai/PropertyAgentPanel";
import { mockListings } from "../../lib/mock/listings";

const steps = [
  { title: "Add photos", body: "Upload a handful of photos — interior, exterior, key rooms." },
  { title: "Add the address", body: "Just the city or area. That's it." },
  { title: "Add a price (optional)", body: "Set a price now, or let Aurora suggest one later." },
  { title: "Chat with Aurora", body: "Aurora tells you what it already sees, then asks only what it can't detect." },
];

/** Center tab, Airbnb "Trips"-style page: large title, hero card with image and gradient CTA, numbered steps. */
export default function AiHubScreen() {
  const exampleListing = mockListings[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Aurora AI</Text>

        <View style={styles.hero}>
          <Image source={{ uri: "https://picsum.photos/seed/aurora-ai-hero/800/520" }} style={styles.heroImage} />
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>Upload photos. Aurora creates the listing.</Text>
            <Text style={styles.heroText}>
              Exposé, FAQ, translations and a dedicated property assistant — built automatically from what you upload.
            </Text>
            <Button label="Upload photos" icon="camera-outline" style={{ marginTop: spacing.lg }} onPress={() => router.push("/create-listing")} />
          </View>
        </View>

        <Divider />

        <Text style={styles.sectionTitle}>It's easy to get started</Text>
        {steps.map((s, i) => (
          <View key={s.title} style={[styles.step, i === steps.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={styles.stepNumber}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepBody}>{s.body}</Text>
            </View>
          </View>
        ))}

        <Divider />

        <Text style={styles.sectionTitle}>A listing Aurora generated</Text>
        <ListingCard listing={exampleListing} />

        <Divider gap={spacing.sm} />

        <Text style={styles.sectionTitle}>Try the property AI agent</Text>
        <Text style={styles.sectionBody}>This is the same assistant renters and buyers chat with on a live listing.</Text>
        <PropertyAgentPanel listingTitle={exampleListing.title} faq={exampleListing.faq} />

        <Card variant="flat" style={{ marginTop: spacing.xl }}>
          <View style={styles.noteRow}>
            <Ionicons name="information-circle-outline" size={22} color={colors.text} />
            <Text style={styles.noteTitle}>What Aurora does not do</Text>
          </View>
          <Text style={styles.noteBody}>
            Aurora Homes does not process payments, hold deposits, collect rent, or provide legal or tax advice. It handles
            marketing and communication — the agreement is always direct between owner and tenant or buyer.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  title: { ...typography.display, color: colors.text, marginBottom: spacing.lg },
  hero: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: "hidden", ...shadow.card },
  heroImage: { width: "100%", height: 200, backgroundColor: colors.bgSecondary },
  heroBody: { padding: spacing.lg },
  heroTitle: { ...typography.h2, color: colors.text },
  heroText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  sectionBody: { ...typography.body, color: colors.textSecondary, marginTop: -spacing.sm, marginBottom: spacing.md },
  step: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  stepNumber: { ...typography.h3, color: colors.text, width: 24 },
  stepTitle: { ...typography.bodyBold, color: colors.text },
  stepBody: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  noteTitle: { ...typography.bodyBold, color: colors.text },
  noteBody: { ...typography.small, color: colors.textSecondary },
});
