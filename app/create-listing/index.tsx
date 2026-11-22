import { useEffect, useRef, useState, type ComponentRef, type PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, FadeInUp, ZoomIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, motion, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { TextField } from "../../components/ui/TextField";
import { Divider } from "../../components/ui/Divider";
import { PressableScale } from "../../components/ui/PressableScale";
import { Reveal, nativeOnly } from "../../components/ui/Reveal";
import { ZMark } from "../../components/brand/ZMark";
import {
  describeDetectedFeatures,
  detectFeaturesFromPhotos,
  type DetectedFeatures,
  type ListingDraftInput,
  type Positioning,
} from "../../lib/ai/service";
import { generateListing } from "../../lib/ai/suzi";
import { lookupCoords } from "../../lib/geo/cities";
import { geocode } from "../../lib/geo/geocode";
import { invalidateRemoteListings } from "../../lib/search/service";
import type { AiGeneratedContent, Listing } from "../../types";
import { addStoredListing } from "../../lib/mock/storage";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { createListingInSupabase, uploadListingImages } from "../../lib/supabase/listings";
import { useSession } from "../../lib/auth/session";
import { useDiscovery } from "../../lib/store/discovery";
import { useVoiceGuide } from "../../lib/voice/useVoiceGuide";
import { tts } from "../../lib/voice/tts";
import { MAX_ROOMS, asksRentKind, parseCount, positioningForPriceMode, priceModeOf, type PriceMode } from "../../lib/listings/wizardAnswers";
import { spokenGoOn, spokenNumber, spokenSkip, spokenYesNo } from "../../lib/suza/spoken";
import { haptic } from "../../lib/ui/haptics";

type WizardStep = "photos" | "address" | "price" | "chat" | "generating" | "review" | "preview" | "success";

const propertyTypes = ["apartment", "villa", "townhouse", "studio", "loft", "house"] as const;

const generationStages = [
  "Analysing photos",
  "Detecting features",
  "Writing exposé",
  "Creating FAQ",
  "Preparing translations",
  "Teaching Suzi this property",
  "Preparing listing preview",
];

interface ChatAnswers {
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  sizeM2?: number;
  petsAllowed?: boolean;
  garage?: boolean;
  positioning?: Positioning;
}

interface ChatQuestion {
  field: keyof ChatAnswers;
  ai: string;
  quickReplies?: { label: string; value: string | number | boolean }[];
  keyboardType?: "number-pad" | "default";
  /** A room count: quick numbers plus a "+" that opens the number keypad. */
  count?: boolean;
}

const questions: ChatQuestion[] = [
  {
    field: "propertyType",
    ai: "What type of property is this?",
    quickReplies: propertyTypes.map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t })),
  },
  {
    field: "bedrooms",
    ai: "How many bedrooms should I list?",
    count: true,
    quickReplies: [1, 2, 3, 4, 5].map((n) => ({ label: `${n}`, value: n })),
  },
  {
    field: "bathrooms",
    ai: "How many bathrooms?",
    count: true,
    quickReplies: [1, 2, 3].map((n) => ({ label: `${n}`, value: n })),
  },
  {
    field: "sizeM2",
    ai: "Roughly how big is it, in m²?",
    keyboardType: "number-pad",
  },
  {
    field: "petsAllowed",
    ai: "Are pets allowed?",
    quickReplies: [{ label: "Yes", value: true }, { label: "No", value: false }],
  },
  {
    field: "garage",
    ai: "Is parking included?",
    quickReplies: [{ label: "Yes", value: true }, { label: "No", value: false }],
  },
  {
    field: "positioning",
    // Rent or sale is chosen on the price step; this only asks which kind of rental.
    ai: "Is it a long-term rental or a holiday stay?",
    quickReplies: [
      { label: "Long-term rental", value: "rent_long" },
      { label: "Holiday stay", value: "rent_holiday" },
    ],
  },
];

interface ChatMessage {
  id: string;
  from: "ai" | "user";
  text: string;
}

const stepOrder: WizardStep[] = ["photos", "address", "price", "chat", "generating", "review", "preview", "success"];

export default function AiListingBuilder() {
  const insets = useSafeAreaInsets();
  // Suza (or the intent sheet) can arrive with the purpose already decided.
  const params = useLocalSearchParams<{ purpose?: string; duration?: string; from?: string }>();
  const presetPositioning: Positioning | undefined =
    params.purpose === "sell" ? "sale" : params.purpose === "rent_out" ? (params.duration === "short" ? "rent_holiday" : "rent_long") : undefined;
  const presetDuration = params.duration === "short" || params.duration === "seasonal" || params.duration === "long" ? params.duration : undefined;
  const [step, setStep] = useState<WizardStep>("photos");
  const [images, setImages] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [priceInput, setPriceInput] = useState("");

  const [detected, setDetected] = useState<DetectedFeatures | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<ChatAnswers>(presetPositioning ? { positioning: presetPositioning } : {});
  const [geo, setGeo] = useState<{ lat: number; lng: number; approximate: boolean } | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [customCount, setCustomCount] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const introRef = useRef<string | null>(null);
  const priceMode: PriceMode = priceModeOf(answers.positioning);

  function setPriceMode(mode: PriceMode) {
    setAnswers((prev) => ({ ...prev, positioning: positioningForPriceMode(mode, prev.positioning) }));
  }

  const [generated, setGenerated] = useState<AiGeneratedContent | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedToSupabase, setPublishedToSupabase] = useState(false);
  const session = useSession();
  // Publishing needs an account (anonymous publishing is off). Without Supabase settings the app
  // stays a local demo and publishes to the phone.
  const needsAccount = isSupabaseConfigured && session.status !== "signedIn";

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const { city, addressArea } = splitAddress(address);

  async function pickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  function removeImage(uri: string) {
    setImages((prev) => prev.filter((i) => i !== uri));
  }

  function startChat() {
    const detectedFeatures = detectFeaturesFromPhotos(address, images.length);
    setDetected(detectedFeatures);
    const intro = describeDetectedFeatures(detectedFeatures);
    introRef.current = intro;
    setMessages([{ id: "intro", from: "ai", text: intro }]);
    if (guided && useDiscovery.getState().voice.speak) void tts.prefetch(`${intro} ${questions[0].ai}`);
    setQuestionIndex(0);
    setStep("chat");
    setTimeout(() => askNext(0), 500);
  }

  function askNext(index: number) {
    if (index < questions.length && questions[index].field === "positioning" && !asksRentKind(priceModeOf(answers.positioning), presetPositioning)) {
      askNext(index + 1);
      setQuestionIndex(index + 1);
      return;
    }
    if (index >= questions.length) {
      setMessages((prev) => [
        ...prev,
        { id: "done", from: "ai", text: "Done. I created a professional listing from your photos." },
      ]);
      setTimeout(() => {
        setStageIndex(0);
        setStep("generating");
      }, 900);
      return;
    }
    presentQuestion(index);
  }

  // A question shows when Suzi starts saying it (at most 2.5 s late, so it never hangs), and the
  // next question's audio loads while this one is answered, so voice and text stay together.
  function presentQuestion(index: number) {
    const id = `q-${index}`;
    const text = questions[index].ai;
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      setMessages((prev) => (prev.some((m) => m.id === id) ? prev : [...prev, { id, from: "ai", text }]));
    };
    if (!guided) return show();
    spokenIds.current.add(id);
    let spoken = text;
    if (introRef.current && !spokenIds.current.has("intro")) {
      spokenIds.current.add("intro");
      spoken = `${introRef.current} ${text}`;
    }
    guide.say(spoken, (h) => handlers.current.chat(index, h), show);
    setTimeout(show, 2500);
    const next = questions[index + 1];
    if (next && useDiscovery.getState().voice.speak) void tts.prefetch(next.ai);
  }

  function answerCurrentQuestion(label: string, value: string | number | boolean) {
    const question = questions[questionIndex];
    setAnswers((prev) => ({ ...prev, [question.field]: value }));
    setMessages((prev) => [...prev, { id: `a-${questionIndex}`, from: "user", text: label }]);
    setTextAnswer("");
    setCustomCount(false);
    setCountError(null);
    const next = questionIndex + 1;
    setQuestionIndex(next);
    setTimeout(() => askNext(next), 450);
  }

  function submitCount() {
    const n = parseCount(textAnswer);
    if (n === null) {
      setCountError(`Enter a number from 0 to ${MAX_ROOMS}.`);
      return;
    }
    answerCurrentQuestion(String(n), n);
  }

  function submitTextAnswer() {
    if (!textAnswer.trim()) return;
    answerCurrentQuestion(textAnswer.trim(), Number(textAnswer.trim()) || textAnswer.trim());
  }

  function draftInput(): ListingDraftInput {
    const positioning = answers.positioning ?? "rent_long";
    const intent: "rent_out" | "sell" = positioning === "sale" ? "sell" : "rent_out";
    const price = Number(priceInput) || 0;
    return {
      intent,
      positioning,
      propertyType: answers.propertyType ?? "apartment",
      city: city || "Marbella",
      addressArea: addressArea || "Centro",
      bedrooms: answers.bedrooms ?? 2,
      bathrooms: answers.bathrooms ?? 1,
      sizeM2: answers.sizeM2 ?? 80,
      pool: detected?.pool ?? false,
      seaView: detected?.seaView ?? false,
      terrace: detected?.terrace ?? false,
      garden: detected?.garden ?? false,
      garage: answers.garage ?? false,
      petsAllowed: answers.petsAllowed ?? false,
      furnished: detected?.furnished ?? false,
      style: detected?.style,
      modernisationLevel: detected?.modernisationLevel,
      kitchenStyle: detected?.kitchenStyle,
      priceMonthly: intent === "rent_out" ? price : undefined,
      priceSale: intent === "sell" ? price : undefined,
      utilitiesMonthly: intent === "rent_out" ? Math.round(price * 0.12) : undefined,
      deposit: intent === "rent_out" ? price : undefined,
      photoCount: images.length,
    };
  }

  // stageIndex is reset to 0 by whoever moves the wizard into "generating",
  // so this effect only drives the stage ticker and the real generation.
  useEffect(() => {
    if (step !== "generating") return;
    const interval = setInterval(() => {
      setStageIndex((prev) => {
        if (prev >= generationStages.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 550);
    let alive = true;
    generateListing(draftInput()).then((content) => {
      if (!alive) return;
      clearInterval(interval);
      setGenerated(content);
      setStageIndex(generationStages.length); // every stage ticked
      setTimeout(() => alive && setStep("review"), 350);
    });
    return () => {
      alive = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function buildListing(id: string, ownerId: string, imageUris: string[]): Listing {
    const input = draftInput();
    const now = new Date().toISOString();
    return {
      id,
      owner_id: ownerId,
      mode: input.intent === "sell" ? "buy" : input.positioning === "rent_holiday" ? "stay" : "rent",
      intent: input.intent,
      title: generated?.title ?? "New listing",
      description: generated?.long_description ?? "",
      city: input.city,
      country: "Spain",
      address_area: input.addressArea,
      property_type: input.propertyType as Listing["property_type"],
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      size_m2: input.sizeM2,
      price_monthly: input.priceMonthly,
      price_sale: input.priceSale,
      utilities_monthly: input.utilitiesMonthly,
      deposit: input.deposit,
      total_move_in_cost:
        input.intent === "rent_out"
          ? (input.priceMonthly ?? 0) + (input.utilitiesMonthly ?? 0) + (input.deposit ?? 0)
          : undefined,
      pets_allowed: input.petsAllowed,
      pool: input.pool,
      sea_view: input.seaView,
      garage: input.garage,
      furnished: input.furnished,
      verified_owner: false,
      verified_property: false,
      lat: geo?.lat ?? lookupCoords(input.addressArea, input.city)?.lat,
      lng: geo?.lng ?? lookupCoords(input.addressArea, input.city)?.lng,
      location_approximate: geo ? geo.approximate : true,
      rental_duration: input.intent === "rent_out" ? presetDuration ?? (input.positioning === "rent_holiday" ? "short" : "long") : undefined,
      status: "published",
      images: imageUris.map((uri, i) => ({ id: `${id}-img-${i}`, listing_id: id, uri, position: i })),
      faq: generated?.faq ?? [],
      created_at: now,
      updated_at: now,
    };
  }

  async function publish() {
    if (needsAccount) {
      // Log-in opens as a sheet over this wizard and closes back to this step, listing intact.
      router.push("/auth/login");
      return;
    }
    setPublishing(true);
    try {
      await publishNow();
    } finally {
      setPublishing(false);
    }
  }

  async function publishNow() {
    if (session.status === "signedIn") {
      const ownerId = session.userId;
      try {
        const tempId = newId();
        const uploadedUrls = await uploadListingImages(ownerId, tempId, images);
        const draftListing = buildListing(tempId, ownerId, uploadedUrls);
        const supabaseId = await createListingInSupabase(draftListing, ownerId);
        if (supabaseId) {
          invalidateRemoteListings();
          setPublishedId(supabaseId);
          setPublishedToSupabase(true);
          setStep("success");
          return;
        }
      } catch {
        // A failed upload or insert falls through to saving on the phone below.
      }
    }

    // Falls back to the phone when Supabase isn't configured, or when the Supabase write fails
    // (until plan 3 moves lib/supabase/listings.ts to the shared schema's column names).
    const id = newId("local-");
    const listing = buildListing(id, "me", images);
    await addStoredListing(listing);
    invalidateRemoteListings();
    setPublishedId(id);
    setStep("success");
  }

  /** Move on from the address step, resolving the typed (or spoken) area to real coordinates in the background. */
  function submitAddress(value: string) {
    setStep("price");
    geocode(value).then((t) => {
      if (t) setGeo({ lat: t.point.lat, lng: t.point.lng, approximate: t.source === "local" });
      else {
        const parts = splitAddress(value);
        const c = lookupCoords(parts.addressArea, parts.city);
        setGeo(c ? { lat: c.lat, lng: c.lng, approximate: true } : null);
      }
    });
  }

  // ---------------------------------------------------------------- Suza's voice guide
  // When Suza brought them here (from the intro, or after they asked her to list a place), she
  // talks them through every step and listens for spoken answers. Taps and typing keep working.
  const [guided] = useState(() => params.from === "intro" || params.from === "suza" || useDiscovery.getState().guided);
  const guide = useVoiceGuide(guided);
  const spokenIds = useRef(new Set<string>());
  const handlers = useRef({
    photos: (_h: string) => {},
    address: (_h: string) => {},
    price: (_h: string) => {},
    chat: (_i: number, _h: string) => {},
    review: (_h: string) => {},
    preview: (_h: string) => {},
  });
  const isSale = (answers.positioning ?? presetPositioning) === "sale";

  // Refresh the spoken-answer handlers after every render so they always act on current state.
  useEffect(() => {
    handlers.current.photos = (h) => {
      if (images.length > 0 && spokenGoOn(h)) setStep("address");
      else guide.say("Add a few photos first, then say next.", (x) => handlers.current.photos(x));
    };
    handlers.current.address = (h) => {
      const place = h
        .replace(/^(it'?s|it is|the place is|we'?re|we are|located)?\s*(in|at|on)?\s*/i, "")
        .replace(/[.!?]+$/, "")
        .trim();
      if (place.length < 2) {
        guide.say("Sorry, which area and city is it in?", (x) => handlers.current.address(x));
        return;
      }
      setAddress(place);
      guide.say(`${place}, got it.`);
      submitAddress(place);
    };
    handlers.current.price = (h) => {
      const saysSale = /\b(sale|sell|selling)\b/i.test(h);
      const saysRent = /\b(rent|rental|monthly|a month|per month)\b/i.test(h);
      if (saysSale) setPriceMode("sale");
      else if (saysRent) setPriceMode("rent");
      const sale = saysSale ? true : saysRent ? false : isSale;
      if (spokenSkip(h)) {
        setPriceInput("");
        guide.say("No problem, you can add a price later.");
        startChat();
        return;
      }
      const n = spokenNumber(h);
      if (n === null || n <= 0) {
        guide.say("Sorry, what price would you like? Or say skip.", (x) => handlers.current.price(x));
        return;
      }
      setPriceInput(String(Math.round(n)));
      guide.say(`${Math.round(n).toLocaleString("en-GB")} euros${sale ? "" : " a month"}. Perfect.`);
      startChat();
    };
    handlers.current.chat = (i, h) => {
      const q = questions[i];
      if (!q || i !== questionIndex) return;
      let answered: { label: string; value: string | number | boolean } | null = null;
      if (q.field === "positioning") {
        if (/\b(sale|sell)/i.test(h)) answered = { label: "Sale", value: "sale" };
        else if (/\b(holiday|short|vacation)/i.test(h)) answered = { label: "Holiday stay", value: "rent_holiday" };
        else if (/\b(long|rental|rent)/i.test(h)) answered = { label: "Long-term rental", value: "rent_long" };
      } else if (q.quickReplies?.every((r) => typeof r.value === "boolean")) {
        const yes = spokenYesNo(h);
        if (yes !== null) answered = { label: yes ? "Yes" : "No", value: yes };
      } else if (q.count) {
        const n = spokenNumber(h);
        if (n !== null && Number.isInteger(n) && n >= 0 && n <= MAX_ROOMS) answered = { label: String(n), value: n };
      } else if (q.keyboardType === "number-pad") {
        const n = spokenNumber(h);
        if (n !== null && n >= 0) answered = { label: String(n), value: n };
      } else if (q.quickReplies) {
        const hit = q.quickReplies.find((r) => h.toLowerCase().includes(r.label.toLowerCase()));
        if (hit) answered = { label: hit.label, value: hit.value };
      } else if (h.trim()) {
        answered = { label: h.trim(), value: h.trim() };
      }
      if (!answered) {
        guide.say(`Sorry, I didn't catch that. ${q.ai}`, (x) => handlers.current.chat(i, x));
        return;
      }
      answerCurrentQuestion(answered.label, answered.value);
    };
    handlers.current.review = (h) => {
      if (spokenGoOn(h)) setStep("preview");
      else guide.say("Take your time. Say next when you're happy with it.", (x) => handlers.current.review(x));
    };
    handlers.current.preview = (h) => {
      if (/\b(publish|post|go live|yes|yeah|do it|go ahead|sure)\b/i.test(h)) {
        guide.say(needsAccount ? "First, log in or create an account. Your listing stays right here." : "Publishing it now.");
        void publish();
      } else {
        guide.say("No problem. Tap Publish whenever you're ready.");
      }
    };
  });

  // One line per step, spoken when the step appears.
  useEffect(() => {
    if (!guided) return;
    const key = `step-${step}`;
    if (spokenIds.current.has(key)) return;
    spokenIds.current.add(key);
    switch (step) {
      case "photos":
        guide.say(
          isSale
            ? "Let's get your home listed for sale. First, photos: tap Add photos and choose five to fifteen of your best rooms."
            : "Let's get your place listed. First, photos: tap Add photos and choose five to fifteen of your best rooms."
        );
        break;
      case "address":
        guide.say("Where is it? The area and the city are enough, like Golden Mile, Marbella.", (h) => handlers.current.address(h));
        break;
      case "price":
        guide.say(
          isSale
            ? "What price are you asking? You can also say skip and set it later."
            : answers.positioning || presetPositioning
              ? "What monthly rent would you like? You can also say skip and set it later."
              : "Is it for rent or for sale, and at what price? You can also say skip and set it later.",
          (h) => handlers.current.price(h)
        );
        break;
      case "generating":
        guide.say("Thank you. I'm writing your listing now, this takes a moment.");
        break;
      case "review":
        guide.say(
          `Here's what I wrote${generated?.title ? `: ${generated.title}` : ""}. Change anything you like, then say next.`,
          (h) => handlers.current.review(h)
        );
        break;
      case "preview":
        guide.say(
          "This is how it will look. Shall I publish it?",
          (h) => handlers.current.preview(h)
        );
        break;
      case "success":
        useDiscovery.getState().setGuided(false);
        guide.say("Your listing is live. You can open it now, or see it on the map.");
        break;
      default:
        break;
    }
  }, [guided, step, guide, isSale, generated, answers.positioning, presetPositioning]);

  // Photos can only be picked by hand: once some are in, Suza offers to move on.
  const hasPhotos = images.length > 0;
  useEffect(() => {
    if (!guided || step !== "photos" || !hasPhotos || spokenIds.current.has("photos-added")) return;
    spokenIds.current.add("photos-added");
    guide.say("Lovely. Add more if you like, or say next.", (h) => handlers.current.photos(h));
  }, [guided, step, hasPhotos, guide]);

  function goBack() {
    const idx = stepOrder.indexOf(step);
    if (idx > 0) setStep(stepOrder[idx - 1]);
  }

  const currentQuestion = questions[questionIndex];
  const progress = (stepOrder.indexOf(step) + 1) / stepOrder.length;
  // The bar eases to each new step instead of jumping, so progress reads as movement.
  const progressValue = useSharedValue(progress);
  useEffect(() => {
    progressValue.set(withTiming(progress, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [progress, progressValue]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressValue.get() * 100}%` }));
  const showFooter = step === "photos" || step === "address" || step === "price" || step === "review" || step === "preview";

  const footer: Record<string, { label: string; disabled?: boolean; onPress: () => void }> = {
    photos: { label: "Next", disabled: images.length === 0, onPress: () => setStep("address") },
    address: {
      label: "Next",
      disabled: !address.trim(),
      onPress: () => submitAddress(address),
    },
    price: { label: "Let Suzi take over", onPress: startChat },
    review: { label: "Next", onPress: () => setStep("preview") },
    preview: { label: "Publish listing", onPress: publish },
  };

  const formattedPrice = `€${Number(priceInput || 0).toLocaleString("en-GB")}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Airbnb host-setup header: exit button right, thin progress bar underneath */}
      <View style={styles.header}>
        <PressableScale
          pressedScale={0.88}
          onPress={() => (step === "photos" ? router.back() : goBack())}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.headerBack}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>List with Suzi</Text>
        <Button label="Exit" variant="outline" size="sm" onPress={() => router.back()} />
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      {step === "photos" && (
        <StepFrame>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.stepTitle}>Add some photos of your place</Text>
          <Text style={styles.stepBody}>Suzi works best with 5–15 clear photos of the interior, exterior and key rooms. You can add more later.</Text>

          {images.length === 0 ? (
            <PressableScale pressedScale={0.98} haptics accessibilityRole="button" style={styles.uploadDropzone} onPress={pickImages}>
              <Ionicons name="images-outline" size={40} color={colors.text} />
              <Text style={styles.uploadTitle}>Add photos</Text>
              <Text style={styles.uploadBody}>Choose from your library</Text>
            </PressableScale>
          ) : (
            <View style={styles.photoGrid}>
              {images.map((uri, i) => (
                <View key={uri} style={[styles.photoTile, i === 0 && styles.photoTileCover]}>
                  <Image source={{ uri }} style={styles.photoImage} contentFit="cover" transition={motion.image} />
                  {i === 0 ? <Badge label="Cover photo" style={styles.coverBadge} /> : null}
                  <PressableScale pressedScale={0.88} style={styles.removePhoto} onPress={() => removeImage(uri)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Remove photo">
                    <Ionicons name="close" size={14} color={colors.text} />
                  </PressableScale>
                </View>
              ))}
              <PressableScale pressedScale={0.97} accessibilityRole="button" style={styles.addPhotoTile} onPress={pickImages}>
                <Ionicons name="add" size={28} color={colors.text} />
                <Text style={styles.addPhotoLabel}>Add more</Text>
              </PressableScale>
            </View>
          )}
        </ScrollView>
        </StepFrame>
      )}

      {step === "address" && (
        <StepFrame>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          <Text style={styles.stepTitle}>Where’s your place located?</Text>
          <Text style={styles.stepBody}>Just the area or city — Suzi will handle the rest. The exact address is only shared after a viewing is confirmed.</Text>
          <TextField
            label="Area, City"
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. Golden Mile, Marbella"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => {
              if (address.trim()) submitAddress(address);
            }}
          />
        </ScrollView>
        </StepFrame>
      )}

      {step === "price" && (
        <StepFrame>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          <Text style={styles.stepTitle}>Now, set your price</Text>
          <Text style={styles.stepBody}>You can leave this blank and set it later — Suzi will still write the full listing.</Text>
          <View style={styles.modeSwitch} accessibilityRole="radiogroup">
            {(["rent", "sale"] as const).map((m) => (
              <PressableScale
                key={m}
                pressedScale={0.97}
                accessibilityRole="radio"
                accessibilityState={{ selected: priceMode === m }}
                style={[styles.modeOption, priceMode === m && styles.modeOptionActive]}
                onPress={() => {
                  haptic.select();
                  setPriceMode(m);
                }}
              >
                <Text style={[styles.modeText, priceMode === m && styles.modeTextActive]}>{m === "rent" ? "Rent" : "Sale"}</Text>
              </PressableScale>
            ))}
          </View>
          <View style={styles.priceEntry}>
            <Text style={styles.priceCurrency}>€</Text>
            <TextInput
              style={styles.priceInput}
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            {priceMode === "rent" ? <Text style={styles.priceUnit}>/ month</Text> : null}
          </View>
          <Text style={styles.priceHint}>
            {priceMode === "rent" ? "The monthly rent. Suzi adds utilities and deposit estimates for you." : "The full asking price."}
          </Text>
        </ScrollView>
        </StepFrame>
      )}

      {step === "chat" && (
        <StepFrame>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chatContent}
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((m) => (
              <Animated.View key={m.id} entering={nativeOnly(FadeInUp.duration(220))} style={[styles.bubble, m.from === "ai" ? styles.bubbleAi : styles.bubbleUser]}>
                {m.from === "ai" ? (
                  <View style={styles.aiLabelRow}>
                    <ZMark size={10} color={colors.primaryDark} />
                    <Text style={styles.aiLabel}>Suzi</Text>
                  </View>
                ) : null}
                <Text style={m.from === "ai" ? styles.bubbleTextAi : styles.bubbleTextUser}>{m.text}</Text>
              </Animated.View>
            ))}
          </ScrollView>

          {currentQuestion && questionIndex < questions.length && (
            <View style={[styles.chatInputArea, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              {currentQuestion.count && customCount ? (
                <View>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.chatInput}
                      value={textAnswer}
                      onChangeText={(v) => {
                        setTextAnswer(v.replace(/[^0-9]/g, ""));
                        setCountError(null);
                      }}
                      placeholder={currentQuestion.field === "bathrooms" ? "Number of bathrooms" : "Number of bedrooms"}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      maxLength={2}
                      autoFocus
                      onSubmitEditing={submitCount}
                    />
                    <PressableScale
                      pressedScale={0.9}
                      accessibilityRole="button"
                      accessibilityLabel="Send answer"
                      style={[styles.sendButton, !textAnswer.trim() && styles.sendIdle]}
                      onPress={submitCount}
                    >
                      <Ionicons name="arrow-up" size={18} color={colors.white} />
                    </PressableScale>
                  </View>
                  {countError ? <Text style={styles.countError}>{countError}</Text> : null}
                </View>
              ) : currentQuestion.quickReplies ? (
                <View style={styles.chipRow}>
                  {currentQuestion.quickReplies.map((qr) => (
                    <PressableScale
                      key={qr.label}
                      pressedScale={0.95}
                      accessibilityRole="button"
                      style={styles.replyChip}
                      onPress={() => {
                        haptic.select();
                        answerCurrentQuestion(qr.label, qr.value);
                      }}
                    >
                      <Text style={styles.replyChipText}>{qr.label}</Text>
                    </PressableScale>
                  ))}
                  {currentQuestion.count ? (
                    <PressableScale
                      pressedScale={0.95}
                      accessibilityRole="button"
                      accessibilityLabel="Enter another number"
                      style={styles.replyChip}
                      onPress={() => {
                        haptic.select();
                        setTextAnswer("");
                        setCustomCount(true);
                      }}
                    >
                      <Ionicons name="add" size={16} color={colors.text} />
                    </PressableScale>
                  ) : null}
                </View>
              ) : (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.chatInput}
                    value={textAnswer}
                    onChangeText={setTextAnswer}
                    placeholder="Type your answer"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={currentQuestion.keyboardType ?? "default"}
                    onSubmitEditing={submitTextAnswer}
                  />
                  <PressableScale
                    pressedScale={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Send answer"
                    style={[styles.sendButton, !textAnswer.trim() && styles.sendIdle]}
                    onPress={submitTextAnswer}
                  >
                    <Ionicons name="arrow-up" size={18} color={colors.white} />
                  </PressableScale>
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
        </StepFrame>
      )}

      {step === "generating" && (
        <StepFrame>
        <View style={styles.centered}>
          <View style={styles.generatingIcon}>
            <ZMark size={32} color={colors.primaryDark} />
          </View>
          <Text style={styles.centeredTitle}>Suzi is writing your listing</Text>
          <View style={{ alignSelf: "stretch", marginTop: spacing.lg }}>
            {generationStages.map((stage, i) => (
              <View key={stage} style={styles.stageRow}>
                <Ionicons
                  name={i < stageIndex ? "checkmark-circle" : i === stageIndex ? "ellipse" : "ellipse-outline"}
                  size={20}
                  color={i < stageIndex ? colors.success : i === stageIndex ? colors.text : colors.border}
                />
                <Text style={[styles.stageText, i <= stageIndex && styles.stageTextActive]}>{stage}</Text>
              </View>
            ))}
          </View>
        </View>
        </StepFrame>
      )}

      {step === "review" && generated && (
        <StepFrame>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          <Text style={styles.stepTitle}>Review your listing</Text>
          <Text style={styles.stepBody}>Everything below was written by Suzi. Edit anything before publishing.</Text>

          <TextField label="Title" value={generated.title} onChangeText={(v) => setGenerated({ ...generated, title: v })} />
          <TextField label="Short summary" value={generated.short_summary} onChangeText={(v) => setGenerated({ ...generated, short_summary: v })} multiline />
          <TextField label="Description" value={generated.long_description} onChangeText={(v) => setGenerated({ ...generated, long_description: v })} multiline />

          <Divider gap={spacing.md} />

          <Text style={styles.reviewSection}>Highlights</Text>
          {generated.feature_bullets.map((f) => (
            <View key={f} style={styles.bulletRow}>
              <Ionicons name="checkmark" size={18} color={colors.text} />
              <Text style={styles.bulletText}>{f}</Text>
            </View>
          ))}

          <Divider gap={spacing.md} />

          <Text style={styles.reviewSection}>Lifestyle & location</Text>
          <Text style={styles.paragraph}>{generated.lifestyle_paragraph}</Text>
          <Text style={[styles.paragraph, { marginTop: spacing.sm }]}>{generated.location_paragraph}</Text>

          <Divider gap={spacing.md} />

          <Text style={styles.reviewSection}>Ideal tenant or buyer</Text>
          <Text style={styles.paragraph}>{generated.ideal_profile}</Text>

          <Divider gap={spacing.md} />

          <Text style={styles.reviewSection}>Price explanation</Text>
          <Text style={styles.paragraph}>{generated.price_explanation}</Text>

          <Divider gap={spacing.md} />

          <Text style={styles.reviewSection}>Things to know</Text>
          {generated.faq.map((item, i) => (
            <View key={item.question} style={[styles.faqRow, i === generated.faq.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.faqQ}>{item.question}</Text>
              <Text style={styles.faqA}>{item.answer}</Text>
            </View>
          ))}

          <Divider gap={spacing.md} />

          <Text style={styles.reviewSection}>What Suzi knows about this property</Text>
          {generated.agent_knowledge_base.map((k) => (
            <View key={k} style={styles.bulletRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
              <Text style={styles.bulletText}>{k}</Text>
            </View>
          ))}

          <Divider gap={spacing.md} />

          <Text style={styles.reviewSection}>Translations</Text>
          <View style={styles.chipRow}>
            {Object.keys(generated.translations).map((lang) => (
              <Badge key={lang} label={lang.toUpperCase()} tone="outline" style={{ marginRight: spacing.sm, marginBottom: spacing.sm }} />
            ))}
          </View>
        </ScrollView>
        </StepFrame>
      )}

      {step === "preview" && generated && (
        <StepFrame>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.stepTitle}>Here’s how it will look</Text>
          <Text style={styles.stepBody}>This is the card renters and buyers will see in search.</Text>
          <View style={styles.previewCard}>
            {images.length > 0 ? <Image source={{ uri: images[0] }} style={styles.previewImage} contentFit="cover" transition={motion.image} /> : <View style={[styles.previewImage, { backgroundColor: colors.bgSecondary }]} />}
            <View style={styles.previewBody}>
              <View style={styles.previewTitleRow}>
                <Text style={styles.previewTitle} numberOfLines={1}>{generated.title}</Text>
                <View style={styles.previewRating}>
                  <Ionicons name="star" size={12} color={colors.text} />
                  <Text style={styles.previewRatingText}>New</Text>
                </View>
              </View>
              <Text style={styles.previewMeta}>{addressArea || "Centro"}, {city || "Marbella"}</Text>
              <Text style={styles.previewMeta} numberOfLines={2}>{generated.short_summary}</Text>
              <Text style={styles.previewPrice}>
                <Text style={styles.previewPriceAmount}>{formattedPrice}</Text>
                {answers.positioning === "sale" ? null : <Text style={styles.previewPriceUnit}> month</Text>}
              </Text>
            </View>
          </View>
        </ScrollView>
        </StepFrame>
      )}

      {step === "success" && (
        <StepFrame>
        <View style={styles.centered}>
          <Animated.View entering={nativeOnly(ZoomIn.springify().damping(motion.springWater.damping).stiffness(motion.springWater.stiffness).mass(motion.springWater.mass))}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </Animated.View>
          <Text style={styles.centeredTitle}>Your listing is live</Text>
          <Text style={styles.centeredBody}>
            {publishedToSupabase ? "Saved to Supabase." : "Saved locally on this device (mock storage)."}
          </Text>
          <Button label="View listing" style={{ marginTop: spacing.xl, alignSelf: "stretch" }} onPress={() => publishedId && router.replace(`/listing/${publishedId}`)} />
          <Button label="See it on the map" variant="outline" style={{ marginTop: spacing.sm, alignSelf: "stretch" }} onPress={() => router.replace("/(tabs)")} />
          {geo?.approximate ? <Text style={styles.centeredBody}>The pin uses the area’s centre until you add a precise address.</Text> : null}
        </View>
        </StepFrame>
      )}

      {guide.canListen && (step === "photos" || step === "address" || step === "price" || step === "chat" || step === "review" || step === "preview") ? (
        <View style={styles.voiceRow} pointerEvents="box-none">
          <PressableScale pressedScale={0.95} haptics accessibilityRole="button" onPress={guide.listening ? guide.stop : guide.listenAgain} style={[styles.voicePill, guide.listening && styles.voicePillActive]} hitSlop={8}>
            <Ionicons name={guide.listening ? "radio-button-on" : "mic"} size={16} color={colors.white} />
            <Text style={styles.voicePillText}>{guide.listening ? "Listening…" : "Answer by voice"}</Text>
          </PressableScale>
        </View>
      ) : null}

      {showFooter && step === "preview" && needsAccount ? (
        <Text style={styles.gateNote}>Log in or create an account to publish. Your listing stays here.</Text>
      ) : null}
      {showFooter ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button label="Back" variant="link" onPress={() => (step === "photos" ? router.back() : goBack())} />
          <Button
            label={footer[step].label}
            variant={step === "preview" ? "primary" : "dark"}
            disabled={footer[step].disabled}
            loading={step === "preview" && publishing}
            onPress={footer[step].onPress}
            style={{ minWidth: 120 }}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/** Each step fades in as it takes the last one's place, so the builder reads as one flow rather than a run of hard cuts. */
function StepFrame({ children }: PropsWithChildren) {
  return (
    <Reveal variant="fade" duration={motion.swap} style={styles.stepFrame}>
      {children}
    </Reveal>
  );
}

/** Fresh ids for listings and uploads; kept outside the component so the render stays pure. */
function newId(prefix = "") {
  return `${prefix}${Date.now()}`;
}

function splitAddress(address: string): { city: string; addressArea: string } {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { addressArea: parts[0], city: parts[parts.length - 1] };
  return { city: parts[0] ?? "", addressArea: parts[0] ?? "" };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerBack: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.smallBold, color: colors.text },
  progressTrack: { height: 4, backgroundColor: colors.bgTertiary },
  progressFill: { height: 4, backgroundColor: colors.text },
  stepFrame: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 120 },
  stepTitle: { ...typography.display, color: colors.text, marginTop: spacing.sm },
  voiceRow: { alignItems: "center", paddingVertical: spacing.sm },
  voicePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary },
  voicePillActive: { backgroundColor: colors.success },
  voicePillText: { ...typography.smallBold, color: colors.white },
  stepBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xl },

  uploadDropzone: {
    borderWidth: 1, borderColor: colors.text, borderStyle: "dashed", borderRadius: radius.md,
    paddingVertical: spacing.xxl, alignItems: "center", backgroundColor: colors.bgSecondary,
  },
  uploadTitle: { ...typography.bodyBold, color: colors.text, marginTop: spacing.md },
  uploadBody: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 2 },
  photoTile: { width: "47.5%", aspectRatio: 1, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.bgSecondary },
  photoTileCover: { width: "100%", aspectRatio: 3 / 2 },
  photoImage: { width: "100%", height: "100%" },
  coverBadge: { position: "absolute", top: spacing.sm + 2, left: spacing.sm + 2 },
  removePhoto: {
    position: "absolute", top: spacing.sm, right: spacing.sm, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...shadow.float,
  },
  addPhotoTile: {
    width: "47.5%", aspectRatio: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.text, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", backgroundColor: colors.white,
  },
  addPhotoLabel: { ...typography.smallMedium, color: colors.text, marginTop: spacing.xs },

  priceEntry: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  priceCurrency: { fontSize: 44, fontWeight: "700", color: colors.text, marginRight: 4 },
  priceInput: { fontSize: 56, fontWeight: "700", color: colors.text, minWidth: 80, textAlign: "center", padding: 0 },
  modeSwitch: { flexDirection: "row", alignSelf: "center", backgroundColor: colors.bgSecondary, borderRadius: radius.pill, padding: 4, marginTop: spacing.lg },
  modeOption: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: radius.pill },
  modeOptionActive: { backgroundColor: colors.white, ...shadow.card },
  modeText: { ...typography.bodyBold, color: colors.textSecondary },
  modeTextActive: { color: colors.text },
  priceUnit: { ...typography.h3, color: colors.textSecondary, marginLeft: spacing.xs, alignSelf: "flex-end", marginBottom: spacing.sm },
  countError: { ...typography.small, color: colors.error, marginTop: spacing.xs },
  priceHint: { ...typography.small, color: colors.textSecondary, textAlign: "center", marginTop: spacing.lg },

  chatContent: { padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  bubble: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: radius.lg + 2, maxWidth: "85%" },
  bubbleAi: { backgroundColor: colors.bgSecondary, alignSelf: "flex-start", borderBottomLeftRadius: radius.xs },
  bubbleUser: { backgroundColor: colors.text, alignSelf: "flex-end", borderBottomRightRadius: radius.xs },
  aiLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  aiLabel: { ...typography.microBold, color: colors.primaryDark },
  bubbleTextAi: { ...typography.body, fontSize: 15, lineHeight: 21, color: colors.text },
  bubbleTextUser: { ...typography.body, fontSize: 15, lineHeight: 21, color: colors.white },
  chatInputArea: { paddingHorizontal: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.white },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  replyChip: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, marginRight: spacing.sm, marginBottom: spacing.sm,
  },
  replyChipText: { ...typography.smallMedium, color: colors.text },
  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chatInput: {
    flex: 1, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, color: colors.text, ...typography.body, fontSize: 15,
  },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendIdle: { backgroundColor: colors.textTertiary },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  generatingIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  centeredTitle: { ...typography.h1, color: colors.text, marginTop: spacing.lg, textAlign: "center" },
  centeredBody: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.sm },
  stageRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, paddingVertical: spacing.sm },
  stageText: { ...typography.body, color: colors.textTertiary },
  stageTextActive: { color: colors.text },

  reviewSection: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.xs },
  bulletText: { ...typography.body, color: colors.text, flex: 1 },
  paragraph: { ...typography.body, color: colors.text },
  faqRow: { paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.divider },
  faqQ: { ...typography.bodyBold, color: colors.text },
  faqA: { ...typography.small, color: colors.textSecondary, marginTop: 2 },

  previewCard: { borderRadius: radius.md, overflow: "hidden" },
  previewImage: { width: "100%", aspectRatio: 1, borderRadius: radius.md },
  previewBody: { paddingTop: spacing.sm + 2 },
  previewTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  previewTitle: { ...typography.smallBold, fontSize: 15, color: colors.text, flex: 1 },
  previewRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  previewRatingText: { ...typography.small, color: colors.text },
  previewMeta: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  previewPrice: { marginTop: spacing.sm },
  previewPriceAmount: { ...typography.smallBold, fontSize: 15, color: colors.text },
  previewPriceUnit: { ...typography.small, color: colors.text },

  gateNote: { ...typography.small, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.divider,
  },
});
