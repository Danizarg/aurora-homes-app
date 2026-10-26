import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { ZMark } from "../brand/ZMark";
import { askSuzi, type SuziTurn } from "../../lib/ai/suzi";
import type { Listing } from "../../types";

interface PropertyAgentPanelProps {
  listing: Listing;
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

/**
 * Per-listing Suzi chat, Airbnb-card styled. Answers come from the real
 * model through zouza.ai (lib/ai/suzi.ts) and fall back to the listing's
 * FAQ when offline. Suzi never gives legal, tax or financial advice — the
 * footer says so.
 */
export function PropertyAgentPanel({ listing }: PropertyAgentPanelProps) {
  const [messages, setMessages] = useState<ChatEntry[]>([
    { id: "intro", from: "agent", text: `Hi, I'm Suzi. Ask me anything about ${listing.title}.` },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const history = useRef<SuziTurn[]>([]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || thinking) return;
    setInput("");
    setThinking(true);
    setMessages((prev) => [...prev, { id: `${Date.now()}-q`, from: "user", text: trimmed }]);

    const reply = await askSuzi(trimmed, listing, history.current);
    history.current = [
      ...history.current,
      { role: "user" as const, content: trimmed },
      { role: "assistant" as const, content: reply.text },
    ].slice(-10);

    setMessages((prev) => [...prev, { id: `${Date.now()}-a`, from: "agent", text: reply.text }]);
    setThinking(false);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.orb}>
          <ZMark size={16} color={colors.white} />
        </View>
        <View>
          <Text style={styles.headerText}>Suzi</Text>
          <Text style={styles.headerSub}>Answers from this listing’s facts · replies instantly</Text>
        </View>
      </View>

      <ScrollView style={styles.messages} nestedScrollEnabled>
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.from === "user" ? styles.bubbleUser : styles.bubbleAgent]}>
            <Text style={m.from === "user" ? styles.bubbleTextUser : styles.bubbleTextAgent}>{m.text}</Text>
          </View>
        ))}
        {thinking ? (
          <View style={[styles.bubble, styles.bubbleAgent, styles.thinking]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.thinkingText}>Suzi is thinking</Text>
          </View>
        ) : null}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions} contentContainerStyle={{ gap: spacing.sm }}>
        {suggestedQuestions.map((q) => (
          <Pressable key={q} style={styles.suggestionChip} onPress={() => ask(q)} disabled={thinking}>
            <Text style={styles.suggestionText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask Suzi about this property"
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => ask(input)}
          editable={!thinking}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendButton, (!input.trim() || thinking) && styles.sendButtonIdle]}
          onPress={() => ask(input)}
          disabled={thinking}
          accessibilityLabel="Send"
        >
          <Ionicons name="arrow-up" size={18} color={colors.white} />
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>Suzi answers from the listing’s facts. She doesn’t give legal, tax or financial advice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.sm + 2 },
  orb: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  headerText: { ...typography.bodyBold, color: colors.text },
  headerSub: { ...typography.micro, color: colors.textSecondary },
  messages: { maxHeight: 240, marginBottom: spacing.md },
  bubble: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm, maxWidth: "85%" },
  bubbleAgent: { backgroundColor: colors.bgSecondary, alignSelf: "flex-start", borderBottomLeftRadius: radius.xs },
  bubbleUser: { backgroundColor: colors.primaryDeep, alignSelf: "flex-end", borderBottomRightRadius: radius.xs },
  bubbleTextAgent: { ...typography.small, lineHeight: 20, color: colors.text },
  bubbleTextUser: { ...typography.small, lineHeight: 20, color: colors.white },
  thinking: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thinkingText: { ...typography.small, color: colors.textSecondary },
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
  disclaimer: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.sm + 2 },
});
