import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { mockConversations } from "../../lib/mock/messages";

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      <FlatList
        data={mockConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon="chatbubble-outline" title="No conversations yet" subtitle="Enquiries about your listings will appear here." />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/messages/${item.id}`)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{item.participant_name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowHeader}>
                <Text style={styles.name}>{item.participant_name}</Text>
                {item.qualified_lead ? <Badge label="Qualified lead" tone="success" /> : null}
              </View>
              <Text style={styles.listingTitle} numberOfLines={1}>{item.listing_title}</Text>
              <Text style={[styles.lastMessage, item.unread && styles.lastMessageUnread]} numberOfLines={1}>
                {item.last_message}
              </Text>
            </View>
            {item.unread ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  headerTitle: { ...typography.h1, color: colors.navy },
  listContent: { paddingHorizontal: spacing.lg },
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  avatar: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.sand,
    alignItems: "center", justifyContent: "center", marginRight: spacing.md,
  },
  avatarInitial: { ...typography.h3, color: colors.gold },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  name: { ...typography.bodyMedium, color: colors.navy },
  listingTitle: { ...typography.small, color: colors.gold, marginTop: 1 },
  lastMessage: { ...typography.small, color: colors.muted, marginTop: 2 },
  lastMessageUnread: { color: colors.navy, fontWeight: "600" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.terracotta, marginLeft: spacing.sm },
});
