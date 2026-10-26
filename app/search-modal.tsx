import { useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../constants/theme";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { IconButton } from "../components/ui/IconButton";
import { categories, type Category } from "../components/search/CategoryTabs";
import { pricePresets } from "../lib/listings/filter";
import { propertyTypeLabel } from "../lib/listings/presentation";
import type { Listing } from "../types";

const destinations = [
  { name: "Marbella", hint: "Costa del Sol" },
  { name: "Sevilla", hint: "Andalusian old town" },
  { name: "Valencia", hint: "Beach and city" },
  { name: "Málaga", hint: "Sun all year" },
  { name: "Madrid", hint: "The capital" },
  { name: "Barcelona", hint: "By the sea" },
];

type Panel = "where" | "type" | "price";

const propertyTypes = Object.keys(propertyTypeLabel) as Listing["property_type"][];

/** Airbnb "Where to?" search modal: stacked cards, the open one expanded, the others collapsed to a summary row. */
export default function SearchModal() {
  const params = useLocalSearchParams<{ q?: string; mode?: string }>();
  const [query, setQuery] = useState(params.q ?? "");
  const [mode, setMode] = useState<Category>((params.mode as Category) || "all");
  const [type, setType] = useState<Listing["property_type"] | undefined>();
  const [priceMax, setPriceMax] = useState<number | undefined>();
  const [panel, setPanel] = useState<Panel>("where");

  function search() {
    router.navigate({
      pathname: "/(tabs)",
      params: {
        q: query.trim(),
        mode: mode === "all" ? "" : mode,
        type: type ?? "",
        priceMax: priceMax ? String(priceMax) : "",
      },
    });
  }

  function clearAll() {
    setQuery("");
    setType(undefined);
    setPriceMax(undefined);
    setMode("all");
    setPanel("where");
  }

  const priceLabel = pricePresets(mode).find((p) => p.value === priceMax)?.label ?? "Any price";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <IconButton icon="close" variant="outline" size={36} onPress={() => router.back()} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeTabs}>
          {categories.map((c) => (
            <Pressable key={c.key} onPress={() => setMode(c.key)} style={styles.modeTab}>
              <Text style={[styles.modeLabel, mode === c.key && styles.modeLabelActive]}>{c.label}</Text>
              <View style={[styles.modeUnderline, mode === c.key && styles.modeUnderlineActive]} />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Where */}
        {panel === "where" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Where to?</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={colors.text} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search destinations"
                placeholderTextColor={colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={search}
                returnKeyType="search"
                autoFocus
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.destinations} contentContainerStyle={{ gap: spacing.md }}>
              {destinations.map((d) => {
                const active = query.toLowerCase() === d.name.toLowerCase();
                return (
                  <Pressable key={d.name} onPress={() => setQuery(d.name)} style={styles.destination}>
                    <Image
                      source={{ uri: `https://picsum.photos/seed/${encodeURIComponent(d.name)}/300/300` }}
                      style={[styles.destinationImage, active && styles.destinationImageActive]}
                    />
                    <Text style={styles.destinationName}>{d.name}</Text>
                    <Text style={styles.destinationHint}>{d.hint}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <CollapsedRow label="Where" value={query || "I'm flexible"} onPress={() => setPanel("where")} />
        )}

        {/* Type */}
        {panel === "type" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>What type of home?</Text>
            <View style={styles.chipRow}>
              <Chip label="Any type" active={!type} onPress={() => setType(undefined)} />
              {propertyTypes.map((t) => (
                <Chip key={t} label={propertyTypeLabel[t]} active={type === t} onPress={() => setType(t)} />
              ))}
            </View>
          </View>
        ) : (
          <CollapsedRow label="Type" value={type ? propertyTypeLabel[type] : "Any type"} onPress={() => setPanel("type")} />
        )}

        {/* Price */}
        {panel === "price" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>What's your budget?</Text>
            <View style={styles.chipRow}>
              {pricePresets(mode).map((p) => (
                <Chip key={p.label} label={p.label} active={priceMax === p.value} onPress={() => setPriceMax(p.value)} />
              ))}
            </View>
          </View>
        ) : (
          <CollapsedRow label="Budget" value={priceLabel} onPress={() => setPanel("price")} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Clear all" variant="link" onPress={clearAll} />
        <Button label="Search" icon="search" onPress={search} style={{ paddingHorizontal: spacing.lg }} />
      </View>
    </SafeAreaView>
  );
}

function CollapsedRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.collapsed}>
      <Text style={styles.collapsedLabel}>{label}</Text>
      <Text style={styles.collapsedValue}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSecondary },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.bgSecondary },
  modeTabs: { paddingLeft: spacing.md, gap: spacing.lg, alignItems: "center" },
  modeTab: { alignItems: "center" },
  modeLabel: { ...typography.bodyMedium, color: colors.textSecondary },
  modeLabelActive: { color: colors.text, fontWeight: "600" },
  modeUnderline: { height: 2, alignSelf: "stretch", marginTop: 4, backgroundColor: "transparent" },
  modeUnderlineActive: { backgroundColor: colors.text },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  panel: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, ...shadow.card },
  panelTitle: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 56,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  destinations: { marginTop: spacing.lg, marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  destination: { width: 120 },
  destinationImage: { width: 120, height: 120, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSecondary },
  destinationImageActive: { borderWidth: 2, borderColor: colors.text },
  destinationName: { ...typography.smallMedium, color: colors.text, marginTop: spacing.sm },
  destinationHint: { ...typography.micro, color: colors.textSecondary },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  collapsed: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2, ...shadow.float,
  },
  collapsedLabel: { ...typography.small, color: colors.textSecondary },
  collapsedValue: { ...typography.smallBold, color: colors.text },
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
});
