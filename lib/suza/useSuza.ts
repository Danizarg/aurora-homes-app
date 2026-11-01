import { useCallback, useEffect, useRef, useState } from "react";
import { useDiscovery } from "../store/discovery";
import { planTurn } from "./brain";
import { executeActions } from "./execute";
import { tts } from "../voice/tts";
import { useSpeechToText } from "../voice/useSpeechToText";

export type SuzaState = "idle" | "listening" | "thinking" | "speaking";

/**
 * The conversation loop: a message in (typed or spoken) → plan → execute
 * actions → reply (spoken when voice is on) → optional follow-up question.
 *
 * Voice commands are hands-free: tap the mic once, talk, and Suza stops
 * listening by herself when you pause. If the turn came in by voice and she
 * ends with a question, she listens again for the answer; typing, tapping an
 * option or interrupting her leaves hands-free mode.
 */
export function useSuza() {
  const stt = useSpeechToText();
  const [state, setState] = useState<SuzaState>("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const handsFree = useRef(false);
  const sttRef = useRef(stt);
  sttRef.current = stt;

  const speakEnabled = useDiscovery((s) => s.voice.speak);

  useEffect(() => {
    if (stt.status === "listening") setState("listening");
    else if (stt.status === "transcribing") setState("thinking");
    else if (stt.status === "error") {
      setError(stt.error);
      handsFree.current = false;
      setState("idle");
    }
  }, [stt.status, stt.error]);

  useEffect(
    () => () => {
      void tts.stop();
      sttRef.current.cancel();
    },
    []
  );

  const listenRef = useRef<() => Promise<void>>(async () => {});
  const sendRef = useRef<(text: string, via?: "voice" | "text") => Promise<void>>(async () => {});

  const say = useCallback((text: string, options?: { label: string; value: string }[], thenListen = false) => {
    const store = useDiscovery.getState();
    store.pushMessage({ role: "suza", text, options });
    if (store.voice.speak) {
      setState("speaking");
      void tts.speak(text, {
        onDone: () => {
          setState("idle");
          if (thenListen && handsFree.current) void listenRef.current();
        },
        onError: () => setState("idle"),
      });
    } else if (thenListen && handsFree.current) {
      void listenRef.current();
    }
  }, []);

  const send = useCallback(
    async (text: string, via: "voice" | "text" = "text") => {
      const trimmed = text.trim();
      if (!trimmed || busy.current) return;
      busy.current = true;
      handsFree.current = via === "voice";
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
        // Listen again only when she asked something and we're still on this screen.
        const leaving = plan.actions.some((a) => a.type === "openUpload" || a.type === "openListing" || a.type === "showSaved");
        say(reply, plan.question?.options, !!plan.question && !leaving);
      } catch {
        setError("Suza hit a snag understanding that. Try rephrasing, or use the search bar.");
        handsFree.current = false;
        setState("idle");
      } finally {
        busy.current = false;
      }
    },
    [say]
  );
  sendRef.current = send;

  const startListening = useCallback(async () => {
    await tts.stop();
    setError(null);
    await sttRef.current.start({
      autoStop: true,
      onResult: (text) => {
        if (text) void sendRef.current(text, "voice");
        else {
          handsFree.current = false;
          setState("idle");
        }
      },
    });
  }, []);
  listenRef.current = startListening;

  const stopListening = useCallback(async () => {
    const text = await sttRef.current.stop();
    if (text) await sendRef.current(text, "voice");
    else {
      handsFree.current = false;
      setState("idle");
    }
  }, []);

  const interrupt = useCallback(async () => {
    handsFree.current = false;
    await tts.stop();
    sttRef.current.cancel();
    setState("idle");
  }, []);

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
