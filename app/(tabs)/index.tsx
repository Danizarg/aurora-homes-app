import { useCallback, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, spacing } from "../../constants/theme";
import { DiscoveryMap } from "../../components/discovery/DiscoveryMap";
import { DiscoveryBar } from "../../components/discovery/DiscoveryBar";
import { DiscoveryFilters, countActiveCriteria } from "../../components/discovery/DiscoveryFilters";
import { IntentSheet } from "../../components/discovery/IntentSheet";
import { ListingPreviewCard } from "../../components/discovery/ListingPreviewCard";
import { ResultsList } from "../../components/discovery/ResultsList";
import { SuzaOrb } from "../../components/suza/SuzaOrb";
import { SuzaSheet } from "../../components/suza/SuzaSheet";
import { useDiscovery } from "../../lib/store/discovery";
import { useSearchSync } from "../../lib/search/useSearch";
import { useSuza } from "../../lib/suza/useSuza";
import { getSavedListingIds, toggleSavedListing } from "../../lib/mock/storage";

/**
 * The home screen: a full-screen map of real listings (or the Airbnb-style
 * list), a floating destination bar, and Suza's orb. Everything reads and
 * writes the one discovery store, so the map, the list, the filters and
 * Suza can never disagree about what is being searched.
 */
export default function DiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const hydrated = useDiscovery((s) => s.hydrated);
  const onboardingDone = useDiscovery((s) => s.onboardingDone);
  const replayIntro = useDiscovery((s) => s.voice.replayIntro);
  const viewMode = useDiscovery((s) => s.viewMode);
  const result = useDiscovery((s) => s.result);
  const searching = useDiscovery((s) => s.searching);
  const selectedId = useDiscovery((s) => s.selectedListingId);
  const select = useDiscovery((s) => s.select);
  const criteria = useDiscovery((s) => s.criteria);
  const clearFilters = useDiscovery((s) => s.clearFilters);

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [intentOpen, setIntentOpen] = useState(false);

  useSearchSync();
  const suza = useSuza();

  useFocusEffect(
    useCallback(() => {
      getSavedListingIds().then(setSavedIds);
    }, [])
  );

  const toggleSave = useCallback(async (id: string) => setSavedIds(await toggleSavedListing(id)), []);

  if (!hydrated) return <View style={styles.screen} />;
  if (!onboardingDone || replayIntro) return <Redirect href="/intro" />;

  const effectiveMode = Platform.OS === "web" ? "list" : viewMode;
  const listings = (result?.items ?? []).map((i) => i.listing);
  const selected = selectedId ? result?.items.find((i) => i.listing.id === selectedId) : undefined;
  const barTop = insets.top + spacing.sm;
  const bottomInset = layout.tabBarHeight + spacing.md;

  return (
    <View style={styles.screen}>
      {effectiveMode === "map" ? (
        <DiscoveryMap listings={listings} />
      ) : (
        <ResultsList result={result} searching={searching} savedIds={savedIds} onToggleSave={toggleSave} onClearFilters={clearFilters} topInset={barTop + 112} />
      )}

      <View style={[styles.barWrap, { top: barTop }]} pointerEvents="box-none">
        <DiscoveryBar filterCount={countActiveCriteria(criteria)} onOpenFilters={() => setFiltersOpen(true)} onOpenIntent={() => setIntentOpen(true)} />
      </View>

      {effectiveMode === "map" && selected && !sheetOpen ? (
        <View style={[styles.preview, { bottom: bottomInset + 84 }]} pointerEvents="box-none">
          <ListingPreviewCard item={selected} saved={savedIds.includes(selected.listing.id)} onToggleSave={toggleSave} onClose={() => select(null)} />
        </View>
      ) : null}

      {!sheetOpen ? (
        <View style={[styles.orb, { bottom: bottomInset }]} pointerEvents="box-none">
          <SuzaOrb state={suza.state} onPress={() => setSheetOpen(true)} />
        </View>
      ) : null}

      <SuzaSheet suza={suza} open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <DiscoveryFilters visible={filtersOpen} onClose={() => setFiltersOpen(false)} />
      <IntentSheet visible={intentOpen} onClose={() => setIntentOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgSecondary },
  barWrap: { position: "absolute", left: 0, right: 0 },
  preview: { position: "absolute", left: 0, right: 0, height: 140 },
  orb: { position: "absolute", left: 0, right: 0, alignItems: "center" },
});
