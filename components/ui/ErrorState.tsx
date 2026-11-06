import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../constants/theme";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  subtitle?: string;
  /** Omit when there is nothing to retry; the state then only explains. */
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * The failure counterpart to EmptyState, laid out the same way so a screen
 * can swap one for the other: left-aligned heading, grey body, dark button.
 * Use it wherever a load can fail, instead of leaving the screen blank.
 */
export function ErrorState({
  title = "Something went wrong",
  subtitle = "Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={32} color={colors.text} style={{ marginBottom: spacing.md }} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {onRetry ? (
        <Button label={retryLabel} variant="dark" onPress={onRetry} style={{ alignSelf: "flex-start", marginTop: spacing.lg }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xl },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
});
