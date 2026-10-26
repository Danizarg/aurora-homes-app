import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { colors, spacing, typography } from "../../constants/theme";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { ListingCard } from "../../components/listings/ListingCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { getSavedListingIds, getStoredListings, toggleSavedListing } from "../../lib/mock/storage";
import { getListingById } from "../../lib/mock/listings";
import type { Listing } from "../../types";

export default function SavedHomesScreen() {
  const [ids, setIds] = useState<string[]>([]);
  const [stored, setStored] = useState<Listing[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSavedListingIds().then(setIds);
      getStoredListings().then(setStored);
    }, [])
  );

  const listings = ids.map((id) => getListingById(id) ?? stored.find((l) => l.id === id)).filter(Boolean) as Listing[];

  async function toggle(id: string) {
    setIds(await toggleSavedListing(id));
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader leading="back" border={false} />
      <FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={styles.title}>Saved homes</Text>
            <Text style={styles.subtitle}>{listings.length} {listings.length === 1 ? "home" : "homes"}</Text>
          </View>
        }
        renderItem={({ item }) => <ListingCard listing={item} saved onToggleSave={toggle} />}
        ListEmptyComponent={
          <EmptyState title="Nothing saved yet" subtitle="Tap the heart on any home to keep it here." actionLabel="Start exploring" onAction={() => router.push("/(tabs)")} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs },
});
