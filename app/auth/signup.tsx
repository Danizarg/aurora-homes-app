import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { signUp } from "../../lib/auth/service";

export default function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup() {
    setLoading(true);
    setError(null);
    const result = await signUp(fullName, email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Finish signing up" leading="back" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Jane Owner" helper="Make sure this matches the name on your ID." />
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" helper="We'll email you listing enquiries and viewing confirmations." />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.terms}>
          By selecting Agree and continue, I agree to Aurora Homes' Terms of Service and acknowledge the Privacy Policy.
        </Text>

        <Button label="Agree and continue" loading={loading} onPress={handleSignup} style={{ marginTop: spacing.md }} />

        <Pressable onPress={() => router.replace("/auth/login")} style={{ marginTop: spacing.lg, alignSelf: "center" }}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  error: { ...typography.small, color: colors.error, marginBottom: spacing.sm },
  terms: { ...typography.micro, lineHeight: 18, color: colors.textSecondary, marginTop: spacing.sm },
  link: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline" },
});
