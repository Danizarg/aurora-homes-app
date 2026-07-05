import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../constants/theme";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
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
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>

        {submitted ? (
          <View style={styles.successWrap}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.successTitle}>Thanks for reaching out</Text>
            <Text style={styles.subtitle}>We'll get back to you at {email} shortly.</Text>
            <Button label="Back to home" style={{ marginTop: spacing.lg }} onPress={() => router.replace("/(tabs)")} />
          </View>
        ) : (
          <>
            <Text style={styles.title}>Contact Aurora Homes</Text>
            <Text style={styles.subtitle}>Have a question, or want to partner with us? Send a message below.</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.muted} />
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted} />

            <Text style={styles.label}>Reason</Text>
            <View style={styles.chipRow}>
              {reasons.map((r) => (
                <Chip key={r.key} label={r.label} active={reason === r.key} onPress={() => setReason(r.key)} />
              ))}
            </View>

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, { height: 110, textAlignVertical: "top" }]}
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="How can we help?"
              placeholderTextColor={colors.muted}
            />

            <Button label="Submit" style={{ marginTop: spacing.lg }} onPress={() => setSubmitted(true)} disabled={!name || !email || !message} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.navy },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { ...typography.bodyMedium, color: colors.navy, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.navy, ...typography.body,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  successWrap: { alignItems: "center", paddingTop: spacing.xxl },
  successTitle: { ...typography.h2, color: colors.navy, marginTop: spacing.md },
});
