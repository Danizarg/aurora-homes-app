import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View, type ColorValue } from "react-native";
import { BlurView } from "expo-blur";
import { colors, layout, shadow, typography } from "../../constants/theme";
import { ZMark } from "../../components/brand/ZMark";
import { haptic } from "../../lib/ui/haptics";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={26} color={color as string} />;
  };
}

/** Frosted glass behind the tab bar; the feed scrolls underneath it. */
function GlassBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView tint="light" intensity={Platform.OS === "android" ? 80 : 50} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
      <View style={styles.glassTint} />
    </View>
  );
}

/** Airbnb-style tab bar, floating on blur: brand tint on the active tab, 10px labels, a tick on switch. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarBackground: GlassBackground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: Platform.OS === "web" ? 72 : layout.tabBarHeight,
          paddingTop: 8,
          paddingBottom: Platform.OS === "web" ? 10 : 24,
          ...shadow.tabBar,
        },
        tabBarLabelStyle: { fontSize: typography.tab.fontSize, fontWeight: typography.tab.fontWeight, lineHeight: 14 },
      }}
      screenListeners={{ tabPress: () => haptic.select() }}
    >
      <Tabs.Screen name="index" options={{ title: "Explore", tabBarIcon: tabIcon("search", "search-outline") }} />
      <Tabs.Screen name="wishlists" options={{ title: "Wishlists", tabBarIcon: tabIcon("heart", "heart-outline") }} />
      <Tabs.Screen
        name="ai"
        options={{
          title: "Suzi",
          // The Z mark is the one brand mark for Zouza and Suzi (see components/brand/ZMark).
          tabBarIcon: ({ color }) => <ZMark size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen name="messages" options={{ title: "Messages", tabBarIcon: tabIcon("chatbubble", "chatbubble-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("person-circle", "person-circle-outline") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glassTint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.72)" },
});
