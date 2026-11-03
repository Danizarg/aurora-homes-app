import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { suzaEndpointReady, suzaUrl } from "../suza/api";

/**
 * Suza's voice.
 *
 * Preferred: the server's neural voice (app/api/suza/speak+api.ts) — a soft,
 * slightly echoing, spatial delivery synthesised on the server and streamed
 * to the device as a short stereo clip. Used whenever the server reports it
 * is configured.
 *
 * Fallback: the device's own speech synthesis (expo-speech), which works in
 * Expo Go and on the web with no keys. Nothing here is prerecorded.
 */
export interface SpeakOptions {
  onStart?: () => void;
  onDone?: () => void;
  onError?: () => void;
}

/** Device-synthesis delivery (see the fallback below). */
const DELIVERY = {
  rate: Platform.OS === "ios" ? 0.4 : 0.82,
  pitch: 0.9,
  volume: 0.8,
};

let chosenVoice: string | undefined | null = null; // null = not looked up yet
let speaking = false;
let utterance = 0; // bumps on every speak/stop so stale callbacks can tell
let player: AudioPlayer | null = null;
let remoteBroken = false; // one failure in this run → device voice for the rest of it

async function pickVoice(): Promise<string | undefined> {
  if (chosenVoice !== null) return chosenVoice;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const english = voices.filter((v) => v.language?.toLowerCase().startsWith("en"));
    const score = (v: Speech.Voice) => {
      let s = 0;
      const name = (v.name ?? "").toLowerCase();
      const id = (v.identifier ?? "").toLowerCase();
      if (v.quality === Speech.VoiceQuality.Enhanced) s += 14;
      if (id.includes("premium")) s += 12;
      if (id.includes("enhanced")) s += 8;
      if (/samantha|ava|zoe|allison|serena|kate|moira|karen|nicky|siri/.test(name)) s += 4;
      if (/ava|serena|moira|fiona|sonia|libby/.test(name)) s += 3;
      if (/google uk english female|google us english|microsoft (aria|jenny|sonia|libby)/.test(name)) s += 6;
      // Suza is written as a woman. On a machine whose only voices are the old Windows
      // ones nothing above matches, every candidate ties on zero, and the tie goes to
      // whichever the platform happens to list first — which is Microsoft David.
      if (/\bmale\b/.test(name)) s -= 25;
      if (/\b(david|mark|george|james|richard|guy|christopher|eric|brandon|jason|davis|andrew|brian|roger|alex|daniel|tom|aaron|arthur|gordon|oliver|reed|rishi|ryan|liam|william|thomas)\b/.test(name)) s -= 25;
      if (/\b(zira|hazel|heera|catherine|susan|linda|eva|aria|jenny|michelle|emma|elizabeth|monica|nancy|sara)\b/.test(name)) s += 3;
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

function releasePlayer() {
  const p = player;
  player = null;
  if (!p) return;
  try {
    p.pause();
  } catch {
    // already stopped
  }
  try {
    p.remove();
  } catch {
    // already released
  }
}

/** Ask the server for the clip and play it. Resolves true if it played (or started playing). */
async function speakRemotely(text: string, id: number, options: SpeakOptions): Promise<boolean> {
  const url = suzaUrl("/api/suza/speak");
  if (!url) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let clipId: string;
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ text }), signal: controller.signal });
    if (!res.ok) return false;
    const data = (await res.json()) as { id?: string };
    if (!data.id) return false;
    clipId = data.id;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
  if (id !== utterance) return true; // interrupted while synthesising: nothing to play, nothing to fall back to

  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    releasePlayer();
    // Phones download the clip first (no streaming quirks over a tunnel); the web streams it.
    const p = createAudioPlayer({ uri: `${url}?id=${encodeURIComponent(clipId)}` }, { updateInterval: 150, downloadFirst: Platform.OS !== "web" });
    player = p;
    return await new Promise<boolean>((resolve) => {
      let started = false;
      let playRequested = false;
      let settled = false;
      const settle = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      // If nothing is audible within this long, give the line to the device voice instead.
      const guard = setTimeout(() => {
        if (started || id !== utterance) return;
        console.warn("[suza voice] clip did not start playing in time; using the device voice");
        releasePlayer();
        settle(false);
      }, 9_000);
      p.addListener("playbackStatusUpdate", (status) => {
        if (id !== utterance) {
          clearTimeout(guard);
          return settle(true);
        }
        if (status.isLoaded && !playRequested) {
          playRequested = true;
          try {
            p.play();
          } catch {
            clearTimeout(guard);
            releasePlayer();
            settle(false);
          }
        }
        if (status.playing && !started) {
          started = true;
          clearTimeout(guard);
          settle(true);
          options.onStart?.();
        }
        if (status.didJustFinish) {
          clearTimeout(guard);
          speaking = false;
          releasePlayer();
          settle(true);
          options.onDone?.();
        }
      });
      // Some platforms report loaded before the listener is attached; a play() call is harmless then.
      try {
        p.play();
        playRequested = true;
      } catch {
        // the listener will try again once loaded
      }
    });
  } catch (e) {
    console.warn("[suza voice] playback failed; using the device voice", e);
    releasePlayer();
    return false;
  }
}

function speakOnDevice(text: string, voice: string | undefined, id: number, options: SpeakOptions) {
  Speech.speak(text, {
    voice,
    language: "en",
    rate: DELIVERY.rate,
    pitch: DELIVERY.pitch,
    volume: DELIVERY.volume,
    onStart: () => {
      if (id === utterance) options.onStart?.();
    },
    onDone: () => {
      if (id !== utterance) return;
      speaking = false;
      options.onDone?.();
    },
    onStopped: () => {
      if (id !== utterance) return;
      speaking = false;
      options.onDone?.();
    },
    onError: () => {
      if (id !== utterance) return;
      speaking = false;
      options.onError?.();
    },
  });
}

export const tts = {
  async speak(text: string, options: SpeakOptions = {}) {
    const trimmed = text.trim();
    if (!trimmed) return;
    await this.stop();
    const id = ++utterance;
    speaking = true;

    if (!remoteBroken && (await suzaEndpointReady("/api/suza/speak"))) {
      if (id !== utterance) return;
      const ok = await speakRemotely(trimmed, id, options);
      if (ok || id !== utterance) return;
      remoteBroken = true; // fall through to the device voice, now and for the rest of this run
    }
    if (id !== utterance) return;
    const voice = await pickVoice();
    if (id !== utterance) return;
    speakOnDevice(trimmed, voice, id, options);
  },
  async stop() {
    utterance++;
    const was = speaking;
    speaking = false;
    releasePlayer();
    if (!was) return;
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
