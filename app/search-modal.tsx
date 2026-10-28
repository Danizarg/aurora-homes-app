import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { colors, radius, shadow, spacing, typography } from "../constants/theme";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { IconButton } from "../components/ui/IconButton";
import { Skeleton } from "../components/ui/Skeleton";
import { pricePresets } from "../lib/listings/filter";
import { reverseGeocode, suggestPlaces } from "../lib/geo/geocode";
import { boundsAround } from "../lib/geo/bounds";
import { mapController } from "../lib/map/controller";
import { useDiscovery } from "../lib/store/discovery";
import { haptic } from "../lib/ui/haptics";
import type { Intent, SearchTarget } from "../types/search";

const intents: { key: Exclude<Intent, "list">; label: string }[] = [
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
  { key: "stay", label: "Stay" },
];

const popular = ["Marbella", "Sevilla", "Valencia", "Málaga", "Madrid", "Barcelona"];

/**
 * "Where to?" — real geocoding as you type (worldwide, via Photon), your
 * own location, intent and budget. Picking a place flies the map there.
 */
export default function SearchModal() {
  const intent = useDiscovery((s) => s.intent);
  const criteria = useDiscovery((s) => s.criteria);
  const setIntent = useDiscovery((s) => s.setIntent);
  const setCriteria = useDiscovery((s) => s.setCriteria);
  const setTarget = useDiscovery((s) => s.setTarget);
  const userLocation = useDiscovery((s) => s.userLocation);
  const setUserLocation = useDiscovery((s) => s.setUserLocation);

  const [query, setQuery] = useState(criteria.target?.label.split(",")[0] ?? "");
  const [suggestions, setSuggestions] = useState<SearchTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [locating, setLocating] = useState(false);
  const [chosen, setChosen] = useState<SearchTarget | undefined>(criteria.target);
  const [localIntent, setLocalIntent] = useState<Exclude<Intent, "list">>(intent && intent !== "list" ? intent : "rent");
  const [budgetMax, setBudgetMax] = useState<number | undefined>(criteria.budgetMax);
  const seq = useRef(0);
  // Rank suggestions near where the user is looking first, then near them; still worldwide.
  const biasPoint = criteria.target?.point ?? userLocation ?? undefined;

  useEffect(() => {
    const q = query.trim();
    const mySeq = ++seq.current;
    const timer = setTimeout(() => {
      if (q.length < 2 || (chosen && chosen.label.startsWith(q))) {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      suggestPlaces(q, 6, biasPoint)
        .then((list) => {
          if (mySeq !== seq.current) return;
          setSuggestions(list);
          setOffline(false);
        })
        .catch(() => mySeq === seq.current && setOffline(true))
        .finally(() => mySeq === seq.current && setLoading(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [query, chosen, biasPoint]);

  function pick(t: SearchTarget) {
    haptic.select();
    setChosen(t);
    setQuery(t.label.split(",")[0]);
    setSuggestions([]);
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const place = await reverseGeocode(point);
      const label = place?.city ? `${place.city}${place.country ? `, ${place.country}` : ""}` : "Around me";
      setUserLocation(point, place?.city ?? null);
      pick({ label, point, bounds: boundsAround(point, 6), kind: "city", source: "device" });
    } finally {
      setLocating(false);
    }
  }

  function search() {
    setIntent(localIntent);
    setCriteria({ intent: localIntent, budgetMax });
    if (chosen) {
      setTarget(chosen);
      mapController.flyToBounds(chosen.bounds, 1400);
    } else if (!query.trim()) {
      setTarget(undefined);
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <IconButton icon="close" variant="outline" size={36} onPress={() => router.back()} />
        <View style={styles.modeTabs}>
          {intents.map((i) => (
            <Pressable key={i.key} onPress={() => { haptic.select(); setLocalIntent(i.key); }} style={styles.modeTab}>
              <Text style={[styles.modeLabel, localIntent === i.key && styles.modeLabelActive]}>{i.label}</Text>
              <View style={[styles.modeUnderline, localIntent === i.key && styles.modeUnderlineActive]} />
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Where to?</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.text} />
            <TextInput
              style={styles.searchInput}
              placeholder="City, neighbourhood, address or landmark"
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={(t) => { setQuery(t); setChosen(undefined); }}
              onSubmitEditing={() => suggestions[0] && pick(suggestions[0])}
              returnKeyType="search"
              autoFocus
            />
            {query ? (
              <Pressable onPress={() => { setQuery(""); setChosen(undefined); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {loading ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Skeleton height={44} />
              <Skeleton height={44} width="80%" />
            </View>
          ) : null}
          {offline ? <Text style={styles.note}>Couldn’t reach the place search — check your connection. Popular cities below still work offline.</Text> : null}
          {suggestions.map((s) => (
            <Pressable key={`${s.label}-${s.point.lat}`} style={styles.suggestion} onPress={() => pick(s)}>
              <View style={styles.suggestionIcon}><Ionicons name="location-outline" size={18} color={colors.text} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>{s.label.split(",")[0]}</Text>
                <Text style={styles.suggestionSub} numberOfLines={1}>{s.label.split(",").slice(1).join(",").trim() || s.kind}</Text>
              </View>
            </Pressable>
          ))}

          {!query ? (
            <>
              <Pressable style={styles.suggestion} onPress={useMyLocation} disabled={locating}>
                <View style={[styles.suggestionIcon, { backgroundColor: colors.primaryLight }]}><Ionicons name="navigate" size={18} color={colors.primaryDark} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle}>{locating ? "Finding you…" : "Around me"}</Text>
                  <Text style={styles.suggestionSub}>Uses your location, only when you ask</Text>
                </View>
              </Pressable>
              <Text style={styles.popularTitle}>Popular</Text>
              <View style={styles.chipRow}>
                {popular.map((p) => (
                  <Chip key={p} label={p} active={chosen?.label.startsWith(p)} onPress={() => { setQuery(p); setChosen(undefined); }} />
                ))}
              </View>
            </>
          ) : null}
          {chosen ? (
            <Text style={styles.note}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} /> {chosen.label}
              {chosen.source === "local" ? " · offline city table" : chosen.source === "device" ? " · your location" : ""}
            </Text>
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Budget</Text>
          <View style={styles.chipRow}>
            {pricePresets(localIntent === "buy" ? "buy" : "rent").map((p) => (
              <Chip key={p.label} label={p.label} active={budgetMax === p.value} onPress={() => setBudgetMax(p.value)} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Clear" variant="link" onPress={() => { setQuery(""); setChosen(undefined); setBudgetMax(undefined); }} />
        <Button label="Search" icon="search" onPress={search} style={{ paddingHorizontal: spacing.lg }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSecondary },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modeTabs: { flexDirection: "row", paddingLeft: spacing.md, gap: spacing.lg, alignItems: "center" },
  modeTab: { alignItems: "center" },
  modeLabel: { ...typography.bodyMedium, color: colors.textSecondary },
  modeLabelActive: { color: colors.text, fontWeight: "600" },
  modeUnderline: { height: 2, alignSelf: "stretch", marginTop: 4, backgroundColor: "transparent" },
  modeUnderlineActive: { backgroundColor: colors.text },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  panel: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, ...shadow.card },
  panelTitle: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  searchBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 56 },
  searchInput: { flex: 1, ...typography.body, color: colors.text, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  suggestion: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm + 2 },
  suggestionIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center" },
  suggestionTitle: { ...typography.bodyMedium, color: colors.text },
  suggestionSub: { ...typography.micro, color: colors.textSecondary },
  popularTitle: { ...typography.smallBold, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  note: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.sm },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.divider },
});
