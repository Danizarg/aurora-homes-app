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

  const summary = [
    `${listing.bedrooms} bd`,
    `${listing.bathrooms} ba`,
    `${listing.size_m2} m²`,
    listing.sea_view ? "Sea view" : listing.pool ? "Pool" : listing.garage ? "Garage" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/listing/${listing.id}`)}
    >
      <View>
        <Image source={{ uri: listing.images[0]?.uri }} style={styles.image} />
        <View style={styles.badgeRow}>
          <Badge label={modeLabel[listing.mode]} tone="light" />
          {listing.verified_property ? (
            <View style={styles.verifiedChip}>
              <Ionicons name="shield-checkmark" size={11} color={colors.success} />
              <Text style={styles.verifiedChipText}>Verified</Text>
            </View>
          ) : null}
        </View>
        {onToggleSave ? (
          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
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
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
          <Text style={styles.price}>{price}</Text>
        </View>
        <Text style={styles.location} numberOfLines={1}>{listing.address_area}, {listing.city}</Text>
        <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: "hidden",
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  cardPressed: {
    opacity: 0.92,
  },
  image: { width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.sand },
  badgeRow: {
    position: "absolute",
    top: spacing.sm + 2,
    left: spacing.sm + 2,
    flexDirection: "row",
    gap: spacing.xs,
  },
  verifiedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    ...shadow.float,
  },
  verifiedChipText: { ...typography.micro, color: colors.success, textTransform: "none" },
  saveButton: {
    position: "absolute",
    top: spacing.sm + 2,
    right: spacing.sm + 2,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: radius.pill,
    padding: spacing.sm - 1,
    ...shadow.float,
  },
  saveButtonPressed: { opacity: 0.8 },
  body: { padding: spacing.md, paddingTop: spacing.md - 2 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  title: { ...typography.h3, color: colors.navy, flex: 1 },
  price: { ...typography.h3, color: colors.navy },
  location: { ...typography.small, color: colors.muted, marginTop: 3 },
  summary: { ...typography.small, color: colors.muted, marginTop: 4 },
});
