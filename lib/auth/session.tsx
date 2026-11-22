// Who is signed in, for every screen. Reads the saved session on start (so people stay signed in
// across restarts), follows Supabase's auth events, loads the display name from public.profiles,
// and keeps the token refreshing only while the app is in the foreground (Supabase's advice for
// React Native).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import { sessionStateFrom, type SessionState } from "./state";

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
    let alive = true;
    let latest = 0;

    const apply = async (session: Session | null) => {
      const ticket = ++latest;
      // Show the account at once, then fill in the name the database holds.
      if (alive) setState(sessionStateFrom(session, null));
      if (!session) return;
      const name = await profileName(session.user.id);
      if (alive && ticket === latest && name) setState(sessionStateFrom(session, name));
    };

    client.auth.getSession().then(({ data }) => apply(data.session));
    // The callback must not await other auth calls (supabase-js deadlock), so the work is deferred.
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => apply(session), 0);
    });

    const refresh = (s: string | null | undefined) => (s === "active" ? client.auth.startAutoRefresh() : client.auth.stopAutoRefresh());
    refresh(AppState.currentState);
    const appState = AppState.addEventListener("change", refresh);

    return () => {
      alive = false;
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
