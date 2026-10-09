import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { PropertyAgentPanel } from "../../components/ai/PropertyAgentPanel";
import { mockListings } from "../../lib/mock/listings";

export default function AiHubScreen() {
  const exampleListing = mockListings[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="sparkles" size={28} color={colors.gold} />
          <Text style={styles.heroTitle}>Aurora turns photos into a professional listing.</Text>
          <Text style={styles.heroSubtitle}>
            Exposé, FAQ, translations, and a dedicated property assistant — built automatically from what you upload.
          </Text>
          <Button
            label="Upload photos"
            size="lg"
            style={{ marginTop: spacing.lg }}
            onPress={() => router.push("/create-listing")}
          />
          <Text style={styles.microLabel}>Immobilie hinzufügen</Text>
        </View>

        <SectionHeader eyebrow="How it works" title="The AI Listing Builder" />
        <Card style={{ marginBottom: spacing.xl }}>
          <BuilderStep icon="camera-outline" title="1. Add photos" body="Upload a handful of photos — interior, exterior, key rooms." />
          <BuilderStep icon="location-outline" title="2. Add address" body="Just the city or area. That's it." />
          <BuilderStep icon="pricetag-outline" title="3. Add price (optional)" body="Set a price now, or let Aurora suggest one later." />
          <BuilderStep icon="chatbubbles-outline" title="4. Chat with Aurora" body="Aurora tells you what it already sees, then asks only what it can't detect." last />
        </Card>

        <SectionHeader eyebrow="Example" title="A listing Aurora generated" />
        <Card style={{ marginBottom: spacing.xl }}>
          <Image source={{ uri: exampleListing.images[0].uri }} style={styles.exampleImage} />
          <Text style={styles.exampleTitle}>{exampleListing.title}</Text>
          <Text style={styles.exampleSummary} numberOfLines={2}>{exampleListing.description}</Text>
          <Pressable onPress={() => router.push(`/listing/${exampleListing.id}`)}>
            <Text style={styles.exampleLink}>View full listing →</Text>
          </Pressable>
        </Card>

        <SectionHeader eyebrow="Every listing" title="Try the Property AI Agent" subtitle="This is the same assistant renters and buyers chat with on a live listing." />
        <PropertyAgentPanel listingTitle={exampleListing.title} faq={exampleListing.faq} />

        <Card style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
          <Text style={styles.disclaimerTitle}>What Aurora does not do</Text>
          <Text style={styles.disclaimerBody}>
            Aurora Homes does not process payments, hold deposits, collect rent, or provide legal or tax advice. It
            handles marketing and communication — the agreement is always direct between owner and tenant or buyer.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function BuilderStep({
  icon,
  title,
  body,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.stepRow, last ? { marginBottom: 0 } : null]}>
      <Ionicons name={icon} size={20} color={colors.gold} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    alignItems: "center", backgroundColor: colors.white, borderRadius: radius.xl,
    padding: spacing.xl, marginBottom: spacing.xl, ...shadow.card,
  },
  heroTitle: { ...typography.h1, color: colors.navy, textAlign: "center", marginTop: spacing.md },
  heroSubtitle: { ...typography.body, color: colors.muted, textAlign: "center", marginTop: spacing.sm },
  microLabel: { ...typography.small, color: colors.gold, marginTop: spacing.sm, fontWeight: "600" },
  stepRow: { flexDirection: "row", marginBottom: spacing.lg },
  stepTitle: { ...typography.bodyMedium, color: colors.navy },
  stepBody: { ...typography.small, color: colors.muted, marginTop: 2 },
  exampleImage: { width: "100%", height: 180, borderRadius: radius.lg, marginBottom: spacing.md, backgroundColor: colors.sand },
  exampleTitle: { ...typography.h3, color: colors.navy },
  exampleSummary: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  exampleLink: { ...typography.bodyMedium, color: colors.gold, marginTop: spacing.sm },
  disclaimerTitle: { ...typography.bodyMedium, color: colors.navy, marginBottom: spacing.xs },
  disclaimerBody: { ...typography.small, color: colors.muted },
});
