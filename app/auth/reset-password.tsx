import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { updatePassword } from "../../lib/auth/service";
import { authErrorMessage } from "../../lib/auth/errors";
import { checkNewPassword } from "../../lib/auth/validate";
import { useSession } from "../../lib/auth/session";
import { useLeaveAuth } from "../../lib/auth/useLeaveAuth";

/** Opened by a password-reset link (app/auth/callback has already signed the person in). */
export default function ResetPasswordScreen() {
  const session = useSession();
  const leave = useLeaveAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSave() {
    const problem = checkNewPassword(password, confirm);
    if (problem) return setError(problem);
    setLoading(true);
    setError(null);
    try {
      const r = await updatePassword(password);
      if (r.ok) setDone(true);
      else setError(authErrorMessage(r.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Set a new password" leading="close" onLeading={leave} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {done ? (
          <>
            <Text style={styles.success}>Your password is changed.</Text>
            <Button label="Continue" onPress={leave} style={{ marginTop: spacing.lg }} />
          </>
        ) : session.status === "signedOut" ? (
          <>
            <Text style={styles.body}>Open the reset link from your email again.</Text>
            <Button label="Back to Zouza" onPress={leave} style={{ marginTop: spacing.lg }} />
          </>
        ) : (
          <>
            <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" helper="At least 8 characters" />
            <TextField label="Repeat new password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••••" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Save new password" loading={loading} disabled={session.status === "loading"} onPress={handleSave} style={{ marginTop: spacing.md }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  body: { ...typography.body, color: colors.text },
  success: { ...typography.body, color: colors.success },
  error: { ...typography.small, color: colors.error, marginBottom: spacing.sm },
});
