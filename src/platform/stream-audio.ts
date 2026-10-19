import {
  requireOptionalNativeModule,
  type EventSubscription,
} from "expo-modules-core";
import { requestRecordingPermissionsAsync } from "expo-audio";
import type { StreamAudioFactory, PlayedAudio } from "./stream-audio-contract";
interface NativeAudio {
  start(): Promise<void>;
  enqueue(id: string, data: string): Promise<void>;
  finish(id: string): Promise<void>;
  interrupt(): Promise<PlayedAudio | null>;
  duck(value: boolean): Promise<void>;
  mute(value: boolean): Promise<void>;
  stop(): Promise<void>;
  addListener(
    event: string,
    callback: (data: never) => void,
  ): EventSubscription;
}
export const createStreamAudio: StreamAudioFactory = (onPlayed) => {
  let native: NativeAudio | null = null;
  let disposed = false;
  let subscriptions: EventSubscription[] = [];
  let error: (value: Error) => void = () => {};
  // Preserve native call ordering across enqueue/finish/interrupt.
  let commands: Promise<unknown> = Promise.resolve();
  const command = (work: () => Promise<unknown>) => {
    commands = commands.then(work).catch(() => {
      if (!disposed) error(new Error("voice_audio_failed"));
    });
  };
  return {
    async start(onAudio, onError) {
      error = onError;
      native = requireOptionalNativeModule<NativeAudio>("PlantopediaVoice");
      if (!native) throw new Error("voice_native_rebuild");
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error("voice_microphone_denied");
      if (disposed) return;
      subscriptions = [
        native.addListener("audio", ({ data }: { data: string }) => {
          if (!disposed) onAudio(data);
        }),
        native.addListener("played", (played: PlayedAudio) => {
          if (!disposed) onPlayed(played);
        }),
        native.addListener("failure", ({ code }: { code: string }) => {
          if (!disposed) onError(new Error(code));
        }),
      ];
      await native.start();
      if (disposed) await native.stop();
    },
    enqueue(id, data) {
      command(async () => {
        if (!disposed) await native?.enqueue(id, data);
      });
    },
    finish(id) {
      command(async () => {
        if (!disposed) await native?.finish(id);
      });
    },
    async interrupt() {
      await commands;
      return (await native?.interrupt()) ?? null;
    },
    duck(value) {
      command(async () => {
        await native?.duck(value);
      });
    },
    mute(value) {
      command(async () => {
        await native?.mute(value);
      });
    },
    async dispose() {
      disposed = true;
      subscriptions.forEach((item) => item.remove());
      subscriptions = [];
      await commands;
      await native?.stop();
    },
  };
};
