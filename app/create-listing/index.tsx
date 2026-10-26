import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { TextField } from "../../components/ui/TextField";
import { Divider } from "../../components/ui/Divider";
import { ZMark } from "../../components/brand/ZMark";
import {
  describeDetectedFeatures,
  detectFeaturesFromPhotos,
  type DetectedFeatures,
  type ListingDraftInput,
  type Positioning,
} from "../../lib/ai/service";
import { generateListing } from "../../lib/ai/suzi";
import type { AiGeneratedContent, Listing } from "../../types";
import { addStoredListing } from "../../lib/mock/storage";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { createListingInSupabase, uploadListingImages } from "../../lib/supabase/listings";
import { getOrCreateSupabaseUserId } from "../../lib/auth/service";

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
    quickReplies: [1, 2, 3, 4, 5].map((n) => ({ label: `${n}`, value: n })),
  },
  {
    field: "bathrooms",
    ai: "How many bathrooms?",
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
    ai: "Should I position this as a premium long-term rental, holiday stay, or sale listing?",
    quickReplies: [
      { label: "Long-term rental", value: "rent_long" },
      { label: "Holiday stay", value: "rent_holiday" },
      { label: "Sale", value: "sale" },
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
  const [step, setStep] = useState<WizardStep>("photos");
  const [images, setImages] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [priceInput, setPriceInput] = useState("");

  const [detected, setDetected] = useState<DetectedFeatures | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<ChatAnswers>({});
  const [textAnswer, setTextAnswer] = useState("");

  const [generated, setGenerated] = useState<AiGeneratedContent | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedToSupabase, setPublishedToSupabase] = useState(false);

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
    setMessages([{ id: "intro", from: "ai", text: describeDetectedFeatures(detectedFeatures) }]);
    setQuestionIndex(0);
    setStep("chat");
    setTimeout(() => askNext(0), 500);
  }

  function askNext(index: number) {
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
    setMessages((prev) => [...prev, { id: `q-${index}`, from: "ai", text: questions[index].ai }]);
  }

  function answerCurrentQuestion(label: string, value: string | number | boolean) {
    const question = questions[questionIndex];
    setAnswers((prev) => ({ ...prev, [question.field]: value }));
    setMessages((prev) => [...prev, { id: `a-${questionIndex}`, from: "user", text: label }]);
    setTextAnswer("");
    const next = questionIndex + 1;
    setQuestionIndex(next);
    setTimeout(() => askNext(next), 450);
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
    generateListing(draftInput()).then((content) => {
      setGenerated(content);
      setTimeout(() => setStep("review"), generationStages.length * 550 + 300);
    });
    return () => clearInterval(interval);
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
      status: "published",
      images: imageUris.map((uri, i) => ({ id: `${id}-img-${i}`, listing_id: id, uri, position: i })),
      faq: generated?.faq ?? [],
      created_at: now,
      updated_at: now,
    };
  }

  async function publish() {
    setPublishing(true);

    if (isSupabaseConfigured) {
      const ownerId = await getOrCreateSupabaseUserId();
      if (ownerId) {
        const tempId = newId();
        const uploadedUrls = await uploadListingImages(ownerId, tempId, images);
        const draftListing = buildListing(tempId, ownerId, uploadedUrls);
        const supabaseId = await createListingInSupabase(draftListing, ownerId);
        if (supabaseId) {
          setPublishedId(supabaseId);
          setPublishedToSupabase(true);
          setStep("success");
          setPublishing(false);
          return;
        }
      }
    }

    // Falls back to local mock storage when Supabase isn't configured, or if
    // the Supabase write failed (e.g. anonymous sign-ins not enabled yet) —
    // keeps the flow fully demoable with no backend.
    const id = newId("local-");
    const listing = buildListing(id, "me", images);
    await addStoredListing(listing);
    setPublishedId(id);
    setStep("success");
    setPublishing(false);
  }

  function goBack() {
    const idx = stepOrder.indexOf(step);
    if (idx > 0) setStep(stepOrder[idx - 1]);
  }

  const currentQuestion = questions[questionIndex];
  const progress = (stepOrder.indexOf(step) + 1) / stepOrder.length;
  const showFooter = step === "photos" || step === "address" || step === "price" || step === "review" || step === "preview";

  const footer: Record<string, { label: string; disabled?: boolean; onPress: () => void }> = {
    photos: { label: "Next", disabled: images.length === 0, onPress: () => setStep("address") },
    address: { label: "Next", disabled: !address.trim(), onPress: () => setStep("price") },
    price: { label: "Let Suzi take over", onPress: startChat },
    review: { label: "Next", onPress: () => setStep("preview") },
    preview: { label: "Publish listing", onPress: publish },
  };

  const formattedPrice = `€${Number(priceInput || 0).toLocaleString("en-GB")}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Airbnb host-setup header: exit button right, thin progress bar underneath */}
      <View style={styles.header}>
        <Pressable onPress={() => (step === "photos" ? router.back() : goBack())} hitSlop={10} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>List with Suzi</Text>
        <Button label="Exit" variant="outline" size="sm" onPress={() => router.back()} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      {step === "photos" && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.stepTitle}>Add some photos of your place</Text>
          <Text style={styles.stepBody}>Suzi works best with 5–15 clear photos of the interior, exterior and key rooms. You can add more later.</Text>

          {images.length === 0 ? (
            <Pressable style={styles.uploadDropzone} onPress={pickImages}>
              <Ionicons name="images-outline" size={40} color={colors.text} />
              <Text style={styles.uploadTitle}>Add photos</Text>
              <Text style={styles.uploadBody}>Choose from your library</Text>
            </Pressable>
          ) : (
            <View style={styles.photoGrid}>
              {images.map((uri, i) => (
                <View key={uri} style={[styles.photoTile, i === 0 && styles.photoTileCover]}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  {i === 0 ? <Badge label="Cover photo" style={styles.coverBadge} /> : null}
                  <Pressable style={styles.removePhoto} onPress={() => removeImage(uri)} hitSlop={6}>
                    <Ionicons name="close" size={14} color={colors.text} />
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.addPhotoTile} onPress={pickImages}>
                <Ionicons name="add" size={28} color={colors.text} />
                <Text style={styles.addPhotoLabel}>Add more</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {step === "address" && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Where’s your place located?</Text>
          <Text style={styles.stepBody}>Just the area or city — Suzi will handle the rest. The exact address is only shared after a viewing is confirmed.</Text>
          <TextField label="Area, City" value={address} onChangeText={setAddress} placeholder="e.g. Golden Mile, Marbella" autoFocus />
        </ScrollView>
      )}

      {step === "price" && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Now, set your price</Text>
          <Text style={styles.stepBody}>You can leave this blank and set it later — Suzi will still write the full listing.</Text>
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
          </View>
          <Text style={styles.priceHint}>Per month for rentals, total for sales. Suzi adds utilities and deposit estimates for you. Publishing costs €20/month while the listing is live, with no commission.</Text>
        </ScrollView>
      )}

      {step === "chat" && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((m) => (
              <View key={m.id} style={[styles.bubble, m.from === "ai" ? styles.bubbleAi : styles.bubbleUser]}>
                {m.from === "ai" ? (
                  <View style={styles.aiLabelRow}>
                    <ZMark size={10} color={colors.primaryDark} />
                    <Text style={styles.aiLabel}>Suzi</Text>
                  </View>
                ) : null}
                <Text style={m.from === "ai" ? styles.bubbleTextAi : styles.bubbleTextUser}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>

          {currentQuestion && questionIndex < questions.length && (
            <View style={[styles.chatInputArea, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              {currentQuestion.quickReplies ? (
                <View style={styles.chipRow}>
                  {currentQuestion.quickReplies.map((qr) => (
                    <Pressable key={qr.label} style={styles.replyChip} onPress={() => answerCurrentQuestion(qr.label, qr.value)}>
                      <Text style={styles.replyChipText}>{qr.label}</Text>
                    </Pressable>
                  ))}
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
                  <Pressable style={[styles.sendButton, !textAnswer.trim() && styles.sendIdle]} onPress={submitTextAnswer}>
                    <Ionicons name="arrow-up" size={18} color={colors.white} />
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {step === "generating" && (
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
      )}

      {step === "review" && generated && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
      )}

      {step === "preview" && generated && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.stepTitle}>Here’s how it will look</Text>
          <Text style={styles.stepBody}>This is the card renters and buyers will see in search.</Text>
          <View style={styles.previewCard}>
            {images.length > 0 ? <Image source={{ uri: images[0] }} style={styles.previewImage} /> : <View style={[styles.previewImage, { backgroundColor: colors.bgSecondary }]} />}
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
      )}

      {step === "success" && (
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={styles.centeredTitle}>Your listing is live</Text>
          <Text style={styles.centeredBody}>
            {publishedToSupabase ? "Saved to Supabase." : "Saved locally on this device (mock storage)."}
          </Text>
          <Button label="View listing" style={{ marginTop: spacing.xl, alignSelf: "stretch" }} onPress={() => publishedId && router.replace(`/listing/${publishedId}`)} />
          <Button label="Back to Explore" variant="outline" style={{ marginTop: spacing.sm, alignSelf: "stretch" }} onPress={() => router.replace("/(tabs)")} />
        </View>
      )}

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
  content: { padding: spacing.lg, paddingBottom: 120 },
  stepTitle: { ...typography.display, color: colors.text, marginTop: spacing.sm },
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

  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.divider,
  },
});
