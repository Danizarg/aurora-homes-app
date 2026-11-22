// Closes the log-in / sign-up screens and returns people to where they were. On a cold start from
// an email link there is nothing underneath, so it goes Home instead.
import { useCallback } from "react";
import { router, useNavigationContainerRef } from "expo-router";
import { appStackRouteNames, authRoutesOnTop } from "./nav";

export function useLeaveAuth(): () => void {
  const ref = useNavigationContainerRef();
  return useCallback(() => {
    const names = ref.isReady() ? appStackRouteNames(ref.getRootState()) : [];
    const n = authRoutesOnTop(names);
    if (n > 0 && n < names.length) router.dismiss(n);
    else router.replace("/(tabs)");
  }, [ref]);
}
