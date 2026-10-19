export interface VoiceCapture {
  start(): Promise<void>;
  finish(): Promise<string>;
  cancel(): Promise<void>;
}
export interface VoicePlayback {
  play(): Promise<void>;
  stop(): void;
  dispose(): void;
}
