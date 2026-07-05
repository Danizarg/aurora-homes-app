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
