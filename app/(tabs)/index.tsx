import { useCallback, useMemo, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { SearchPill } from "../../components/search/SearchPill";
import { CategoryTabs, categories, type Category } from "../../components/search/CategoryTabs";
import { FiltersSheet } from "../../components/search/FiltersSheet";
import { CompactListingCard, ListingCard } from "../../components/listings/ListingCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { IconButton } from "../../components/ui/IconButton";
import { mockListings } from "../../lib/mock/listings";
import { getSavedListingIds, toggleSavedListing } from "../../lib/mock/storage";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { fetchPublishedListings } from "../../lib/supabase/listings";
import { applyFilters, countActiveFilters, defaultFilters, type FiltersState, type SortOrder } from "../../lib/listings/filter";
import type { Listing } from "../../types";

type Params = { q?: string; mode?: string; type?: string; priceMax?: string };

const modeKeys: Category[] = ["all", "stay", "rent", "buy", "live"];

function toCategory(value?: string): Category {
  return modeKeys.includes(value as Category) ? (value as Category) : "all";
}

export default function ExploreScreen() {
  const params = useLocalSearchParams<Params>();
  const { width } = useWindowDimensions();

  const [category, setCategory] = useState<Category>("all");
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [sort, setSort] = useState<SortOrder>("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [remoteListings, setRemoteListings] = useState<Listing[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSavedListingIds().then(setSavedIds);
      if (isSupabaseConfigured) fetchPublishedListings().then(setRemoteListings);
    }, [])
  );

  // A query, a type or a price coming from the search modal switches Explore into results mode.
  const query = params.q?.trim() ?? "";
  const searching = query.length > 0 || !!params.type || !!params.priceMax;
  const resultsMode: Category = params.mode ? toCategory(params.mode) : category;

  const effectiveFilters = useMemo<FiltersState>(
    () => ({
      ...filters,
      propertyType: filters.propertyType ?? (params.type as Listing["property_type"] | undefined),
      priceMax: filters.priceMax ?? (params.priceMax ? Number(params.priceMax) : undefined),
    }),
    [filters, params.type, params.priceMax]
  );

  const allListings = useMemo(() => [...remoteListings, ...mockListings], [remoteListings]);

  const results = useMemo(
    () => applyFilters(allListings, { mode: resultsMode, query, filters: effectiveFilters, sort }),
    [allListings, resultsMode, query, effectiveFilters, sort]
  );

  const homeListings = useMemo(() => applyFilters(allListings, { mode: category, filters: defaultFilters }), [allListings, category]);

  const sections = useMemo(() => {
    const byCity = new Map<string, Listing[]>();
    for (const l of homeListings) byCity.set(l.city, [...(byCity.get(l.city) ?? []), l]);
    return [...byCity.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([city, items], i) => ({
        key: city,
        title: i === 0 ? `Popular homes in ${city}` : i === 1 ? `Available next month in ${city}` : `Stay in ${city}`,
        items,
      }));
  }, [homeListings]);

  async function handleToggleSave(id: string) {
    setSavedIds(await toggleSavedListing(id));
  }

  function openSearch() {
    router.push({ pathname: "/search-modal", params: { q: query, mode: resultsMode } });
  }

  function clearSearch() {
    router.setParams({ q: "", mode: "", type: "", priceMax: "" });
    setFilters(defaultFilters);
  }

  const cardWidth = Math.round((width - spacing.lg * 2) / 2.15);
  const activeFilterCount = countActiveFilters(effectiveFilters);
  const modeLabel = categories.find((c) => c.key === resultsMode)?.label ?? "Homes";

  if (searching) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.resultsHeader}>
          <IconButton icon="chevron-back" variant="outline" size={40} onPress={clearSearch} />
          <SearchPill onPress={openSearch} query={query || modeLabel} subtitle={`${modeLabel} · ${effectiveFilters.priceMax ? `Up to €${effectiveFilters.priceMax.toLocaleString("en-GB")}` : "Any price"}`} />
          <View>
            <IconButton icon="options-outline" variant="outline" size={40} onPress={() => setShowFilters(true)} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>
            ) : null}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {results.length === 0 ? "No homes" : results.length === 1 ? "1 home" : `${results.length} homes`}
              {query ? ` in ${query}` : ""}
            </Text>
          }
          renderItem={({ item }) => (
            <ListingCard listing={item} saved={savedIds.includes(item.id)} onToggleSave={handleToggleSave} />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No exact matches"
              subtitle="Try changing or removing some of your filters or adjusting your search area."
              actionLabel="Remove all filters"
              onAction={() => { setFilters(defaultFilters); router.setParams({ type: "", priceMax: "" }); }}
            />
          }
        />

        <FiltersSheet
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          filters={effectiveFilters}
          onChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          mode={resultsMode}
          resultCount={results.length}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.pillRow}>
          <SearchPill onPress={openSearch} />
        </View>
        <CategoryTabs value={category} onChange={setCategory} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.homeContent}>
        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <SectionHeader title={section.title} onPress={() => router.setParams({ q: section.key, mode: category })} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
              {section.items.map((listing) => (
                <CompactListingCard
                  key={listing.id}
                  listing={listing}
                  width={cardWidth}
                  saved={savedIds.includes(listing.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </ScrollView>
          </View>
        ))}

        {sections.length === 0 ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <EmptyState title="Nothing here yet" subtitle="There are no homes in this category right now." />
          </View>
        ) : null}

        <Pressable style={styles.hostCard} onPress={() => router.push("/(tabs)/ai")}>
          <Image source={{ uri: "https://picsum.photos/seed/zouza-host/600/400" }} style={styles.hostImage} />
          <View style={styles.hostBody}>
            <Text style={styles.hostTitle}>List your home with Suzi</Text>
            <Text style={styles.hostText}>Upload photos. Suzi writes the listing, FAQ and translations for you. €20/month, no commission.</Text>
            <Text style={styles.hostLink}>Learn more</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.divider },
  pillRow: { flexDirection: "row", paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  homeContent: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.lg + spacing.sm },
  sectionHeader: { paddingHorizontal: spacing.lg, marginBottom: -spacing.xs },
  carousel: { paddingHorizontal: spacing.lg },
  hostCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.white,
  },
  hostImage: { width: "100%", height: 150, backgroundColor: colors.bgSecondary },
  hostBody: { padding: spacing.lg },
  hostTitle: { ...typography.h3, color: colors.text },
  hostText: { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs },
  hostLink: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline", marginTop: spacing.md },

  resultsHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm + 2,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  filterBadge: {
    position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.text, alignItems: "center", justifyContent: "center",
  },
  filterBadgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  resultsContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  resultsCount: { ...typography.smallMedium, color: colors.text, textAlign: "center", marginBottom: spacing.md },
});
