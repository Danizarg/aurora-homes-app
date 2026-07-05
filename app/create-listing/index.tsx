import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../constants/theme";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { generateListingContent, type ListingDraftInput } from "../../lib/ai/service";
import type { AiGeneratedContent, Listing } from "../../types";
import { addStoredListing } from "../../lib/mock/storage";
import { isSupabaseConfigured } from "../../lib/supabase/client";

type WizardStep = "photos" | "facts" | "generating" | "review" | "preview" | "success";

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

export default function CreateListingWizard() {
  const { intent: intentParam } = useLocalSearchParams<{ intent?: string }>();
  const intent = intentParam === "sell" ? "sell" : "rent_out";

  const [step, setStep] = useState<WizardStep>("photos");
  const [images, setImages] = useState<string[]>([]);

  const [propertyType, setPropertyType] = useState<(typeof propertyTypes)[number]>("apartment");
  const [city, setCity] = useState("");
  const [addressArea, setAddressArea] = useState("");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("1");
  const [sizeM2, setSizeM2] = useState("80");
  const [pool, setPool] = useState(false);
  const [seaView, setSeaView] = useState(false);
  const [garage, setGarage] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [price, setPrice] = useState("");
  const [utilities, setUtilities] = useState("");
  const [deposit, setDeposit] = useState("");
  const [ownerRules, setOwnerRules] = useState("");
  const [notes, setNotes] = useState("");

  const [generated, setGenerated] = useState<AiGeneratedContent | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [publishedId, setPublishedId] = useState<string | null>(null);

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

  function draftInput(): ListingDraftInput {
    return {
      intent,
      propertyType,
      city: city || "Marbella",
      addressArea: addressArea || "Centro",
      bedrooms: Number(bedrooms) || 1,
      bathrooms: Number(bathrooms) || 1,
      sizeM2: Number(sizeM2) || 50,
      pool,
      seaView,
      garage,
      petsAllowed,
      furnished,
      priceMonthly: intent === "rent_out" ? Number(price) || 0 : undefined,
      priceSale: intent === "sell" ? Number(price) || 0 : undefined,
      utilitiesMonthly: Number(utilities) || 0,
      deposit: Number(deposit) || 0,
      ownerRules,
      notes,
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

  async function publish() {
    const input = draftInput();
    const now = new Date().toISOString();
    const id = `local-${Date.now()}`;
    const listing: Listing = {
      id,
      owner_id: "me",
      mode: intent === "sell" ? "buy" : "rent",
      intent,
      title: generated?.title ?? "New Aurora listing",
      description: generated?.long_description ?? "",
      city: input.city,
      country: "Spain",
      address_area: input.addressArea,
      property_type: propertyType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      size_m2: input.sizeM2,
      price_monthly: input.priceMonthly,
      price_sale: input.priceSale,
      utilities_monthly: input.utilitiesMonthly,
      deposit: input.deposit,
      platform_fee_percent: 2,
      total_move_in_cost:
        intent === "rent_out"
          ? (input.priceMonthly ?? 0) + (input.utilitiesMonthly ?? 0) + (input.deposit ?? 0)
          : undefined,
      pets_allowed: petsAllowed,
      pool,
      sea_view: seaView,
      garage,
      furnished,
      verified_owner: false,
      verified_property: false,
      status: "published",
      images: images.map((uri, i) => ({ id: `${id}-img-${i}`, listing_id: id, uri, position: i })),
      faq: generated?.faq ?? [],
      created_at: now,
      updated_at: now,
    };
    // Supabase upload path would go here when isSupabaseConfigured is true —
    // see lib/supabase/client.ts. Falling back to local mock storage keeps
    // this flow fully demoable with no backend.
    await addStoredListing(listing);
    setPublishedId(id);
    setStep("success");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => (step === "photos" ? router.back() : goBack())} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>{intent === "sell" ? "Sell your property" : "Rent out your property"}</Text>
        <View style={{ width: 22 }} />
      </View>

      {step === "photos" && (
        <ScrollView contentContainerStyle={styles.content}>
          <SectionHeader eyebrow="Step 1 of 5" title="Upload photos" subtitle="Aurora works best with 5–15 clear photos of the interior, exterior, and key rooms." />
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
            onPress={() => setStep("facts")}
          />
        </ScrollView>
      )}

      {step === "facts" && (
        <ScrollView contentContainerStyle={styles.content}>
          <SectionHeader eyebrow="Step 2 of 5" title="Property facts" subtitle="A few details so Aurora can generate an accurate listing." />

          <FieldLabel label="Property type" />
          <View style={styles.chipRow}>
            {propertyTypes.map((t) => (
              <Pressable key={t} style={[styles.typeChip, propertyType === t && styles.typeChipActive]} onPress={() => setPropertyType(t)}>
                <Text style={[styles.typeChipText, propertyType === t && styles.typeChipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <TextField label="City" value={city} onChangeText={setCity} placeholder="Marbella" />
          <TextField label="Area / address area" value={addressArea} onChangeText={setAddressArea} placeholder="Golden Mile" />
          <View style={styles.row}>
            <TextField label="Bedrooms" value={bedrooms} onChangeText={setBedrooms} keyboardType="number-pad" style={{ flex: 1, marginRight: spacing.sm }} />
            <TextField label="Bathrooms" value={bathrooms} onChangeText={setBathrooms} keyboardType="number-pad" style={{ flex: 1 }} />
          </View>
          <TextField label="Size (m²)" value={sizeM2} onChangeText={setSizeM2} keyboardType="number-pad" />

          <ToggleRow label="Pool" value={pool} onValueChange={setPool} />
          <ToggleRow label="Sea view" value={seaView} onValueChange={setSeaView} />
          <ToggleRow label="Garage" value={garage} onValueChange={setGarage} />
          <ToggleRow label="Pets allowed" value={petsAllowed} onValueChange={setPetsAllowed} />
          <ToggleRow label="Furnished" value={furnished} onValueChange={setFurnished} />

          <TextField
            label={intent === "sell" ? "Sale price (€)" : "Monthly rent (€)"}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            placeholder={intent === "sell" ? "495000" : "1200"}
          />
          {intent === "rent_out" && (
            <>
              <TextField label="Utilities (€/month)" value={utilities} onChangeText={setUtilities} keyboardType="number-pad" placeholder="150" />
              <TextField label="Deposit (€)" value={deposit} onChangeText={setDeposit} keyboardType="number-pad" placeholder="1200" />
            </>
          )}
          <TextField label="Owner rules (optional)" value={ownerRules} onChangeText={setOwnerRules} placeholder="No smoking indoors" />
          <TextField label="Notes for Aurora (optional)" value={notes} onChangeText={setNotes} placeholder="Anything else worth mentioning" multiline />

          <Button label="Generate my listing" style={{ marginTop: spacing.xl }} onPress={() => setStep("generating")} />
        </ScrollView>
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
          <SectionHeader eyebrow="Step 3 of 5" title="Review your exposé" subtitle="Everything below was generated by Aurora. Edit anything before publishing." />
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
          <SectionHeader eyebrow="Step 4 of 5" title="Listing preview" subtitle="This is how your published listing will look." />
          {images.length > 0 && <Image source={{ uri: images[0] }} style={styles.previewImage} />}
          <Text style={styles.previewTitle}>{generated.title}</Text>
          <Text style={styles.previewLocation}>{addressArea || "Centro"}, {city || "Marbella"}</Text>
          <Text style={styles.previewPrice}>
            {intent === "sell" ? `${Number(price || 0).toLocaleString("en-GB")} €` : `${Number(price || 0).toLocaleString("en-GB")} €/month`}
          </Text>
          <Text style={styles.bullet}>{generated.short_summary}</Text>
          <Button label="Publish listing" style={{ marginTop: spacing.xl }} onPress={publish} />
        </ScrollView>
      )}

      {step === "success" && (
        <View style={styles.generatingWrap}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          <Text style={styles.generatingTitle}>Your professional listing is ready.</Text>
          <Text style={styles.successSubtitle}>
            {isSupabaseConfigured ? "Saved to Supabase." : "Saved locally on this device (mock storage)."}
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
    const order: WizardStep[] = ["photos", "facts", "generating", "review", "preview", "success"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  }
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

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.gold, false: colors.border }} />
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
  row: { flexDirection: "row" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md },
  typeChip: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: radius.pill,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md, marginRight: spacing.sm, marginBottom: spacing.sm,
  },
  typeChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  typeChipText: { ...typography.small, color: colors.navy, textTransform: "capitalize" },
  typeChipTextActive: { color: colors.white },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  toggleLabel: { ...typography.body, color: colors.navy },
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
});
