import { useCallback, useEffect, useRef, useState } from "react";
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
import { authLinks } from "../../lib/auth/links";
import { authErrorMessage } from "../../lib/auth/errors";
import { useLeaveAuth } from "../../lib/auth/useLeaveAuth";

// One handler for the whole app run: a link that already signed someone in is never reused.
const handleUrl = createCallbackHandler(completeFromUrl);

type CallbackView = { kind: "working" } | { kind: "idle" } | { kind: "error"; code: string; url: string };

/**
 * Where "Confirm email address" and "Reset password" links land. Expo-router drops the #tokens, so
 * the raw URLs come from lib/auth/links, which has collected them since app start.
 */
export default function AuthCallbackScreen() {
  const leave = useLeaveAuth();
  const [view, setView] = useState<CallbackView>({ kind: "working" });
  const mounted = useRef(true);

  // Newest link first; the first one that means something decides what the screen shows.
  const run = useCallback(
    async (urls: string[]) => {
      for (const raw of [...urls].reverse()) {
        const url = Linking.unwrapDevLaunchURL(raw);
        const outcome = await handleUrl(url);
        if (!outcome || !mounted.current) continue;
        if (outcome.kind === "signedIn") return leave();
        if (outcome.kind === "recovery") return router.replace("/auth/reset-password");
        return setView({ kind: "error", code: outcome.code, url });
      }
      if (mounted.current) setView((v) => (v.kind === "working" ? { kind: "idle" } : v));
    },
    [leave],
  );

  useEffect(() => {
    mounted.current = true;
    // Deferred a tick so the effect itself never sets state (react-hooks/set-state-in-effect).
    queueMicrotask(() => void run(authLinks.take()));
    const off = authLinks.subscribe(() => {
      setView({ kind: "working" });
      void run(authLinks.take());
    });
    return () => {
      mounted.current = false;
      off();
    };
  }, [run]);

  function retry(url: string) {
    setView({ kind: "working" });
    void run([url]);
  }

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
          <LinkProblem code={view.code} onRetry={() => retry(view.url)} onDone={leave} />
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

function LinkProblem({ code, onRetry, onDone }: { code: string; onRetry: () => void; onDone: () => void }) {
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
      {code === "network" ? <Button label="Try again" onPress={onRetry} style={{ marginTop: spacing.lg }} /> : null}
      {code === "otp_expired" ? (
        <View style={{ marginTop: spacing.lg }}>
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Button label="Send a new confirmation link" variant="outline" loading={busy === "confirm"} onPress={() => send("confirm")} />
          <Button label="Send a new reset link" variant="outline" loading={busy === "reset"} onPress={() => send("reset")} style={{ marginTop: spacing.sm }} />
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
      ) : null}
      <Button label="Back to Zouza" variant={code === "network" ? "outline" : "primary"} onPress={onDone} style={{ marginTop: spacing.lg }} />
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
