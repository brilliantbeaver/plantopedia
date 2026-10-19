import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/expo";
import { apiClient, type ApiClient } from "./api";
import { AppState } from "react-native";
import { local } from "./local";
import { z } from "zod";
import {
  createVoiceSession,
  type VoiceSessionController,
} from "./voice-session";
const Context = createContext<{
  api: ApiClient;
  owner: string;
  voice: VoiceSessionController;
  registerCleanup: (cleanup: () => Promise<void>) => () => void;
  release: () => Promise<void>;
} | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const { getToken, userId } = useAuth();
  // Expo Clerk wraps getToken anew on each render. Keep owner resources stable
  // while using its latest token function; never use another owner's function.
  const tokenSource = useRef({ owner: userId, getToken });
  useLayoutEffect(() => {
    tokenSource.current = { owner: userId, getToken };
  }, [userId, getToken]);
  const readToken = useCallback(() => {
    const current = tokenSource.current;
    return current.owner === userId
      ? current.getToken()
      : Promise.resolve(null);
  }, [userId]);
  // apiClient stores this callback; only token/request invoke it after render.
  // eslint-disable-next-line react-hooks/refs
  const scope = useMemo(() => apiClient(readToken), [readToken]);
  const voice = useMemo(
    () => createVoiceSession(scope, userId ?? null),
    [scope, userId],
  );
  const resources = useMemo(() => {
    const cleanups = new Set<() => Promise<void>>();
    return {
      registerCleanup(cleanup: () => Promise<void>) {
        cleanups.add(cleanup);
        return () => {
          cleanups.delete(cleanup);
        };
      },
      async release() {
        await Promise.allSettled([...cleanups].map((cleanup) => cleanup()));
      },
    };
  }, []);
  useEffect(() => {
    const unregister = resources.registerCleanup(() =>
      voice.transport.disconnect(),
    );
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active")
        void voice.transport.disconnect().catch(() => undefined);
    });
    return () => {
      unregister();
      subscription.remove();
      void voice.transport.disconnect().catch(() => undefined);
    };
  }, [resources, voice]);
  useEffect(() => {
    scope.activate();
    return () => {
      scope.dispose();
    };
  }, [scope]);
  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    let running = false;
    async function reconcile() {
      if (running || stopped || !userId) return;
      running = true;
      try {
        const references = await local.references(userId);
        for (
          let offset = 0;
          offset < references.length && !stopped;
          offset += 100
        ) {
          const result = await scope.request(
            "/sync/status",
            z.object({
              records: z.array(
                z.object({ id: z.string(), exists: z.boolean() }),
              ),
            }),
            {
              method: "POST",
              body: {
                records: references
                  .slice(offset, offset + 100)
                  .map((id) => ({ type: "plant", id })),
              },
            },
          );
          if (stopped) return;
          for (const record of result.records)
            if (!record.exists) await local.reconcileDeleted(userId, record.id);
        }
      } catch {
        /* Remain offline; never delete local evidence on a failed status request. */
      } finally {
        running = false;
      }
    }
    void reconcile();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void reconcile();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void reconcile();
    }, 30000);
    return () => {
      stopped = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [scope, userId]);
  if (!userId) return null;
  return (
    <Context.Provider
      value={{ api: scope, owner: userId, voice, ...resources }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSessionApi() {
  const context = useContext(Context);
  if (!context) throw new Error("SessionProvider required");
  return context;
}
