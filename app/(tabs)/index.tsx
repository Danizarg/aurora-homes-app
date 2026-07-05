import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { mockListings } from "../../lib/mock/listings";

const actionCards = [
  { key: "rent_out", title: "Rent out", micro: "Vermieten", icon: "key-outline" as const, route: "/rent-out" },
  { key: "sell", title: "Sell", micro: "Verkaufen", icon: "pricetag-outline" as const, route: "/sell" },
  { key: "rent", title: "Rent", micro: "Mieten", icon: "home-outline" as const, route: "/(tabs)/search" },
  { key: "buy", title: "Buy", micro: "Kaufen", icon: "business-outline" as const, route: "/(tabs)/search" },
];

const processSteps = [
  "Upload photos",
  "Aurora analyses the property",
  "Exposé is generated",
  "FAQ is created",
  "Listing is published",
  "Property AI assistant is created",
];

const destinations = ["Marbella", "Sevilla", "Valencia", "Málaga", "Madrid", "Barcelona"];

export default function HomeScreen() {
  const exampleListing = mockListings[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Badge label="AI-Powered Marketing" tone="gold" />
          <Text style={styles.heroTitle}>Professional Property Marketing. Powered by AI.</Text>
          <Text style={styles.heroSubtitle}>Upload photos. Aurora creates the listing.</Text>
          <View style={styles.heroActions}>
            <Button label="Upload photos" onPress={() => router.push("/(tabs)/create")} size="lg" />
            <Button
              label="Explore homes"
              variant="outline"
              onPress={() => router.push("/(tabs)/search")}
              size="lg"
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>

        <View style={styles.actionsGrid}>
          {actionCards.map((action) => (
            <Pressable
              key={action.key}
              style={styles.actionCard}
              onPress={() => router.push(action.route as never)}
            >
              <Ionicons name={action.icon} size={22} color={colors.gold} />
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionMicro}>{action.micro}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader
          eyebrow="How it works"
          title="From photos to a live listing in 5 minutes"
        />
        <Card style={{ marginBottom: spacing.xl }}>
          {processSteps.map((step, i) => (
            <View key={step} style={[styles.stepRow, i === processSteps.length - 1 && { marginBottom: 0 }]}>
              <View style={styles.stepIndex}>
                <Text style={styles.stepIndexText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Card>

        <SectionHeader eyebrow="Example" title="AI-generated listing" />
        <Card style={{ marginBottom: spacing.xl }}>
          <Image source={{ uri: exampleListing.images[0].uri }} style={styles.exampleImage} />
          <Text style={styles.exampleTitle}>{exampleListing.title}</Text>
          <Text style={styles.exampleSummary} numberOfLines={2}>{exampleListing.description}</Text>
          <Pressable onPress={() => router.push(`/listing/${exampleListing.id}`)}>
            <Text style={styles.exampleLink}>View full listing →</Text>
          </Pressable>
        </Card>

        <SectionHeader eyebrow="Every listing" title="A dedicated AI property agent" subtitle="Renters and buyers can ask questions 24/7 — availability, pets, price, viewings — answered instantly from the listing's own data." />
        <Card style={{ marginBottom: spacing.xl }}>
          <View style={styles.chatBubbleThem}>
            <Text style={styles.chatText}>Is the property still available?</Text>
          </View>
          <View style={styles.chatBubbleMe}>
            <Text style={styles.chatTextMe}>Yes, available from 1 August. Would you like to request a viewing?</Text>
          </View>
        </Card>

        <View style={styles.twoCol}>
          <Card style={styles.halfCard}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.gold} />
            <Text style={styles.smallCardTitle}>Verified homes</Text>
            <Text style={styles.smallCardBody}>Owner and property verification, checked on an ongoing basis.</Text>
          </Card>
          <Card style={styles.halfCard}>
            <Ionicons name="cash-outline" size={22} color={colors.gold} />
            <Text style={styles.smallCardTitle}>Real price transparency</Text>
            <Text style={styles.smallCardBody}>Rent, utilities, deposit, and fees shown clearly — no hidden costs.</Text>
          </Card>
        </View>

        <SectionHeader eyebrow="Spain first" title="Popular destinations" />
        <View style={styles.destinationsRow}>
          {destinations.map((d) => (
            <Pressable key={d} style={styles.destinationChip} onPress={() => router.push("/(tabs)/search")}>
              <Text style={styles.destinationText}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.twoCol}>
          <Card style={styles.halfCard}>
            <Text style={styles.smallCardTitle}>For owners</Text>
            <Text style={styles.smallCardBody}>Save time, look professional, receive more qualified enquiries, and reduce agent costs.</Text>
          </Card>
          <Card style={styles.halfCard}>
            <Text style={styles.smallCardTitle}>For renters & buyers</Text>
            <Text style={styles.smallCardBody}>Verified homes, clear pricing, direct owner contact, and a 24/7 property assistant.</Text>
          </Card>
        </View>

        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.smallCardTitle}>Low-fee, transparent pricing</Text>
          <Text style={styles.smallCardBody}>
            Aurora Homes is built around a lower, transparent platform fee compared to traditional agencies — see the full breakdown on the Pricing page.
          </Text>
          <Pressable onPress={() => router.push("/pricing")}>
            <Text style={styles.exampleLink}>See pricing →</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: { marginBottom: spacing.xl, marginTop: spacing.sm },
  heroTitle: { ...typography.display, color: colors.navy, marginTop: spacing.md },
  heroSubtitle: { ...typography.body, color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.lg },
  heroActions: { marginTop: spacing.xs },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: spacing.xl },
  actionCard: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  actionTitle: { ...typography.h3, color: colors.navy, marginTop: spacing.sm },
  actionMicro: { ...typography.small, color: colors.muted },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  stepIndex: {
    width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.sand,
    alignItems: "center", justifyContent: "center", marginRight: spacing.sm,
  },
  stepIndexText: { ...typography.small, color: colors.gold, fontWeight: "700" },
  stepText: { ...typography.body, color: colors.navy, flex: 1 },
  exampleImage: { width: "100%", height: 160, borderRadius: radius.md, marginBottom: spacing.md, backgroundColor: colors.sand },
  exampleTitle: { ...typography.h3, color: colors.navy },
  exampleSummary: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  exampleLink: { ...typography.bodyMedium, color: colors.gold, marginTop: spacing.sm },
  chatBubbleThem: { backgroundColor: colors.ivoryDeep, borderRadius: radius.md, padding: spacing.sm, alignSelf: "flex-start", marginBottom: spacing.sm, maxWidth: "85%" },
  chatBubbleMe: { backgroundColor: colors.navy, borderRadius: radius.md, padding: spacing.sm, alignSelf: "flex-end", maxWidth: "85%" },
  chatText: { ...typography.small, color: colors.navy },
  chatTextMe: { ...typography.small, color: colors.white },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xl },
  halfCard: { width: "48%" },
  smallCardTitle: { ...typography.h3, color: colors.navy, marginTop: spacing.sm },
  smallCardBody: { ...typography.small, color: colors.muted, marginTop: spacing.xs },
  destinationsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.xl },
  destinationChip: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingVertical: spacing.sm - 2, paddingHorizontal: spacing.md,
    marginRight: spacing.sm, marginBottom: spacing.sm,
  },
  destinationText: { ...typography.small, color: colors.navy, fontWeight: "600" },
});
