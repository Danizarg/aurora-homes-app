// Leaving the log-in / sign-up screens should put people back where they were (an open listing
// wizard, Profile), not always on Home. Pure module: the hook in ./useLeaveAuth does the navigating.

/** How many auth screens sit on top of the root stack, given its route names from bottom to top. */
export function authRoutesOnTop(routeNames: string[]): number {
  let n = 0;
  for (let i = routeNames.length - 1; i >= 0 && routeNames[i].startsWith("auth/"); i--) n++;
  return n;
}
