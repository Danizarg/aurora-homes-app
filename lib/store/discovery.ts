import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GeoPoint, Intent, SearchCriteria, SearchResult, SearchTarget } from "../../types/search";
import { emptyCriteria } from "../../types/search";
import type { Region } from "../geo/bounds";

export type ViewMode = "map" | "list";

export interface SuzaMessage {
  id: string;
  role: "user" | "suza";
  text: string;
  at: string;
  /** Quick replies Suza offered with this message. */
  options?: { label: string; value: string }[];
}

export interface VoicePrefs {
  /** Speak Suza's replies aloud. */
  speak: boolean;
  /** Replay the intro on next launch (set from settings). */
  replayIntro: boolean;
}

interface DiscoveryState {
  hydrated: boolean;
  onboardingDone: boolean;
  intent: Intent | null;
  criteria: SearchCriteria;
  /** Last camera the user left the map at. */
  camera: Region | null;
  /** The traveller's position, if they allowed it. */
  userLocation: GeoPoint | null;
  userLocationLabel: string | null;
  viewMode: ViewMode;
  selectedListingId: string | null;
  result: SearchResult | null;
  searching: boolean;
  messages: SuzaMessage[];
  /** Questions Suza has already asked this conversation, so she never repeats one. */
  asked: string[];
  /** The user said "just show me everything": stop asking qualifying questions. */
  showAll: boolean;
  voice: VoicePrefs;

  setOnboardingDone: (done: boolean) => void;
  markAsked: (key: string) => void;
  setShowAll: (showAll: boolean) => void;
  setIntent: (intent: Intent | null) => void;
  setCriteria: (patch: Partial<SearchCriteria>) => void;
  replaceCriteria: (criteria: SearchCriteria) => void;
  clearFilters: () => void;
  setTarget: (target: SearchTarget | undefined) => void;
  setCamera: (camera: Region | null) => void;
  setUserLocation: (point: GeoPoint | null, label?: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  select: (id: string | null) => void;
  setResult: (result: SearchResult | null, searching?: boolean) => void;
  setSearching: (searching: boolean) => void;
  pushMessage: (m: Omit<SuzaMessage, "id" | "at">) => SuzaMessage;
  clearConversation: () => void;
  setVoice: (patch: Partial<VoicePrefs>) => void;
  /** Wipe all on-device state and preferences so the app starts over at the intro. */
  resetAll: () => Promise<void>;
}

/** Fields that reset when the user clears filters; the destination and intent survive. */
const filterKeys: (keyof SearchCriteria)[] = [
  "propertyTypes", "budgetMin", "budgetMax", "bedroomsMin", "bathroomsMin", "areaMin", "areaMax",
  "pool", "garage", "furnished", "seaView", "pets", "verifiedOnly", "dateStart", "dateEnd", "guests",
  "rentalDuration", "distance", "queryText", "sort",
];

let messageSeq = 0;

/**
 * One store for the whole discovery experience: intent, criteria, camera,
 * results, selection, view mode, the Suza conversation and voice settings.
 * Preferences persist on the device; results and selection are session-only.
 */
const initialState = {
  onboardingDone: false,
  intent: null,
  criteria: emptyCriteria,
  camera: null,
  userLocation: null,
  userLocationLabel: null,
  viewMode: "map" as ViewMode,
  selectedListingId: null,
  result: null,
  searching: false,
  messages: [],
  asked: [],
  showAll: false,
  voice: { speak: true, replayIntro: false },
};

export const useDiscovery = create<DiscoveryState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...initialState,

      resetAll: async () => {
        // Everything the app keeps on the device: this store, saved homes, local
        // listings, bookings, conversations, demo session and geo caches.
        await AsyncStorage.clear().catch(() => {});
        await useDiscovery.persist.clearStorage();
        set({ ...initialState, hydrated: true });
      },

      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      markAsked: (key) => set((s) => (s.asked.includes(key) ? {} : { asked: [...s.asked, key] })),
      setShowAll: (showAll) => set({ showAll }),
      setIntent: (intent) =>
        set((s) => ({ intent, criteria: { ...s.criteria, intent: intent && intent !== "list" ? intent : s.criteria.intent } })),
      setCriteria: (patch) => set((s) => ({ criteria: { ...s.criteria, ...patch } })),
      replaceCriteria: (criteria) => set({ criteria }),
      clearFilters: () =>
        set((s) => {
          const next: SearchCriteria = { ...s.criteria };
          for (const k of filterKeys) delete (next as unknown as Record<string, unknown>)[k];
          return { criteria: next };
        }),
      setTarget: (target) => set((s) => ({ criteria: { ...s.criteria, target, bounds: undefined } })),
      setCamera: (camera) => set({ camera }),
      setUserLocation: (userLocation, userLocationLabel = get().userLocationLabel) => set({ userLocation, userLocationLabel }),
      setViewMode: (viewMode) => set({ viewMode }),
      select: (selectedListingId) => set({ selectedListingId }),
      setResult: (result, searching = false) => set({ result, searching }),
      setSearching: (searching) => set({ searching }),
      pushMessage: (m) => {
        const message: SuzaMessage = { ...m, id: `m-${Date.now()}-${messageSeq++}`, at: new Date().toISOString() };
        set((s) => ({ messages: [...s.messages, message].slice(-60) }));
        return message;
      },
      clearConversation: () => set({ messages: [], asked: [], showAll: false }),
      setVoice: (patch) => set((s) => ({ voice: { ...s.voice, ...patch } })),
    }),
    {
      name: "zouza.discovery.v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        onboardingDone: s.onboardingDone,
        intent: s.intent,
        criteria: { ...s.criteria, bounds: undefined },
        camera: s.camera,
        userLocation: s.userLocation,
        userLocationLabel: s.userLocationLabel,
        viewMode: s.viewMode,
        messages: s.messages,
        voice: s.voice,
      }),
    }
  )
);

// Screens wait for `hydrated` before deciding on onboarding or restoring the camera.
useDiscovery.persist.onFinishHydration(() => useDiscovery.setState({ hydrated: true }));
if (useDiscovery.persist.hasHydrated()) useDiscovery.setState({ hydrated: true });
