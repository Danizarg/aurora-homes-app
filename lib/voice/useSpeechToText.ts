import { useCallback, useEffect, useRef, useState } from "react";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { suzaEndpointReady, suzaUrl } from "../suza/api";
import type { ListenOptions, SpeechToText, SttStatus } from "./types";

/**
 * Native speech-to-text in Expo Go: record with expo-audio, then send the
 * clip to the Zouza server (app/api/suza/transcribe+api.ts), which holds the
 * speech provider key; the app never does.
 *
 * `available` is decided by asking the server (GET → { ok }), so the mic is
 * only offered when it will actually work. Silence detection (recorder
 * metering) ends a hands-free turn ~1.2 s after the person stops talking.
 */
const SPEECH_DB = -38; // louder than this counts as speech
const SILENCE_MS = 1200;
const NO_SPEECH_MS = 6000;
const MAX_TURN_MS = 15000;

export function useSpeechToText(): SpeechToText {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [status, setStatus] = useState<SttStatus>("requesting");
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const partial = ""; // no live partials from a server round-trip
  const cancelled = useRef(false);
  const listening = useRef(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const optionsRef = useRef<ListenOptions>({});
  const stopRef = useRef<() => Promise<string>>(async () => "");

  useEffect(() => {
    let alive = true;
    suzaEndpointReady("/api/suza/transcribe").then((ok) => {
      if (!alive) return;
      setAvailable(ok);
      setStatus(ok ? "idle" : "unavailable");
      setError(ok ? null : "Voice input isn't switched on for this server yet (it needs a transcription key). Typing works now.");
    });
    return () => {
      alive = false;
    };
  }, []);

  const clearPoll = () => {
    if (poll.current) clearInterval(poll.current);
    poll.current = null;
  };

  const start = useCallback(
    async (options: ListenOptions = {}) => {
      if (!available || listening.current) return;
      optionsRef.current = options;
      setError(null);
      setStatus("requesting");
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone access was declined. You can allow it in Settings, or keep typing.");
        setStatus("error");
        return;
      }
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        cancelled.current = false;
        listening.current = true;
        setStatus("listening");

        // Hands-free: end the turn on silence after speech, or give up quietly if nobody speaks.
        const startedAt = Date.now();
        let spokeAt = 0;
        let lastLoud = 0;
        clearPoll();
        poll.current = setInterval(() => {
          if (!listening.current) return clearPoll();
          const s = recorder.getStatus();
          const db = s.metering ?? -160;
          const now = Date.now();
          if (db > SPEECH_DB) {
            lastLoud = now;
            if (!spokeAt) spokeAt = now;
          }
          const tooLong = now - startedAt > MAX_TURN_MS;
          const silentAfterSpeech = spokeAt && now - lastLoud > SILENCE_MS;
          const nobodySpoke = !spokeAt && now - startedAt > NO_SPEECH_MS;
          if (options.autoStop && (tooLong || silentAfterSpeech || nobodySpoke)) {
            clearPoll();
            if (nobodySpoke) {
              cancelled.current = true;
              void stopRef.current().then(() => options.onResult?.(""));
            } else {
              void stopRef.current().then((text) => options.onResult?.(text));
            }
          }
        }, 120);
      } catch {
        setError("Couldn't start recording on this device.");
        setStatus("error");
      }
    },
    [available, recorder]
  );

  const stop = useCallback(async () => {
    if (!listening.current) return "";
    listening.current = false;
    clearPoll();
    setStatus("transcribing");
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || cancelled.current) {
        setStatus("idle");
        return "";
      }
      const url = suzaUrl("/api/suza/transcribe");
      if (!url) throw new Error("no server");
      const form = new FormData();
      form.append("audio", { uri, name: "speech.m4a", type: "audio/m4a" } as unknown as Blob);
      form.append("language", "en");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      try {
        const res = await fetch(url, { method: "POST", body: form, signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { text?: string };
        setStatus("idle");
        return (json.text ?? "").trim();
      } finally {
        clearTimeout(timer);
      }
    } catch {
      setError("I couldn't reach the transcription service. Please type your message instead.");
      setStatus("error");
      return "";
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  }, [recorder]);
  stopRef.current = stop;

  const cancel = useCallback(() => {
    cancelled.current = true;
    clearPoll();
    if (listening.current) {
      listening.current = false;
      recorder.stop().catch(() => {});
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
    setStatus(available ? "idle" : "unavailable");
  }, [recorder, available]);

  return { status, error, available, partial, start, stop, cancel };
}
