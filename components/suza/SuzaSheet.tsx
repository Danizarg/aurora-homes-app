import { useEffect, useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, { FadeIn, FadeInUp, FadeOut, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, motion, radius, shadow, spacing, typography } from "../../constants/theme";
import { ZMark } from "../brand/ZMark";
import { PressableScale } from "../ui/PressableScale";
import { useDiscovery } from "../../lib/store/discovery";
import { haptic } from "../../lib/ui/haptics";
import type { useSuza } from "../../lib/suza/useSuza";

type Suza = ReturnType<typeof useSuza>;

interface SuzaSheetProps {
  suza: Suza;
  open: boolean;
  onClose: () => void;
}

const stateLabel = { idle: "Ask me anything", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking" } as const;

/**
 * Suza's conversation panel: a compact bottom sheet over the map that
 * expands to full height when dragged or when the keyboard is up. Messages,
 * tap-to-answer options, mic, text input, mute and stop live here.
 */
export function SuzaSheet({ suza, open, onClose }: SuzaSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const messages = useDiscovery((s) => s.messages);
  const voice = useDiscovery((s) => s.voice);
  const setVoice = useDiscovery((s) => s.setVoice);
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // The tab bar is a translucent absolute bar; the sheet sits on top of it, not behind it.
  const tabBarHeight = (Platform.OS === "web" ? 72 : layout.tabBarHeight) + insets.bottom;
  const compactHeight = Math.round((height - tabBarHeight) * 0.52);
  const fullHeight = Math.round((height - tabBarHeight) * 0.9);
  const translate = useSharedValue(height);

  useEffect(() => {
    translate.set(open ? withSpring(0, motion.springRelease) : withTiming(height, { duration: 240 }));
  }, [open, height, translate]);

  useEffect(() => {
    if (open) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, open]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translate.get() }] }));
  const last = messages[messages.length - 1];
  const options = last?.role === "suza" ? last.options : undefined;

  async function submit(text?: string) {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput("");
    await suza.send(value);
  }

  async function onMic() {
    if (suza.state === "listening") await suza.stopListening();
    else if (suza.state === "speaking") await suza.interrupt();
    else await suza.startListening();
  }

  return (
    <Animated.View style={[styles.sheet, { height: expanded ? fullHeight : compactHeight, bottom: tabBarHeight, paddingBottom: spacing.sm }, sheetStyle]} pointerEvents={open ? "auto" : "none"}>
      <BlurView tint="light" intensity={70} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />

      <View style={styles.header}>
        <PressableScale pressedScale={0.95} onPress={() => setExpanded((v) => !v)} style={styles.handleArea} hitSlop={10}>
          <View style={styles.handle} />
        </PressableScale>
        <View style={styles.headerRow}>
          <View style={styles.orbSmall}><ZMark size={14} color={colors.white} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Suza</Text>
            <Text style={styles.status}>{suza.state === "listening" && suza.partial ? suza.partial : stateLabel[suza.state]}</Text>
          </View>
          <PressableScale pressedScale={0.9} hitSlop={6} onPress={() => { haptic.select(); setVoice({ speak: !voice.speak }); if (voice.speak) void suza.interrupt(); }} style={styles.iconButton}>
            <Ionicons name={voice.speak ? "volume-high-outline" : "volume-mute-outline"} size={18} color={colors.text} />
          </PressableScale>
          <PressableScale pressedScale={0.9} hitSlop={6} onPress={onClose} style={styles.iconButton}>
            <Ionicons name="chevron-down" size={20} color={colors.text} />
          </PressableScale>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent} keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? (
          <Text style={styles.hint}>Tell me where you want to live, your budget, how many bedrooms, or just say “show me everything”.</Text>
        ) : null}
        {messages.map((m) => (
          <Animated.View key={m.id} entering={FadeInUp.duration(220)} style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleSuza]}>
            <Text style={m.role === "user" ? styles.bubbleTextUser : styles.bubbleTextSuza}>{m.text}</Text>
          </Animated.View>
        ))}
        {suza.state === "thinking" ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.bubble, styles.bubbleSuza]}>
            <Text style={styles.bubbleTextSuza}>…</Text>
          </Animated.View>
        ) : null}
        {options?.length ? (
          <View style={styles.options}>
            {options.map((o) => (
              <PressableScale key={o.label} pressedScale={0.95} onPress={() => { haptic.select(); void submit(o.value); }} style={styles.option}>
                <Text style={styles.optionText}>{o.label}</Text>
              </PressableScale>
            ))}
          </View>
        ) : null}
        {suza.error ? <Text style={styles.error}>{suza.error}</Text> : null}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={tabBarHeight}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={suza.voiceInputAvailable ? "Type or hold the mic" : "Type to Suza"}
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            onFocus={() => setExpanded(true)}
            onSubmitEditing={() => submit()}
            returnKeyType="send"
          />
          {input.trim() ? (
            <PressableScale pressedScale={0.9} onPress={() => submit()} style={[styles.mic, styles.send]}>
              <Ionicons name="arrow-up" size={20} color={colors.white} />
            </PressableScale>
          ) : (
            <PressableScale
              pressedScale={0.9}
              haptics
              onPress={onMic}
              disabled={!suza.voiceInputAvailable && suza.state !== "speaking"}
              style={[styles.mic, suza.state === "listening" && styles.micActive, !suza.voiceInputAvailable && suza.state !== "speaking" && styles.micDisabled]}
            >
              <Ionicons name={suza.state === "speaking" ? "stop" : suza.state === "listening" ? "checkmark" : "mic"} size={20} color={colors.white} />
            </PressableScale>
          )}
        </View>
        {!suza.voiceInputAvailable && suza.voiceInputHint ? <Text style={styles.voiceHint}>{suza.voiceInputHint}</Text> : null}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: "hidden", ...shadow.card,
  },
  tint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.88)" },
  header: { paddingHorizontal: spacing.md },
  handleArea: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  orbSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  name: { ...typography.bodyBold, color: colors.text },
  status: { ...typography.micro, color: colors.textSecondary },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgSecondary },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  hint: { ...typography.small, color: colors.textSecondary, paddingVertical: spacing.sm },
  bubble: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: radius.lg, maxWidth: "88%" },
  bubbleSuza: { backgroundColor: colors.white, alignSelf: "flex-start", borderBottomLeftRadius: radius.xs, borderWidth: 1, borderColor: colors.divider },
  bubbleUser: { backgroundColor: colors.text, alignSelf: "flex-end", borderBottomRightRadius: radius.xs },
  bubbleTextSuza: { ...typography.body, fontSize: 15, lineHeight: 21, color: colors.text },
  bubbleTextUser: { ...typography.body, fontSize: 15, lineHeight: 21, color: colors.white },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.xs },
  option: { borderWidth: 1, borderColor: colors.text, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.white },
  optionText: { ...typography.smallBold, color: colors.text },
  error: { ...typography.micro, color: colors.error, paddingTop: spacing.xs },
  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  input: { flex: 1, height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, backgroundColor: colors.white, color: colors.text, ...typography.body, fontSize: 15 },
  mic: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  micActive: { backgroundColor: colors.success },
  micDisabled: { backgroundColor: colors.textTertiary },
  send: { backgroundColor: colors.text },
  voiceHint: { ...typography.micro, color: colors.textSecondary, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
});
