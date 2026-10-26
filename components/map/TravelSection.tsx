import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Button } from "../ui/Button";
import { useUserLocation } from "../../lib/location/useUserLocation";
import { formatDistance, formatMinutes, type GeoPoint } from "../../lib/geo/distance";
import { directionsUrl, googleFlightsUrl, openUrl, planTravel, skyscannerUrl } from "../../lib/geo/travel";

interface TravelSectionProps {
  destination: GeoPoint;
  destinationLabel: string;
  /** Pre-fills the flight date when the traveller already picked one. */
  travelDate?: Date;
}

/**
 * "How to get there" from wherever the traveller is: nearest airports at
 * both ends with flight-search links, driving estimate with directions, and
 * public transport. Location is only requested when the user taps the button.
 */
export function TravelSection({ destination, destinationLabel, travelDate }: TravelSectionProps) {
  const location = useUserLocation();
  const plan = useMemo(() => (location.point ? planTravel(location.point, destination) : null), [location.point, destination]);

  if (!location.point) {
    return (
      <View>
        <Text style={styles.body}>See flight options, driving time and directions from where you are now.</Text>
        <Button
          label={location.status === "asking" ? "Finding you…" : "Use my location"}
          icon="locate-outline"
          variant="outline"
          onPress={location.request}
          loading={location.status === "asking"}
          style={{ marginTop: spacing.md }}
        />
        {location.status === "denied" ? (
          <Text style={styles.note}>Location access was declined. You can still get directions below.</Text>
        ) : null}
        {location.status === "unavailable" ? <Text style={styles.note}>Location isn’t available on this device right now.</Text> : null}
        <Pressable onPress={() => openUrl(directionsUrl(null, destination, "driving"), `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`)} style={styles.link}>
          <Ionicons name="navigate-outline" size={16} color={colors.text} />
          <Text style={styles.linkText}>Directions to {destinationLabel}</Text>
        </Pressable>
      </View>
    );
  }

  const from = location.label ?? "your location";
  const { flight, drive, straightKm } = plan!;

  return (
    <View>
      <Text style={styles.body}>
        From {from}: {formatDistance(straightKm)} as the crow flies.
      </Text>

      {flight.sensible ? (
        <Card
          icon="airplane-outline"
          title={`Fly ${flight.from.airport.iata} → ${flight.to.airport.iata}`}
          lines={[
            `${flight.from.airport.name} is ${formatDistance(flight.from.km)} from you`,
            `${flight.to.airport.name} is ${formatDistance(flight.to.km)} from the home`,
            `About ${formatMinutes(flight.minutes)} in the air`,
          ]}
          actions={[
            { label: "Google Flights", onPress: () => openUrl(googleFlightsUrl(flight.from.airport.iata, flight.to.airport.iata, travelDate)) },
            { label: "Skyscanner", onPress: () => openUrl(skyscannerUrl(flight.from.airport.iata, flight.to.airport.iata, travelDate)) },
          ]}
        />
      ) : null}

      <Card
        icon="car-outline"
        title={`Drive · about ${formatMinutes(drive.minutes)}`}
        lines={[`Roughly ${formatDistance(straightKm * 1.25)} by road`]}
        actions={[
          { label: "Directions", onPress: () => openUrl(directionsUrl(location.point, destination, "driving"), `https://www.google.com/maps/dir/?api=1&origin=${location.point!.lat},${location.point!.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`) },
        ]}
      />

      <Card
        icon="train-outline"
        title="Public transport"
        lines={[flight.sensible ? `From ${flight.to.airport.iata}: train, bus or taxi to ${destinationLabel}` : `Trains and buses to ${destinationLabel}`]}
        actions={[
          { label: "Transit route", onPress: () => openUrl(directionsUrl(location.point, destination, "transit"), `https://www.google.com/maps/dir/?api=1&origin=${location.point!.lat},${location.point!.lng}&destination=${destination.lat},${destination.lng}&travelmode=transit`) },
        ]}
      />

      <Text style={styles.note}>Times are estimates. Flight and ticket links open in your browser; Zouza doesn’t sell travel.</Text>
    </View>
  );
}

function Card({ icon, title, lines, actions }: { icon: keyof typeof Ionicons.glyphMap; title: string; lines: string[]; actions: { label: string; onPress: () => void }[] }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={22} color={colors.text} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {lines.map((l) => (
        <Text key={l} style={styles.cardLine}>{l}</Text>
      ))}
      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable key={a.label} onPress={a.onPress} style={styles.action}>
            <Text style={styles.actionText}>{a.label}</Text>
            <Ionicons name="open-outline" size={14} color={colors.text} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, color: colors.text },
  note: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.md },
  link: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md },
  linkText: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline" },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  cardTitle: { ...typography.bodyBold, color: colors.text, flex: 1 },
  cardLine: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm + 2 },
  action: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { ...typography.smallBold, color: colors.text, textDecorationLine: "underline" },
});
