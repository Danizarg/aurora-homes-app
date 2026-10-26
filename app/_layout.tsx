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
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="listing/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="search-modal" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="map" options={{ animation: "fade" }} />
        <Stack.Screen name="create-listing/index" options={{ presentation: "fullScreenModal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
