import type { Locale } from "@plantopedia/contracts";
export type VoicePhase =
  | "listening"
  | "hearing"
  | "connecting"
  | "idle"
  | "requesting_permission"
  | "recording"
  | "recorded"
  | "sending"
  | "processing"
  | "ready"
  | "error";
export interface VoiceState {
  phase: VoicePhase;
  live?: boolean;
  muted?: boolean;
  caption: string;
  userCaption: string;
  playingAudio: boolean;
  audioReady: boolean;
  completedId: string | null;
  error: string | null;
  notice?: string | null;
}
export const initialVoice: VoiceState = {
  phase: "idle",
  caption: "",
  userCaption: "",
  playingAudio: false,
  audioReady: false,
  completedId: null,
  error: null,
};
export interface VoiceTransport {
  prime?(): void;
  record(conversationId: string, locale: Locale): Promise<void>;
  send(): Promise<void>;
  play(): Promise<void>;
  disconnect(): Promise<void>;
}
