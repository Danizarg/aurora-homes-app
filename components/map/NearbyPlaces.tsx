import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Chip } from "../ui/Chip";
import { SkeletonRow } from "../ui/Skeleton";
import { placeIcon } from "./placeIcons";
import { nearestAirport } from "../../lib/geo/airports";
import { formatDistance, walkMinutes, driveMinutes, formatMinutes, type GeoPoint } from "../../lib/geo/distance";
import { categoryLabel, fetchNearbyPlaces, type NearbyPlace, type PlaceCategory } from "../../lib/geo/places";
import { openUrl, showOnMapUrl } from "../../lib/geo/travel";

interface NearbyPlacesProps {
  center: GeoPoint;
  onPlaces?: (places: NearbyPlace[]) => void;
}

type Filter = PlaceCategory | "all";

/**
 * Airbnb's "Getting around" made concrete: supermarkets, shops, cafés,
 * pharmacies, transport, beaches and the nearest airport around the area,
 * with walking distances. Data from OpenStreetMap; the airport is computed.
 */
export function NearbyPlaces({ center, onPlaces }: NearbyPlacesProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${center.lat},${center.lng},${attempt}`;
  const [result, setResult] = useState<{ key: string; places: NearbyPlace[] | null; error: string | null }>({ key: "", places: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetchNearbyPlaces(center)
      .then((places) => {
        if (cancelled) return;
        setResult({ key: requestKey, places, error: null });
        onPlaces?.(places);
      })
      .catch((e: Error) => !cancelled && setResult({ key: requestKey, places: null, error: e.message }));
    return () => {
      cancelled = true;
    };
    // onPlaces is a stable callback from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const loaded = result.key === requestKey;
  const places = loaded ? result.places : null;
  const error = loaded ? result.error : null;

  const airport = useMemo(() => nearestAirport(center), [center]);
  const categories = useMemo(() => {
    const present = new Set<PlaceCategory>();
    for (const p of places ?? []) present.add(p.category);
    return (Object.keys(categoryLabel) as PlaceCategory[]).filter((c) => present.has(c));
  }, [places]);
  const visible = (places ?? []).filter((p) => filter === "all" || p.category === filter).slice(0, filter === "all" ? 10 : 12);

  return (
    <View>
      <Row
        icon="airplane-outline"
        title={`${airport.airport.name} (${airport.airport.iata})`}
        body={`${formatDistance(airport.km)} · about ${formatMinutes(driveMinutes(airport.km))} by car`}
        onPress={() => openUrl(showOnMapUrl(airport.airport, airport.airport.name))}
      />

      {places === null && !error ? (
        <View>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : null}

      {error ? (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>{error}</Text>
          <Pressable onPress={() => setAttempt((n) => n + 1)}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {places && places.length > 0 ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ paddingRight: spacing.lg }}>
            <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
            {categories.map((c) => (
              <Chip key={c} label={categoryLabel[c]} icon={placeIcon[c]} active={filter === c} onPress={() => setFilter(c)} />
            ))}
          </ScrollView>
          {visible.map((p) => (
            <Row
              key={p.id}
              icon={placeIcon[p.category]}
              title={p.name}
              body={`${formatDistance(p.km)} · ${walkMinutes(p.km)} min walk`}
              onPress={() => openUrl(showOnMapUrl(p.point, p.name))}
            />
          ))}
        </>
      ) : null}

      {places && places.length === 0 ? (
        <Text style={styles.loadingText}>No mapped places within walking distance — the area is quiet and residential.</Text>
      ) : null}
    </View>
  );
}

function Row({ icon, title, body, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm + 2 },
  iconWrap: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center" },
  rowTitle: { ...typography.bodyMedium, color: colors.text },
  rowBody: { ...typography.small, color: colors.textSecondary, marginTop: 1 },
  chips: { marginTop: spacing.sm, marginBottom: spacing.xs, marginHorizontal: -spacing.lg, paddingLeft: spacing.lg },
  loading: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  loadingText: { ...typography.small, color: colors.textSecondary, flex: 1 },
  retry: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline" },
});
