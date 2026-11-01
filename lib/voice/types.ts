export type SttStatus = "idle" | "requesting" | "listening" | "transcribing" | "error" | "unavailable";

export interface ListenOptions {
  /**
   * Stop by itself once the person has spoken and then paused (hands-free),
   * instead of waiting for a tap. `onResult` receives the final transcript
   * ("" when nothing was heard).
   */
  autoStop?: boolean;
  onResult?: (text: string) => void;
}

export interface SpeechToText {
  status: SttStatus;
  /** Why voice input isn't working, in words the user can act on. */
  error: string | null;
  /** True when this platform/configuration can take voice input at all. */
  available: boolean;
  /** Live partial transcript where the platform offers one. */
  partial: string;
  start: (options?: ListenOptions) => Promise<void>;
  /** Stops listening and resolves with the final transcript ("" when nothing was heard). */
  stop: () => Promise<string>;
  cancel: () => void;
}
