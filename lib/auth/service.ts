// Auth abstraction: uses Supabase Auth when configured, otherwise falls
// back to a local mock session stored in AsyncStorage so the app can be
// demoed end-to-end without a backend.
import { supabase, isSupabaseConfigured } from "../supabase/client";
import { getMockSession, setMockSession, type MockSession } from "../mock/storage";

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }
  await setMockSession({ fullName: email.split("@")[0], email });
  return {};
}

export async function signUp(fullName: string, email: string, password: string): Promise<{ error?: string }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    return { error: error?.message };
  }
  await setMockSession({ fullName, email });
  return {};
}

export async function sendPasswordReset(email: string): Promise<{ error?: string }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message };
  }
  return {};
}

export async function getCurrentSession(): Promise<MockSession | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    return { fullName: data.session.user.user_metadata?.full_name ?? "", email: data.session.user.email ?? "" };
  }
  return getMockSession();
}

/** Read-only lookup of the current Supabase user id — does not create a session. */
export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Returns the current Supabase user id, signing in anonymously if nobody is
 * signed in yet. This lets the AI Listing Builder publish a real, owned row
 * (satisfying the owner_id foreign key + RLS policies in schema.sql) without
 * forcing a demo user through the signup flow first. Requires "Anonymous
 * sign-ins" to be enabled in Supabase Dashboard → Authentication → Providers.
 */
export async function getOrCreateSupabaseUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user.id;

  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) return null;
  return anon.user.id;
}
