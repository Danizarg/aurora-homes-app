import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { colors, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { completeFromUrl, resendConfirmation, sendPasswordReset } from "../../lib/auth/service";
import { createCallbackHandler } from "../../lib/auth/callbackHandler";
import { authErrorMessage } from "../../lib/auth/errors";
import { useLeaveAuth } from "../../lib/auth/useLeaveAuth";

// One handler for the whole app run, so a link that reaches this screen twice is used once.
const handleUrl = createCallbackHandler(completeFromUrl);

type CallbackView = { kind: "working" } | { kind: "idle" } | { kind: "error"; code: string };

/** Where "Confirm email address" and "Reset password" links land. Expo-router drops the #tokens, so the raw URL is read from expo-linking. */
export default function AuthCallbackScreen() {
  const latestUrl = Linking.useLinkingURL();
  const leave = useLeaveAuth();
  const [view, setView] = useState<CallbackView>({ kind: "working" });

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const raw of [Linking.getLinkingURL(), latestUrl]) {
        if (!raw) continue;
        const outcome = await handleUrl(Linking.unwrapDevLaunchURL(raw));
        if (!alive || !outcome) continue;
        if (outcome.kind === "signedIn") return leave();
        if (outcome.kind === "recovery") return router.replace("/auth/reset-password");
        return setView({ kind: "error", code: outcome.code });
      }
      if (alive) setView((v) => (v.kind === "working" ? { kind: "idle" } : v));
    })();
    return () => {
      alive = false;
    };
  }, [latestUrl, leave]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Zouza account" leading="close" onLeading={leave} />
      <View style={styles.content}>
        {view.kind === "working" ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.text} />
            <Text style={styles.body}>Signing you in…</Text>
          </View>
        ) : view.kind === "error" ? (
          <LinkProblem code={view.code} onDone={leave} />
        ) : (
          <>
            <Text style={styles.body}>There&apos;s nothing to finish here. Open the link from your email again if you need to.</Text>
            <Button label="Back to Zouza" onPress={leave} style={{ marginTop: spacing.lg }} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function LinkProblem({ code, onDone }: { code: string; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"confirm" | "reset" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function send(kind: "confirm" | "reset") {
    if (!email.trim()) return setNote("Enter your email.");
    setBusy(kind);
    setNote(null);
    try {
      const r = kind === "confirm" ? await resendConfirmation(email) : await sendPasswordReset(email);
      setNote(r.ok ? "Sent. Open the new link on this iPhone." : authErrorMessage(r.code));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Text style={styles.body}>{authErrorMessage(code)}</Text>
      {code === "otp_expired" ? (
        <View style={{ marginTop: spacing.lg }}>
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Button label="Send a new confirmation link" variant="outline" loading={busy === "confirm"} onPress={() => send("confirm")} />
          <Button label="Send a new reset link" variant="outline" loading={busy === "reset"} onPress={() => send("reset")} style={{ marginTop: spacing.sm }} />
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
      ) : null}
      <Button label="Back to Zouza" onPress={onDone} style={{ marginTop: spacing.lg }} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  center: { alignItems: "center", gap: spacing.md, marginTop: spacing.xl },
  body: { ...typography.body, color: colors.text },
  note: { ...typography.small, color: colors.textSecondary, marginTop: spacing.sm },
});
