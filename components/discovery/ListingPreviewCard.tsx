import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { colors, motion, radius, shadow, spacing, typography } from "../../constants/theme";
import { PressableScale } from "../ui/PressableScale";
import { HeartButton } from "../listings/ListingCard";
import { Badge } from "../ui/Badge";
import { formatDistance } from "../../lib/geo/distance";
import { headlineFor, priceParts, specsLine } from "../../lib/listings/presentation";
import type { ScoredListing } from "../../types/search";

interface ListingPreviewCardProps {
  item: ScoredListing;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onClose: () => void;
}

const distanceLabel: Record<string, string> = {
  sea: "coast", beach: "beach", airport: "airport", school: "school", supermarket: "supermarket",
  gym: "gym", restaurants: "restaurants", transport: "transport", hospital: "hospital", center: "centre", place: "",
};

/** The card that slides up when a pin is tapped: photo, price, essentials, real distances, and a way into the full listing. */
export function ListingPreviewCard({ item, saved, onToggleSave, onClose }: ListingPreviewCardProps) {
  const { listing, distances, demo } = item;
  const { amount, unit } = priceParts(listing);
  const distanceBits = Object.entries(distances)
    .filter(([, km]) => typeof km === "number")
    .map(([kind, km]) => `${formatDistance(km as number)} to ${distanceLabel[kind] || kind}`);

  return (
    <Animated.View entering={FadeInDown.duration(motion.reveal)} exiting={FadeOutDown.duration(180)} style={styles.wrap}>
      <PressableScale pressedScale={0.985} style={styles.card} onPress={() => router.push(`/listing/${listing.id}`)}>
        <Image source={{ uri: listing.images[0]?.uri }} style={styles.image} contentFit="cover" transition={motion.image} />
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>{headlineFor(listing)}</Text>
            {demo ? <Badge label="Demo" tone="muted" /> : null}
          </View>
          <Text style={styles.meta} numberOfLines={1}>{listing.title}</Text>
          <Text style={styles.meta} numberOfLines={1}>{specsLine(listing)}</Text>
          {distanceBits.length ? <Text style={styles.distance} numberOfLines={1}>{distanceBits.join(" · ")}</Text> : null}
          <Text style={styles.price}>
            <Text style={styles.priceAmount}>{amount}</Text>
            {unit ? <Text style={styles.priceUnit}> {unit}</Text> : null}
          </Text>
        </View>
        <View style={styles.actions}>
          <HeartButton saved={saved} onPress={() => onToggleSave(listing.id)} size={22} />
          <PressableScale pressedScale={0.9} onPress={onClose} hitSlop={8} style={styles.close}>
            <Ionicons name="close" size={18} color={colors.text} />
          </PressableScale>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.md, right: spacing.md },
  card: { flexDirection: "row", backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.sm + 2, ...shadow.card },
  image: { width: 108, height: 108, borderRadius: radius.md, backgroundColor: colors.bgSecondary },
  body: { flex: 1, paddingLeft: spacing.md, paddingRight: spacing.sm, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  meta: { ...typography.micro, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  distance: { ...typography.micro, color: colors.primaryDark, marginTop: 4 },
  price: { marginTop: 6 },
  priceAmount: { ...typography.smallBold, fontSize: 15, color: colors.text },
  priceUnit: { ...typography.small, color: colors.text },
  actions: { justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center" },
});
