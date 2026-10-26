import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { colors, radius, shadow, spacing, typography } from "../constants/theme";
import { IconButton } from "../components/ui/IconButton";
import { ListingsMap } from "../components/map/ListingsMap";
import { CompactListingCard } from "../components/listings/ListingCard";
import { mockListings } from "../lib/mock/listings";
import { getSavedListingIds, getStoredListings, toggleSavedListing } from "../lib/mock/storage";
import { applyFilters, defaultFilters } from "../lib/listings/filter";
import type { Listing, ListingMode } from "../types";

type Params = { q?: string; mode?: string; type?: string; priceMax?: string };

/**
 * Full-screen map of the current results (Airbnb's "Map" view): the earth
 * first, then a fly-in to the homes, price pills as pins and a card
 * carousel along the bottom that follows the selected pin.
 */
export default function MapScreen() {
  const params = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [stored, setStored] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const listRef = useRef<FlatList<Listing>>(null);

  useEffect(() => {
    getStoredListings().then(setStored);
    getSavedListingIds().then(setSavedIds);
  }, []);

  const listings = useMemo(() => {
    const mode = (params.mode as ListingMode | undefined) || "all";
    return applyFilters([...stored, ...mockListings], {
      mode,
      query: params.q ?? "",
      filters: {
        ...defaultFilters,
        propertyType: (params.type as Listing["property_type"]) || undefined,
        priceMax: params.priceMax ? Number(params.priceMax) : undefined,
      },
    });
  }, [stored, params.mode, params.q, params.type, params.priceMax]);

  const cardWidth = Math.round(width * 0.72);

  const select = useCallback(
    (listing: Listing) => {
      setSelectedId(listing.id);
      const index = listings.findIndex((l) => l.id === listing.id);
      if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    },
    [listings]
  );

  async function toggleSave(id: string) {
    setSavedIds(await toggleSavedListing(id));
  }

  return (
    <View style={styles.screen}>
      <ListingsMap listings={listings} selectedId={selectedId} onSelect={select} />

      <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
        <IconButton icon="chevron-back" variant="overlay" size={40} onPress={() => router.back()} />
        <View style={styles.countPill}>
          <Text style={styles.countText}>{listings.length === 1 ? "1 home" : `${listings.length} homes`}{params.q ? ` in ${params.q}` : ""}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.carousel, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <FlatList
          ref={listRef}
          data={listings}
          horizontal
          keyExtractor={(l) => l.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          snapToInterval={cardWidth + spacing.sm + 4}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: cardWidth + spacing.sm + 4, offset: (cardWidth + spacing.sm + 4) * index, index })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + spacing.sm + 4));
            const item = listings[index];
            if (item) setSelectedId(item.id);
          }}
          renderItem={({ item }) => (
            <View style={[styles.card, { width: cardWidth }, item.id === selectedId && styles.cardSelected]}>
              <CompactListingCard listing={item} width={cardWidth - spacing.md * 2} saved={savedIds.includes(item.id)} onToggleSave={toggleSave} />
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgSecondary },
  topBar: { position: "absolute", left: spacing.md, right: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  countPill: { backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: spacing.md, ...shadow.float },
  countText: { ...typography.smallBold, color: colors.text },
  carousel: { position: "absolute", left: 0, right: 0, bottom: 0 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginRight: spacing.sm + 4, ...shadow.card },
  cardSelected: { borderWidth: 2, borderColor: colors.text },
});
