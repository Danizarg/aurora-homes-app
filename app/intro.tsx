import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { Globe, type GlobePhase } from "../components/globe/Globe";
import { PressableScale } from "../components/ui/PressableScale";
import { ZMark } from "../components/brand/ZMark";
import { colors, motion, radius, spacing, typography } from "../constants/theme";
import { geocode, reverseGeocode, suggestPlaces } from "../lib/geo/geocode";
import { lookupCoords } from "../lib/geo/cities";
import { boundsAround } from "../lib/geo/bounds";
import { useDiscovery } from "../lib/store/discovery";
import { useSuza } from "../lib/suza/useSuza";
import { useSpeechToText } from "../lib/voice/useSpeechToText";
import { haptic } from "../lib/ui/haptics";
import type { Intent, SearchTarget } from "../types/search";

const MARBELLA = lookupCoords("", "Marbella")!;
/** Where the globe goes for someone who skips the question instead of answering it. */
const DEMO_TARGET: SearchTarget = { label: "Marbella", point: MARBELLA, bounds: boundsAround(MARBELLA, 6), kind: "city", source: "local" };

const WHERE_QUESTION = "Hey, I'm Suza, your personal real estate assistant. Where in the world are you looking?";
const intentQuestion = (place: string) =>
  `${place} — lovely. Are you looking to buy a home, rent somewhere, find a short stay, or list your own property?`;
const STARTERS = ["Marbella", "Málaga", "Barcelona", "Madrid", "Valencia"];

const choices: { intent: Intent; title: string; body: string; icon: keyof typeof Ionicons.glyphMap; say: string }[] = [
  { intent: "buy", title: "Buy a property", body: "Homes for sale, direct from owners", icon: "key-outline", say: "I want to buy a property" },
  { intent: "rent", title: "Rent a property", body: "Long-term and seasonal rentals", icon: "home-outline", say: "I want to rent a property" },
  { intent: "stay", title: "Find a short stay", body: "Weeks or months, furnished", icon: "bed-outline", say: "I'm looking for a short stay" },
  { intent: "list", title: "Sell or rent out my property", body: "Suza writes the listing from your photos", icon: "camera-outline", say: "I want to list my own property" },
];

const listChoices = [
  { label: "Sell it", value: "I want to sell my property" },
  { label: "Rent out short-term", value: "rent out my property short-term" },
  { label: "Rent out seasonally", value: "rent out my property seasonally" },
  { label: "Rent out long-term", value: "rent out my property long-term" },
];

type Step = "earth" | "where" | "flying" | "intent" | "listing";

/**
 * First launch, in four beats: the whole planet turning in the dark; Suza
 * asking out loud where in the world you're looking; your answer, typed,
 * tapped or spoken (or "use my location", if you'd rather); then one
 * continuous flight down to that place, where she asks what brings you.
 * Nothing asks for your location until you offer it. Skip is always a tap
 * away, and reduced-motion settings shorten everything.
 */
export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const suza = useSuza();
  const stt = useSpeechToText();
  const setIntent = useDiscovery((s) => s.setIntent);
  const setCriteria = useDiscovery((s) => s.setCriteria);
  const setTarget = useDiscovery((s) => s.setTarget);
  const setCamera = useDiscovery((s) => s.setCamera);
  const setUserLocation = useDiscovery((s) => s.setUserLocation);
  const setOnboardingDone = useDiscovery((s) => s.setOnboardingDone);
  const setVoice = useDiscovery((s) => s.setVoice);
  const clearConversation = useDiscovery((s) => s.clearConversation);
  const pushMessage = useDiscovery((s) => s.pushMessage);

  const [phase, setPhase] = useState<GlobePhase>("spin");
  const [step, setStep] = useState<Step>("earth");
  const [place, setPlace] = useState<SearchTarget | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchTarget[]>([]);
  const [resolving, setResolving] = useState(false);
  const [whereError, setWhereError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const asked = useRef(false);
  const greeted = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Beat one: the planet alone, long enough to read as a planet and not a loading screen.
  useEffect(() => {
    const timer = setTimeout(() => setStep((s) => (s === "earth" ? "where" : s)), reducedMotion ? 300 : 2600);
    timers.current.push(timer);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  // Beat two: she asks, out loud, and the question opens the conversation.
  useEffect(() => {
    if (step !== "where" || asked.current) return;
    asked.current = true;
    clearConversation();
    suza.greet(WHERE_QUESTION);
  }, [step, suza, clearConversation]);

  // Real places for whatever is being typed, a beat after the typing stops.
  useEffect(() => {
    const q = query.trim();
    if (step !== "where" || q.length < 2) return;
    let alive = true;
    const timer = setTimeout(() => {
      suggestPlaces(q, 4)
        .then((found) => alive && setSuggestions(found))
        .catch(() => {});
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, step]);

  /** Beat four: record the answer and start the flight. */
  const flyTo = useCallback(
    async (target: SearchTarget, spoken: string) => {
      await suza.interrupt();
      setSuggestions([]);
      setQuery("");
      setWhereError(null);
      setPlace(target);
      setStep("flying");
      pushMessage({ role: "user", text: spoken });
      useDiscovery.getState().markAsked("location");
      setPhase("focus");
      timers.current.push(setTimeout(() => setPhase("zoom"), reducedMotion ? 200 : 1200));
    },
    [pushMessage, reducedMotion, suza]
  );

  /** Beat three: turn whatever they said into a point on the globe. */
  const submitPlace = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || resolving) return;
      haptic.select();
      setResolving(true);
      setWhereError(null);
      try {
        const found = await geocode(q);
        const local = found ? null : lookupCoords("", q);
        const target = found ?? (local ? { label: q, point: local, bounds: boundsAround(local, 6), kind: "city", source: "local" as const } : null);
        if (!target) {
          setWhereError(`I couldn't find "${q}" on the map. Try the city, or a nearby town.`);
          suza.greet(`I couldn't find ${q} on the map. Could you try the city, or a nearby town?`);
          return;
        }
        await flyTo(target, q);
      } finally {
        setResolving(false);
      }
    },
    [flyTo, resolving, suza]
  );

  /** The one place the location permission is ever asked for: because they tapped it. */
  const goToMyLocation = useCallback(async () => {
    haptic.select();
    setResolving(true);
    setWhereError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setWhereError("No problem — type a place instead and I'll take you there.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const named = await reverseGeocode(point);
      const label = named?.city ?? named?.country ?? "where you are";
      setUserLocation(point, named?.city ?? null);
      await flyTo({ label, point, bounds: boundsAround(point, 6), kind: "city", source: "device" }, `near me, in ${label}`);
    } catch {
      setWhereError("I couldn't read your location just now. Type a place instead.");
    } finally {
      setResolving(false);
    }
  }, [flyTo, setUserLocation]);

  const showIntent = useCallback(() => {
    setStep((s) => (s === "intent" || s === "listing" ? s : "intent"));
    if (greeted.current) return;
    greeted.current = true;
    suza.greet(
      intentQuestion(place?.label ?? DEMO_TARGET.label),
      choices.map((c) => ({ label: c.title, value: c.say }))
    );
  }, [place, suza]);

  function landOnMap(intent: Exclude<Intent, "list">) {
    const target = place ?? DEMO_TARGET;
    setIntent(intent);
    setCriteria({ intent });
    setTarget(target);
    // Land wide (country scale) so the map's own fly-in continues the shot.
    setCamera({ latitude: target.point.lat, longitude: target.point.lng, latitudeDelta: 6, longitudeDelta: 6 });
    setOnboardingDone(true);
    setVoice({ replayIntro: false });
    router.replace("/(tabs)");
  }

  async function choose(c: (typeof choices)[number]) {
    haptic.select();
    await suza.interrupt();
    if (c.intent === "list") {
      setIntent("list");
      setStep("listing");
      suza.greet("Lovely — are you selling, or renting it out? And if renting, short-term, seasonal or long-term?", listChoices);
      return;
    }
    landOnMap(c.intent);
  }

  async function chooseListing(value: string) {
    haptic.select();
    await suza.interrupt();
    setOnboardingDone(true);
    setVoice({ replayIntro: false });
    const sell = /sell/i.test(value);
    const duration = /short/i.test(value) ? "short" : /season/i.test(value) ? "seasonal" : /long/i.test(value) ? "long" : "";
    router.replace({ pathname: "/create-listing", params: { purpose: sell ? "sell" : "rent_out", duration, from: "intro" } });
  }

  async function skip() {
    haptic.select();
    await suza.interrupt();
    stt.cancel();
    if (step === "earth" || step === "where" || step === "flying") {
      // No answer given, so the globe stops where it is and Marbella stands in.
      setSkipped(true);
      setPlace((p) => p ?? DEMO_TARGET);
      setPhase("done");
      showIntent();
      return;
    }
    // Skipping the question too: straight to the map, keeping whatever intent was chosen.
    const target = place ?? DEMO_TARGET;
    setTarget(target);
    const chosen = useDiscovery.getState().intent;
    setCriteria({ intent: chosen && chosen !== "list" ? chosen : undefined });
    setCamera({ latitude: target.point.lat, longitude: target.point.lng, latitudeDelta: 6, longitudeDelta: 6 });
    setOnboardingDone(true);
    setVoice({ replayIntro: false });
    router.replace("/(tabs)");
  }

  /** Dropping them as the query shrinks keeps stale suggestions from outliving it. */
  function onQueryChange(text: string) {
    setQuery(text);
    if (text.trim().length < 2) setSuggestions([]);
  }

  const listening = stt.status === "listening";
  const chips: { key: string; label: string; onPress: () => void }[] = suggestions.length
    ? suggestions.map((s) => ({ key: `${s.label}-${s.point.lat}`, label: s.label, onPress: () => void flyTo(s, s.label) }))
    : STARTERS.map((name) => ({ key: name, label: name, onPress: () => void submitPlace(name) }));

  return (
    <View style={styles.screen}>
      <Globe target={place?.point ?? null} phase={phase} reducedMotion={reducedMotion} onArrived={showIntent} />

      {step === "flying" && place ? (
        <Animated.View entering={FadeIn.duration(500)} exiting={FadeOut.duration(300)} style={[styles.status, { bottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.statusText}>Flying to {place.label}</Text>
        </Animated.View>
      ) : null}

      <PressableScale pressedScale={0.94} onPress={() => void skip()} style={[styles.skip, { top: insets.top + spacing.sm }]} hitSlop={8}>
        <Text style={styles.skipText}>{step === "intent" || step === "listing" ? "Skip" : "Skip intro"}</Text>
      </PressableScale>

      {step === "where" ? (
        <Animated.View entering={FadeInDown.springify().damping(14).stiffness(140)} style={[styles.panel, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.greetingRow}>
            <View style={styles.orb}><ZMark size={18} color={colors.white} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingTitle}>Hey, I&apos;m Suza</Text>
              <Text style={styles.greetingBody}>Where in the world are you looking?</Text>
            </View>
            {suza.state === "speaking" ? (
              <PressableScale pressedScale={0.9} onPress={() => void suza.interrupt()} style={styles.stop} hitSlop={6}>
                <Ionicons name="stop" size={14} color={colors.text} />
              </PressableScale>
            ) : null}
          </View>

          {/* The keyboard must never cover the answer, so the field and its chips ride above it. */}
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
            <View style={styles.inputRow}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={onQueryChange}
                placeholder="A city, an island, a neighbourhood…"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="go"
                autoCorrect={false}
                editable={!resolving}
                onSubmitEditing={() => void submitPlace(query)}
              />
              {query.trim() ? (
                <PressableScale pressedScale={0.92} haptics onPress={() => void submitPlace(query)} style={styles.go} hitSlop={6}>
                  <Ionicons name="arrow-forward" size={16} color={colors.white} />
                </PressableScale>
              ) : null}
            </View>

            <View style={styles.chipRow}>
              {chips.map((chip) => (
                <PressableScale key={chip.key} pressedScale={0.96} haptics onPress={chip.onPress} style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>{chip.label}</Text>
                </PressableScale>
              ))}
              <PressableScale pressedScale={0.96} haptics onPress={() => void goToMyLocation()} style={[styles.chip, styles.chipAccent]}>
                <Ionicons name="locate" size={14} color={colors.primary} />
                <Text style={[styles.chipText, styles.chipAccentText]}>Use my location</Text>
              </PressableScale>
            </View>

            {whereError ? <Text style={styles.error}>{whereError}</Text> : null}

            <View style={styles.voiceRow}>
              {stt.available ? (
                <PressableScale
                  pressedScale={0.92}
                  haptics
                  onPress={() =>
                    listening
                      ? void stt.stop().then((text) => void submitPlace(text))
                      : void stt.start({ autoStop: true, onResult: (text) => void submitPlace(text) })
                  }
                  style={[styles.mic, listening && styles.micActive]}
                >
                  <Ionicons name={listening ? "checkmark" : "mic"} size={18} color={colors.white} />
                  <Text style={styles.micText}>{listening ? "Done" : "Say a place"}</Text>
                </PressableScale>
              ) : (
                <Text style={styles.voiceHint}>
                  {Platform.OS === "web"
                    ? "Type a place or tap one. Spoken answers need a browser with speech recognition."
                    : "Type a place or tap one. Spoken answers arrive with the Zouza transcription service."}
                </Text>
              )}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      ) : null}

      {step === "intent" || step === "listing" ? (
        <Animated.View entering={FadeInDown.springify().damping(14).stiffness(140)} style={[styles.panel, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.greetingRow}>
            <View style={styles.orb}><ZMark size={18} color={colors.white} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingTitle}>{step === "listing" ? "Tell me about your place" : (place?.label ?? DEMO_TARGET.label)}</Text>
              <Text style={styles.greetingBody}>
                {step === "listing"
                  ? "Selling, or renting it out? Short-term, seasonal or long-term?"
                  : skipped
                    ? "A demo destination for now — change it any time from the search bar. What brings you here?"
                    : "What brings you here?"}
              </Text>
            </View>
            {suza.state === "speaking" ? (
              <PressableScale pressedScale={0.9} onPress={() => void suza.interrupt()} style={styles.stop} hitSlop={6}>
                <Ionicons name="stop" size={14} color={colors.text} />
              </PressableScale>
            ) : null}
          </View>

          {step === "intent" ? (
            <View style={styles.choices}>
              {choices.map((c, i) => (
                <Animated.View key={c.intent} entering={FadeInDown.delay(80 + i * motion.stagger).duration(motion.reveal)}>
                  <PressableScale pressedScale={0.97} haptics onPress={() => void choose(c)} style={styles.choice}>
                    <View style={styles.choiceIcon}><Ionicons name={c.icon} size={22} color={colors.text} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceTitle}>{c.title}</Text>
                      <Text style={styles.choiceBody}>{c.body}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.choices}>
              {listChoices.map((c, i) => (
                <Animated.View key={c.label} entering={FadeInDown.delay(60 + i * motion.stagger).duration(motion.reveal)}>
                  <PressableScale pressedScale={0.97} haptics onPress={() => void chooseListing(c.value)} style={styles.choice}>
                    <Text style={[styles.choiceTitle, { flex: 1 }]}>{c.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          )}

          <View style={styles.voiceRow}>
            {suza.voiceInputAvailable ? (
              <PressableScale
                pressedScale={0.92}
                haptics
                onPress={() => (suza.state === "listening" ? void suza.stopListening().then(route) : void suza.startListening())}
                style={[styles.mic, suza.state === "listening" && styles.micActive]}
              >
                <Ionicons name={suza.state === "listening" ? "checkmark" : "mic"} size={18} color={colors.white} />
                <Text style={styles.micText}>{suza.state === "listening" ? "Done" : "Answer by voice"}</Text>
              </PressableScale>
            ) : (
              <Text style={styles.voiceHint}>{Platform.OS === "web" ? "Tap a choice, or use a browser with speech recognition to answer by voice." : "Tap a choice to continue. Voice answers arrive with the Zouza transcription service."}</Text>
            )}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );

  /** After a spoken answer, read the intent Suza set and continue the flow. */
  function route() {
    const intent = useDiscovery.getState().intent;
    if (intent === "list") {
      setStep("listing");
      return;
    }
    if (intent) landOnMap(intent);
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#04050d" },
  status: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center" },
  statusText: { ...typography.bodyMedium, color: "rgba(255,255,255,0.9)", textAlign: "center" },
  skip: { position: "absolute", right: spacing.md, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.14)" },
  skipText: { ...typography.smallBold, color: colors.white },
  panel: {
    position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
  },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  orb: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  greetingTitle: { ...typography.h3, color: colors.text },
  greetingBody: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  stop: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSecondary,
  },
  input: { flex: 1, ...typography.body, color: colors.text, padding: 0 },
  go: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%", paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  chipAccent: { borderColor: colors.primary },
  chipText: { ...typography.smallBold, color: colors.text, flexShrink: 1 },
  chipAccentText: { color: colors.primary },
  error: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.sm },
  choices: { gap: spacing.sm },
  choice: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  choiceIcon: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.bgSecondary, alignItems: "center", justifyContent: "center" },
  choiceTitle: { ...typography.bodyBold, color: colors.text },
  choiceBody: { ...typography.micro, color: colors.textSecondary, marginTop: 2 },
  voiceRow: { alignItems: "center", marginTop: spacing.md },
  mic: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 18 },
  micActive: { backgroundColor: colors.success },
  micText: { ...typography.smallBold, color: colors.white },
  voiceHint: { ...typography.micro, color: colors.textSecondary, textAlign: "center" },
});
