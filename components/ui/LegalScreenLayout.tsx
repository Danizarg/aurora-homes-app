import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../constants/theme";

interface LegalScreenLayoutProps {
  title: string;
  paragraphs: string[];
}

export function LegalScreenLayout({ title, paragraphs }: LegalScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>{p}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.navy, marginBottom: spacing.lg },
  paragraph: { ...typography.body, color: colors.navy, marginBottom: spacing.md, lineHeight: 22 },
});
