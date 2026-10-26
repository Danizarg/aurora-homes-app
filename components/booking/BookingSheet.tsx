import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../ui/Button";
import { ScreenHeader } from "../ui/ScreenHeader";
import { Calendar, type DateRange } from "./Calendar";
import { blockedDaysFrom, bookingCopy, bookingKindFor, describeBooking, earliestDate, formatDay, nightsBetween } from "../../lib/booking/dates";
import { addBookingRequest, getBookingRequests, startConversation } from "../../lib/mock/storage";
import { formatMoney, priceParts } from "../../lib/listings/presentation";
import type { BookingRequest, Listing } from "../../types";

interface BookingSheetProps {
  listing: Listing;
  visible: boolean;
  onClose: () => void;
  /** Called with the saved request and the conversation it opened. */
  onSubmitted: (booking: BookingRequest, conversationId: string) => void;
}

/**
 * Airbnb's "Select dates" sheet: calendar on top, guests + optional note,
 * sticky footer with the chosen dates and the request button. Stays pick a
 * range; rentals pick a move-in day; sales pick a viewing day.
 */
export function BookingSheet({ listing, visible, onClose, onSubmitted }: BookingSheetProps) {
  const kind = bookingKindFor(listing);
  const copy = bookingCopy[kind];
  const [range, setRange] = useState<DateRange>({});
  const [guests, setGuests] = useState(2);
  const [note, setNote] = useState("");
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getBookingRequests().then((all) => {
      if (cancelled) return;
      setBlocked(blockedDaysFrom(all, listing.id));
      setRange({});
      setNote("");
    });
    return () => {
      cancelled = true;
    };
  }, [visible, listing.id]);

  const complete = kind === "stay" ? !!range.start && !!range.end : !!range.start;
  const nights = range.start && range.end ? nightsBetween(range.start, range.end) : 0;
  const { amount, unit } = priceParts(listing);
  const monthly = listing.price_monthly ?? 0;
  const stayEstimate = kind === "stay" && nights > 0 ? Math.round((monthly / 30) * nights) : null;

  function summary() {
    if (!range.start) return copy.title;
    if (kind === "stay") return range.end ? `${formatDay(range.start)} – ${formatDay(range.end)} · ${nights} ${nights === 1 ? "night" : "nights"}` : `${formatDay(range.start)} – select check-out`;
    return formatDay(range.start, true);
  }

  async function submit() {
    if (!complete || !range.start) return;
    setSubmitting(true);
    const booking = await addBookingRequest({
      listing_id: listing.id,
      listing_title: listing.title,
      kind,
      start_date: range.start,
      end_date: kind === "stay" ? range.end : undefined,
      guests: kind === "stay" ? guests : undefined,
      message: note.trim() || undefined,
    });
    const intro =
      kind === "stay"
        ? `Hi! I'd like to book ${listing.title} for ${guests} ${guests === 1 ? "guest" : "guests"}, ${describeBooking(booking)}.`
        : kind === "move_in"
          ? `Hi! I'd like to move into ${listing.title} on ${formatDay(range.start, true)}.`
          : `Hi! I'd like to view ${listing.title} on ${formatDay(range.start, true)}. Which time suits you?`;
    const conversation = await startConversation(listing, note.trim() ? `${intro}\n\n${note.trim()}` : intro, {
      bookingId: booking.id,
      qualifiedLead: true,
    });
    setSubmitting(false);
    onSubmitted(booking, conversation.id);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader title={copy.title} leading="close" onLeading={onClose} />
        <View style={styles.body}>
          <Text style={styles.hint}>{copy.hint}</Text>
          <View style={{ flex: 1 }}>
            <Calendar
              mode={kind === "stay" ? "range" : "single"}
              value={range}
              onChange={setRange}
              blocked={blocked}
              minDate={earliestDate(listing)}
            />
          </View>

          {kind === "stay" ? (
            <View style={styles.row}>
              <View>
                <Text style={styles.rowTitle}>Guests</Text>
                <Text style={styles.rowBody}>{listing.bedrooms * 2} max</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable onPress={() => setGuests((g) => Math.max(1, g - 1))} style={[styles.stepButton, guests === 1 && styles.stepDisabled]} disabled={guests === 1}>
                  <Ionicons name="remove" size={18} color={colors.textSecondary} />
                </Pressable>
                <Text style={styles.stepValue}>{guests}</Text>
                <Pressable onPress={() => setGuests((g) => Math.min(listing.bedrooms * 2, g + 1))} style={styles.stepButton}>
                  <Ionicons name="add" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          ) : null}

          <TextInput
            style={styles.note}
            placeholder={kind === "viewing" ? "Preferred time, questions for the owner…" : "Anything the owner should know?"}
            placeholderTextColor={colors.textTertiary}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerPrice}>
              <Text style={styles.footerAmount}>{amount}</Text>
              {unit ? <Text style={styles.footerUnit}> {unit}</Text> : null}
              {stayEstimate ? <Text style={styles.footerUnit}> · ≈ {formatMoney(stayEstimate)} total</Text> : null}
            </Text>
            <Text style={styles.footerDates} numberOfLines={1}>{summary()}</Text>
          </View>
          <Button label={copy.cta} onPress={submit} disabled={!complete} loading={submitting} style={{ minWidth: 150 }} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  hint: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  rowTitle: { ...typography.bodyBold, color: colors.text },
  rowBody: { ...typography.small, color: colors.textSecondary },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.textSecondary, alignItems: "center", justifyContent: "center" },
  stepDisabled: { opacity: 0.3 },
  stepValue: { ...typography.body, color: colors.text, width: 40, textAlign: "center" },
  note: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, height: 48,
    ...typography.small, color: colors.text, marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.white, ...shadow.bar,
  },
  footerPrice: {},
  footerAmount: { ...typography.bodyBold, color: colors.text },
  footerUnit: { ...typography.small, color: colors.text },
  footerDates: { ...typography.small, color: colors.text, textDecorationLine: "underline", marginTop: 2 },
});
