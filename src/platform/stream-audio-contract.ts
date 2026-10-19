export interface PlayedAudio {
  itemId: string;
  ms: number;
}
export interface StreamAudio {
  prime?(): void;
  start(
    onAudio: (base64: string) => void,
    onError: (error: Error) => void,
  ): Promise<void>;
  enqueue(itemId: string, base64: string): void;
  finish(itemId: string): void;
  interrupt(): PlayedAudio | null | Promise<PlayedAudio | null>;
  mute(muted: boolean): void;
  duck(active: boolean): void;
  dispose(): Promise<void>;
}
export type StreamAudioFactory = (
  onPlayed: (audio: PlayedAudio) => void,
) => StreamAudio;
