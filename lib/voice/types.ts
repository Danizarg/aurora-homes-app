export type SttStatus = "idle" | "requesting" | "listening" | "transcribing" | "error" | "unavailable";

export interface SpeechToText {
  status: SttStatus;
  /** Why voice input isn't working, in words the user can act on. */
  error: string | null;
  /** True when this platform/configuration can take voice input at all. */
  available: boolean;
  /** Live partial transcript where the platform offers one. */
  partial: string;
  start: () => Promise<void>;
  /** Stops listening and resolves with the final transcript ("" when nothing was heard). */
  stop: () => Promise<string>;
  cancel: () => void;
}
