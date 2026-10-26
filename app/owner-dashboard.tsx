import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../constants/theme";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Divider } from "../components/ui/Divider";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { Avatar } from "../components/ui/Avatar";
import { getStoredListings } from "../lib/mock/storage";
import { mockViewingRequests } from "../lib/mock/messages";
import { getCurrentUserId } from "../lib/auth/service";
import { fetchMyListings } from "../lib/supabase/listings";
import { priceLine } from "../lib/listings/presentation";
import type { Listing } from "../types";

/** Airbnb Host "Listings" page: large title, dark "Add listing" button, thumbnail rows, hairline sections. */
export default function OwnerDashboardScreen() {
  const [listings, setListings] = useState<Listing[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const localListings = await getStoredListings();
        const userId = await getCurrentUserId();
        const supabaseListings = userId ? await fetchMyListings(userId) : [];
        setListings([...supabaseListings, ...localListings]);
      })();
    }, [])
  );

  const published = listings.filter((l) => l.status === "published");
  const drafts = listings.filter((l) => l.status === "draft");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader leading="back" border={false} right={<Button label="Add listing" variant="dark" size="sm" onPress={() => router.push("/create-listing")} />} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your listings</Text>

        <Text style={styles.sectionTitle}>Published ({published.length})</Text>
        {published.length === 0 ? (
          <Text style={styles.muted}>No published listings yet. Upload photos and let Suzi write your first one.</Text>
        ) : (
          published.map((l) => <ListingRow key={l.id} listing={l} />)
        )}

        <Divider />

        <Text style={styles.sectionTitle}>Drafts ({drafts.length})</Text>
        {drafts.length === 0 ? <Text style={styles.muted}>No drafts.</Text> : drafts.map((l) => <ListingRow key={l.id} listing={l} />)}

        <Divider />

        <Text style={styles.sectionTitle}>Viewing requests</Text>
        {mockViewingRequests.map((v, i) => (
          <View key={v.id} style={[styles.requestRow, i === mockViewingRequests.length - 1 && { borderBottomWidth: 0 }]}>
            <Avatar name={v.requester_name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.requestName}>{v.requester_name}</Text>
              <Text style={styles.requestMeta}>{v.listing_title} · {v.requested_date}</Text>
            </View>
            <Badge label={v.status === "confirmed" ? "Confirmed" : v.status === "pending" ? "Pending" : "Declined"} tone={v.status === "confirmed" ? "success" : "muted"} />
          </View>
        ))}

        <Divider />

        <Text style={styles.sectionTitle}>Suzi activity</Text>
        <View style={styles.statsRow}>
          <Stat value="18" label="Questions answered" />
          <Stat value="3" label="Qualified leads" />
          <Stat value="2" label="Viewings requested" />
        </View>

        <Divider />

        <Card>
          <View style={styles.verifyRow}>
            <Ionicons name="shield-checkmark-outline" size={26} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>Get the Verified badge</Text>
              <Text style={styles.muted}>Upload proof of ownership or listing authorization to appear higher in search.</Text>
            </View>
          </View>
          <Button label="Start verification" variant="outline" style={{ marginTop: spacing.md }} onPress={() => router.push("/trust")} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function ListingRow({ listing }: { listing: Listing }) {
  return (
    <Pressable style={styles.listingRow} onPress={() => router.push(`/listing/${listing.id}`)}>
      <Image source={{ uri: listing.images[0]?.uri }} style={styles.thumb} />
      <View style={{ flex: 1 }}>
        <Text style={styles.listingTitle} numberOfLines={1}>{listing.title}</Text>
        <Text style={styles.listingMeta}>{listing.city} · {listing.bedrooms} bd · {priceLine(listing)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text} />
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.display, color: colors.text, marginBottom: spacing.xl },
  sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  muted: { ...typography.small, color: colors.textSecondary },
  listingRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm + 2 },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.bgSecondary },
  listingTitle: { ...typography.bodyMedium, color: colors.text },
  listingMeta: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  requestRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  requestName: { ...typography.bodyMedium, color: colors.text },
  requestMeta: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: spacing.sm + 2 },
  stat: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  statValue: { ...typography.h2, color: colors.text },
  statLabel: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.xs },
  verifyRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  verifyTitle: { ...typography.bodyBold, color: colors.text, marginBottom: 2 },
});
