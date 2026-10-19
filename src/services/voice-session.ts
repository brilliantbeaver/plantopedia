import type { ApiClient } from "./api";
import { initialVoice } from "../platform/voice-contract";
import { createLiveVoiceTransport } from "../platform/live-voice";
import type { VoiceState } from "../platform/voice-contract";

// One owner-scoped transport survives individual docks and conversation routes.
export function createVoiceSession(
  api: ApiClient,
  owner: string | null,
  createTransport = createLiveVoiceTransport,
) {
  let snapshot: VoiceState = initialVoice;
  const listeners = new Set<() => void>();
  const transport = createTransport(api, (state) => {
    snapshot = state;
    for (const listener of listeners) listener();
  });
  return {
    owner,
    transport,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
export type VoiceSessionController = ReturnType<typeof createVoiceSession>;
