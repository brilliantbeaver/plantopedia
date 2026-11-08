import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { useSessionApi } from "../../services/session";
import { gardenData } from "../../services/garden-data";
import { local } from "../../services/local";
import { featureStorage } from "../../services/feature-storage";
import { deletionQueue, type PendingDelete } from "./deletion";
import { Action, Copy, Feedback } from "../../components/ui";
import { usePreferences, designTokens } from "../../theme/preferences";
import { navigationLayout } from "../../theme/navigation-layout";

const Context = createContext<{
  items: PendingDelete[];
  remove(item: Pick<PendingDelete, "id" | "label" | "kind">): Promise<void>;
} | null>(null);
export function useDeletion() {
  return useContext(Context);
}
export function DeletionProvider({ children }: { children: ReactNode }) {
  const { owner, api } = useSessionApi();
  const query = useQueryClient();
  const { colors, t } = usePreferences();
  const queue = useMemo(() => deletionQueue(owner, featureStorage), [owner]);
  const [items, setItems] = useState<PendingDelete[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [accessible, setAccessible] = useState(true);
  const [needsTime, setNeedsTime] = useState(false);
  const alive = useRef(true);
  const running = useRef(false);
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then(setAccessible);
    if (Platform.OS === "android")
      void AccessibilityInfo.getRecommendedTimeoutMillis(5000)
        .then((ms) => setNeedsTime(ms > 5000))
        .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setAccessible,
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    alive.current = true;
    async function refresh() {
      if (
        running.current ||
        !alive.current ||
        AppState.currentState !== "active"
      )
        return;
      running.current = true;
      try {
        await queue.flush(
          Date.now(),
          () => alive.current,
          async (item) => {
            if (item.kind === "sighting") {
              await gardenData.update(owner, api, (d) => ({
                ...d,
                sightings: d.sightings.filter((x) => x.id !== item.id),
                actions: d.actions.filter(
                  (a) => a.id !== "animal_" + item.id || a.acknowledged,
                ),
              }));
              await local.purge(owner, item.id);
              await query.invalidateQueries({ queryKey: [owner] });
              return;
            }
            try {
              await api.request(
                `/plants/${item.id}`,
                z.object({ deleted: z.boolean() }),
                { method: "DELETE" },
              );
            } catch (e) {
              if (!(
                e &&
                typeof e === "object" &&
                "status" in e &&
                [404, 410].includes(Number(e.status))
              ))
                throw e;
            }
            if (!alive.current) throw new Error("scope_changed");
            await local.removeOriginal(owner, `planting_photo_${item.id}`);
            await gardenData.update(owner, api, (d) => ({
              ...d,
              actions: d.actions.map((a) =>
                a.plantId === item.id
                  ? { ...a, text: "", photoUri: undefined }
                  : a,
              ),
              catalogSaves: Object.fromEntries(
                Object.entries(d.catalogSaves).filter(
                  ([, v]) => v.id !== item.id,
                ),
              ),
            }));
            await local.purge(owner, item.id);
            await query.invalidateQueries({ queryKey: [owner] });
          },
        );
        if (alive.current) setItems(await queue.list());
      } catch (e) {
        if (alive.current) setError(e);
      } finally {
        running.current = false;
      }
    }
    void queue.list().then(setItems).catch(setError);
    const timer = setInterval(() => void refresh(), 1000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      alive.current = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [queue, api, owner, query]);
  async function refreshItems() {
    setItems(await queue.list());
    await query.invalidateQueries({ queryKey: [owner] });
  }
  return (
    <Context.Provider
      value={{
        items,
        async remove(item) {
          try {
            await queue.enqueue(item, Date.now(), accessible || needsTime);
            await refreshItems();
          } catch (e) {
            setError(e);
            throw e;
          }
          AccessibilityInfo.announceForAccessibility(t("itemRemoved"));
        },
      }}
    >
      {children}
      {(items.length > 0 || !!error) && (
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom:
              navigationLayout(width, fontScale).height +
              Math.max(insets.bottom, 10) +
              12,
          }}
        >
          <ScrollView
            style={{
              maxHeight: 220,
              backgroundColor: colors.surface,
              borderRadius: designTokens.radius.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            contentContainerStyle={{
              padding: 16,
              gap: designTokens.spacing.small,
            }}
          >
            {items.map((item) => (
              <View key={item.id} style={{ gap: designTokens.spacing.small }}>
                <Copy>
                  {item.label} ·{" "}
                  {t(
                    item.status === "pending" ? "itemRemoved" : "deletePending",
                  )}
                </Copy>
                {item.status === "pending" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: designTokens.spacing.small,
                    }}
                  >
                    <Action
                      compact
                      secondary
                      title={t("undo")}
                      onPress={() =>
                        void queue
                          .undo(item.id)
                          .then(refreshItems)
                          .catch(setError)
                      }
                    />
                    {item.deadline === null && (
                      <Action
                        compact
                        destructive
                        title={t("remove")}
                        onPress={() =>
                          void queue
                            .dismiss(item.id)
                            .then(refreshItems)
                            .catch(setError)
                        }
                      />
                    )}
                  </View>
                ) : item.status === "failed" ? (
                  <>
                    <Copy>{t("deleteFailed")}</Copy>
                    <Action
                      secondary
                      title={t("retry")}
                      onPress={() =>
                        void queue
                          .retry(item.id)
                          .then(refreshItems)
                          .catch(setError)
                      }
                    />
                    <Action
                      secondary
                      title={t("undo")}
                      onPress={() =>
                        void queue
                          .restore(item.id)
                          .then(refreshItems)
                          .catch(setError)
                      }
                    />
                  </>
                ) : (
                  <Copy muted>{t("deletePending")}</Copy>
                )}
              </View>
            ))}
            <Feedback error={error} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Context.Provider>
  );
}
