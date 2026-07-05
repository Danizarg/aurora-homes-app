import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { getListingById } from "../../lib/mock/listings";

const quickPaths = [
  { key: "rent", title: "Rent", micro: "Mieten", icon: "home-outline" as const, route: "/(tabs)/search" },
  { key: "buy", title: "Buy", micro: "Kaufen", icon: "business-outline" as const, route: "/(tabs)/search" },
  { key: "sell", title: "Sell", micro: "Verkaufen", icon: "pricetag-outline" as const, route: "/sell" },
  { key: "rent_out", title: "Rent out", micro: "Vermieten", icon: "key-outline" as const, route: "/rent-out" },
];

const carouselIds = ["l6", "l7", "l8", "l3", "l2"];
const destinations = ["Marbella", "Sevilla", "Valencia", "Málaga", "Madrid", "Barcelona"];

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const carouselListings = carouselIds.map((id) => getListingById(id)).filter(Boolean);

  function handleSearchSubmit() {
    router.push({ pathname: "/(tabs)/search", params: query.trim() ? { q: query.trim() } : {} });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Find your next home.</Text>
          <Text style={styles.heroTitleAccent}>Powered by AI.</Text>
        </View>

        {/* Search prompt */}
        <Text style={styles.searchPrompt}>Where do you want to live?</Text>
        <Pressable style={styles.searchBar} onPress={() => router.push("/(tabs)/search")}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="City, area, or country"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
        </Pressable>

        {/* Visual carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
          contentContainerStyle={{ paddingRight: spacing.lg }}
        >
          {carouselListings.map((listing) => (
            <Pressable
              key={listing!.id}
              style={styles.carouselCard}
              onPress={() => router.push(`/listing/${listing!.id}`)}
            >
              <Image source={{ uri: listing!.images[0].uri }} style={styles.carouselImage} />
              <View style={styles.carouselOverlay}>
                <Text style={styles.carouselCity}>{listing!.city}</Text>
                <Text style={styles.carouselTitle} numberOfLines={1}>{listing!.title}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Simple company message */}
        <View style={styles.messageBlock}>
          <Text style={styles.messageTitle}>Find. Sell. Rent.</Text>
          <Text style={styles.messageSubtitle}>Everything else is done by AI.</Text>
        </View>

        {/* Four quick paths */}
        <View style={styles.actionsGrid}>
          {quickPaths.map((action) => (
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

        {/* AI feature explanation */}
        <Card style={styles.aiCard}>
          <Ionicons name="sparkles" size={22} color={colors.gold} />
          <Text style={styles.aiCardTitle}>Upload photos. Aurora creates the listing.</Text>
          <Text style={styles.aiCardBody}>
            Exposé, FAQ, translations, and a dedicated property assistant — generated automatically.
          </Text>
        </Card>

        {/* Owner upload CTA */}
        <Pressable style={styles.ownerCta} onPress={() => router.push("/(tabs)/ai")}>
          <Ionicons name="camera-outline" size={22} color={colors.white} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.ownerCtaTitle}>Add property</Text>
            <Text style={styles.ownerCtaMicro}>Immobilie hinzufügen</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </Pressable>

        {/* Property AI Agent demo */}
        <SectionHeader eyebrow="Every listing" title="A dedicated AI property agent" subtitle="Renters and buyers can ask questions 24/7 — availability, pets, price, viewings — answered instantly." />
        <Card style={{ marginBottom: spacing.xl }}>
          <View style={styles.chatBubbleThem}>
            <Text style={styles.chatText}>Is the property still available?</Text>
          </View>
          <View style={styles.chatBubbleMe}>
            <Text style={styles.chatTextMe}>Yes, available from 1 August. Would you like to request a viewing?</Text>
          </View>
        </Card>

        {/* Verified homes + price transparency */}
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

        {/* Spain-first destinations */}
        <SectionHeader eyebrow="Spain first" title="Popular destinations" />
        <View style={styles.destinationsRow}>
          {destinations.map((d) => (
            <Pressable key={d} style={styles.destinationChip} onPress={() => router.push({ pathname: "/(tabs)/search", params: { q: d } })}>
              <Text style={styles.destinationText}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.smallCardTitle}>Low-fee, transparent pricing</Text>
          <Text style={styles.smallCardBody}>
            Aurora Homes is built around a lower, transparent platform fee compared to traditional agencies.
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
  hero: { marginTop: spacing.sm, marginBottom: spacing.md },
  heroTitle: { ...typography.display, color: colors.navy },
  heroTitleAccent: { ...typography.display, color: colors.gold },
  searchPrompt: { ...typography.h3, color: colors.navy, marginBottom: spacing.sm },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.lg, ...shadow.soft,
  },
  searchInput: { ...typography.body, color: colors.navy, marginLeft: spacing.sm, flex: 1 },
  carousel: { marginBottom: spacing.xl, marginHorizontal: -spacing.lg, paddingLeft: spacing.lg },
  carouselCard: { width: 220, height: 260, borderRadius: radius.lg, overflow: "hidden", marginRight: spacing.md, backgroundColor: colors.sand },
  carouselImage: { width: "100%", height: "100%" },
  carouselOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md,
    backgroundColor: "rgba(27,36,48,0.55)",
  },
  carouselCity: { ...typography.micro, color: colors.goldSoft, textTransform: "uppercase" },
  carouselTitle: { ...typography.bodyMedium, color: colors.white, marginTop: 2 },
  messageBlock: { alignItems: "center", marginBottom: spacing.xl, paddingVertical: spacing.md },
  messageTitle: { ...typography.h1, color: colors.navy, textAlign: "center" },
  messageSubtitle: { ...typography.body, color: colors.gold, textAlign: "center", marginTop: spacing.xs, fontWeight: "600" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: spacing.xl },
  actionCard: {
    width: "48%", backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md, ...shadow.soft,
  },
  actionTitle: { ...typography.h3, color: colors.navy, marginTop: spacing.sm },
  actionMicro: { ...typography.small, color: colors.muted },
  aiCard: { marginBottom: spacing.lg },
  aiCardTitle: { ...typography.h3, color: colors.navy, marginTop: spacing.sm },
  aiCardBody: { ...typography.small, color: colors.muted, marginTop: spacing.xs },
  ownerCta: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.xl,
  },
  ownerCtaTitle: { ...typography.h3, color: colors.white },
  ownerCtaMicro: { ...typography.small, color: colors.goldSoft, marginTop: 2 },
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
  exampleLink: { ...typography.bodyMedium, color: colors.gold, marginTop: spacing.sm },
});
