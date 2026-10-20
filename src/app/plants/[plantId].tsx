import { useState } from "react";
import { ScrollView, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlantDetail } from "@plantopedia/contracts";
import { z } from "zod";
import {
  Screen,
  Copy,
  Action,
  Card,
  Field,
  Feedback,
  Disclosure,
  ConfirmDialog,
  SectionHeader,
  styles,
} from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { AppIcon, IconBadge } from "../../components/AppIcon";
import { IdentificationPanel } from "../../features/identification/IdentificationPanel";
import { RequestError } from "../../services/api";
import { PrivatePhoto } from "../../components/PrivatePhoto";
import { useSessionApi } from "../../services/session";
import { local } from "../../services/local";
import { usePreferences } from "../../theme/preferences";
export default function PlantProfile() {
  const { plantId: id } = useLocalSearchParams<{ plantId: string }>();
  const { api, owner } = useSessionApi();
  const { t, preferences, colors } = usePreferences();
  const router = useRouter();
  const query = useQueryClient();
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [noteAttempt, setNoteAttempt] = useState(() => ({
    id: randomUUID(),
    capturedAt: new Date().toISOString(),
  }));
  const detail = useQuery({
    queryKey: [owner, "plant", id],
    queryFn: async () => {
      try {
        const result = await api.plant(id);
        await local.cache(owner, result);
        return result;
      } catch (error) {
        if (error instanceof RequestError) {
          if ([404, 410].includes(error.status))
            await local.reconcileDeleted(owner, id);
          throw error;
        }
        const cached = PlantDetail.safeParse(await local.cached(owner, id));
        if (cached.success) return cached.data;
        throw error;
      }
    },
  });
  const add = useMutation({
    mutationFn: () =>
      api.observe(id, { ...noteAttempt, text: note }, noteAttempt.id),
    onSuccess: () => {
      setNote("");
      setNoteOpen(false);
      setNoteAttempt({
        id: randomUUID(),
        capturedAt: new Date().toISOString(),
      });
      return query.invalidateQueries({ queryKey: [owner, "plant", id] });
    },
  });
  const talk = useMutation({
    mutationFn: async () => {
      const conversation = await api.startConversation(
        {
          id: randomUUID(),
          plantId: id,
          photoId: selected ?? detail.data?.plant.coverPhotoId ?? null,
          locale: preferences.locale,
        },
        randomUUID(),
      );
      router.push({
        pathname: "/ask",
        params: { conversationId: conversation.id },
      });
    },
  });
  const data = detail.data;
  const observations =
    data?.observations
      .slice()
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)) ?? [];
  return (
    <Screen>
      <PageHeader title={data?.plant.nickname ?? t("plants")} back />
      <Feedback loading={detail.isPending} error={detail.error} />
      {detail.isError && (
        <Action
          secondary
          icon="refresh"
          title={t("tryAgain")}
          busy={detail.isFetching}
          onPress={() => void detail.refetch()}
        />
      )}
      {data && (
        <>
          <View style={styles.inline}>
            <AppIcon
              name={
                data.plant.ownership === "owned"
                  ? "heart-outline"
                  : "compass-outline"
              }
              size={20}
              color={colors.primary}
            />
            <Copy muted>
              {t(data.plant.ownership)}
              {data.plant.place ? ` · ${data.plant.place}` : ""}
            </Copy>
          </View>
          {Boolean(selected ?? data.plant.coverPhotoId) && (
            <View
              style={{
                height: 260,
                backgroundColor: colors.muted,
                borderRadius: 26,
                overflow: "hidden",
              }}
            >
              <PrivatePhoto
                plantId={id}
                photoId={selected ?? data.plant.coverPhotoId ?? ""}
                resizeMode="contain"
                style={{ height: 260, borderRadius: 26 }}
              />
            </View>
          )}
          {data.photos.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {data.photos.map((photo, index) => (
                <Pressable
                  key={photo.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("viewPhoto")} ${index + 1}`}
                  accessibilityState={{
                    selected:
                      photo.id === (selected ?? data.plant.coverPhotoId),
                  }}
                  onPress={() => setSelected(photo.id)}
                  style={({ pressed }) => ({
                    borderWidth: 3,
                    borderColor:
                      photo.id === (selected ?? data.plant.coverPhotoId)
                        ? colors.primary
                        : colors.border,
                    borderRadius: 18,
                    padding: 3,
                    width: 80,
                    minHeight: 96,
                    gap: 3,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <PrivatePhoto
                    plantId={id}
                    photoId={photo.id}
                    style={{ width: 68, height: 60, borderRadius: 12 }}
                  />
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    {t("photoShort")} {index + 1}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <IdentificationPanel
            key={`${owner}/${id}`}
            data={data}
            focusedPhotoId={selected ?? data.plant.coverPhotoId}
            onPhotoFocus={setSelected}
          />
          <Action
            title={t("ask")}
            icon="chatbubbles"
            busy={talk.isPending}
            onPress={() => talk.mutate()}
          />
          <Feedback error={talk.error} />
          <Card>
            <Disclosure
              title={t("addNote")}
              icon="create-outline"
              open={noteOpen}
              onChange={setNoteOpen}
            >
              <Field
                multiline
                placeholder={t("note")}
                value={note}
                onChangeText={(value) => {
                  setNote(value);
                  if (add.isError) {
                    add.reset();
                    setNoteAttempt({
                      id: randomUUID(),
                      capturedAt: new Date().toISOString(),
                    });
                  }
                }}
                editable={!add.isPending}
              />
              <Action
                title={t("saveObservation")}
                icon="checkmark"
                disabled={!note.trim()}
                busy={add.isPending}
                onPress={() => add.mutate()}
              />
              <Feedback error={add.error} />
            </Disclosure>
          </Card>
          <SectionHeader title={t("timeline")} />
          {observations.length === 0 && (
            <Card>
              <IconBadge name="journal-outline" />
              <Copy>{t("noObservations")}</Copy>
              <Copy muted>{t("observationIntro")}</Copy>
            </Card>
          )}
          {observations.slice(0, showAll ? undefined : 3).map((observation) => (
            <Card key={observation.id} style={{ padding: 16 }}>
              <View style={styles.inline}>
                <AppIcon
                  name="time-outline"
                  size={18}
                  color={colors.secondary}
                />
                <Copy muted>
                  {new Intl.DateTimeFormat(preferences.locale, {
                    dateStyle: "medium",
                  }).format(new Date(observation.capturedAt))}
                </Copy>
              </View>
              <Copy>{observation.text || t("photo")}</Copy>
            </Card>
          ))}
          {observations.length > 3 && (
            <Action
              secondary
              icon={showAll ? "chevron-up" : "chevron-down"}
              title={`${t(showAll ? "showLess" : "showMore")} (${observations.length})`}
              onPress={() => setShowAll((value) => !value)}
            />
          )}
          <Disclosure title={t("moreOptions")} icon="ellipsis-horizontal">
            <Action
              destructive
              icon="trash-outline"
              title={t("remove")}
              onPress={() => setDeleting(true)}
            />
          </Disclosure>
        </>
      )}
      <ConfirmDialog
        visible={deleting}
        title={t("remove")}
        message={t("deleteWarning")}
        confirmLabel={t("remove")}
        destructive
        onCancel={() => setDeleting(false)}
        onConfirm={async () => {
          await api.request(
            `/plants/${id}`,
            z.object({ deleted: z.boolean() }),
            { method: "DELETE" },
          );
          await local.purge(owner, id);
          await query.invalidateQueries({ queryKey: [owner] });
          router.replace("/plants");
        }}
      />
    </Screen>
  );
}
