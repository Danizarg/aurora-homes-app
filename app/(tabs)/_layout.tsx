import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { colors, layout, typography } from "../../constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={26} color={color} />
  );
}

/** Airbnb-style flat tab bar: hairline top border, brand tint on the active tab, 10px labels. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          height: Platform.OS === "web" ? 72 : layout.tabBarHeight,
          paddingTop: 8,
          paddingBottom: Platform.OS === "web" ? 10 : 24,
        },
        tabBarLabelStyle: { fontSize: typography.tab.fontSize, fontWeight: typography.tab.fontWeight, lineHeight: 14 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Explore", tabBarIcon: tabIcon("search", "search-outline") }} />
      <Tabs.Screen name="wishlists" options={{ title: "Wishlists", tabBarIcon: tabIcon("heart", "heart-outline") }} />
      <Tabs.Screen name="ai" options={{ title: "Aurora AI", tabBarIcon: tabIcon("sparkles", "sparkles-outline") }} />
      <Tabs.Screen name="messages" options={{ title: "Messages", tabBarIcon: tabIcon("chatbubble", "chatbubble-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("person-circle", "person-circle-outline") }} />
    </Tabs>
  );
}
