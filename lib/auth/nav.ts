// Leaving the log-in / sign-up screens should put people back where they were (an open listing
// wizard, Profile), not always on Home. Pure module: the hook in ./useLeaveAuth does the navigating.

/** How many auth screens sit on top of the root stack, given its route names from bottom to top. */
export function authRoutesOnTop(routeNames: string[]): number {
  let n = 0;
  for (let i = routeNames.length - 1; i >= 0 && routeNames[i].startsWith("auth/"); i--) n++;
  return n;
}

type RouteLike = { name: string; state?: { routes?: RouteLike[] } };

/**
 * Route names of the app's own Stack (app/_layout.tsx), bottom to top. expo-router puts that Stack
 * inside a hidden "__root" route of the navigation container, so the container's root state alone
 * shows just ["__root"].
 */
export function appStackRouteNames(rootState: { routes?: RouteLike[] } | undefined): string[] {
  const routes = rootState?.routes ?? [];
  const inner = routes.length === 1 && routes[0].name === "__root" ? (routes[0].state?.routes ?? []) : routes;
  return inner.map((r) => r.name);
}
