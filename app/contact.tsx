import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../constants/theme";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { TextField } from "../components/ui/TextField";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import type { ContactReason } from "../types";

const reasons: { key: ContactReason; label: string }[] = [
  { key: "rent", label: "I want to rent" },
  { key: "list_property", label: "I want to list a property" },
  { key: "sell", label: "I want to sell" },
  { key: "buy", label: "I want to buy" },
  { key: "partnership", label: "Partnership" },
  { key: "support", label: "Support" },
];

export default function ContactScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<ContactReason>("rent");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Contact us" leading="back" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {submitted ? (
          <View style={styles.successWrap}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.successTitle}>Thanks for reaching out</Text>
            <Text style={styles.subtitle}>We'll get back to you at {email} shortly.</Text>
            <Button label="Back to home" variant="dark" style={{ marginTop: spacing.lg, alignSelf: "stretch" }} onPress={() => router.replace("/(tabs)")} />
          </View>
        ) : (
          <>
            <Text style={styles.title}>How can we help?</Text>
            <Text style={styles.subtitle}>Have a question, or want to partner with us? Send a message below.</Text>

            <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name" />
            <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />

            <Text style={styles.label}>Reason</Text>
            <View style={styles.chipRow}>
              {reasons.map((r) => (
                <Chip key={r.key} label={r.label} active={reason === r.key} onPress={() => setReason(r.key)} />
              ))}
            </View>

            <TextField label="Message" value={message} onChangeText={setMessage} multiline placeholder="Tell us a bit more" />

            <Button label="Send message" variant="dark" style={{ marginTop: spacing.sm }} onPress={() => setSubmitted(true)} disabled={!name || !email || !message} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.sm },
  successWrap: { alignItems: "center", paddingTop: spacing.xxl },
  successTitle: { ...typography.h2, color: colors.text, marginTop: spacing.md },
});
