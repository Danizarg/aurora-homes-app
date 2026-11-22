import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { resendConfirmation, signUp } from "../../lib/auth/service";
import { authErrorMessage } from "../../lib/auth/errors";
import { checkSignup, normalizeEmail } from "../../lib/auth/validate";
import { useLeaveAuth } from "../../lib/auth/useLeaveAuth";

export default function SignupScreen() {
  const leave = useLeaveAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSignup() {
    const problem = checkSignup({ fullName, email, password });
    if (problem) return setError(problem);
    setLoading(true);
    setError(null);
    try {
      const result = await signUp(fullName, email, password);
      if (!result.ok) setError(authErrorMessage(result.code));
      else if (result.needsConfirmation) setSentTo(normalizeEmail(email));
      else leave();
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) return <CheckEmail email={sentTo} />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Finish signing up" leading="back" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
        <TextField label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" placeholder="Jane Owner" />
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" textContentType="emailAddress" keyboardType="email-address" placeholder="you@example.com" helper="We'll email you listing enquiries and viewing confirmations." />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="At least 8 characters" helper="At least 8 characters" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.terms}>
          By selecting Agree and continue, I agree to Zouza’s{" "}
          <Text style={styles.termsLink} accessibilityRole="link" onPress={() => router.push("/legal/terms")}>
            Terms of Service
          </Text>{" "}
          and acknowledge the{" "}
          <Text style={styles.termsLink} accessibilityRole="link" onPress={() => router.push("/legal/privacy")}>
            Privacy Policy
          </Text>
          .
        </Text>

        <Button label="Agree and continue" loading={loading} onPress={handleSignup} style={{ marginTop: spacing.md }} />

        <Pressable onPress={() => router.replace("/auth/login")} style={{ marginTop: spacing.lg, alignSelf: "center" }}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Shown after sign-up while the confirmation email is on its way. Its link opens app/auth/callback. */
function CheckEmail({ email }: { email: string }) {
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function handleResend() {
    setSending(true);
    setNote(null);
    try {
      const r = await resendConfirmation(email);
      setNote(r.ok ? "Sent." : authErrorMessage(r.code));
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Check your email" leading="back" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Check your email</Text>
        <Text style={styles.body}>We sent a link to {email}. Open it on this iPhone to finish signing up.</Text>
        <Button label="Resend email" variant="outline" loading={sending} onPress={handleResend} style={{ marginTop: spacing.lg }} />
        {note ? <Text style={styles.note}>{note}</Text> : null}
        <Pressable onPress={() => router.replace("/auth/login")} style={{ marginTop: spacing.lg, alignSelf: "center" }}>
          <Text style={styles.link}>Back to log in</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  body: { ...typography.body, color: colors.text },
  note: { ...typography.small, color: colors.textSecondary, marginTop: spacing.sm },
  error: { ...typography.small, color: colors.error, marginBottom: spacing.sm },
  terms: { ...typography.micro, lineHeight: 18, color: colors.textSecondary, marginTop: spacing.sm },
  termsLink: { color: colors.text, textDecorationLine: "underline" },
  link: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline" },
});
