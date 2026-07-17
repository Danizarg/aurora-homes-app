import { useEffect, useRef, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { SectionHeader } from "../../components/ui/SectionHeader";
import {
  describeDetectedFeatures,
  detectFeaturesFromPhotos,
  generateListingContent,
  type DetectedFeatures,
  type ListingDraftInput,
  type Positioning,
} from "../../lib/ai/service";
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
  "Building property AI agent",
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

export default function AiListingBuilder() {
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

  const scrollRef = useRef<ScrollView>(null);

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
      setTimeout(() => setStep("generating"), 900);
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
    };
  }

  useEffect(() => {
    if (step !== "generating") return;
    setStageIndex(0);
    const interval = setInterval(() => {
      setStageIndex((prev) => {
        if (prev >= generationStages.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 550);
    generateListingContent(draftInput()).then((content) => {
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
      title: generated?.title ?? "New Aurora listing",
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
      platform_fee_percent: 2,
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
        const tempId = `${Date.now()}`;
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
    const id = `local-${Date.now()}`;
    const listing = buildListing(id, "me", images);
    await addStoredListing(listing);
    setPublishedId(id);
    setStep("success");
    setPublishing(false);
  }

  const currentQuestion = questions[questionIndex];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => (step === "photos" ? router.back() : goBack())} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Listing Builder</Text>
        <View style={{ width: 22 }} />
      </View>

      {step === "photos" && (
        <ScrollView contentContainerStyle={styles.content}>
          <SectionHeader eyebrow="Step 1 of 3" title="Upload photos" subtitle="Aurora works best with 5–15 clear photos of the interior, exterior, and key rooms." />
          <View style={styles.photoGrid}>
            {images.map((uri) => (
              <View key={uri} style={styles.photoTile}>
                <Image source={{ uri }} style={styles.photoImage} />
                <Pressable style={styles.removePhoto} onPress={() => removeImage(uri)}>
                  <Ionicons name="close" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addPhotoTile} onPress={pickImages}>
              <Ionicons name="camera-outline" size={26} color={colors.gold} />
              <Text style={styles.addPhotoLabel}>Add photos</Text>
            </Pressable>
          </View>
          {images.length === 0 && (
            <Card style={{ marginTop: spacing.md }}>
              <Text style={styles.emptyPhotoText}>No photos yet. Tap "Add photos" to select images from your library — Aurora will use them to write your listing.</Text>
            </Card>
          )}
          <Button
            label="Continue"
            style={{ marginTop: spacing.xl }}
            disabled={images.length === 0}
            onPress={() => setStep("address")}
          />
        </ScrollView>
      )}

      {step === "address" && (
        <ScrollView contentContainerStyle={styles.content}>
          <SectionHeader eyebrow="Step 2 of 3" title="Enter address" subtitle="Just the area or city — Aurora will handle the rest." />
          <TextField label="Address" value={address} onChangeText={setAddress} placeholder="e.g. Golden Mile, Marbella" />
          <Button label="Continue" style={{ marginTop: spacing.xl }} disabled={!address.trim()} onPress={() => setStep("price")} />
        </ScrollView>
      )}

      {step === "price" && (
        <ScrollView contentContainerStyle={styles.content}>
          <SectionHeader eyebrow="Step 3 of 3" title="Price (optional)" subtitle="You can leave this blank and set it later — Aurora will still build the full listing." />
          <TextField label="Price (€)" value={priceInput} onChangeText={setPriceInput} keyboardType="number-pad" placeholder="e.g. 1200" />
          <Button label="Let Aurora take over" style={{ marginTop: spacing.xl }} onPress={startChat} />
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
                {m.from === "ai" ? <Text style={styles.aiLabel}>Aurora AI</Text> : null}
                <Text style={m.from === "ai" ? styles.bubbleTextAi : styles.bubbleTextUser}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>

          {currentQuestion && questionIndex < questions.length && (
            <View style={styles.chatInputArea}>
              {currentQuestion.quickReplies ? (
                <View style={styles.chipRow}>
                  {currentQuestion.quickReplies.map((qr) => (
                    <Pressable
                      key={qr.label}
                      style={styles.replyChip}
                      onPress={() => answerCurrentQuestion(qr.label, qr.value)}
                    >
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
                    placeholder="Type your answer..."
                    placeholderTextColor={colors.muted}
                    keyboardType={currentQuestion.keyboardType ?? "default"}
                    onSubmitEditing={submitTextAnswer}
                  />
                  <Pressable style={styles.sendButton} onPress={submitTextAnswer}>
                    <Ionicons name="send" size={16} color={colors.white} />
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {step === "generating" && (
        <View style={styles.generatingWrap}>
          <Ionicons name="sparkles" size={40} color={colors.gold} />
          <Text style={styles.generatingTitle}>Aurora is building your listing</Text>
          {generationStages.map((stage, i) => (
            <View key={stage} style={styles.stageRow}>
              <Ionicons
                name={i < stageIndex ? "checkmark-circle" : i === stageIndex ? "ellipse" : "ellipse-outline"}
                size={18}
                color={i <= stageIndex ? colors.gold : colors.border}
              />
              <Text style={[styles.stageText, i <= stageIndex && styles.stageTextActive]}>{stage}</Text>
            </View>
          ))}
        </View>
      )}

      {step === "review" && generated && (
        <ScrollView contentContainerStyle={styles.content}>
          <SectionHeader eyebrow="Review" title="Review your exposé" subtitle="Everything below was generated by Aurora. Edit anything before publishing." />
          <TextField label="Title" value={generated.title} onChangeText={(v) => setGenerated({ ...generated, title: v })} />
          <TextField label="Short summary" value={generated.short_summary} onChangeText={(v) => setGenerated({ ...generated, short_summary: v })} multiline />
          <TextField label="Long description" value={generated.long_description} onChangeText={(v) => setGenerated({ ...generated, long_description: v })} multiline />

          <FieldLabel label="Feature bullets" />
          <Card style={{ marginBottom: spacing.md }}>
            {generated.feature_bullets.map((f) => (
              <Text key={f} style={styles.bullet}>• {f}</Text>
            ))}
          </Card>

          <FieldLabel label="Lifestyle & location" />
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={styles.bullet}>{generated.lifestyle_paragraph}</Text>
            <Text style={[styles.bullet, { marginTop: spacing.sm }]}>{generated.location_paragraph}</Text>
          </Card>

          <FieldLabel label="Ideal tenant / buyer profile" />
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={styles.bullet}>{generated.ideal_profile}</Text>
          </Card>

          <FieldLabel label="Price breakdown" />
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={styles.bullet}>{generated.price_explanation}</Text>
          </Card>

          <FieldLabel label="FAQ" />
          {generated.faq.map((item) => (
            <Card key={item.question} style={{ marginBottom: spacing.sm }}>
              <Text style={styles.faqQ}>{item.question}</Text>
              <Text style={styles.bullet}>{item.answer}</Text>
            </Card>
          ))}

          <FieldLabel label="Property AI agent knowledge base" />
          <Card style={{ marginBottom: spacing.md }}>
            {generated.agent_knowledge_base.map((k) => (
              <Text key={k} style={styles.bullet}>• {k}</Text>
            ))}
          </Card>

          <FieldLabel label="Translations" />
          <View style={styles.chipRow}>
            {Object.keys(generated.translations).map((lang) => (
              <Badge key={lang} label={lang} tone="muted" />
            ))}
          </View>

          <Button label="Continue to preview" style={{ marginTop: spacing.xl }} onPress={() => setStep("preview")} />
        </ScrollView>
      )}

      {step === "preview" && generated && (
        <ScrollView contentContainerStyle={styles.content}>
          <SectionHeader eyebrow="Preview" title="Listing preview" subtitle="This is how your published listing will look." />
          {images.length > 0 && <Image source={{ uri: images[0] }} style={styles.previewImage} />}
          <Text style={styles.previewTitle}>{generated.title}</Text>
          <Text style={styles.previewLocation}>{addressArea || "Centro"}, {city || "Marbella"}</Text>
          <Text style={styles.previewPrice}>
            {answers.positioning === "sale"
              ? `${Number(priceInput || 0).toLocaleString("en-GB")} €`
              : `${Number(priceInput || 0).toLocaleString("en-GB")} €/month`}
          </Text>
          <Text style={styles.bullet}>{generated.short_summary}</Text>
          <Button label="Publish listing" style={{ marginTop: spacing.xl }} onPress={publish} loading={publishing} />
        </ScrollView>
      )}

      {step === "success" && (
        <View style={styles.generatingWrap}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          <Text style={styles.generatingTitle}>Your professional listing is ready.</Text>
          <Text style={styles.successSubtitle}>
            {publishedToSupabase ? "Saved to Supabase." : "Saved locally on this device (mock storage)."}
          </Text>
          <Button
            label="View listing"
            style={{ marginTop: spacing.xl, width: "100%" }}
            onPress={() => publishedId && router.replace(`/(tabs)/profile`)}
          />
          <Button
            label="Back to home"
            variant="outline"
            style={{ marginTop: spacing.sm, width: "100%" }}
            onPress={() => router.replace("/(tabs)")}
          />
        </View>
      )}
    </SafeAreaView>
  );

  function goBack() {
    const order: WizardStep[] = ["photos", "address", "price", "chat", "generating", "review", "preview", "success"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  }
}

function splitAddress(address: string): { city: string; addressArea: string } {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { addressArea: parts[0], city: parts[parts.length - 1] };
  return { city: parts[0] ?? "", addressArea: parts[0] ?? "" };
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function TextField({
  label,
  style,
  ...rest
}: { label: string; style?: object } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      <FieldLabel label={label} />
      <TextInput
        style={[styles.input, rest.multiline && { height: 90, textAlignVertical: "top" }]}
        placeholderTextColor={colors.muted}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h3, color: colors.navy },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  photoGrid: { flexDirection: "row", flexWrap: "wrap" },
  photoTile: { width: "31%", aspectRatio: 1, marginRight: "3.5%", marginBottom: spacing.sm, borderRadius: radius.md, overflow: "hidden" },
  photoImage: { width: "100%", height: "100%" },
  removePhoto: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(27,36,48,0.7)", borderRadius: radius.pill, padding: 3 },
  addPhotoTile: {
    width: "31%", aspectRatio: 1, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.gold, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", backgroundColor: colors.white,
  },
  addPhotoLabel: { ...typography.micro, color: colors.gold, marginTop: spacing.xs, textTransform: "none" },
  emptyPhotoText: { ...typography.small, color: colors.muted },
  fieldLabel: { ...typography.bodyMedium, color: colors.navy, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.navy, ...typography.body,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md },
  generatingWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  generatingTitle: { ...typography.h2, color: colors.navy, marginTop: spacing.md, marginBottom: spacing.lg, textAlign: "center" },
  stageRow: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", marginBottom: spacing.sm, gap: spacing.sm },
  stageText: { ...typography.body, color: colors.border },
  stageTextActive: { color: colors.navy },
  bullet: { ...typography.small, color: colors.navy },
  faqQ: { ...typography.bodyMedium, color: colors.navy, marginBottom: spacing.xs },
  previewImage: { width: "100%", height: 200, borderRadius: radius.lg, marginBottom: spacing.md, backgroundColor: colors.sand },
  previewTitle: { ...typography.h1, color: colors.navy },
  previewLocation: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  previewPrice: { ...typography.h2, color: colors.gold, marginTop: spacing.sm, marginBottom: spacing.md },
  successSubtitle: { ...typography.body, color: colors.muted, textAlign: "center" },
  chatContent: { padding: spacing.lg, paddingBottom: spacing.md },
  bubble: { padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm, maxWidth: "85%" },
  bubbleAi: { backgroundColor: colors.ivoryDeep, alignSelf: "flex-start" },
  bubbleUser: { backgroundColor: colors.navy, alignSelf: "flex-end" },
  aiLabel: { ...typography.micro, color: colors.gold, marginBottom: 2 },
  bubbleTextAi: { ...typography.small, color: colors.navy },
  bubbleTextUser: { ...typography.small, color: colors.white },
  chatInputArea: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  replyChip: {
    borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.white, borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, marginRight: spacing.sm, marginBottom: spacing.sm,
  },
  replyChipText: { ...typography.small, color: colors.navy, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "center" },
  chatInput: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm, color: colors.navy,
  },
  sendButton: { backgroundColor: colors.gold, borderRadius: radius.pill, padding: spacing.sm + 2 },
});
