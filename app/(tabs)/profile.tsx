import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Avatar } from "../../components/ui/Avatar";
import { Divider } from "../../components/ui/Divider";
import { getSavedListingIds, getStoredListings, setMockSession } from "../../lib/mock/storage";
import { mockViewingRequests } from "../../lib/mock/messages";

type MenuItem = { icon: keyof typeof Ionicons.glyphMap; label: string; route: string };

const settings: MenuItem[] = [
  { icon: "business-outline", label: "Owner dashboard", route: "/owner-dashboard" },
  { icon: "shield-checkmark-outline", label: "Trust & verification", route: "/trust" },
  { icon: "pricetag-outline", label: "Pricing & fees", route: "/pricing" },
  { icon: "notifications-outline", label: "Notifications", route: "/(tabs)/messages" },
];

const support: MenuItem[] = [
  { icon: "help-circle-outline", label: "Contact Aurora Homes", route: "/contact" },
  { icon: "document-text-outline", label: "Terms of service", route: "/legal/terms" },
  { icon: "lock-closed-outline", label: "Privacy policy", route: "/legal/privacy" },
  { icon: "information-circle-outline", label: "Disclaimer", route: "/legal/disclaimer" },
];

/** Airbnb Profile: large title, elevated identity card, two stat tiles, "host" promo card, settings lists with hairlines. */
export default function ProfileScreen() {
  const [savedCount, setSavedCount] = useState(0);
  const [myListingsCount, setMyListingsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getSavedListingIds().then((ids) => setSavedCount(ids.length));
      getStoredListings().then((listings) => setMyListingsCount(listings.length));
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Profile</Text>
          <Ionicons name="notifications-outline" size={26} color={colors.text} />
        </View>

        <View style={styles.identityCard}>
          <Avatar name="Aurora" size={88} />
          <Text style={styles.name}>Aurora Demo</Text>
          <Text style={styles.role}>Guest · Not yet verified</Text>
        </View>

        <View style={styles.tiles}>
          <StatTile icon="albums-outline" label="My listings" value={myListingsCount} onPress={() => router.push("/owner-dashboard")} />
          <StatTile icon="heart-outline" label="Saved homes" value={savedCount} onPress={() => router.push("/(tabs)/wishlists")} />
          <StatTile icon="calendar-outline" label="Viewings" value={mockViewingRequests.length} onPress={() => router.push("/owner-dashboard")} />
        </View>

        <Pressable style={styles.hostCard} onPress={() => router.push("/(tabs)/ai")}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hostTitle}>List your home with Aurora</Text>
            <Text style={styles.hostBody}>Upload photos — Aurora writes the exposé, FAQ and translations.</Text>
          </View>
          <Image source={{ uri: "https://picsum.photos/seed/aurora-profile-host/200/200" }} style={styles.hostImage} />
        </Pressable>

        <Text style={styles.sectionTitle}>Settings</Text>
        {settings.map((item, i) => (
          <MenuRow key={item.label} item={item} last={i === settings.length - 1} />
        ))}

        <Divider gap={spacing.md} />

        <Text style={styles.sectionTitle}>Support & legal</Text>
        {support.map((item, i) => (
          <MenuRow key={item.label} item={item} last={i === support.length - 1} />
        ))}

        <Divider gap={spacing.md} />

        <Pressable
          onPress={async () => {
            await setMockSession(null);
            router.replace("/auth/login");
          }}
          style={{ paddingVertical: spacing.sm }}
        >
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.bgSecondary }]} onPress={onPress}>
      <Ionicons name={icon} size={24} color={colors.text} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

function MenuRow({ item, last }: { item: MenuItem; last?: boolean }) {
  return (
    <Pressable style={[styles.menuRow, last && { borderBottomWidth: 0 }]} onPress={() => router.push(item.route as never)}>
      <Ionicons name={item.icon} size={24} color={colors.text} />
      <Text style={styles.menuLabel}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  title: { ...typography.display, color: colors.text },
  identityCard: {
    alignItems: "center", backgroundColor: colors.white, borderRadius: radius.xl, paddingVertical: spacing.lg + spacing.sm,
    ...shadow.card, marginBottom: spacing.lg,
  },
  name: { ...typography.h2, color: colors.text, marginTop: spacing.md },
  role: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  tiles: { flexDirection: "row", gap: spacing.sm + 2, marginBottom: spacing.lg },
  tile: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.white },
  tileValue: { ...typography.h3, color: colors.text, marginTop: spacing.sm + 4 },
  tileLabel: { ...typography.micro, color: colors.textSecondary, marginTop: 2 },
  hostCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.xl,
  },
  hostTitle: { ...typography.bodyBold, color: colors.text },
  hostBody: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  hostImage: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.bgSecondary },
  sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuLabel: { ...typography.body, color: colors.text, flex: 1 },
  logout: { ...typography.body, color: colors.text, textDecorationLine: "underline" },
  version: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.lg },
});
