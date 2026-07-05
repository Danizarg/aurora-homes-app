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
  const price =
    listing.mode === "buy"
      ? `${listing.price_sale?.toLocaleString("en-GB")} €`
      : `${listing.price_monthly?.toLocaleString("en-GB")} €/mo`;

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
          <Text style={styles.meta}>{listing.bedrooms} bd</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{listing.bathrooms} ba</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{listing.size_m2} m²</Text>
        </View>
        <Text style={styles.price}>{price}</Text>
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
    ...shadow.soft,
  },
  image: { width: "100%", height: 180, backgroundColor: colors.sand },
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
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  meta: { ...typography.small, color: colors.navy },
  metaDot: { ...typography.small, color: colors.muted, marginHorizontal: spacing.xs },
  price: { ...typography.bodyMedium, color: colors.gold, marginTop: spacing.sm },
});
