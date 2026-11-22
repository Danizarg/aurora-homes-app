import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "../constants/theme";
import { AuthProvider } from "../lib/auth/session";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          {/* Home is only ever arrived at from the intro, a login or a finished flow. It dissolves in: a sideways push would read as going deeper, not as coming back. */}
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="intro" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="listing/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="search-modal" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="create-listing/index" options={{ presentation: "fullScreenModal" }} />
          {/* Account screens slide up as sheets, so they also appear above the full-screen listing wizard (Publish asks for an account). */}
          <Stack.Screen name="auth/login" options={{ presentation: "modal" }} />
          <Stack.Screen name="auth/signup" options={{ presentation: "modal" }} />
          <Stack.Screen name="auth/forgot-password" options={{ presentation: "modal" }} />
          <Stack.Screen name="auth/reset-password" options={{ presentation: "modal" }} />
          <Stack.Screen name="auth/callback" options={{ presentation: "modal" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
