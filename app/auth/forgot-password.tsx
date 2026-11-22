import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { sendPasswordReset } from "../../lib/auth/service";
import { authErrorMessage } from "../../lib/auth/errors";
import { normalizeEmail } from "../../lib/auth/validate";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const address = normalizeEmail(email);
    if (!address) return setError("Enter your email.");
    setLoading(true);
    setError(null);
    try {
      const r = await sendPasswordReset(address);
      if (r.ok) setSentTo(address);
      else setError(authErrorMessage(r.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Forgot password?" leading="back" />
      <View style={styles.content}>
        <Text style={styles.subtitle}>Enter the email address associated with your account and we’ll send you a link to reset your password.</Text>

        {sentTo ? (
          <Text style={styles.success}>If an account exists for {sentTo}, a reset link has been sent. Open the link on this iPhone.</Text>
        ) : (
          <>
            <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" textContentType="emailAddress" keyboardType="email-address" placeholder="you@example.com" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Send reset link" loading={loading} onPress={handleSend} />
          </>
        )}

        <Pressable onPress={() => router.replace("/auth/login")} style={{ marginTop: spacing.xl, alignSelf: "center" }}>
          <Text style={styles.link}>Back to login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  subtitle: { ...typography.body, color: colors.text, marginBottom: spacing.lg },
  success: { ...typography.body, color: colors.success },
  error: { ...typography.small, color: colors.error, marginBottom: spacing.sm },
  link: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline" },
});
