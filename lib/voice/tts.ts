import * as Speech from "expo-speech";
import { Platform } from "react-native";

/**
 * Suza's voice: the device's own speech synthesis (expo-speech), which
 * works in Expo Go and on the web with no keys. Picks the most natural
 * English voice the device offers (iOS "enhanced"/"premium" voices when
 * installed) and speaks softly — see `DELIVERY`. A production neural voice
 * can replace `speak` behind the same interface later; nothing here is
 * prerecorded.
 */
export interface SpeakOptions {
  onStart?: () => void;
  onDone?: () => void;
  onError?: () => void;
}

/**
 * How soft Suza sounds. The two platforms scale `rate` differently — on iOS
 * 0.5 is the system default, everywhere else it is 1.0 — so both numbers sit
 * about a fifth below their own platform's normal pace. Pitch below 1 warms
 * the voice, and a volume under 1 keeps her under the room rather than over
 * it; together they read as calm rather than sleepy.
 */
const DELIVERY = {
  rate: Platform.OS === "ios" ? 0.4 : 0.82,
  pitch: 0.9,
  volume: 0.8,
};

let chosenVoice: string | undefined | null = null; // null = not looked up yet
let speaking = false;

async function pickVoice(): Promise<string | undefined> {
  if (chosenVoice !== null) return chosenVoice;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const english = voices.filter((v) => v.language?.toLowerCase().startsWith("en"));
    const score = (v: Speech.Voice) => {
      let s = 0;
      const name = (v.name ?? "").toLowerCase();
      const id = (v.identifier ?? "").toLowerCase();
      // Smoother synthesis matters more than the voice's character: the
      // compact voices sound thin and brittle however gently they are driven.
      if (v.quality === Speech.VoiceQuality.Enhanced) s += 14;
      if (id.includes("premium")) s += 12;
      if (id.includes("enhanced")) s += 8;
      if (/samantha|ava|zoe|allison|serena|kate|moira|karen|nicky|siri/.test(name)) s += 4; // warm, widely-installed female voices
      if (/ava|serena|moira|fiona|sonia|libby/.test(name)) s += 3; // the gentlest of those
      if (/google uk english female|google us english|microsoft (aria|jenny|sonia|libby)/.test(name)) s += 6; // web/android
      if (v.language?.toLowerCase() === "en-gb") s += 1;
      if (/compact|eloquence|fred|zarvox|whisper|bad news|bells|bubbles|cellos|trinoids|organ|boing|junior|ralph|albert/.test(name)) s -= 20;
      return s;
    };
    const best = [...english].sort((a, b) => score(b) - score(a))[0];
    chosenVoice = best?.identifier;
  } catch {
    chosenVoice = undefined;
  }
  return chosenVoice;
}

export const tts = {
  async speak(text: string, options: SpeakOptions = {}) {
    const trimmed = text.trim();
    if (!trimmed) return;
    await this.stop();
    const voice = await pickVoice();
    speaking = true;
    Speech.speak(trimmed, {
      voice,
      language: "en",
      rate: DELIVERY.rate,
      pitch: DELIVERY.pitch,
      volume: DELIVERY.volume,
      onStart: () => options.onStart?.(),
      onDone: () => {
        speaking = false;
        options.onDone?.();
      },
      onStopped: () => {
        speaking = false;
        options.onDone?.();
      },
      onError: () => {
        speaking = false;
        options.onError?.();
      },
    });
  },
  async stop() {
    if (!speaking) return;
    speaking = false;
    try {
      await Speech.stop();
    } catch {
      // nothing to stop
    }
  },
  isSpeaking() {
    return speaking;
  },
};
