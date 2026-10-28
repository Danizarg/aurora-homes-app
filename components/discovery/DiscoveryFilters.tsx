import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Divider } from "../ui/Divider";
import { ScreenHeader } from "../ui/ScreenHeader";
import { propertyTypeLabel } from "../../lib/listings/presentation";
import { pricePresets } from "../../lib/listings/filter";
import { useDiscovery } from "../../lib/store/discovery";
import type { Listing } from "../../types";
import type { DistanceConstraint, ProximityKind, SearchCriteria } from "../../types/search";

const propertyTypes = Object.keys(propertyTypeLabel) as Listing["property_type"][];
const propertyIcons: Record<Listing["property_type"], keyof typeof Ionicons.glyphMap> = {
  apartment: "business-outline", villa: "home-outline", townhouse: "storefront-outline", studio: "cube-outline", loft: "layers-outline", house: "home",
};
const nearOptions: { kind: ProximityKind; label: string; icon: keyof typeof Ionicons.glyphMap; km: number }[] = [
  { kind: "sea", label: "Coast", icon: "water-outline", km: 1.5 },
  { kind: "beach", label: "Beach", icon: "sunny-outline", km: 1.2 },
  { kind: "supermarket", label: "Supermarket", icon: "cart-outline", km: 1 },
  { kind: "school", label: "School", icon: "school-outline", km: 2 },
  { kind: "transport", label: "Transport", icon: "bus-outline", km: 1 },
  { kind: "restaurants", label: "Restaurants", icon: "restaurant-outline", km: 1 },
  { kind: "gym", label: "Gym", icon: "barbell-outline", km: 1.5 },
  { kind: "airport", label: "Airport", icon: "airplane-outline", km: 15 },
];

export function countActiveCriteria(c: SearchCriteria) {
  let n = 0;
  if (c.propertyTypes?.length) n++;
  if (c.budgetMax != null || c.budgetMin != null) n++;
  if (c.bedroomsMin) n++;
  if (c.bathroomsMin) n++;
  if (c.areaMin || c.areaMax) n++;
  for (const k of ["pool", "garage", "furnished", "seaView", "pets", "verifiedOnly"] as const) if (c[k]) n++;
  if (c.distance?.length) n += c.distance.length;
  if (c.rentalDuration) n++;
  return n;
}

interface DiscoveryFiltersProps {
  visible: boolean;
  onClose: () => void;
}

/** The same Airbnb filter sheet, now writing straight into the shared criteria Suza also edits. */
export function DiscoveryFilters({ visible, onClose }: DiscoveryFiltersProps) {
  const c = useDiscovery((s) => s.criteria);
  const intent = useDiscovery((s) => s.intent);
  const set = useDiscovery((s) => s.setCriteria);
  const clear = useDiscovery((s) => s.clearFilters);
  const count = useDiscovery((s) => s.result?.items.length ?? 0);
  const isRental = intent !== "buy";

  function toggleType(t: Listing["property_type"]) {
    const current = c.propertyTypes ?? [];
    set({ propertyTypes: current.includes(t) ? current.filter((x) => x !== t) : [...current, t] });
  }
  function toggleNear(opt: (typeof nearOptions)[number]) {
    const current = c.distance ?? [];
    const exists = current.some((d) => d.to === opt.kind);
    const next: DistanceConstraint[] = exists ? current.filter((d) => d.to !== opt.kind) : [...current, { to: opt.kind, maxKm: opt.km }];
    set({ distance: next });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader title="Filters" leading="close" onLeading={onClose} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Property type</Text>
          <View style={styles.tileGrid}>
            {propertyTypes.map((t) => {
              const active = c.propertyTypes?.includes(t);
              return (
                <Pressable key={t} onPress={() => toggleType(t)} style={[styles.tile, active && styles.tileActive]}>
                  <Ionicons name={propertyIcons[t]} size={26} color={colors.text} />
                  <Text style={styles.tileLabel}>{propertyTypeLabel[t]}</Text>
                </Pressable>
              );
            })}
          </View>

          <Divider />
          <Text style={styles.sectionTitle}>Price range</Text>
          <Text style={styles.sectionBody}>{isRental ? "Monthly rent, before utilities" : "Asking price"}</Text>
          <View style={styles.chipRow}>
            {pricePresets(intent === "buy" ? "buy" : "rent").map((p) => (
              <Chip key={p.label} label={p.label} active={c.budgetMax === p.value} onPress={() => set({ budgetMax: p.value })} />
            ))}
          </View>

          <Divider />
          <Text style={styles.sectionTitle}>Rooms</Text>
          <Stepper label="Bedrooms" value={c.bedroomsMin ?? 0} onChange={(v) => set({ bedroomsMin: v || undefined })} />
          <Stepper label="Bathrooms" value={c.bathroomsMin ?? 0} onChange={(v) => set({ bathroomsMin: v || undefined })} />

          <Divider />
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.chipRow}>
            <Chip label="Pool" icon="water-outline" active={!!c.pool} onPress={() => set({ pool: !c.pool || undefined })} />
            <Chip label="Sea view" icon="sunny-outline" active={!!c.seaView} onPress={() => set({ seaView: !c.seaView || undefined })} />
            <Chip label="Parking" icon="car-outline" active={!!c.garage} onPress={() => set({ garage: !c.garage || undefined })} />
            {isRental ? (
              <>
                <Chip label="Pets allowed" icon="paw-outline" active={!!c.pets} onPress={() => set({ pets: !c.pets || undefined })} />
                <Chip label="Furnished" icon="bed-outline" active={!!c.furnished} onPress={() => set({ furnished: !c.furnished || undefined })} />
              </>
            ) : null}
          </View>

          <Divider />
          <Text style={styles.sectionTitle}>Near</Text>
          <Text style={styles.sectionBody}>Real straight-line distances from OpenStreetMap data.</Text>
          <View style={styles.chipRow}>
            {nearOptions.map((o) => (
              <Chip key={o.kind} label={`${o.label} · ${o.km} km`} icon={o.icon} active={!!c.distance?.some((d) => d.to === o.kind)} onPress={() => toggleNear(o)} />
            ))}
          </View>

          <Divider />
          <Text style={styles.sectionTitle}>Trust</Text>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={styles.toggleTitle}>Verified homes only</Text>
              <Text style={styles.toggleBody}>Properties checked against proof of ownership.</Text>
            </View>
            <Switch value={!!c.verifiedOnly} onValueChange={(v) => set({ verifiedOnly: v || undefined })} trackColor={{ true: colors.text, false: colors.border }} thumbColor={colors.white} />
          </View>

          <Divider />
          <Text style={styles.sectionTitle}>Sort</Text>
          {([["recommended", "Recommended"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"]] as const).map(([key, label]) => (
            <Pressable key={key} style={styles.radioRow} onPress={() => set({ sort: key })}>
              <Text style={styles.radioLabel}>{label}</Text>
              <View style={[styles.radio, (c.sort ?? "recommended") === key && styles.radioActive]}>
                {(c.sort ?? "recommended") === key ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Clear all" variant="link" onPress={clear} />
          <Button label={count === 1 ? "Show 1 home" : `Show ${count} homes`} variant="dark" onPress={onClose} style={{ minWidth: 160 }} />
        </View>
      </SafeAreaView>
    </Modal>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  sectionBody: { ...typography.small, color: colors.textSecondary, marginTop: -spacing.sm, marginBottom: spacing.md },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 4 },
  tile: { width: "31%", height: 92, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 4, justifyContent: "space-between", backgroundColor: colors.white },
  tileActive: { borderWidth: 2, borderColor: colors.text, backgroundColor: colors.bgSecondary },
  tileLabel: { ...typography.smallMedium, fontSize: 13, color: colors.text },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md },
  stepperLabel: { ...typography.body, color: colors.text },
  stepperControls: { flexDirection: "row", alignItems: "center" },
  stepperButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.textSecondary, alignItems: "center", justifyContent: "center" },
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
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.white, ...shadow.bar },
});
