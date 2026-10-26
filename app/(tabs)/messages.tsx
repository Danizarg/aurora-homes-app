import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Avatar } from "../../components/ui/Avatar";
import { Chip } from "../../components/ui/Chip";
import { IconButton } from "../../components/ui/IconButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { mockConversations } from "../../lib/mock/messages";
import { getListingById } from "../../lib/mock/listings";

type Filter = "all" | "unread" | "leads";

function relativeTime(iso: string) {
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (days < 7) return date.toLocaleDateString("en-GB", { weekday: "short" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Airbnb Inbox: big title with search/filter circles, filter chips, avatar rows with listing thumbnail. */
export default function MessagesScreen() {
  const [filter, setFilter] = useState<Filter>("all");

  const conversations = useMemo(() => {
    if (filter === "unread") return mockConversations.filter((c) => c.unread);
    if (filter === "leads") return mockConversations.filter((c) => c.qualified_lead);
    return mockConversations;
  }, [filter]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.headerActions}>
          <IconButton icon="search" size={40} variant="outline" />
          <IconButton icon="options-outline" size={40} variant="outline" />
        </View>
      </View>

      <View style={styles.chips}>
        <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label="Unread" active={filter === "unread"} onPress={() => setFilter("unread")} />
        <Chip label="Qualified leads" active={filter === "leads"} onPress={() => setFilter("leads")} />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState title="You don't have any messages" subtitle="When you contact an owner or receive an enquiry, you'll see it here." />
        }
        renderItem={({ item }) => {
          const thumb = getListingById(item.listing_id)?.images[0]?.uri;
          return (
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => router.push(`/messages/${item.id}`)}>
              <View style={styles.avatarWrap}>
                <Avatar name={item.participant_name} size={56} />
                {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>{item.participant_name}</Text>
                  <Text style={styles.time}>{relativeTime(item.last_message_at)}</Text>
                </View>
                <Text style={[styles.preview, item.unread && styles.previewUnread]} numberOfLines={1}>{item.last_message}</Text>
                <Text style={styles.listing} numberOfLines={1}>
                  {item.listing_title}{item.qualified_lead ? " · Qualified lead" : ""}
                </Text>
              </View>
              {item.unread ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  title: { ...typography.display, color: colors.text },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  chips: { flexDirection: "row", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.md },
  rowPressed: { opacity: 0.7 },
  avatarWrap: { width: 60, height: 60 },
  thumb: { position: "absolute", right: -4, bottom: -2, width: 28, height: 28, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.bgSecondary },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  name: { ...typography.bodyMedium, color: colors.text, flex: 1 },
  time: { ...typography.micro, color: colors.textSecondary },
  preview: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  previewUnread: { color: colors.text, fontWeight: "600" },
  listing: { ...typography.micro, color: colors.textSecondary, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
