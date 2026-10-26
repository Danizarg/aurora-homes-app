import { useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { IconButton } from "../../components/ui/IconButton";
import { ZMark } from "../../components/brand/ZMark";
import { Avatar } from "../../components/ui/Avatar";
import { mockConversations, mockMessages } from "../../lib/mock/messages";
import type { Message } from "../../types";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversation = mockConversations.find((c) => c.id === id);
  const [messages, setMessages] = useState<Message[]>(mockMessages[id ?? ""] ?? []);
  const [input, setInput] = useState("");

  function send() {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: `${Date.now()}`, conversation_id: id ?? "", sender: "me", text: input.trim(), created_at: new Date().toISOString() }]);
    setInput("");
  }

  const name = conversation?.participant_name ?? "Conversation";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" variant="plain" size={40} onPress={() => router.back()} />
        <Pressable style={styles.headerCenter} onPress={() => conversation && router.push(`/listing/${conversation.listing_id}`)}>
          <Avatar name={name} size={32} />
          <View style={{ marginLeft: spacing.sm }}>
            <Text style={styles.headerTitle}>{name}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{conversation?.listing_title}</Text>
          </View>
        </Pressable>
        <IconButton icon="ellipsis-horizontal" variant="plain" size={40} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => {
            const me = item.sender === "me";
            const ai = item.sender === "ai";
            return (
              <View style={[styles.messageRow, me && styles.messageRowMe]}>
                {!me ? <Avatar name={ai ? "Suzi" : name} size={28} style={{ marginRight: spacing.sm, backgroundColor: ai ? colors.primary : colors.text }} /> : null}
                <View style={[styles.bubble, me ? styles.bubbleMe : ai ? styles.bubbleAi : styles.bubbleThem]}>
                  {ai ? (
                    <View style={styles.aiLabelRow}>
                      <ZMark size={10} color={colors.primaryDark} />
                      <Text style={styles.aiLabel}>Suzi</Text>
                    </View>
                  ) : null}
                  <Text style={me ? styles.bubbleTextMe : styles.bubbleText}>{item.text}</Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message"
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable style={[styles.sendButton, !input.trim() && styles.sendIdle]} onPress={send} disabled={!input.trim()}>
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.smallBold, color: colors.text },
  headerSubtitle: { ...typography.micro, color: colors.textSecondary },
  messagesList: { padding: spacing.lg, gap: spacing.sm },
  messageRow: { flexDirection: "row", alignItems: "flex-end", maxWidth: "85%" },
  messageRowMe: { alignSelf: "flex-end" },
  bubble: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: radius.lg + 2 },
  bubbleThem: { backgroundColor: colors.bgSecondary, borderBottomLeftRadius: radius.xs },
  bubbleAi: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: radius.xs },
  bubbleMe: { backgroundColor: colors.text, borderBottomRightRadius: radius.xs },
  aiLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  aiLabel: { ...typography.microBold, color: colors.primaryDark },
  bubbleText: { ...typography.body, fontSize: 15, lineHeight: 21, color: colors.text },
  bubbleTextMe: { ...typography.body, fontSize: 15, lineHeight: 21, color: colors.white },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.white,
  },
  input: {
    flex: 1, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, color: colors.text, ...typography.body, fontSize: 15,
  },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendIdle: { backgroundColor: colors.textTertiary },
});
