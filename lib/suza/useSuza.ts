import { useCallback, useEffect, useRef, useState } from "react";
import { useDiscovery } from "../store/discovery";
import { planTurn } from "./brain";
import { executeActions } from "./execute";
import { tts } from "../voice/tts";
import { useSpeechToText } from "../voice/useSpeechToText";

export type SuzaState = "idle" | "listening" | "thinking" | "speaking";

/**
 * The conversation loop: a message in (typed or transcribed) → plan →
 * execute actions → reply (spoken when voice is on) → optional follow-up
 * question with tap-to-answer options.
 */
export function useSuza() {
  const stt = useSpeechToText();
  const [state, setState] = useState<SuzaState>("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const speakEnabled = useDiscovery((s) => s.voice.speak);

  useEffect(() => {
    if (stt.status === "listening") setState("listening");
    else if (stt.status === "transcribing") setState("thinking");
    else if (stt.status === "error") {
      setError(stt.error);
      setState("idle");
    }
  }, [stt.status, stt.error]);

  useEffect(() => () => void tts.stop(), []);

  const say = useCallback(
    (text: string, options?: { label: string; value: string }[]) => {
      const store = useDiscovery.getState();
      store.pushMessage({ role: "suza", text, options });
      if (store.voice.speak) {
        setState("speaking");
        void tts.speak(text, { onDone: () => setState("idle"), onError: () => setState("idle") });
      }
    },
    []
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy.current) return;
      busy.current = true;
      setError(null);
      await tts.stop();
      const store = useDiscovery.getState();
      store.pushMessage({ role: "user", text: trimmed });
      setState("thinking");
      try {
        const result = store.result;
        const plan = await planTurn(trimmed, {
          intent: store.intent,
          criteria: store.criteria,
          asked: store.asked,
          showAll: store.showAll,
          userLocationLabel: store.userLocationLabel,
          resultCount: result ? result.items.length : null,
          selectedListingId: store.selectedListingId,
          resultIds: result ? result.items.slice(0, 5).map((i) => i.listing.id) : [],
        });
        executeActions(plan.actions);
        let reply = plan.reply;
        if (plan.question) {
          useDiscovery.getState().markAsked(plan.question.key);
          reply = `${reply} ${plan.question.text}`.trim();
        }
        say(reply, plan.question?.options);
      } catch {
        setError("Suza hit a snag understanding that. Try rephrasing, or use the search bar.");
        setState("idle");
      } finally {
        busy.current = false;
      }
    },
    [say]
  );

  const startListening = useCallback(async () => {
    await tts.stop();
    setError(null);
    await stt.start();
  }, [stt]);

  const stopListening = useCallback(async () => {
    const text = await stt.stop();
    if (text) await send(text);
    else setState("idle");
  }, [stt, send]);

  const interrupt = useCallback(async () => {
    await tts.stop();
    stt.cancel();
    setState("idle");
  }, [stt]);

  const greet = useCallback(
    (text: string, options?: { label: string; value: string }[]) => {
      const store = useDiscovery.getState();
      const last = store.messages[store.messages.length - 1];
      if (last?.role === "suza" && last.text === text) return;
      say(text, options);
    },
    [say]
  );

  return {
    state,
    error,
    partial: stt.partial,
    voiceInputAvailable: stt.available,
    voiceInputHint: stt.error,
    speakEnabled,
    send,
    startListening,
    stopListening,
    interrupt,
    greet,
  };
}
