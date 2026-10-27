import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { colors, layout, radius, spacing, typography } from "../../constants/theme";
import { EmptyState } from "../../components/ui/EmptyState";
import { getSavedListingIds, getStoredListings } from "../../lib/mock/storage";
import { getListingById } from "../../lib/mock/listings";
import type { Listing } from "../../types";

/** Airbnb Wishlists tab: large title, a grid of collage tiles, or the "Create your first wishlist" empty state. */
export default function WishlistsScreen() {
  const [saved, setSaved] = useState<Listing[]>([]);
  const [recent, setRecent] = useState<Listing[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [ids, stored] = await Promise.all([getSavedListingIds(), getStoredListings()]);
        const resolved = ids.map((id) => getListingById(id) ?? stored.find((l) => l.id === id)).filter(Boolean) as Listing[];
        setSaved(resolved);
        setRecent(stored);
      })();
    }, [])
  );

  const empty = saved.length === 0 && recent.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Wishlists</Text>

        {empty ? (
          <EmptyState
            title="Create your first wishlist"
            subtitle="As you search, tap the heart icon to save your favourite homes to a wishlist."
            actionLabel="Start exploring"
            onAction={() => router.push("/(tabs)")}
          />
        ) : (
          <View style={styles.grid}>
            {saved.length > 0 ? (
              <WishlistTile title="Saved homes" count={saved.length} images={saved.map((l) => l.images[0]?.uri)} onPress={() => router.push("/wishlists/saved")} />
            ) : null}
            {recent.length > 0 ? (
              <WishlistTile title="My listings" count={recent.length} images={recent.map((l) => l.images[0]?.uri)} onPress={() => router.push("/owner-dashboard")} />
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WishlistTile({ title, count, images, onPress }: { title: string; count: number; images: (string | undefined)[]; onPress: () => void }) {
  const tiles = [0, 1, 2, 3].map((i) => images[i]);
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View style={styles.collage}>
        {tiles.map((uri, i) => (
          <View key={i} style={styles.collageCell}>
            {uri ? <Image source={{ uri }} style={styles.collageImage} /> : <View style={[styles.collageImage, styles.collageEmpty]} />}
          </View>
        ))}
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileMeta}>{count} saved</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl + layout.tabBarHeight },
  title: { ...typography.display, color: colors.text, marginBottom: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "47.5%", marginBottom: spacing.lg },
  collage: {
    aspectRatio: 1, borderRadius: radius.lg, overflow: "hidden", flexDirection: "row", flexWrap: "wrap",
    backgroundColor: colors.white, borderWidth: 3, borderColor: colors.white, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  collageCell: { width: "50%", height: "50%", padding: 1 },
  collageImage: { width: "100%", height: "100%", borderRadius: 2 },
  collageEmpty: { backgroundColor: colors.bgSecondary },
  tileTitle: { ...typography.bodyBold, color: colors.text, marginTop: spacing.sm + 2 },
  tileMeta: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
});
