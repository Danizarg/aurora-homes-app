import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
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
      <View style={styles.content}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>List a property or save your favourite homes.</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Jane Owner" placeholderTextColor={colors.muted} />
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted} />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={colors.muted} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Sign up" loading={loading} onPress={handleSignup} style={{ marginTop: spacing.lg }} />

        <Pressable onPress={() => router.replace("/auth/login")} style={{ marginTop: spacing.md }}>
          <Text style={styles.link}>Already have an account? Log in</Text>
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
});
