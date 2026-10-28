import { FlatList, StyleSheet, Text, View } from "react-native";
import { colors, layout, spacing, typography } from "../../constants/theme";
import { ListingCard } from "../listings/ListingCard";
import { Reveal } from "../ui/Reveal";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonRow } from "../ui/Skeleton";
import type { SearchResult } from "../../types/search";

interface ResultsListProps {
  result: SearchResult | null;
  searching: boolean;
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onClearFilters: () => void;
  topInset: number;
}

/** Airbnb-style list mode over the same results the map shows. */
export function ResultsList({ result, searching, savedIds, onToggleSave, onClearFilters, topInset }: ResultsListProps) {
  const items = result?.items ?? [];
  const unknown = result?.unknownDistance ?? 0;
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.listing.id}
      contentContainerStyle={[styles.content, { paddingTop: topInset }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.count}>
            {searching && items.length === 0 ? "Searching…" : items.length === 1 ? "1 home" : `${items.length} homes`}
            {result && result.matchedBeforeDistance > items.length && !searching ? ` · ${result.matchedBeforeDistance - items.length} outside your distance limits` : ""}
          </Text>
          {result?.widenedKm && !searching ? <Text style={styles.note}>Nothing matched inside the destination itself — these are within {result.widenedKm} km of it, nearest first.</Text> : null}
          {unknown > 0 && !searching ? <Text style={styles.note}>{unknown} more couldn’t be measured for distance and were left out.</Text> : null}
          {result?.includesDemo ? <Text style={styles.note}>Some of these are demo listings shown while the catalogue grows.</Text> : null}
        </View>
      }
      renderItem={({ item, index }) => (
        <Reveal index={index}>
          <ListingCard listing={item.listing} saved={savedIds.includes(item.listing.id)} onToggleSave={onToggleSave} />
        </Reveal>
      )}
      ListEmptyComponent={
        searching ? (
          <View>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <EmptyState title="No exact matches" subtitle="Try widening the area, loosening a filter, or ask Suza for something close." actionLabel="Clear filters" onAction={onClearFilters} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl + layout.tabBarHeight + 80 },
  header: { marginBottom: spacing.md, alignItems: "center" },
  count: { ...typography.smallMedium, color: colors.text, textAlign: "center" },
  note: { ...typography.micro, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs },
});
