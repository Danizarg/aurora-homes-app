import { useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { mockConversations, mockMessages } from "../../lib/mock/messages";
import type { Message } from "../../types";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversation = mockConversations.find((c) => c.id === id);
  const [messages, setMessages] = useState<Message[]>(mockMessages[id ?? ""] ?? []);
  const [input, setInput] = useState("");

  function send() {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: `${Date.now()}`, conversation_id: id ?? "", sender: "me", text: input, created_at: new Date().toISOString() }]);
    setInput("");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <View style={{ marginLeft: spacing.md }}>
          <Text style={styles.headerTitle}>{conversation?.participant_name ?? "Conversation"}</Text>
          <Text style={styles.headerSubtitle}>{conversation?.listing_title}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.sender === "me" ? styles.bubbleMe : item.sender === "ai" ? styles.bubbleAi : styles.bubbleThem]}>
              {item.sender === "ai" ? <Text style={styles.aiLabel}>Aurora AI</Text> : null}
              <Text style={item.sender === "me" ? styles.bubbleTextMe : styles.bubbleText}>{item.text}</Text>
            </View>
          )}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
          />
          <Pressable style={styles.sendButton} onPress={send}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  header: { flexDirection: "row", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h3, color: colors.navy },
  headerSubtitle: { ...typography.small, color: colors.gold },
  messagesList: { padding: spacing.lg },
  bubble: { padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm, maxWidth: "80%" },
  bubbleThem: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignSelf: "flex-start" },
  bubbleAi: { backgroundColor: colors.ivoryDeep, alignSelf: "flex-start" },
  bubbleMe: { backgroundColor: colors.navy, alignSelf: "flex-end" },
  aiLabel: { ...typography.micro, color: colors.gold, marginBottom: 2 },
  bubbleText: { ...typography.small, color: colors.navy },
  bubbleTextMe: { ...typography.small, color: colors.white },
  inputRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm, color: colors.navy,
  },
  sendButton: { backgroundColor: colors.gold, borderRadius: radius.pill, padding: spacing.sm + 2 },
});
