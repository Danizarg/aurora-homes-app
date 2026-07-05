import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { PropertyAgentPanel } from "../../components/ai/PropertyAgentPanel";
import { getListingById } from "../../lib/mock/listings";
import { mockReviews } from "../../lib/mock/messages";
import { toggleSavedListing } from "../../lib/mock/storage";

const screenWidth = Dimensions.get("window").width;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = getListingById(id);
  const [saved, setSaved] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  if (!listing) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Listing not found.</Text>
      </SafeAreaView>
    );
  }

  const isRental = listing.mode !== "buy";
  const reviews = mockReviews.filter((r) => r.listing_id === listing.id);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth))}
          >
            {listing.images.map((image) => (
              <Image key={image.id} source={{ uri: image.uri }} style={{ width: screenWidth, height: 280 }} />
            ))}
          </ScrollView>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.navy} />
          </Pressable>
          <View style={styles.galleryDots}>
            {listing.images.map((_, i) => (
              <View key={i} style={[styles.dot, i === galleryIndex && styles.dotActive]} />
            ))}
          </View>
        </View>

        <View style={styles.content}>
          <Badge label={listing.mode.toUpperCase()} tone="navy" />
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.location}>{listing.address_area}, {listing.city}, {listing.country}</Text>
          <Text style={styles.price}>
            {isRental ? `${listing.price_monthly?.toLocaleString("en-GB")} €/month` : `${listing.price_sale?.toLocaleString("en-GB")} €`}
          </Text>

          <Card style={styles.verificationCard}>
            <View style={styles.verificationRow}>
              <Ionicons name={listing.verified_owner ? "checkmark-circle" : "close-circle-outline"} size={18} color={listing.verified_owner ? colors.success : colors.muted} />
              <Text style={styles.verificationText}>Owner {listing.verified_owner ? "verified" : "not yet verified"}</Text>
            </View>
            <View style={styles.verificationRow}>
              <Ionicons name={listing.verified_property ? "checkmark-circle" : "close-circle-outline"} size={18} color={listing.verified_property ? colors.success : colors.muted} />
              <Text style={styles.verificationText}>Property {listing.verified_property ? "verified" : "not yet verified"}</Text>
            </View>
            {listing.last_verified_at ? (
              <Text style={styles.verificationMeta}>Last checked {listing.last_verified_at}</Text>
            ) : null}
          </Card>

          {isRental ? (
            <Card style={{ marginTop: spacing.lg }}>
              <Text style={styles.priceModuleTitle}>Real price breakdown</Text>
              <PriceRow label="Monthly rent" value={listing.price_monthly} />
              <PriceRow label="Utilities" value={listing.utilities_monthly} />
              <PriceRow label="Deposit" value={listing.deposit} />
              <PriceRow label="Platform fee" value={undefined} display={`${listing.platform_fee_percent}%`} />
              <View style={styles.priceDivider} />
              <PriceRow label="Total due at move-in" value={listing.total_move_in_cost} emphasize />
            </Card>
          ) : (
            <Card style={{ marginTop: spacing.lg }}>
              <Text style={styles.priceModuleTitle}>Purchase details</Text>
              <PriceRow label="Asking price" value={listing.price_sale} emphasize />
              <PriceRow label="Estimated purchase costs" value={undefined} display="10–13% (placeholder)" />
              <Text style={styles.verificationMeta}>This is a direct-owner listing. Aurora Homes does not process payments or provide legal advice.</Text>
            </Card>
          )}

          <SectionHeader title="Features" />
          <View style={styles.featuresGrid}>
            <Feature label={`${listing.bedrooms} bedrooms`} icon="bed-outline" />
            <Feature label={`${listing.bathrooms} bathrooms`} icon="water-outline" />
            <Feature label={`${listing.size_m2} m²`} icon="resize-outline" />
            {listing.pool && <Feature label="Pool" icon="water" />}
            {listing.sea_view && <Feature label="Sea view" icon="sunny-outline" />}
            {listing.garage && <Feature label="Garage" icon="car-outline" />}
            {listing.pets_allowed && <Feature label="Pets allowed" icon="paw-outline" />}
            {listing.furnished && <Feature label="Furnished" icon="bed" />}
          </View>

          <SectionHeader title="Description" />
          <Text style={styles.description}>{listing.description}</Text>

          {listing.available_from ? (
            <>
              <SectionHeader title="Availability" />
              <Text style={styles.description}>Available from {listing.available_from}{listing.minimum_stay ? ` · Minimum stay ${listing.minimum_stay}` : ""}</Text>
            </>
          ) : null}

          <View style={styles.actionsRow}>
            <Button label="Request viewing" style={{ flex: 1 }} onPress={() => router.push("/(tabs)/messages")} />
            <Button
              label={saved ? "Saved" : "Save"}
              variant="outline"
              style={{ marginLeft: spacing.sm }}
              onPress={async () => {
                await toggleSavedListing(listing.id);
                setSaved((s) => !s);
              }}
            />
          </View>
          <Button label="Contact owner" variant="secondary" style={{ marginTop: spacing.sm }} onPress={() => router.push("/(tabs)/messages")} />

          <SectionHeader title="Frequently asked questions" />
          {listing.faq.map((item) => (
            <Card key={item.question} style={{ marginBottom: spacing.sm }}>
              <Text style={styles.faqQ}>{item.question}</Text>
              <Text style={styles.faqA}>{item.answer}</Text>
            </Card>
          ))}

          <SectionHeader title="Ask the Property AI Agent" subtitle="Every Aurora Homes listing has its own assistant, trained on this property's data." />
          <PropertyAgentPanel listingTitle={listing.title} faq={listing.faq} />

          {reviews.length > 0 && (
            <>
              <SectionHeader title="Reviews" />
              {reviews.map((r) => (
                <Card key={r.id} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{r.author_name}</Text>
                    <Text style={styles.reviewRating}>{"★".repeat(r.rating)}</Text>
                  </View>
                  <Text style={styles.faqA}>{r.text}</Text>
                </Card>
              ))}
            </>
          )}

          <SectionHeader title="Contract template" subtitle="A standard template is available as a starting point. Aurora Homes does not provide legal advice — please review with a professional before signing." />
          <Card style={{ marginBottom: spacing.xl }}>
            <Text style={styles.faqA}>Contract template placeholder — available once a viewing is confirmed.</Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PriceRow({ label, value, display, emphasize }: { label: string; value?: number; display?: string; emphasize?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, emphasize && styles.priceLabelEmphasize]}>{label}</Text>
      <Text style={[styles.priceValue, emphasize && styles.priceValueEmphasize]}>
        {display ?? (value != null ? `${value.toLocaleString("en-GB")} €` : "—")}
      </Text>
    </View>
  );
}

function Feature({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={18} color={colors.gold} />
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  notFound: { padding: spacing.lg, ...typography.body, color: colors.navy },
  backButton: {
    position: "absolute", top: spacing.md, left: spacing.md, backgroundColor: colors.white,
    borderRadius: radius.pill, padding: spacing.sm,
  },
  galleryDots: { position: "absolute", bottom: spacing.sm, alignSelf: "center", flexDirection: "row" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.6)", marginHorizontal: 3 },
  dotActive: { backgroundColor: colors.white, width: 8, height: 8, borderRadius: 4 },
  content: { padding: spacing.lg },
  title: { ...typography.h1, color: colors.navy, marginTop: spacing.sm },
  location: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  price: { ...typography.h2, color: colors.gold, marginTop: spacing.sm },
  verificationCard: { marginTop: spacing.lg },
  verificationRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs, gap: spacing.xs },
  verificationText: { ...typography.small, color: colors.navy },
  verificationMeta: { ...typography.micro, color: colors.muted, marginTop: spacing.xs, textTransform: "none" },
  priceModuleTitle: { ...typography.h3, color: colors.navy, marginBottom: spacing.sm },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  priceLabel: { ...typography.small, color: colors.muted },
  priceLabelEmphasize: { color: colors.navy, fontWeight: "700" },
  priceValue: { ...typography.small, color: colors.navy },
  priceValueEmphasize: { ...typography.bodyMedium, color: colors.gold },
  priceDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap" },
  featureItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, marginRight: spacing.sm, marginBottom: spacing.sm, gap: spacing.xs,
  },
  featureLabel: { ...typography.small, color: colors.navy },
  description: { ...typography.body, color: colors.navy, lineHeight: 22 },
  actionsRow: { flexDirection: "row", marginTop: spacing.lg },
  faqQ: { ...typography.bodyMedium, color: colors.navy, marginBottom: spacing.xs },
  faqA: { ...typography.small, color: colors.muted },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs },
  reviewAuthor: { ...typography.bodyMedium, color: colors.navy },
  reviewRating: { color: colors.gold },
});
