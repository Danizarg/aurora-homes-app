import { useCallback, useEffect, useRef } from "react";
import { useDiscovery } from "../store/discovery";
import { tts } from "./tts";
import { useSpeechToText } from "./useSpeechToText";

/**
 * Suza talking someone through a screen: `say(line, onAnswer?)` speaks the
 * line and, when an answer handler is given, listens hands-free afterwards
 * and passes on what was heard. Each new `say` cancels the previous turn, so
 * stale answers never land on a later step. Inert when `enabled` is false.
 */
export function useVoiceGuide(enabled: boolean) {
  const stt = useSpeechToText();
  const sttRef = useRef(stt);
  const turn = useRef(0);
  const lastHandler = useRef<((heard: string) => void) | null>(null);

  useEffect(() => {
    sttRef.current = stt;
  });

  const listen = useCallback((id: number, onAnswer: (heard: string) => void) => {
    if (id !== turn.current || !sttRef.current.available) return;
    void sttRef.current.start({
      autoStop: true,
      onResult: (heard) => {
        if (id === turn.current && heard) onAnswer(heard);
      },
    });
  }, []);

  const say = useCallback(
    (text: string, onAnswer?: (heard: string) => void) => {
      if (!enabled) return;
      const id = ++turn.current;
      lastHandler.current = onAnswer ?? null;
      sttRef.current.cancel();
      const then = () => {
        if (onAnswer) listen(id, onAnswer);
      };
      if (useDiscovery.getState().voice.speak) void tts.speak(text, { onDone: then, onError: then });
      else then();
    },
    [enabled, listen]
  );

  /** Listen again for the current step's answer without repeating the line. */
  const listenAgain = useCallback(() => {
    if (!enabled || !lastHandler.current) return;
    void tts.stop();
    sttRef.current.cancel();
    listen(++turn.current, lastHandler.current);
  }, [enabled, listen]);

  const stop = useCallback(() => {
    turn.current++;
    lastHandler.current = null;
    void tts.stop();
    sttRef.current.cancel();
  }, []);

  useEffect(() => stop, [stop]);

  return {
    say,
    listenAgain,
    stop,
    listening: stt.status === "listening",
    canListen: enabled && stt.available,
  };
}
