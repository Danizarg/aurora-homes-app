import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../constants/theme";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { getStoredListings } from "../lib/mock/storage";
import { mockViewingRequests } from "../lib/mock/messages";
import type { Listing } from "../types";

export default function OwnerDashboardScreen() {
  const [listings, setListings] = useState<Listing[]>([]);

  useFocusEffect(
    useCallback(() => {
      getStoredListings().then(setListings);
    }, [])
  );

  const published = listings.filter((l) => l.status === "published");
  const drafts = listings.filter((l) => l.status === "draft");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <SectionHeader eyebrow="Owner dashboard" title="Manage your listings" />

        <Button label="Add new listing" onPress={() => router.push("/(tabs)/create")} style={{ marginBottom: spacing.xl }} />

        <SectionHeader title={`Published listings (${published.length})`} />
        {published.length === 0 ? (
          <EmptyState icon="albums-outline" title="No published listings yet" />
        ) : (
          published.map((l) => (
            <Card key={l.id} style={{ marginBottom: spacing.sm }}>
              <Text style={styles.listingTitle}>{l.title}</Text>
              <Text style={styles.listingMeta}>{l.city} · {l.bedrooms} bd · {l.price_monthly ? `${l.price_monthly} €/mo` : `${l.price_sale} €`}</Text>
            </Card>
          ))
        )}

        <SectionHeader title={`Draft listings (${drafts.length})`} />
        {drafts.length === 0 ? (
          <EmptyState icon="document-outline" title="No drafts" />
        ) : (
          drafts.map((l) => (
            <Card key={l.id} style={{ marginBottom: spacing.sm }}>
              <Text style={styles.listingTitle}>{l.title}</Text>
            </Card>
          ))
        )}

        <SectionHeader title="Viewing requests" />
        {mockViewingRequests.map((v) => (
          <Card key={v.id} style={{ marginBottom: spacing.sm }}>
            <View style={styles.rowBetween}>
              <Text style={styles.listingTitle}>{v.listing_title}</Text>
              <Badge label={v.status} tone={v.status === "confirmed" ? "success" : "gold"} />
            </View>
            <Text style={styles.listingMeta}>{v.requester_name} · requested {v.requested_date}</Text>
          </Card>
        ))}

        <SectionHeader title="AI agent activity" subtitle="Questions your property AI assistants have answered on your behalf." />
        <Card style={{ marginBottom: spacing.sm }}>
          <Text style={styles.listingMeta}>18 questions answered this month across your listings, including availability, pets, and pricing.</Text>
        </Card>

        <SectionHeader title="Verification tasks" />
        <Card style={{ marginBottom: spacing.xl }}>
          <Text style={styles.listingMeta}>Upload proof of ownership or listing authorization to unlock the "Verified" badge and appear higher in search.</Text>
          <Button label="Start verification" variant="outline" style={{ marginTop: spacing.md }} onPress={() => router.push("/trust")} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  listingTitle: { ...typography.bodyMedium, color: colors.navy },
  listingMeta: { ...typography.small, color: colors.muted, marginTop: spacing.xs },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
