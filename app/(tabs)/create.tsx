import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { SectionHeader } from "../../components/ui/SectionHeader";

export default function CreateIntentScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.content}>
        <SectionHeader
          eyebrow="Create a listing"
          title="What would you like to do?"
          subtitle="Aurora will build your exposé, FAQ, translations, and property AI assistant automatically."
        />

        <Pressable
          style={styles.optionCard}
          onPress={() => router.push({ pathname: "/create-listing", params: { intent: "rent_out" } })}
        >
          <Ionicons name="key-outline" size={26} color={colors.gold} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.optionTitle}>Rent out my property</Text>
            <Text style={styles.optionSubtitle}>Create a professional rental listing in minutes.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        <Pressable
          style={styles.optionCard}
          onPress={() => router.push({ pathname: "/create-listing", params: { intent: "sell" } })}
        >
          <Ionicons name="pricetag-outline" size={26} color={colors.gold} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.optionTitle}>Sell my property</Text>
            <Text style={styles.optionSubtitle}>Agency-level presentation, without the agency process.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg },
  optionCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, ...shadow.soft,
  },
  optionTitle: { ...typography.h3, color: colors.navy },
  optionSubtitle: { ...typography.small, color: colors.muted, marginTop: 2 },
});
