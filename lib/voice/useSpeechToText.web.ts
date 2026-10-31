import { useCallback, useEffect, useRef, useState } from "react";
import type { ListenOptions, SpeechToText, SttStatus } from "./types";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognition(): (new () => Recognition) | null {
  const w = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Browser speech recognition (Chrome, Edge, Safari 14.1+). Real, free,
 * on-device or vendor-hosted. Hands-free turns use `continuous = false`, so
 * the browser ends the session itself after the person pauses.
 */
export function useSpeechToText(): SpeechToText {
  const Ctor = getRecognition();
  const [status, setStatus] = useState<SttStatus>(Ctor ? "idle" : "unavailable");
  const [error, setError] = useState<string | null>(Ctor ? null : "This browser has no speech recognition. Chrome or Edge support it; typing works everywhere.");
  const [partial, setPartial] = useState("");
  const rec = useRef<Recognition | null>(null);
  const finalText = useRef("");
  const latest = useRef("");
  const resolver = useRef<((text: string) => void) | null>(null);
  const autoResult = useRef<((text: string) => void) | null>(null);

  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(
    async (options: ListenOptions = {}) => {
      if (!Ctor) return;
      finalText.current = "";
      latest.current = "";
      setPartial("");
      setError(null);
      autoResult.current = options.autoStop ? options.onResult ?? null : null;
      const r = new Ctor();
      r.lang = "en-GB";
      r.continuous = !options.autoStop;
      r.interimResults = true;
      r.onresult = (e) => {
        let interim = "";
        let fin = "";
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          const t = res[0]?.transcript ?? "";
          if (res.isFinal) fin += t + " ";
          else interim += t;
        }
        finalText.current = fin.trim();
        latest.current = (fin + interim).trim();
        setPartial(latest.current);
      };
      r.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        setError(e.error === "not-allowed" ? "Microphone access was blocked. Allow it in the browser's site settings." : `Speech recognition error: ${e.error}`);
        setStatus("error");
      };
      r.onend = () => {
        setStatus((s) => (s === "error" ? s : "idle"));
        const text = (finalText.current || latest.current).trim();
        setPartial("");
        if (resolver.current) {
          resolver.current(text);
          resolver.current = null;
        } else if (autoResult.current) {
          const cb = autoResult.current;
          autoResult.current = null;
          cb(text);
        }
      };
      rec.current = r;
      setStatus("listening");
      try {
        r.start();
      } catch {
        setError("Couldn't start the microphone.");
        setStatus("error");
      }
    },
    [Ctor]
  );

  const stop = useCallback(() => {
    return new Promise<string>((resolve) => {
      if (!rec.current) return resolve("");
      autoResult.current = null;
      resolver.current = (text) => resolve(text);
      setStatus("transcribing");
      rec.current.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    resolver.current = null;
    autoResult.current = null;
    rec.current?.abort();
    setPartial("");
    setStatus(Ctor ? "idle" : "unavailable");
  }, [Ctor]);

  return { status, error, available: !!Ctor, partial, start, stop, cancel };
}
