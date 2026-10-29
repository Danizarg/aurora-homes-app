import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { Globe, type GlobePhase } from "../components/globe/Globe";
import { PressableScale } from "../components/ui/PressableScale";
import { ZMark } from "../components/brand/ZMark";
import { colors, motion, radius, spacing, typography } from "../constants/theme";
import { reverseGeocode } from "../lib/geo/geocode";
import { lookupCoords } from "../lib/geo/cities";
import { boundsAround } from "../lib/geo/bounds";
import { useDiscovery } from "../lib/store/discovery";
import { useSuza } from "../lib/suza/useSuza";
import { haptic } from "../lib/ui/haptics";
import type { GeoPoint, Intent, SearchTarget } from "../types/search";

const DEMO_CITY = { name: "Marbella", point: lookupCoords("", "Marbella")! };
const GREETING = "Hey! I'm Suza, your personal real estate assistant. Welcome! Are you looking to buy a home, rent somewhere, find a short stay, or list your own property?";

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

type Step = "earth" | "intent" | "listing";

/**
 * First launch: the planet in space, a slow spin, then a continuous fly-in
 * to the visitor's city (with permission) or a clearly labelled demo city,
 * Suza's spoken greeting, and the four intent choices. Skip is always a tap
 * away; reduced-motion settings shorten everything.
 */
export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const suza = useSuza();
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
  const [target, setTargetPoint] = useState<GeoPoint | null>(null);
  const [label, setLabel] = useState<string>("");
  const [isDemo, setIsDemo] = useState(false);
  const [status, setStatus] = useState("Finding your corner of the world…");
  const [reducedMotion, setReducedMotion] = useState(false);
  const greeted = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
  }, []);

  // Ask for location after the planet has had a moment on screen.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      let point: GeoPoint | null = null;
      let name = "";
      let demo = false;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const place = await reverseGeocode(point);
          name = place?.city ?? place?.country ?? "your area";
          setUserLocation(point, place?.city ?? null);
        }
      } catch {
        point = null;
      }
      if (!point) {
        point = DEMO_CITY.point;
        name = DEMO_CITY.name;
        demo = true;
      }
      if (cancelled) return;
      setTargetPoint(point);
      setLabel(name);
      setIsDemo(demo);
      setStatus(demo ? `Showing ${name} as a demo destination` : `Flying to ${name}`);
      setPhase("focus");
      setTimeout(() => !cancelled && setPhase("zoom"), reducedMotion ? 200 : 1200);
    }, reducedMotion ? 100 : 1600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reducedMotion, setUserLocation]);

  const showIntent = useCallback(() => {
    if (step !== "earth") return;
    setStep("intent");
    if (!greeted.current) {
      greeted.current = true;
      clearConversation();
      suza.greet(GREETING, choices.map((c) => ({ label: c.title, value: c.say })));
    }
  }, [step, suza, clearConversation]);

  function landOnMap(intent: Exclude<Intent, "list">) {
    const point = target ?? DEMO_CITY.point;
    const name = label || DEMO_CITY.name;
    const t: SearchTarget = { label: name, point, bounds: boundsAround(point, 6), kind: "city", source: isDemo ? "local" : "device" };
    setIntent(intent);
    setCriteria({ intent });
    setTarget(t);
    // Land wide (country scale) so the map's own fly-in continues the shot.
    setCamera({ latitude: point.lat, longitude: point.lng, latitudeDelta: 6, longitudeDelta: 6 });
    setOnboardingDone(true);
    setVoice({ replayIntro: false });
    const question = `Where would you like to ${intent === "buy" ? "buy" : intent === "stay" ? "stay" : "live"}? I can start around ${name}${isDemo ? " (a demo destination until you share your location)" : ""}.`;
    pushMessage({ role: "suza", text: question, options: [{ label: `Around ${name}`, value: `in ${name}` }, { label: "Somewhere else", value: "somewhere else" }] });
    useDiscovery.getState().markAsked("location");
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
    if (step === "earth") {
      setPhase("done");
      showIntent();
      return;
    }
    // Skipping the question too: straight to the map, keeping whatever intent was chosen (none is fine — Suza asks there).
    await suza.interrupt();
    const point = target ?? DEMO_CITY.point;
    const name = label || DEMO_CITY.name;
    setTarget({ label: name, point, bounds: boundsAround(point, 6), kind: "city", source: isDemo ? "local" : "device" });
    const chosen = useDiscovery.getState().intent;
    setCriteria({ intent: chosen && chosen !== "list" ? chosen : undefined });
    setCamera({ latitude: point.lat, longitude: point.lng, latitudeDelta: 6, longitudeDelta: 6 });
    setOnboardingDone(true);
    setVoice({ replayIntro: false });
    router.replace("/(tabs)");
  }

  return (
    <View style={styles.screen}>
      <Globe target={target} phase={phase} reducedMotion={reducedMotion} onArrived={showIntent} />

      {/* Status line while the camera moves */}
      {step === "earth" ? (
        <Animated.View entering={FadeIn.duration(600)} exiting={FadeOut.duration(300)} style={[styles.status, { bottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.statusText}>{status}</Text>
          {isDemo ? <Text style={styles.statusSub}>You can change the city any time from the search bar.</Text> : null}
        </Animated.View>
      ) : null}

      <PressableScale pressedScale={0.94} onPress={skip} style={[styles.skip, { top: insets.top + spacing.sm }]} hitSlop={8}>
        <Text style={styles.skipText}>{step === "earth" ? "Skip intro" : "Skip"}</Text>
      </PressableScale>

      {step !== "earth" ? (
        <Animated.View entering={FadeInDown.springify().damping(14).stiffness(140)} style={[styles.panel, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.greetingRow}>
            <View style={styles.orb}><ZMark size={18} color={colors.white} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingTitle}>{step === "listing" ? "Tell me about your place" : "Hey, I'm Suza"}</Text>
              <Text style={styles.greetingBody}>
                {step === "listing" ? "Selling, or renting it out? Short-term, seasonal or long-term?" : "Your personal real estate assistant. What brings you here?"}
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
                onPress={() => (suza.state === "listening" ? void suza.stopListening().then(() => route(useDiscovery.getState().messages)) : void suza.startListening())}
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
  function route(_messages: unknown) {
    const intent = useDiscovery.getState().intent;
    if (intent === "list") {
      setStep("listing");
      return;
    }
    if (intent) landOnMap(intent);
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0d214d" },
  status: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center" },
  statusText: { ...typography.bodyMedium, color: "rgba(255,255,255,0.9)", textAlign: "center" },
  statusSub: { ...typography.micro, color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: spacing.xs },
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
