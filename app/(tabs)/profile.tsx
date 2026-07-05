import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Badge } from "../../components/ui/Badge";
import { getSavedListingIds, getStoredListings, setMockSession } from "../../lib/mock/storage";
import { mockViewingRequests } from "../../lib/mock/messages";

const menuItems = [
  { icon: "business-outline" as const, label: "Owner dashboard", route: "/owner-dashboard" },
  { icon: "mail-outline" as const, label: "Contact Aurora Homes", route: "/contact" },
  { icon: "shield-checkmark-outline" as const, label: "Trust & verification", route: "/trust" },
  { icon: "pricetag-outline" as const, label: "Pricing & fees", route: "/pricing" },
  { icon: "document-text-outline" as const, label: "Terms of service", route: "/legal/terms" },
  { icon: "lock-closed-outline" as const, label: "Privacy policy", route: "/legal/privacy" },
];

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>A</Text>
          </View>
          <View>
            <Text style={styles.name}>Aurora Demo Account</Text>
            <Badge label="Not yet verified" tone="muted" />
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="My listings" value={myListingsCount} onPress={() => router.push("/owner-dashboard")} />
          <StatCard label="Saved homes" value={savedCount} onPress={() => router.push("/(tabs)/search")} />
          <StatCard label="Viewing requests" value={mockViewingRequests.length} onPress={() => router.push("/owner-dashboard")} />
        </View>

        <View style={styles.menu}>
          {menuItems.map((item) => (
            <Pressable key={item.label} style={styles.menuRow} onPress={() => router.push(item.route as never)}>
              <Ionicons name={item.icon} size={20} color={colors.gold} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.logoutRow}
          onPress={async () => {
            await setMockSession(null);
            router.replace("/auth/login");
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutLabel}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, onPress }: { label: string; value: number; onPress: () => void }) {
  return (
    <Pressable style={styles.statCard} onPress={onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.sand, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  avatarInitial: { ...typography.h1, color: colors.gold },
  name: { ...typography.h3, color: colors.navy, marginBottom: spacing.xs },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xl },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginRight: spacing.sm, alignItems: "center", ...shadow.soft,
  },
  statValue: { ...typography.h1, color: colors.navy },
  statLabel: { ...typography.micro, color: colors.muted, textTransform: "none", marginTop: spacing.xs, textAlign: "center" },
  menu: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  menuRow: {
    flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md,
  },
  menuLabel: { ...typography.body, color: colors.navy, flex: 1 },
  logoutRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: spacing.xl, gap: spacing.sm },
  logoutLabel: { ...typography.bodyMedium, color: colors.error },
});
