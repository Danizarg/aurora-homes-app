import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
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
      <ScreenHeader title="Forgot password?" leading="back" />
      <View style={styles.content}>
        <Text style={styles.subtitle}>Enter the email address associated with your account and we'll send you a link to reset your password.</Text>

        {sent ? (
          <Text style={styles.success}>If an account exists for {email}, a reset link has been sent.</Text>
        ) : (
          <>
            <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
            <Button label="Send reset link" variant="dark" loading={loading} onPress={handleSend} />
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
  link: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline" },
});
