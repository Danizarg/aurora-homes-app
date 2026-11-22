// Who is signed in, for every screen. Reads the saved session on start (so people stay signed in
// across restarts), follows Supabase's auth events, loads the display name from public.profiles,
// and keeps the token refreshing only while the app is in the foreground (Supabase's advice for
// React Native).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import { createSessionSync, type SessionState } from "./state";
// Registers the app-wide link listener as early as the root layout loads (see ./links).
import "./links";

const SessionContext = createContext<SessionState>({ status: "loading" });

async function profileName(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return (data as { full_name?: string | null } | null)?.full_name ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(supabase ? { status: "loading" } : { status: "signedOut" });

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const sync = createSessionSync(setState, profileName);
    client.auth.getSession().then(({ data }) => sync.apply(data.session));
    // Applied at once, so a screen opened right after an email link already sees the account. The
    // name lookup inside apply is not awaited here (no other auth calls are awaited in the callback).
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => sync.apply(session));

    const refresh = (s: string | null | undefined) => (s === "active" ? client.auth.startAutoRefresh() : client.auth.stopAutoRefresh());
    refresh(AppState.currentState);
    const appState = AppState.addEventListener("change", refresh);

    return () => {
      sync.stop();
      sub.subscription.unsubscribe();
      appState.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
