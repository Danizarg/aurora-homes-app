import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";

interface SearchPillProps {
  onPress: () => void;
  /** Collapsed state ("Start your search") when no query is set. */
  query?: string;
  subtitle?: string;
}

/** The Airbnb search pill: white, fully rounded, soft shadow, search icon on the left. */
export function SearchPill({ onPress, query, subtitle }: SearchPillProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      <Ionicons name="search" size={18} color={colors.text} style={styles.icon} />
      {query ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.query} numberOfLines={1}>{query}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      ) : (
        <Text style={styles.placeholder}>Start your search</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md + 4,
    ...shadow.search,
  },
  pressed: { backgroundColor: colors.bgSecondary },
  icon: { marginRight: spacing.sm + 4 },
  placeholder: { ...typography.smallBold, color: colors.text },
  query: { ...typography.smallBold, color: colors.text },
  subtitle: { ...typography.micro, color: colors.textSecondary, marginTop: 1 },
});
