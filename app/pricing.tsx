import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../constants/theme";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";

/**
 * Pricing, as decided 2026-10-08: tenants and buyers pay nothing; owners
 * pay a flat €20/month while a listing is live; Zouza takes no transaction
 * fees of any kind. Mirrors /pricing on zouza.ai — keep the two in step.
 */
export default function PricingScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <SectionHeader eyebrow="Pricing" title="No fees. One subscription." subtitle="Searching, browsing, talking to Suzi and enquiring are free. Owners pay a flat €20 a month while a listing is live." />

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>Tenants and buyers</Text>
          <Text style={styles.price}>Free</Text>
          <Text style={styles.cardBody}>Search, save homes, ask Suzi anything, message owners and request viewings. Nothing is added to the rent or the price, at any point.</Text>
        </Card>

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>Owners</Text>
          <Text style={styles.price}>€20 / month</Text>
          <Text style={styles.cardBody}>Creating and previewing a listing is free. The subscription starts when you publish and keeps the listing live. Cancel any month, no contract.</Text>
        </Card>

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>Example: what a tenant pays at move-in</Text>
          <PriceRow label="Monthly rent" value="1,200 €" />
          <PriceRow label="Utilities" value="150 €" />
          <PriceRow label="Deposit" value="1,200 €" />
          <PriceRow label="Zouza fee" value="0 €" />
          <View style={styles.divider} />
          <PriceRow label="Total due at move-in" value="2,550 €" emphasize />
          <Text style={[styles.cardBody, { marginTop: spacing.sm }]}>Every euro goes to the owner or comes back to you as the deposit.</Text>
        </Card>

        <Card style={styles.disclaimer}>
          <Text style={styles.cardTitle}>What Zouza does not do</Text>
          <Text style={styles.cardBody}>Zouza does not process payments, collect rent, hold deposits or give legal, tax or financial advice. Agreements are made directly between owner and tenant or buyer.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function PriceRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, emphasize && styles.priceLabelEmphasize]}>{label}</Text>
      <Text style={[styles.priceValue, emphasize && styles.priceValueEmphasize]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  cardTitle: { ...typography.h3, color: colors.ink, marginBottom: spacing.sm },
  cardBody: { ...typography.small, color: colors.muted },
  price: { ...typography.h1, color: colors.ink, marginBottom: spacing.sm },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  priceLabel: { ...typography.small, color: colors.muted },
  priceLabelEmphasize: { color: colors.ink, fontWeight: "700" },
  priceValue: { ...typography.small, color: colors.ink },
  priceValueEmphasize: { ...typography.bodyMedium, color: colors.brand600 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  disclaimer: { backgroundColor: colors.paper2 },
});
