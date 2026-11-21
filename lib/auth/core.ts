// Every Supabase Auth call the app makes, with the options the design fixes (terms version on
// sign-up, email links that come back to the app, log-out on this phone only). Results are plain
// { ok } / { ok:false, code } values: this never throws, and screens turn the code into copy with
// authErrorMessage. Pure module: the client is passed in, so tests use a stand-in.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthUrlResult } from "./url.ts";
import { normalizeEmail } from "./validate.ts";

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; code: string };
export type CompleteResult = { ok: true; recovery: boolean } | { ok: false; code: string };

export type AuthClientLike = Pick<
  SupabaseClient["auth"],
  "signInWithPassword" | "signUp" | "resend" | "resetPasswordForEmail" | "updateUser" | "signOut" | "setSession" | "exchangeCodeForSession"
>;

type AuthErrorLike = { code?: string; name?: string } | null | undefined;

function codeFor(error: AuthErrorLike): string {
  if (error?.code) return error.code;
  if (error?.name === "AuthRetryableFetchError") return "network";
  return "unknown";
}

async function attempt<T extends AuthResult | CompleteResult>(run: () => Promise<T>): Promise<T | { ok: false; code: string }> {
  try {
    return await run();
  } catch (e) {
    return { ok: false, code: codeFor(e as AuthErrorLike) };
  }
}

export function createAuthApi(auth: AuthClientLike, opts: { redirectUrl: () => string; termsVersion: string }) {
  const done = (error: AuthErrorLike): AuthResult => (error ? { ok: false, code: codeFor(error) } : { ok: true });

  return {
    signIn: (email: string, password: string) =>
      attempt(async () => done((await auth.signInWithPassword({ email: normalizeEmail(email), password })).error)),

    signUp: (fullName: string, email: string, password: string) =>
      attempt(async (): Promise<AuthResult> => {
        const { data, error } = await auth.signUp({
          email: normalizeEmail(email),
          password,
          options: { emailRedirectTo: opts.redirectUrl(), data: { full_name: fullName.trim(), terms_version: opts.termsVersion } },
        });
        if (error) return done(error);
        // No session means Supabase sent a confirmation email. It answers the same way when the
        // address already has an account, so people can't find out who is signed up.
        return { ok: true, needsConfirmation: !data.session };
      }),

    resendConfirmation: (email: string) =>
      attempt(async () =>
        done((await auth.resend({ type: "signup", email: normalizeEmail(email), options: { emailRedirectTo: opts.redirectUrl() } })).error),
      ),

    sendPasswordReset: (email: string) =>
      attempt(async () => done((await auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo: opts.redirectUrl() })).error)),

    updatePassword: (password: string) => attempt(async () => done((await auth.updateUser({ password })).error)),

    signOut: () => attempt(async () => done((await auth.signOut({ scope: "local" })).error)),

    completeFromUrl: (r: AuthUrlResult) =>
      attempt(async (): Promise<CompleteResult> => {
        if (r.kind === "error") return { ok: false, code: r.code };
        if (r.kind === "none") return { ok: false, code: "none" };
        const { error } =
          r.kind === "session"
            ? await auth.setSession({ access_token: r.accessToken, refresh_token: r.refreshToken })
            : await auth.exchangeCodeForSession(r.code);
        return error ? { ok: false, code: codeFor(error) } : { ok: true, recovery: r.recovery };
      }),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
