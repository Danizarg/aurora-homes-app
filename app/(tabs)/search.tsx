import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Chip } from "../../components/ui/Chip";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListingCard } from "../../components/listings/ListingCard";
import { mockListings } from "../../lib/mock/listings";
import { getSavedListingIds, toggleSavedListing } from "../../lib/mock/storage";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { fetchPublishedListings } from "../../lib/supabase/listings";
import type { Listing, ListingMode } from "../../types";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

const modes: { key: ListingMode; label: string }[] = [
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
  { key: "stay", label: "Stay" },
  { key: "live", label: "Live" },
];

const propertyTypes = ["apartment", "villa", "townhouse", "studio", "loft", "house"];

interface FiltersState {
  query: string;
  bedroomsMin: number;
  pool: boolean;
  seaView: boolean;
  garage: boolean;
  petsAllowed: boolean;
  furnished: boolean;
  verifiedOnly: boolean;
  newBuild: boolean;
  directOwner: boolean;
  propertyType?: string;
}

const defaultFilters: FiltersState = {
  query: "",
  bedroomsMin: 0,
  pool: false,
  seaView: false,
  garage: false,
  petsAllowed: false,
  furnished: false,
  verifiedOnly: false,
  newBuild: false,
  directOwner: false,
};

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [mode, setMode] = useState<ListingMode>("stay");
  const [filters, setFilters] = useState<FiltersState>(() => ({ ...defaultFilters, query: q ?? "" }));
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<"default" | "price_asc" | "price_desc">("default");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [supabaseListings, setSupabaseListings] = useState<Listing[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSavedListingIds().then(setSavedIds);
      if (isSupabaseConfigured) fetchPublishedListings().then(setSupabaseListings);
    }, [])
  );

  useEffect(() => {
    if (q) setFilters((f) => ({ ...f, query: q }));
  }, [q]);

  const isRental = mode === "rent" || mode === "stay" || mode === "live";

  const results = useMemo(() => {
    let list = [...supabaseListings, ...mockListings].filter((l) => l.mode === mode);
    if (filters.query.trim()) {
      const q = filters.query.toLowerCase();
      list = list.filter(
        (l) => l.city.toLowerCase().includes(q) || l.title.toLowerCase().includes(q) || l.address_area.toLowerCase().includes(q)
      );
    }
    if (filters.bedroomsMin > 0) list = list.filter((l) => l.bedrooms >= filters.bedroomsMin);
    if (filters.pool) list = list.filter((l) => l.pool);
    if (filters.seaView) list = list.filter((l) => l.sea_view);
    if (filters.garage) list = list.filter((l) => l.garage);
    if (filters.petsAllowed) list = list.filter((l) => l.pets_allowed);
    if (filters.furnished) list = list.filter((l) => l.furnished);
    if (filters.verifiedOnly) list = list.filter((l) => l.verified_property);
    if (filters.directOwner) list = list.filter((l) => l.verified_owner);
    if (filters.propertyType) list = list.filter((l) => l.property_type === filters.propertyType);

    if (sort === "price_asc") {
      list = [...list].sort((a, b) => (a.price_monthly ?? a.price_sale ?? 0) - (b.price_monthly ?? b.price_sale ?? 0));
    } else if (sort === "price_desc") {
      list = [...list].sort((a, b) => (b.price_monthly ?? b.price_sale ?? 0) - (a.price_monthly ?? a.price_sale ?? 0));
    }
    return list;
  }, [mode, filters, sort, supabaseListings]);

  async function handleToggleSave(id: string) {
    const next = await toggleSavedListing(id);
    setSavedIds(next);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.modeRow}>
          {modes.map((m) => (
            <Chip key={m.key} label={m.label} active={mode === m.key} onPress={() => setMode(m.key)} />
          ))}
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="location-outline" size={18} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="City or area (e.g. Marbella)"
              placeholderTextColor={colors.muted}
              value={filters.query}
              onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
            />
          </View>
          <Pressable style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={20} color={colors.white} />
          </Pressable>
        </View>
        <View style={styles.sortRow}>
          <Text style={styles.resultsCount}>{results.length} homes found</Text>
          <Pressable
            onPress={() =>
              setSort(sort === "default" ? "price_asc" : sort === "price_asc" ? "price_desc" : "default")
            }
          >
            <Text style={styles.sortLabel}>
              Sort: {sort === "default" ? "Recommended" : sort === "price_asc" ? "Price ↑" : "Price ↓"}
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ListingCard listing={item} saved={savedIds.includes(item.id)} onToggleSave={handleToggleSave} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="No homes match your filters"
            subtitle="Try widening your budget or removing a filter."
          />
        }
      />

      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Filters</Text>

              <Text style={styles.filterLabel}>Minimum bedrooms</Text>
              <View style={styles.chipRow}>
                {[0, 1, 2, 3, 4].map((n) => (
                  <Chip
                    key={n}
                    label={n === 0 ? "Any" : `${n}+`}
                    active={filters.bedroomsMin === n}
                    onPress={() => setFilters((f) => ({ ...f, bedroomsMin: n }))}
                  />
                ))}
              </View>

              <Text style={styles.filterLabel}>Property type</Text>
              <View style={styles.chipRow}>
                <Chip label="Any" active={!filters.propertyType} onPress={() => setFilters((f) => ({ ...f, propertyType: undefined }))} />
                {propertyTypes.map((t) => (
                  <Chip
                    key={t}
                    label={t.charAt(0).toUpperCase() + t.slice(1)}
                    active={filters.propertyType === t}
                    onPress={() => setFilters((f) => ({ ...f, propertyType: t }))}
                  />
                ))}
              </View>

              <Text style={styles.filterLabel}>Features</Text>
              <View style={styles.chipRow}>
                <Chip label="Pool" active={filters.pool} onPress={() => setFilters((f) => ({ ...f, pool: !f.pool }))} />
                <Chip label="Sea view" active={filters.seaView} onPress={() => setFilters((f) => ({ ...f, seaView: !f.seaView }))} />
                <Chip label="Garage" active={filters.garage} onPress={() => setFilters((f) => ({ ...f, garage: !f.garage }))} />
                {isRental && (
                  <>
                    <Chip label="Pets allowed" active={filters.petsAllowed} onPress={() => setFilters((f) => ({ ...f, petsAllowed: !f.petsAllowed }))} />
                    <Chip label="Furnished" active={filters.furnished} onPress={() => setFilters((f) => ({ ...f, furnished: !f.furnished }))} />
                  </>
                )}
              </View>

              <Text style={styles.filterLabel}>Trust</Text>
              <View style={styles.chipRow}>
                <Chip label="Verified only" active={filters.verifiedOnly} onPress={() => setFilters((f) => ({ ...f, verifiedOnly: !f.verifiedOnly }))} />
                <Chip label="Direct owner" active={filters.directOwner} onPress={() => setFilters((f) => ({ ...f, directOwner: !f.directOwner }))} />
                {!isRental && (
                  <Chip label="New build" active={filters.newBuild} onPress={() => setFilters((f) => ({ ...f, newBuild: !f.newBuild }))} />
                )}
              </View>

              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl }}>
                <Button label="Reset" variant="outline" style={{ flex: 1 }} onPress={() => setFilters(defaultFilters)} />
                <Button label="Show results" style={{ flex: 1 }} onPress={() => setShowFilters(false)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  headerTitle: { ...typography.h1, color: colors.navy, marginBottom: spacing.md },
  modeRow: { flexDirection: "row", marginBottom: spacing.sm },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  searchInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.white,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md - 2, marginRight: spacing.sm, ...shadow.soft,
  },
  searchInput: { ...typography.body, color: colors.navy, marginLeft: spacing.sm, flex: 1 },
  filterButton: { backgroundColor: colors.navy, borderRadius: radius.pill, padding: spacing.sm + 4, ...shadow.soft },
  sortRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  resultsCount: { ...typography.small, color: colors.muted },
  sortLabel: { ...typography.small, color: colors.gold, fontWeight: "600" },
  listContent: { padding: spacing.lg, paddingTop: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(27,36,48,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.ivory, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, maxHeight: "85%",
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  modalTitle: { ...typography.h2, color: colors.navy, marginBottom: spacing.md },
  filterLabel: { ...typography.bodyMedium, color: colors.navy, marginTop: spacing.md, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
});
