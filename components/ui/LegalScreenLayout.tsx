import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../../constants/theme";
import { ScreenHeader } from "./ScreenHeader";

interface LegalScreenLayoutProps {
  title: string;
  paragraphs: string[];
}

export function LegalScreenLayout({ title, paragraphs }: LegalScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader leading="back" border={false} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>{p}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.display, color: colors.text, marginBottom: spacing.lg },
  paragraph: { ...typography.body, color: colors.text, marginBottom: spacing.md },
});
