import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../constants/theme";
import { Card } from "../components/ui/Card";
import { Divider } from "../components/ui/Divider";
import { ScreenHeader } from "../components/ui/ScreenHeader";

export default function PricingScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader leading="back" border={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Transparent, low-fee by design</Text>
        <Text style={styles.subtitle}>Aurora Homes is built around a lower platform fee than traditional agencies, with every cost shown upfront.</Text>

        <Text style={styles.sectionTitle}>Price details</Text>
        <Text style={styles.sectionBody}>Example: a €1,200 rental at move-in</Text>
        <PriceRow label="Monthly rent" value="€1,200" />
        <PriceRow label="Utilities (est.)" value="€150" />
        <PriceRow label="Deposit" value="€1,200" />
        <PriceRow label="Aurora Homes fee" value="0–3%" />
        <View style={styles.totalDivider} />
        <PriceRow label="Total due at move-in" value="€2,550" emphasize />

        <Divider />

        <Text style={styles.sectionTitle}>No hidden costs</Text>
        <Text style={styles.body}>Every fee is shown on the listing before you contact the owner or request a viewing. No surprise charges at signing.</Text>

        <Divider />

        <Card variant="flat">
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
  sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  sectionBody: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.text },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  priceText: { ...typography.body, color: colors.text },
  priceEmphasis: { fontWeight: "600" },
  totalDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  cardTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs },
  cardBody: { ...typography.small, color: colors.textSecondary },
});
