import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { brand, colors, radius, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { signIn } from "../../lib/auth/service";

/** Airbnb "Log in or sign up" sheet: centered title, grouped inputs, gradient Continue, "or" divider, outline alternatives. */
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
      <ScreenHeader title="Log in or sign up" leading="close" onLeading={() => router.replace("/(tabs)")} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome to {brand.name}</Text>

        <View style={styles.group}>
          <View style={[styles.field, styles.fieldTop]}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.textTertiary} />
          </View>
          <View style={[styles.field, styles.fieldBottom]}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={colors.textTertiary} />
          </View>
        </View>
        <Text style={styles.hint}>We’ll never share your email. Owners log in to manage listings and messages.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Continue" loading={loading} onPress={handleLogin} style={{ marginTop: spacing.lg }} />

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        <Button label="Create an account" variant="outline" icon="person-add-outline" onPress={() => router.push("/auth/signup")} />
        <Button label="Continue without an account" variant="outline" icon="arrow-forward-outline" style={{ marginTop: spacing.md }} onPress={() => router.replace("/(tabs)")} />

        <Pressable onPress={() => router.push("/auth/forgot-password")} style={{ marginTop: spacing.xl, alignSelf: "center" }}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>

        <View style={styles.footnote}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.footnoteText}>Your data stays private. Read our privacy policy.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  group: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white },
  field: { paddingHorizontal: spacing.md, paddingVertical: 10, minHeight: 56, justifyContent: "center" },
  fieldTop: { borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldBottom: {},
  fieldLabel: { ...typography.micro, color: colors.textSecondary },
  input: { ...typography.body, color: colors.text, paddingVertical: 0, marginTop: 2 },
  hint: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.sm },
  error: { ...typography.small, color: colors.error, marginTop: spacing.sm },
  orRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.lg },
  orLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  orText: { ...typography.micro, color: colors.text },
  link: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline" },
  footnote: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xl, justifyContent: "center" },
  footnoteText: { ...typography.micro, color: colors.textSecondary },
});
