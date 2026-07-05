import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { sendPasswordReset } from "../../lib/auth/service";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setLoading(true);
    await sendPasswordReset(email);
    setLoading(false);
    setSent(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>We'll send a reset link to your email.</Text>

        {sent ? (
          <Text style={styles.success}>If an account exists for {email}, a reset link has been sent.</Text>
        ) : (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted} />
            <Button label="Send reset link" loading={loading} onPress={handleSend} style={{ marginTop: spacing.lg }} />
          </>
        )}

        <Pressable onPress={() => router.replace("/auth/login")} style={{ marginTop: spacing.lg }}>
          <Text style={styles.link}>Back to login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  title: { ...typography.display, color: colors.navy },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.xl },
  label: { ...typography.bodyMedium, color: colors.navy, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.navy, ...typography.body,
  },
  success: { ...typography.body, color: colors.success },
  link: { ...typography.small, color: colors.gold, fontWeight: "600", textAlign: "center" },
});
