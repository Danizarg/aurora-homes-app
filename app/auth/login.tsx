import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { signIn } from "../../lib/auth/service";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to manage your listings and messages.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted} />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={colors.muted} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Log in" loading={loading} onPress={handleLogin} style={{ marginTop: spacing.lg }} />

        <Pressable onPress={() => router.push("/auth/forgot-password")} style={{ marginTop: spacing.md }}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/auth/signup")} style={{ marginTop: spacing.sm }}>
          <Text style={styles.link}>Don't have an account? Sign up</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/(tabs)")} style={{ marginTop: spacing.xl }}>
          <Text style={styles.skipLink}>Continue without an account</Text>
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
  label: { ...typography.bodyMedium, color: colors.navy, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.navy, ...typography.body,
  },
  error: { ...typography.small, color: colors.error, marginTop: spacing.sm },
  link: { ...typography.small, color: colors.gold, fontWeight: "600", textAlign: "center" },
  skipLink: { ...typography.small, color: colors.muted, textAlign: "center" },
});
