import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../constants/theme";
import { Card } from "../components/ui/Card";
import { Divider } from "../components/ui/Divider";
import { ScreenHeader } from "../components/ui/ScreenHeader";

/**
 * Pricing, as decided 2026-10-08: tenants and buyers pay nothing; owners
 * pay a flat €20/month while a listing is live; Zouza takes no transaction
 * fees of any kind. Mirrors /pricing on zouza.ai — keep the two in step.
 */
export default function PricingScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader leading="back" border={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>No fees. One subscription.</Text>
        <Text style={styles.subtitle}>Searching, browsing, talking to Suzi and enquiring are free. Owners pay a flat €20 a month while a listing is live.</Text>

        <View style={styles.plans}>
          <Card>
            <Text style={styles.planWho}>Tenants and buyers</Text>
            <Text style={styles.planPrice}>Free</Text>
            <Text style={styles.planBody}>Search, save homes, ask Suzi anything, message owners and request viewings. Nothing is added to the rent or the price, at any point.</Text>
          </Card>
          <Card>
            <Text style={styles.planWho}>Owners</Text>
            <Text style={styles.planPrice}>
              €20 <Text style={styles.planUnit}>/ month</Text>
            </Text>
            <Text style={styles.planBody}>Creating and previewing a listing is free. The subscription starts when you publish and keeps the listing live. Cancel any month, no contract.</Text>
          </Card>
        </View>

        <Divider />

        <Text style={styles.sectionTitle}>Price details</Text>
        <Text style={styles.sectionBody}>Example: what a tenant pays at move-in on a €1,200 rental</Text>
        <PriceRow label="Monthly rent" value="€1,200" />
        <PriceRow label="Utilities (est.)" value="€150" />
        <PriceRow label="Deposit" value="€1,200" />
        <PriceRow label="Zouza fee" value="€0" />
        <View style={styles.totalDivider} />
        <PriceRow label="Total due at move-in" value="€2,550" emphasize />
        <Text style={[styles.sectionBody, { marginTop: spacing.sm }]}>Every euro goes to the owner or comes back to you as the deposit.</Text>

        <Divider />

        <Card variant="flat">
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
      <Text style={[styles.priceText, emphasize && styles.priceEmphasis]}>{label}</Text>
      <Text style={[styles.priceText, emphasize && styles.priceEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xl },
  plans: { gap: spacing.md },
  planWho: { ...typography.smallBold, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  planPrice: { ...typography.display, color: colors.text, marginTop: spacing.sm },
  planUnit: { ...typography.body, color: colors.textSecondary },
  planBody: { ...typography.small, lineHeight: 20, color: colors.textSecondary, marginTop: spacing.sm },
  sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  sectionBody: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  priceText: { ...typography.body, color: colors.text },
  priceEmphasis: { fontWeight: "600" },
  totalDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  cardTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs },
  cardBody: { ...typography.small, color: colors.textSecondary },
});
