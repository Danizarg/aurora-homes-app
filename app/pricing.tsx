import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../constants/theme";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";

export default function PricingScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <SectionHeader eyebrow="Pricing" title="Transparent, low-fee by design" subtitle="Aurora Homes is built around a lower platform fee than traditional agencies, with every cost shown upfront." />

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>Example: real price at move-in</Text>
          <PriceRow label="Monthly rent" value="1,200 €" />
          <PriceRow label="Utilities" value="150 €" />
          <PriceRow label="Deposit" value="1,200 €" />
          <PriceRow label="Platform fee" value="0–3%" />
          <View style={styles.divider} />
          <PriceRow label="Total due at move-in" value="2,550 €" emphasize />
        </Card>

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>No hidden costs</Text>
          <Text style={styles.cardBody}>Every fee is shown on the listing before you contact the owner or request a viewing. No surprise charges at signing.</Text>
        </Card>

        <Card style={styles.disclaimer}>
          <Text style={styles.cardTitle}>Disclaimer</Text>
          <Text style={styles.cardBody}>Exact fee structure will be announced before launch. Aurora Homes does not process payments, rent, or deposits in the MVP.</Text>
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
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  cardTitle: { ...typography.h3, color: colors.navy, marginBottom: spacing.sm },
  cardBody: { ...typography.small, color: colors.muted },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  priceLabel: { ...typography.small, color: colors.muted },
  priceLabelEmphasize: { color: colors.navy, fontWeight: "700" },
  priceValue: { ...typography.small, color: colors.navy },
  priceValueEmphasize: { ...typography.bodyMedium, color: colors.gold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  disclaimer: { backgroundColor: colors.ivoryDeep },
});
