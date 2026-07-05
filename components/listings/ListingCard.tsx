import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import type { Listing } from "../../types";
import { Badge } from "../ui/Badge";

interface ListingCardProps {
  listing: Listing;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}

const modeLabel: Record<Listing["mode"], string> = {
  rent: "Rent",
  buy: "Buy",
  stay: "Stay",
  live: "Live",
};

export function ListingCard({ listing, saved, onToggleSave }: ListingCardProps) {
  const isSale = listing.mode === "buy";
  const price = isSale
    ? `${listing.price_sale?.toLocaleString("en-GB")} €`
    : `${listing.price_monthly?.toLocaleString("en-GB")} €/mo`;
  const priceNote = isSale ? "Asking price" : "Excl. utilities & fees";

  const highlightFeatures: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { icon: "bed-outline", label: `${listing.bedrooms} bd` },
    { icon: "water-outline", label: `${listing.bathrooms} ba` },
    { icon: "resize-outline", label: `${listing.size_m2} m²` },
  ];
  if (listing.sea_view) highlightFeatures.push({ icon: "sunny-outline", label: "Sea view" });
  else if (listing.pool) highlightFeatures.push({ icon: "water", label: "Pool" });
  else if (listing.garage) highlightFeatures.push({ icon: "car-outline", label: "Garage" });

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/listing/${listing.id}`)}
    >
      <View>
        <Image source={{ uri: listing.images[0]?.uri }} style={styles.image} />
        <View style={styles.badgeRow}>
          <Badge label={modeLabel[listing.mode]} tone="navy" />
          {listing.verified_property ? <Badge label="Verified" tone="success" /> : null}
        </View>
        {onToggleSave ? (
          <Pressable
            style={styles.saveButton}
            onPress={() => onToggleSave(listing.id)}
            hitSlop={8}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={18}
              color={saved ? colors.terracotta : colors.navy}
            />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
        <Text style={styles.location}>{listing.address_area}, {listing.city}</Text>

        <View style={styles.metaRow}>
          {highlightFeatures.slice(0, 4).map((f) => (
            <View key={f.label} style={styles.metaItem}>
              <Ionicons name={f.icon} size={13} color={colors.gold} />
              <Text style={styles.meta}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.priceNote}>{priceNote}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  image: { width: "100%", height: 210, backgroundColor: colors.sand },
  badgeRow: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs,
  },
  saveButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    padding: spacing.xs + 2,
  },
  body: { padding: spacing.md },
  title: { ...typography.h3, color: colors.navy },
  location: { ...typography.small, color: colors.muted, marginTop: 2 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.sm, gap: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { ...typography.small, color: colors.navy },
  priceRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: spacing.sm },
  price: { ...typography.h3, color: colors.gold },
  priceNote: { ...typography.micro, color: colors.muted, textTransform: "none" },
});
