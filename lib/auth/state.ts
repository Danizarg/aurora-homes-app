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
