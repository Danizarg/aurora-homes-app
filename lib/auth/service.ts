// The app's account functions, bound to the real Supabase client. The logic and the exact options
// live in ./core (tested under Node); this file only wires in the client and the link back to the
// app. Without Supabase settings every call answers { ok:false, code:"not_configured" }.
import * as Linking from "expo-linking";
import { supabase, isSupabaseConfigured } from "../supabase/client";
import { createAuthApi, type AuthApi } from "./core";
import type { AuthUrlResult } from "./url";
import { TERMS_VERSION } from "./terms";

export type { AuthResult, CompleteResult } from "./core";

/** Where every email link (confirm, reset) sends people: exp://<ip>:8081/--/auth/callback in Expo Go, zouza:///auth/callback in builds. */
export const authRedirectUrl = () => Linking.createURL("/auth/callback");

const notConfigured = { ok: false as const, code: "not_configured" };
const api: AuthApi | null = supabase ? createAuthApi(supabase.auth, { redirectUrl: authRedirectUrl, termsVersion: TERMS_VERSION }) : null;

export const signIn = async (email: string, password: string) => (api ? api.signIn(email, password) : notConfigured);
export const signUp = async (fullName: string, email: string, password: string) => (api ? api.signUp(fullName, email, password) : notConfigured);
export const resendConfirmation = async (email: string) => (api ? api.resendConfirmation(email) : notConfigured);
export const sendPasswordReset = async (email: string) => (api ? api.sendPasswordReset(email) : notConfigured);
export const updatePassword = async (password: string) => (api ? api.updatePassword(password) : notConfigured);
export const signOut = async () => (api ? api.signOut() : notConfigured);
export const completeFromUrl = async (r: AuthUrlResult) => (api ? api.completeFromUrl(r) : notConfigured);

/** Read-only lookup of the current Supabase user id — does not create a session. */
export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Old anonymous-publish path, kept only until create-listing asks for a real account (plan 2,
 * Task 7). Anonymous sign-ins are off in Supabase, so this returns null unless someone is signed in.
 */
export async function getOrCreateSupabaseUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user.id;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) return null;
  return anon.user.id;
}
