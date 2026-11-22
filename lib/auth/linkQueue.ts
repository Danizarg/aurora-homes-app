// Every URL the app is opened with, kept until app/auth/callback reads it. The launch URL is handed
// out once per app run (so an old link doesn't come back on a later visit to the screen), and each
// URL event is its own delivery, even when the string repeats (a second tap on a used link). Pure
// module: ./links wires it to expo-linking.

export function createLinkQueue(getInitialUrl: () => string | null) {
  let initialTaken = false;
  const pending: string[] = [];
  const listeners = new Set<() => void>();
  return {
    push(url: string) {
      pending.push(url);
      listeners.forEach((l) => l());
    },
    /** Oldest first: the launch URL (first call only), then each URL event since the last take. */
    take(): string[] {
      const out: string[] = [];
      if (!initialTaken) {
        initialTaken = true;
        const initial = getInitialUrl();
        if (initial) out.push(initial);
      }
      out.push(...pending.splice(0));
      return out;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type LinkQueue = ReturnType<typeof createLinkQueue>;
