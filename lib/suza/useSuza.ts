import { useCallback, useEffect, useRef, useState } from "react";
import { useDiscovery } from "../store/discovery";
import { planTurn } from "./brain";
import { executeActions } from "./execute";
import { nextQuestion } from "./questions";
import { describeResults, waitForSearch } from "./summary";
import { tts } from "../voice/tts";
import { useSpeechToText } from "../voice/useSpeechToText";

export type SuzaState = "idle" | "listening" | "thinking" | "speaking";
type Option = { label: string; value: string };

/**
 * The conversation loop: a message in (typed or spoken) → plan → execute
 * actions → reply (spoken when voice is on) → optional follow-up question.
 *
 * Voice turns are hands-free: Suza stops listening by herself when you pause,
 * and when she ends on a question she listens again for the answer.
 *
 * Guided mode (store `guided`, set by the intro): Suza leads. She asks the
 * next useful question herself, listens after every question whether the
 * last answer was spoken or tapped, and when nothing is left to ask she waits
 * for the search to settle and tells you what she found. Closing the panel or
 * interrupting her ends guided mode.
 */
export function useSuza() {
  const stt = useSpeechToText();
  const [state, setState] = useState<SuzaState>("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const handsFree = useRef(false);
  const sttRef = useRef(stt);
  sttRef.current = stt;
  /** Where a heard answer goes when someone other than the planner asked the question. */
  const pendingAnswer = useRef<((heard: string) => void) | null>(null);

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
  const finishGuideRef = useRef<() => Promise<void>>(async () => {});

  /** Say a line; when she has finished speaking (or straight away when muted), run `after`. */
  const say = useCallback((text: string, options?: Option[], after?: () => void) => {
    const store = useDiscovery.getState();
    store.pushMessage({ role: "suza", text, options });
    if (store.voice.speak) {
      setState("speaking");
      void tts.speak(text, {
        onDone: () => {
          setState("idle");
          after?.();
        },
        onError: () => {
          setState("idle");
          after?.();
        },
      });
    } else {
      after?.();
    }
  }, []);

  /** Delivers a heard answer to whoever asked for it. */
  const deliver = useCallback((heard: string) => {
    const cb = pendingAnswer.current;
    pendingAnswer.current = null;
    setState("idle");
    if (!heard || !cb) return;
    useDiscovery.getState().pushMessage({ role: "user", text: heard });
    cb(heard);
  }, []);

  /** Listen once, hands-free, and hand the words to `onAnswer` instead of the planner. */
  const listenFor = useCallback(
    async (onAnswer: (heard: string) => void) => {
      if (!sttRef.current.available) return;
      await tts.stop();
      setError(null);
      pendingAnswer.current = onAnswer;
      await sttRef.current.start({ autoStop: true, onResult: deliver });
    },
    [deliver]
  );

  /** Ask a question out loud and route the spoken answer to `onAnswer` (taps still work too). */
  const ask = useCallback(
    (text: string, options: Option[] | undefined, onAnswer: (heard: string) => void) => {
      say(text, options, () => void listenFor(onAnswer));
    },
    [say, listenFor]
  );

  const send = useCallback(
    async (text: string, via: "voice" | "text" = "text") => {
      const trimmed = text.trim();
      if (!trimmed || busy.current) return;
      busy.current = true;
      pendingAnswer.current = null;
      const guided = useDiscovery.getState().guided;
      handsFree.current = via === "voice" || guided;
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
          if (!reply.includes(plan.question.text)) reply = `${reply} ${plan.question.text}`.trim();
        }
        const leaving = plan.actions.some((a) => a.type === "openUpload" || a.type === "openListing" || a.type === "showSaved");
        let after: (() => void) | undefined;
        if (plan.question && !leaving && handsFree.current) after = () => void listenRef.current();
        else if (!plan.question && !leaving && guided) after = () => void finishGuideRef.current();
        // Opening a listing or the saved list ends the guided search; opening the listing builder hands the guide over to it.
        else if (leaving && !plan.actions.some((a) => a.type === "openUpload")) useDiscovery.getState().setGuided(false);
        say(reply, plan.question?.options, after);
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
    pendingAnswer.current = null;
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
    if (pendingAnswer.current) return deliver(text);
    if (text) await sendRef.current(text, "voice");
    else {
      handsFree.current = false;
      setState("idle");
    }
  }, [deliver]);

  /** The end of a guided search: wait for results, then say what she found. */
  const finishGuide = useCallback(async () => {
    setState("thinking");
    await waitForSearch(() => useDiscovery.getState().searching);
    const store = useDiscovery.getState();
    if (!store.guided) return setState("idle");
    const { text, empty } = describeResults(store.result, store.criteria.target?.label);
    if (empty) {
      // Not done yet: offer the ways forward and keep listening.
      say(text, [{ label: "Widen the area", value: "show me everything around here" }, { label: "Somewhere else", value: "somewhere else" }], () => void listenRef.current());
      return;
    }
    store.setGuided(false);
    handsFree.current = false;
    say(text);
  }, [say]);
  finishGuideRef.current = finishGuide;

  /** Start (or resume) the guided journey on the map: ask the next useful question, or summarise. */
  const guide = useCallback(async () => {
    const store = useDiscovery.getState();
    if (!store.guided) return;
    handsFree.current = true;
    const q = nextQuestion(store.intent, store.criteria, store.asked, store.showAll);
    if (!q) return finishGuide();
    store.markAsked(q.key);
    const lead = store.criteria.target ? `Let's find your place around ${store.criteria.target.label.split(",")[0]}. ` : "Let's find your place. ";
    say(`${lead}${q.text}`, q.options, () => void listenRef.current());
  }, [say, finishGuide]);

  const interrupt = useCallback(async () => {
    handsFree.current = false;
    pendingAnswer.current = null;
    await tts.stop();
    sttRef.current.cancel();
    setState("idle");
  }, []);

  /** Interrupt and leave guided mode: the person has taken over. */
  const endGuide = useCallback(async () => {
    useDiscovery.getState().setGuided(false);
    await interrupt();
  }, [interrupt]);

  const greet = useCallback(
    (text: string, options?: Option[]) => {
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
    ask,
    listenFor,
    startListening,
    stopListening,
    interrupt,
    endGuide,
    guide,
    greet,
  };
}
