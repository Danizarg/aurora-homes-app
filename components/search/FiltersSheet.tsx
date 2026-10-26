import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Divider } from "../ui/Divider";
import { ScreenHeader } from "../ui/ScreenHeader";
import { defaultFilters, pricePresets, type FiltersState, type SortOrder, sortLabels } from "../../lib/listings/filter";
import { propertyTypeLabel } from "../../lib/listings/presentation";
import type { Listing, ListingMode } from "../../types";

interface FiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: FiltersState;
  onChange: (f: FiltersState) => void;
  sort: SortOrder;
  onSortChange: (s: SortOrder) => void;
  mode: ListingMode | "all";
  resultCount: number;
}

const propertyTypes = Object.keys(propertyTypeLabel) as Listing["property_type"][];
const propertyIcons: Record<Listing["property_type"], keyof typeof Ionicons.glyphMap> = {
  apartment: "business-outline",
  villa: "home-outline",
  townhouse: "storefront-outline",
  studio: "cube-outline",
  loft: "layers-outline",
  house: "home",
};

/** Airbnb "Filters" sheet: centered title, sectioned content with hairlines, sticky "Clear all / Show N homes" bar. */
export function FiltersSheet({ visible, onClose, filters, onChange, sort, onSortChange, mode, resultCount }: FiltersSheetProps) {
  const isRental = mode !== "buy";
  const set = (patch: Partial<FiltersState>) => onChange({ ...filters, ...patch });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader title="Filters" leading="close" onLeading={onClose} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Property type</Text>
          <View style={styles.tileGrid}>
            <TypeTile label="Any type" icon="grid-outline" active={!filters.propertyType} onPress={() => set({ propertyType: undefined })} />
            {propertyTypes.map((t) => (
              <TypeTile
                key={t}
                label={propertyTypeLabel[t]}
                icon={propertyIcons[t]}
                active={filters.propertyType === t}
                onPress={() => set({ propertyType: t })}
              />
            ))}
          </View>

          <Divider />

          <Text style={styles.sectionTitle}>Price range</Text>
          <Text style={styles.sectionBody}>{isRental ? "Monthly rent, before utilities" : "Asking price"}</Text>
          <View style={styles.chipRow}>
            {pricePresets(mode).map((p) => (
              <Chip key={p.label} label={p.label} active={filters.priceMax === p.value} onPress={() => set({ priceMax: p.value })} />
            ))}
          </View>

          <Divider />

          <Text style={styles.sectionTitle}>Rooms</Text>
          <Stepper label="Bedrooms" value={filters.bedroomsMin} onChange={(v) => set({ bedroomsMin: v })} />
          <Stepper label="Bathrooms" value={filters.bathroomsMin} onChange={(v) => set({ bathroomsMin: v })} />

          <Divider />

          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.chipRow}>
            <Chip label="Pool" icon="water-outline" active={filters.pool} onPress={() => set({ pool: !filters.pool })} />
            <Chip label="Sea view" icon="sunny-outline" active={filters.seaView} onPress={() => set({ seaView: !filters.seaView })} />
            <Chip label="Garage" icon="car-outline" active={filters.garage} onPress={() => set({ garage: !filters.garage })} />
            {isRental ? (
              <>
                <Chip label="Pets allowed" icon="paw-outline" active={filters.petsAllowed} onPress={() => set({ petsAllowed: !filters.petsAllowed })} />
                <Chip label="Furnished" icon="bed-outline" active={filters.furnished} onPress={() => set({ furnished: !filters.furnished })} />
              </>
            ) : null}
          </View>

          <Divider />

          <Text style={styles.sectionTitle}>Trust</Text>
          <ToggleRow
            title="Verified homes only"
            body="Properties checked against proof of ownership."
            value={filters.verifiedOnly}
            onChange={(v) => set({ verifiedOnly: v })}
          />
          <ToggleRow
            title="Direct owner"
            body="Listed by a verified owner, no agency in between."
            value={filters.directOwner}
            onChange={(v) => set({ directOwner: v })}
          />

          <Divider />

          <Text style={styles.sectionTitle}>Sort</Text>
          {(Object.keys(sortLabels) as SortOrder[]).map((key) => (
            <Pressable key={key} style={styles.radioRow} onPress={() => onSortChange(key)}>
              <Text style={styles.radioLabel}>{sortLabels[key]}</Text>
              <View style={[styles.radio, sort === key && styles.radioActive]}>
                {sort === key ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Clear all" variant="link" onPress={() => { onChange(defaultFilters); onSortChange("recommended"); }} />
          <Button
            label={resultCount === 1 ? "Show 1 home" : `Show ${resultCount} homes`}
            variant="dark"
            onPress={onClose}
            style={{ minWidth: 160 }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function TypeTile({ label, icon, active, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, active && styles.tileActive]}>
      <Ionicons name={icon} size={26} color={colors.text} />
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable onPress={() => onChange(Math.max(0, value - 1))} disabled={value === 0} style={[styles.stepperButton, value === 0 && styles.stepperDisabled]}>
          <Ionicons name="remove" size={18} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.stepperValue}>{value === 0 ? "Any" : `${value}+`}</Text>
        <Pressable onPress={() => onChange(Math.min(8, value + 1))} style={styles.stepperButton}>
          <Ionicons name="add" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

function ToggleRow({ title, body, value, onChange }: { title: string; body: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleBody}>{body}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.text, false: colors.border }} thumbColor={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  sectionBody: { ...typography.small, color: colors.textSecondary, marginTop: -spacing.sm, marginBottom: spacing.md },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 4 },
  tile: {
    width: "31%", height: 92, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm + 4, justifyContent: "space-between", backgroundColor: colors.white,
  },
  tileActive: { borderWidth: 2, borderColor: colors.text, backgroundColor: colors.bgSecondary },
  tileLabel: { ...typography.smallMedium, fontSize: 13, color: colors.text },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md },
  stepperLabel: { ...typography.body, color: colors.text },
  stepperControls: { flexDirection: "row", alignItems: "center" },
  stepperButton: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.textSecondary,
    alignItems: "center", justifyContent: "center",
  },
  stepperDisabled: { opacity: 0.3 },
  stepperValue: { ...typography.body, color: colors.text, width: 56, textAlign: "center" },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md },
  toggleTitle: { ...typography.body, color: colors.text },
  toggleBody: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  radioRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md - 2 },
  radioLabel: { ...typography.body, color: colors.text },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.textSecondary, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.text, backgroundColor: colors.text },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.white, ...shadow.bar,
  },
});
