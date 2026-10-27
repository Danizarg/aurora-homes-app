import { useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, motion, radius, spacing, typography } from "../../constants/theme";
import type { Listing } from "../../types";
import { Badge } from "../ui/Badge";
import { PressableScale } from "../ui/PressableScale";
import { haptic } from "../../lib/ui/haptics";
import { formatRating, headlineFor, highlightFor, isGuestFavourite, priceParts, specsLine } from "../../lib/listings/presentation";

interface ListingCardProps {
  listing: Listing;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}

/**
 * Full-width feed card (Airbnb search results): swipeable square photo
 * carousel with dots, heart top-right, "Guest favourite" top-left, then
 * headline · rating, two grey lines and a bold price. Photos cross-fade in;
 * the whole card squeezes softly when pressed.
 */
export function ListingCard({ listing, saved, onToggleSave }: ListingCardProps) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const { amount, unit } = priceParts(listing);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!width) return;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  return (
    <PressableScale pressedScale={0.985} style={styles.card} onPress={() => router.push(`/listing/${listing.id}`)}>
      <View style={styles.media} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={styles.carousel}
          >
            {listing.images.map((image) => (
              <Image
                key={image.id}
                source={{ uri: image.uri }}
                style={{ width, height: width }}
                contentFit="cover"
                transition={motion.image}
              />
            ))}
          </ScrollView>
        ) : null}

        {isGuestFavourite(listing) ? <Badge label="Guest favourite" style={styles.badge} /> : null}

        <HeartButton saved={saved} onPress={onToggleSave ? () => onToggleSave(listing.id) : undefined} />

        {listing.images.length > 1 ? (
          <View style={styles.dots}>
            {listing.images.slice(0, 5).map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{headlineFor(listing)}</Text>
          <View style={styles.rating}>
            <Ionicons name="star" size={12} color={colors.text} />
            <Text style={styles.ratingText}>{formatRating(listing)}</Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>{listing.address_area} · {highlightFor(listing)}</Text>
        <Text style={styles.meta} numberOfLines={1}>{specsLine(listing)}</Text>
        <Text style={styles.price}>
          <Text style={styles.priceAmount}>{amount}</Text>
          {unit ? <Text style={styles.priceUnit}> {unit}</Text> : null}
        </Text>
      </View>
    </PressableScale>
  );
}

interface CompactListingCardProps extends ListingCardProps {
  width: number;
}

/**
 * Compact card used in horizontal carousels on Explore ("Popular homes in
 * Marbella"): square photo, headline, "€1,200 month · ★ 4.92".
 */
export function CompactListingCard({ listing, saved, onToggleSave, width }: CompactListingCardProps) {
  const { amount, unit } = priceParts(listing);
  return (
    <PressableScale pressedScale={0.97} style={[styles.compact, { width }]} onPress={() => router.push(`/listing/${listing.id}`)}>
      <View style={[styles.media, { height: width }]}>
        <Image
          source={{ uri: listing.images[0]?.uri }}
          style={[styles.compactImage, { width, height: width }]}
          contentFit="cover"
          transition={motion.image}
        />
        {isGuestFavourite(listing) ? <Badge label="Guest favourite" style={styles.badgeCompact} /> : null}
        <View style={styles.heartCompact}>
          <HeartButton saved={saved} onPress={onToggleSave ? () => onToggleSave(listing.id) : undefined} size={22} />
        </View>
      </View>
      <Text style={styles.compactTitle} numberOfLines={1}>{headlineFor(listing)}</Text>
      <Text style={styles.compactMeta} numberOfLines={1}>
        {amount}{unit ? ` ${unit}` : ""} · <Ionicons name="star" size={11} color={colors.textSecondary} /> {formatRating(listing)}
      </Text>
    </PressableScale>
  );
}

/** Airbnb's heart: outlined white over a translucent fill, pops and ticks when saved. */
export function HeartButton({ saved, onPress, size = 24 }: { saved?: boolean; onPress?: () => void; size?: number }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  function handlePress() {
    if (!onPress) return;
    scale.set(withSequence(withSpring(1.35, motion.springPress), withSpring(1, motion.springRelease)));
    haptic.light();
    onPress();
  }

  return (
    <Pressable style={styles.heart} onPress={handlePress} hitSlop={10} disabled={!onPress}>
      <Animated.View style={[styles.heartInner, animated]}>
        <Ionicons name="heart" size={size} color={saved ? colors.primary : "rgba(0,0,0,0.5)"} style={StyleSheet.absoluteFill} />
        <Ionicons name="heart-outline" size={size} color={colors.white} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg + spacing.sm },
  media: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.bgSecondary,
  },
  carousel: { flex: 1 },
  badge: { position: "absolute", top: spacing.md, left: spacing.md },
  badgeCompact: { position: "absolute", top: spacing.sm + 2, left: spacing.sm + 2, paddingVertical: 4, paddingHorizontal: spacing.sm },
  heart: { position: "absolute", top: spacing.md - 2, right: spacing.md - 2, width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  heartInner: { alignItems: "center", justifyContent: "center" },
  heartCompact: { position: "absolute", top: 0, right: 0 },
  dots: {
    position: "absolute", bottom: spacing.md, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.55)" },
  dotActive: { backgroundColor: colors.white },
  body: { paddingTop: spacing.sm + 2 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  title: { ...typography.smallBold, fontSize: 15, color: colors.text, flex: 1 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { ...typography.small, color: colors.text },
  meta: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  price: { marginTop: spacing.sm - 2 },
  priceAmount: { ...typography.smallBold, fontSize: 15, color: colors.text },
  priceUnit: { ...typography.small, color: colors.text },
  compact: { marginRight: spacing.md - 4 },
  compactImage: { borderRadius: radius.md },
  compactTitle: { ...typography.smallMedium, color: colors.text, marginTop: spacing.sm },
  compactMeta: { ...typography.micro, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
