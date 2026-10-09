import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
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
          <Ionicons name="sparkles" size={14} color={colors.gold} />
        </View>
        <Text style={styles.headerText}>Property AI Assistant</Text>
      </View>

      <ScrollView style={styles.messages} nestedScrollEnabled>
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.from === "user" ? styles.bubbleUser : styles.bubbleAgent]}>
            <Text style={m.from === "user" ? styles.bubbleTextUser : styles.bubbleTextAgent}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.suggestions}>
        {suggestedQuestions.map((q) => (
          <Pressable key={q} style={styles.suggestionChip} onPress={() => ask(q)}>
            <Text style={styles.suggestionText}>{q}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask about this property..."
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => ask(input)}
        />
        <Pressable style={styles.sendButton} onPress={() => ask(input)}>
          <Ionicons name="send" size={16} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.ivoryDeep, borderRadius: radius.xl, padding: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.sm },
  headerIcon: {
    width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.white,
    alignItems: "center", justifyContent: "center",
  },
  headerText: { ...typography.bodyMedium, color: colors.navy },
  messages: { maxHeight: 220, marginBottom: spacing.md },
  bubble: { padding: spacing.sm + 2, borderRadius: radius.lg, marginBottom: spacing.sm, maxWidth: "85%", ...shadow.float },
  bubbleAgent: { backgroundColor: colors.white, alignSelf: "flex-start" },
  bubbleUser: { backgroundColor: colors.navy, alignSelf: "flex-end" },
  bubbleTextAgent: { ...typography.small, color: colors.navy },
  bubbleTextUser: { ...typography.small, color: colors.white },
  suggestions: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.sm },
  suggestionChip: {
    backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: spacing.xs + 1, paddingHorizontal: spacing.sm + 2,
    marginRight: spacing.xs, marginBottom: spacing.xs, ...shadow.float,
  },
  suggestionText: { ...typography.micro, color: colors.navy, textTransform: "none" },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2, marginRight: spacing.sm, color: colors.navy, ...shadow.float,
  },
  sendButton: { backgroundColor: colors.gold, borderRadius: radius.pill, padding: spacing.sm + 4, ...shadow.float },
});
