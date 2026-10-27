import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, motion, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Divider } from "../ui/Divider";
import { IconButton } from "../ui/IconButton";

interface Step {
  title: string;
  body: string;
}

interface HostLandingProps {
  title: string;
  subtitle?: string;
  imageSeed: string;
  stepsTitle: string;
  steps: Step[];
  disclaimer?: { title: string; body: string };
  ctaLabel?: string;
}

/** Airbnb "Airbnb your home" landing: huge headline, hero image, numbered steps, sticky "Get started" bar. */
export function HostLanding({ title, subtitle, imageSeed, stepsTitle, steps, disclaimer, ctaLabel = "Get started" }: HostLandingProps) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" variant="outline" size={36} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Image source={{ uri: `https://picsum.photos/seed/${imageSeed}/900/600` }} style={styles.hero} contentFit="cover" transition={motion.image} />

        <Text style={styles.stepsTitle}>{stepsTitle}</Text>
        {steps.map((s, i) => (
          <View key={s.title} style={[styles.step, i === steps.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={styles.stepNumber}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepBody}>{s.body}</Text>
            </View>
          </View>
        ))}

        {disclaimer ? (
          <>
            <Divider />
            <Card variant="flat">
              <Text style={styles.disclaimerTitle}>{disclaimer.title}</Text>
              <Text style={styles.disclaimerBody}>{disclaimer.body}</Text>
            </Card>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button label={ctaLabel} onPress={() => router.push("/create-listing")} style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  title: { ...typography.display, color: colors.text, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  hero: { width: "100%", height: 220, borderRadius: radius.lg, marginTop: spacing.lg, backgroundColor: colors.bgSecondary },
  stepsTitle: { ...typography.h2, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  step: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  stepNumber: { ...typography.h3, color: colors.text, width: 24 },
  stepTitle: { ...typography.bodyBold, color: colors.text },
  stepBody: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  disclaimerTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs },
  disclaimerBody: { ...typography.small, color: colors.textSecondary },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.divider, ...shadow.bar,
  },
});
