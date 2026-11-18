import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "../constants/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
      </Stack>
    </SafeAreaProvider>
  );
}
