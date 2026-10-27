import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, motion, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { Divider } from "../../components/ui/Divider";
import { Avatar } from "../../components/ui/Avatar";
import { IconButton } from "../../components/ui/IconButton";
import { PropertyAgentPanel } from "../../components/ai/PropertyAgentPanel";
import { ListingMap } from "../../components/map/ListingMap";
import { NearbyPlaces } from "../../components/map/NearbyPlaces";
import { TravelSection } from "../../components/map/TravelSection";
import { BookingSheet } from "../../components/booking/BookingSheet";
import { coordsFor } from "../../lib/geo/cities";
import { openUrl, showOnMapUrl } from "../../lib/geo/travel";
import type { NearbyPlace } from "../../lib/geo/places";
import { bookingCopy, bookingKindFor } from "../../lib/booking/dates";
import { getListingById } from "../../lib/mock/listings";
import { mockReviews } from "../../lib/mock/reviews";
import { getSavedListingIds, startConversation, toggleSavedListing } from "../../lib/mock/storage";
import {
  formatDate,
  formatMoney,
  formatRating,
  isGuestFavourite,
  isSale,
  priceParts,
  propertyTypeLabel,
  reviewCountFor,
  specsLine,
} from "../../lib/listings/presentation";
import type { Listing } from "../../types";

type Amenity = { icon: keyof typeof Ionicons.glyphMap; label: string };

function amenitiesFor(listing: Listing): Amenity[] {
  const list: Amenity[] = [
    { icon: "bed-outline", label: `${listing.bedrooms} ${listing.bedrooms === 1 ? "bedroom" : "bedrooms"}` },
    { icon: "water-outline", label: `${listing.bathrooms} ${listing.bathrooms === 1 ? "bathroom" : "bathrooms"}` },
    { icon: "resize-outline", label: `${listing.size_m2} m² living space` },
    { icon: "wifi-outline", label: "Wifi" },
    { icon: "snow-outline", label: "Air conditioning" },
  ];
  if (listing.pool) list.push({ icon: "water", label: "Pool" });
  if (listing.sea_view) list.push({ icon: "sunny-outline", label: "Sea view" });
  if (listing.garage) list.push({ icon: "car-outline", label: "Free parking on premises" });
  if (listing.pets_allowed) list.push({ icon: "paw-outline", label: "Pets allowed" });
  if (listing.furnished) list.push({ icon: "cube-outline", label: "Fully furnished" });
  list.push({ icon: "tv-outline", label: "TV" }, { icon: "restaurant-outline", label: "Kitchen" });
  return list;
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = getListingById(id);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [allAmenities, setAllAmenities] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const onPlaces = useCallback((places: NearbyPlace[]) => setNearby(places.slice(0, 12)), []);
  const center = useMemo(() => (listing ? coordsFor(listing) : null), [listing]);

  useFocusEffect(
    useCallback(() => {
      if (id) getSavedListingIds().then((ids) => setSaved(ids.includes(id)));
    }, [id])
  );

  if (!listing) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Listing not found.</Text>
      </SafeAreaView>
    );
  }

  const sale = isSale(listing);
  const reviews = mockReviews.filter((r) => r.listing_id === listing.id);
  const rating = formatRating(listing);
  const reviewCount = reviews.length || reviewCountFor(listing);
  const favourite = isGuestFavourite(listing);
  const amenities = amenitiesFor(listing);
  const visibleAmenities = allAmenities ? amenities : amenities.slice(0, 6);
  const { amount, unit } = priceParts(listing);
  const galleryHeight = Math.round(width * 0.92);
  const kind = bookingKindFor(listing);
  const areaLabel = `${listing.address_area}, ${listing.city}`;

  async function messageOwner() {
    const conversation = await startConversation(listing!, `Hi! I’m interested in ${listing!.title}. Is it still available?`);
    router.push(`/messages/${conversation.id}`);
  }

  async function toggleSave() {
    const ids = await toggleSavedListing(listing!.id);
    setSaved(ids.includes(listing!.id));
  }

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Gallery */}
        <View style={{ height: galleryHeight }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {listing.images.map((image) => (
              <Image key={image.id} source={{ uri: image.uri }} style={{ width, height: galleryHeight }} contentFit="cover" transition={motion.image} />
            ))}
          </ScrollView>
          <View style={[styles.galleryControls, { top: insets.top + spacing.sm }]}>
            <IconButton icon="chevron-back" variant="overlay" onPress={() => router.back()} />
            <View style={styles.galleryRight}>
              <IconButton icon="share-outline" variant="overlay" />
              <IconButton icon={saved ? "heart" : "heart-outline"} variant="overlay" color={saved ? colors.primary : colors.text} onPress={toggleSave} />
            </View>
          </View>
          <View style={styles.galleryCounter}>
            <Text style={styles.galleryCounterText}>{galleryIndex + 1} / {listing.images.length}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.subtitle}>{propertyTypeLabel[listing.property_type]} in {listing.address_area}, {listing.city}, {listing.country}</Text>
          <Text style={styles.specs}>{specsLine(listing)}</Text>

          {favourite ? (
            <View style={styles.favouriteCard}>
              <View style={styles.favouriteCol}>
                <Text style={styles.favouriteTitle}>Guest</Text>
                <Text style={styles.favouriteTitle}>favourite</Text>
              </View>
              <View style={styles.favouriteDivider} />
              <View style={styles.favouriteCol}>
                <Text style={styles.favouriteBig}>{rating}</Text>
                <View style={styles.stars}>
                  {[0, 1, 2, 3, 4].map((i) => <Ionicons key={i} name="star" size={10} color={colors.text} />)}
                </View>
              </View>
              <View style={styles.favouriteDivider} />
              <View style={styles.favouriteCol}>
                <Text style={styles.favouriteBig}>{reviewCount}</Text>
                <Text style={styles.favouriteSmall}>Reviews</Text>
              </View>
            </View>
          ) : (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={colors.text} />
              <Text style={styles.ratingText}>{rating}</Text>
              <Text style={styles.ratingDot}>·</Text>
              <Text style={styles.ratingReviews}>{reviewCount} reviews</Text>
            </View>
          )}

          <Divider />

          {/* Host */}
          <View style={styles.hostRow}>
            <Avatar name="Owner" size={44} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.hostName}>Listed by the owner</Text>
              <Text style={styles.hostMeta}>
                {listing.verified_owner ? "Verified owner" : "Owner not yet verified"}
                {listing.last_verified_at ? ` · Checked ${listing.last_verified_at}` : ""}
              </Text>
            </View>
            {listing.verified_owner ? <Ionicons name="shield-checkmark" size={22} color={colors.primary} /> : null}
          </View>
          <Button label="Message owner" variant="outline" icon="chatbubble-outline" onPress={messageOwner} style={{ marginTop: spacing.md }} />

          <Divider />

          {/* Highlights */}
          <Highlight
            icon={listing.verified_property ? "shield-checkmark-outline" : "shield-outline"}
            title={listing.verified_property ? "Verified property" : "Verification pending"}
            body={listing.verified_property ? "Ownership documents were checked by Zouza." : "The owner has not completed property verification yet."}
          />
          <Highlight icon="chatbubbles-outline" title="Direct contact with the owner" body="No agency in between. Ask anything and request a viewing in the chat." />
          {listing.available_from ? (
            <Highlight icon="calendar-outline" title={`Available from ${formatDate(listing.available_from)}`} body={listing.minimum_stay ? `Minimum stay ${listing.minimum_stay}${listing.maximum_stay ? `, up to ${listing.maximum_stay}` : ""}.` : "Move in as soon as you are ready."} />
          ) : (
            <Highlight icon="key-outline" title="Direct-owner sale" body="Zouza does not process payments or give legal, tax or financial advice." />
          )}

          <Divider />

          {/* Description */}
          <Text style={styles.description} numberOfLines={descriptionExpanded ? undefined : 4}>{listing.description}</Text>
          <Pressable onPress={() => setDescriptionExpanded((v) => !v)} style={styles.showMore}>
            <Text style={styles.showMoreText}>{descriptionExpanded ? "Show less" : "Show more"}</Text>
            <Ionicons name={descriptionExpanded ? "chevron-up" : "chevron-forward"} size={16} color={colors.text} />
          </Pressable>

          <Divider />

          {/* Amenities */}
          <Text style={styles.sectionTitle}>What this place offers</Text>
          {visibleAmenities.map((a) => (
            <View key={a.label} style={styles.amenityRow}>
              <Ionicons name={a.icon} size={24} color={colors.text} />
              <Text style={styles.amenityLabel}>{a.label}</Text>
            </View>
          ))}
          {amenities.length > 6 ? (
            <Button
              label={allAmenities ? "Show fewer amenities" : `Show all ${amenities.length} amenities`}
              variant="outline"
              onPress={() => setAllAmenities((v) => !v)}
              style={{ marginTop: spacing.md }}
            />
          ) : null}

          <Divider />

          {/* Price details */}
          <Text style={styles.sectionTitle}>Price details</Text>
          {sale ? (
            <>
              <PriceRow label="Asking price" value={formatMoney(listing.price_sale ?? 0)} />
              <PriceRow label="Estimated purchase costs" value="10–13%" />
              <PriceRow label="Zouza fee" value="€0" />
              <View style={styles.priceTotalDivider} />
              <PriceRow label="Total (excl. purchase costs)" value={formatMoney(listing.price_sale ?? 0)} emphasize />
            </>
          ) : (
            <>
              <PriceRow label="Monthly rent" value={formatMoney(listing.price_monthly ?? 0)} />
              <PriceRow label="Utilities (est.)" value={listing.utilities_monthly != null ? formatMoney(listing.utilities_monthly) : "—"} />
              <PriceRow label="Deposit" value={listing.deposit != null ? formatMoney(listing.deposit) : "—"} />
              <PriceRow label="Zouza fee" value="€0" />
              <View style={styles.priceTotalDivider} />
              <PriceRow label="Total due at move-in" value={formatMoney((listing.price_monthly ?? 0) + (listing.utilities_monthly ?? 0) + (listing.deposit ?? 0))} emphasize />
              <Text style={styles.muted}>Every euro goes to the owner or comes back to you as the deposit.</Text>
            </>
          )}

          <Divider />

          {/* Where you’ll be */}
          <Text style={styles.sectionTitle}>Where you’ll be</Text>
          <Text style={[styles.muted, { marginBottom: spacing.md }]}>{areaLabel}, {listing.country}. The exact address is shared once a viewing or stay is confirmed.</Text>
          {center ? <ListingMap center={center} places={nearby} /> : null}
          <Pressable onPress={() => center && openUrl(showOnMapUrl(center, areaLabel))} style={styles.showMore}>
            <Text style={styles.showMoreText}>Open in Maps</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text} />
          </Pressable>
          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>What’s nearby</Text>
          {center ? <NearbyPlaces center={center} onPlaces={onPlaces} /> : null}

          <Divider />

          {/* How to get there */}
          <Text style={styles.sectionTitle}>How to get there</Text>
          {center ? <TravelSection destination={center} destinationLabel={areaLabel} /> : null}

          <Divider />

          {/* Reviews */}
          <View style={styles.reviewsHeader}>
            <Ionicons name="star" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>{rating} · {reviewCount} reviews</Text>
          </View>
          {reviews.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewsScroll} contentContainerStyle={{ paddingRight: spacing.lg }}>
              {reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.stars}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Ionicons key={i} name="star" size={11} color={i < r.rating ? colors.text : colors.border} />
                    ))}
                    <Text style={styles.reviewDate}> · {new Date(r.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</Text>
                  </View>
                  <Text style={styles.reviewText} numberOfLines={4}>{r.text}</Text>
                  <View style={styles.reviewAuthor}>
                    <Avatar name={r.author_name} size={36} />
                    <Text style={styles.reviewAuthorName}>{r.author_name}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.muted}>Reviews from verified viewings will appear here.</Text>
          )}

          <Divider />

          {/* FAQ */}
          <Text style={styles.sectionTitle}>Things to know</Text>
          {listing.faq.map((item, i) => (
            <View key={item.question} style={[styles.faqRow, i === listing.faq.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.faqQ}>{item.question}</Text>
              <Text style={styles.faqA}>{item.answer}</Text>
            </View>
          ))}

          <Divider />

          <Text style={styles.sectionTitle}>Ask Suzi</Text>
          <Text style={[styles.muted, { marginBottom: spacing.md }]}>Suzi knows this listing’s facts and answers instantly, any time.</Text>
          <PropertyAgentPanel listing={listing} />

          <Divider />

          <Text style={styles.muted}>
            A standard contract template becomes available once a viewing is confirmed. Zouza does not provide legal advice — review it with a professional before signing.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barPrice}>
            <Text style={styles.barPriceAmount}>{amount}</Text>
            {unit ? <Text style={styles.barPriceUnit}> {unit}</Text> : null}
          </Text>
          <Pressable onPress={() => setBookingOpen(true)}>
            <Text style={styles.barMeta}>{kind === "stay" ? "Select dates" : listing.available_from ? `Available ${formatDate(listing.available_from)}` : "Pick a viewing day"}</Text>
          </Pressable>
        </View>
        <Button label={bookingCopy[kind].cta} onPress={() => setBookingOpen(true)} style={{ minWidth: 150 }} />
      </View>

      <BookingSheet
        listing={listing}
        visible={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onSubmitted={(_booking, conversationId) => {
          setBookingOpen(false);
          router.push(`/messages/${conversationId}`);
        }}
      />
    </View>
  );
}

function Highlight({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.highlight}>
      <Ionicons name={icon} size={24} color={colors.text} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={styles.highlightTitle}>{title}</Text>
        <Text style={styles.highlightBody}>{body}</Text>
      </View>
    </View>
  );
}

function PriceRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, emphasize && styles.priceEmphasis]}>{label}</Text>
      <Text style={[styles.priceValue, emphasize && styles.priceEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  notFound: { padding: spacing.lg, ...typography.body, color: colors.text },
  galleryControls: { position: "absolute", left: spacing.md, right: spacing.md, flexDirection: "row", justifyContent: "space-between" },
  galleryRight: { flexDirection: "row", gap: spacing.sm + 2 },
  galleryCounter: {
    position: "absolute", bottom: spacing.md, right: spacing.md,
    backgroundColor: colors.overlayPill, borderRadius: radius.xs, paddingVertical: 4, paddingHorizontal: spacing.sm + 2,
  },
  galleryCounterText: { ...typography.microBold, color: colors.white },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  specs: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md, gap: 4 },
  ratingText: { ...typography.smallBold, color: colors.text },
  ratingDot: { ...typography.small, color: colors.text },
  ratingReviews: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline" },
  favouriteCard: {
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: spacing.md, marginTop: spacing.lg,
  },
  favouriteCol: { flex: 1, alignItems: "center", justifyContent: "center" },
  favouriteDivider: { width: 1, height: 36, backgroundColor: colors.border },
  favouriteTitle: { ...typography.h4, color: colors.text, lineHeight: 18 },
  favouriteBig: { ...typography.h3, color: colors.text },
  favouriteSmall: { ...typography.micro, color: colors.text, textDecorationLine: "underline", marginTop: 2 },
  stars: { flexDirection: "row", alignItems: "center", gap: 1, marginTop: 2 },
  hostRow: { flexDirection: "row", alignItems: "center" },
  hostName: { ...typography.bodyBold, color: colors.text },
  hostMeta: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  highlight: { flexDirection: "row", marginBottom: spacing.lg },
  highlightTitle: { ...typography.bodyBold, color: colors.text },
  highlightBody: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  description: { ...typography.body, color: colors.text },
  showMore: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: 2 },
  showMoreText: { ...typography.bodyBold, color: colors.text, textDecorationLine: "underline" },
  sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  amenityRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm + 4, gap: spacing.md },
  amenityLabel: { ...typography.body, color: colors.text },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  priceLabel: { ...typography.body, color: colors.text },
  priceValue: { ...typography.body, color: colors.text },
  priceEmphasis: { fontWeight: "600" },
  priceTotalDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  reviewsHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reviewsScroll: { marginHorizontal: -spacing.lg, paddingLeft: spacing.lg },
  reviewCard: {
    width: 280, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, marginRight: spacing.md,
  },
  reviewDate: { ...typography.micro, color: colors.textSecondary },
  reviewText: { ...typography.body, color: colors.text, marginTop: spacing.sm, minHeight: 72 },
  reviewAuthor: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  reviewAuthorName: { ...typography.smallBold, color: colors.text },
  muted: { ...typography.small, color: colors.textSecondary },
  faqRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  faqQ: { ...typography.bodyBold, color: colors.text },
  faqA: { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs },
  bottomBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.divider, ...shadow.bar,
  },
  barPrice: {},
  barPriceAmount: { ...typography.bodyBold, color: colors.text },
  barPriceUnit: { ...typography.body, color: colors.text },
  barMeta: { ...typography.small, color: colors.text, textDecorationLine: "underline", marginTop: 2 },
});
