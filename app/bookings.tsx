import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { colors, radius, spacing, typography } from "../constants/theme";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { getBookingRequests, getConversations, getStoredListings } from "../lib/mock/storage";
import { getListingById } from "../lib/mock/listings";
import { describeBooking } from "../lib/booking/dates";
import type { BookingRequest, Conversation, Listing } from "../types";

const statusTone = { pending: "muted", confirmed: "success", declined: "outline" } as const;
const statusLabel = { pending: "Awaiting owner", confirmed: "Confirmed", declined: "Declined" } as const;

/** Airbnb's "Trips": every stay, move-in or viewing the user has requested. */
export default function BookingsScreen() {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stored, setStored] = useState<Listing[]>([]);

  useFocusEffect(
    useCallback(() => {
      getBookingRequests().then(setBookings);
      getConversations().then(setConversations);
      getStoredListings().then(setStored);
    }, [])
  );

  const upcoming = bookings.filter((b) => b.status !== "declined");
  const past = bookings.filter((b) => b.status === "declined");

  function listingFor(b: BookingRequest) {
    return getListingById(b.listing_id) ?? stored.find((l) => l.id === b.listing_id);
  }

  function Row({ b }: { b: BookingRequest }) {
    const listing = listingFor(b);
    const conversation = conversations.find((c) => c.booking_id === b.id || c.listing_id === b.listing_id);
    return (
      <Pressable style={styles.row} onPress={() => (conversation ? router.push(`/messages/${conversation.id}`) : router.push(`/listing/${b.listing_id}`))}>
        <Image source={{ uri: listing?.images[0]?.uri }} style={styles.thumb} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{b.listing_title}</Text>
          <Text style={styles.meta}>{describeBooking(b)}{b.guests ? ` · ${b.guests} guests` : ""}</Text>
          <Badge label={statusLabel[b.status]} tone={statusTone[b.status]} style={{ marginTop: spacing.sm }} />
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader leading="back" border={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Trips & viewings</Text>
        {bookings.length === 0 ? (
          <EmptyState
            title="No trips booked… yet!"
            subtitle="Pick dates on any home to request a stay, a move-in date or a viewing. Requests show up here."
            actionLabel="Start exploring"
            onAction={() => router.push("/(tabs)")}
          />
        ) : (
          <>
            {upcoming.map((b) => <Row key={b.id} b={b} />)}
            {past.length > 0 ? (
              <>
                <Text style={styles.section}>Declined</Text>
                {past.map((b) => <Row key={b.id} b={b} />)}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  heading: { ...typography.display, color: colors.text, marginBottom: spacing.lg },
  section: { ...typography.h3, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  thumb: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.bgSecondary },
  title: { ...typography.bodyBold, color: colors.text },
  meta: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
});
