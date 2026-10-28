import { useCallback, useRef, useState } from "react";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import type { SpeechToText, SttStatus } from "./types";

/**
 * Native speech-to-text in Expo Go: record with expo-audio, then send the
 * clip to the Zouza server for transcription (the server holds the speech
 * provider key; the app never does). Endpoint contract:
 *
 *   POST {EXPO_PUBLIC_APP_URL}/api/suza/transcribe   multipart/form-data
 *     audio: <m4a/caf file>, language: "en"
 *   → 200 { "text": "two bedroom apartment in marbella" }
 *
 * Until that endpoint exists, `available` is false and the panel offers
 * typing instead — no fake transcripts, no prerecorded audio.
 */
const APP_URL = (process.env.EXPO_PUBLIC_APP_URL || "https://zouza.ai").replace(/\/$/, "");
const TRANSCRIBE_ENABLED = process.env.EXPO_PUBLIC_SUZA_TRANSCRIBE === "true";

export function useSpeechToText(): SpeechToText {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [status, setStatus] = useState<SttStatus>(TRANSCRIBE_ENABLED ? "idle" : "unavailable");
  const [error, setError] = useState<string | null>(
    TRANSCRIBE_ENABLED ? null : "Voice input needs the Zouza transcription endpoint (EXPO_PUBLIC_SUZA_TRANSCRIBE=true). Typing works now."
  );
  const partial = ""; // no live partials from a server round-trip
  const cancelled = useRef(false);

  const start = useCallback(async () => {
    if (!TRANSCRIBE_ENABLED) return;
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
      setStatus("listening");
    } catch {
      setError("Couldn't start recording on this device.");
      setStatus("error");
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    if (status !== "listening") return "";
    setStatus("transcribing");
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || cancelled.current) {
        setStatus("idle");
        return "";
      }
      const form = new FormData();
      form.append("audio", { uri, name: "speech.m4a", type: "audio/m4a" } as unknown as Blob);
      form.append("language", "en");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20_000);
      try {
        const res = await fetch(`${APP_URL}/api/suza/transcribe`, { method: "POST", body: form, signal: controller.signal });
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
  }, [recorder, status]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    if (status === "listening") recorder.stop().catch(() => {});
    setStatus(TRANSCRIBE_ENABLED ? "idle" : "unavailable");
  }, [recorder, status]);

  return { status, error, available: TRANSCRIBE_ENABLED, partial, start, stop, cancel };
}
