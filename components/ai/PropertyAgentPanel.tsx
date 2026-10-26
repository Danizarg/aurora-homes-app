import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { answerAgentQuestion } from "../../lib/ai/service";
import type { FaqItem } from "../../types";

interface PropertyAgentPanelProps {
  listingTitle: string;
  faq: FaqItem[];
}

interface ChatEntry {
  id: string;
  from: "user" | "agent";
  text: string;
}

const suggestedQuestions = [
  "Is the property still available?",
  "Are dogs allowed?",
  "What is included in the price?",
  "Is there a garage?",
];

export function PropertyAgentPanel({ listingTitle, faq }: PropertyAgentPanelProps) {
  const [messages, setMessages] = useState<ChatEntry[]>([
    { id: "intro", from: "agent", text: `Hi, I'm the AI assistant for ${listingTitle}. Ask me anything about this property.` },
  ]);
  const [input, setInput] = useState("");

  function ask(question: string) {
    if (!question.trim()) return;
    const answer = answerAgentQuestion(question, faq);
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-q`, from: "user", text: question },
      { id: `${Date.now()}-a`, from: "agent", text: answer },
    ]);
    setInput("");
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={16} color={colors.primaryDark} />
        </View>
        <View>
          <Text style={styles.headerText}>Property AI assistant</Text>
          <Text style={styles.headerSub}>Answers from this listing's details · replies instantly</Text>
        </View>
      </View>

      <ScrollView style={styles.messages} nestedScrollEnabled>
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.from === "user" ? styles.bubbleUser : styles.bubbleAgent]}>
            <Text style={m.from === "user" ? styles.bubbleTextUser : styles.bubbleTextAgent}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions} contentContainerStyle={{ gap: spacing.sm }}>
        {suggestedQuestions.map((q) => (
          <Pressable key={q} style={styles.suggestionChip} onPress={() => ask(q)}>
            <Text style={styles.suggestionText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask about this property"
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => ask(input)}
        />
        <Pressable style={[styles.sendButton, !input.trim() && styles.sendButtonIdle]} onPress={() => ask(input)}>
          <Ionicons name="arrow-up" size={18} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.sm + 2 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  headerText: { ...typography.bodyBold, color: colors.text },
  headerSub: { ...typography.micro, color: colors.textSecondary },
  messages: { maxHeight: 220, marginBottom: spacing.md },
  bubble: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm, maxWidth: "85%" },
  bubbleAgent: { backgroundColor: colors.bgSecondary, alignSelf: "flex-start", borderBottomLeftRadius: radius.xs },
  bubbleUser: { backgroundColor: colors.text, alignSelf: "flex-end", borderBottomRightRadius: radius.xs },
  bubbleTextAgent: { ...typography.small, lineHeight: 20, color: colors.text },
  bubbleTextUser: { ...typography.small, lineHeight: 20, color: colors.white },
  suggestions: { marginBottom: spacing.md, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md },
  suggestionChip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md - 2,
  },
  suggestionText: { ...typography.micro, fontWeight: "500", color: colors.text },
  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  input: {
    flex: 1, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, color: colors.text, ...typography.small,
  },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendButtonIdle: { backgroundColor: colors.textTertiary },
});
