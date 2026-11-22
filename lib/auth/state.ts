// What the UI knows about the person using the app. Pure module.

export type SessionState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; userId: string; email: string; fullName: string };

type SessionLike = { user: { id: string; email?: string; user_metadata?: { full_name?: string } } } | null;

/** The name comes from public.profiles when loaded (the database may tidy it), else from sign-up metadata. */
export function sessionStateFrom(session: SessionLike, profileName: string | null): SessionState {
  if (!session) return { status: "signedOut" };
  const { user } = session;
  return {
    status: "signedIn",
    userId: user.id,
    email: user.email ?? "",
    fullName: profileName ?? user.user_metadata?.full_name ?? "",
  };
}

/**
 * Keeps a SessionState in step with Supabase: the account shows at once (so a screen opened right
 * after a link never sees "signed out"), the display name from public.profiles follows, and a name
 * that arrives after the session changed is dropped.
 */
export function createSessionSync(set: (s: SessionState) => void, loadName: (userId: string) => Promise<string | null>) {
  let latest = 0;
  let alive = true;
  return {
    apply(session: SessionLike) {
      const ticket = ++latest;
      set(sessionStateFrom(session, null));
      if (!session) return;
      loadName(session.user.id).then(
        (name) => {
          if (alive && ticket === latest && name) set(sessionStateFrom(session, name));
        },
        () => {},
      );
    },
    stop() {
      alive = false;
    },
  };
}
