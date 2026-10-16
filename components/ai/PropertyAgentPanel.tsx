import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
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
 * Per-listing Suzi chat. Answers come from the real model through zouza.ai
 * (see lib/ai/suzi.ts) and fall back to the listing's FAQ when offline.
 * Suzi never gives legal, tax or financial advice — the footer says so.
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
        <Text style={styles.headerText}>Suzi</Text>
      </View>

      <ScrollView style={styles.messages} nestedScrollEnabled>
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.from === "user" ? styles.bubbleUser : styles.bubbleAgent]}>
            <Text style={m.from === "user" ? styles.bubbleTextUser : styles.bubbleTextAgent}>{m.text}</Text>
          </View>
        ))}
        {thinking ? (
          <View style={[styles.bubble, styles.bubbleAgent, styles.thinking]}>
            <ActivityIndicator size="small" color={colors.brand500} />
            <Text style={styles.thinkingText}>Suzi is thinking</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.suggestions}>
        {suggestedQuestions.map((q) => (
          <Pressable key={q} style={styles.suggestionChip} onPress={() => ask(q)} disabled={thinking}>
            <Text style={styles.suggestionText}>{q}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask Suzi about this property…"
          placeholderTextColor={colors.muted2}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => ask(input)}
          editable={!thinking}
          returnKeyType="send"
        />
        <Pressable style={styles.sendButton} onPress={() => ask(input)} disabled={thinking} accessibilityLabel="Send">
          <Ionicons name="arrow-up" size={16} color={colors.white} />
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>Suzi answers from the listing’s facts. She doesn’t give legal, tax or financial advice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.paper2, borderRadius: radius.xl, padding: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.sm },
  orb: {
    width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.brand500,
    alignItems: "center", justifyContent: "center",
  },
  headerText: { ...typography.bodyMedium, color: colors.ink },
  messages: { maxHeight: 240, marginBottom: spacing.md },
  bubble: { padding: spacing.sm + 2, borderRadius: radius.lg, marginBottom: spacing.sm, maxWidth: "85%" },
  bubbleAgent: { backgroundColor: colors.white, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border },
  bubbleUser: { backgroundColor: colors.brand900, alignSelf: "flex-end" },
  bubbleTextAgent: { ...typography.small, color: colors.ink2 },
  bubbleTextUser: { ...typography.small, color: colors.white },
  thinking: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thinkingText: { ...typography.small, color: colors.muted },
  suggestions: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.sm },
  suggestionChip: {
    backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.xs + 1, paddingHorizontal: spacing.sm + 2, marginRight: spacing.xs, marginBottom: spacing.xs,
  },
  suggestionText: { ...typography.micro, color: colors.ink2, textTransform: "none" },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginRight: spacing.sm, color: colors.ink,
  },
  sendButton: { backgroundColor: colors.brand500, borderRadius: radius.pill, padding: spacing.sm + 4, ...shadow.float },
  disclaimer: { ...typography.micro, color: colors.muted, marginTop: spacing.sm, fontWeight: "400" },
});
