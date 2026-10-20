import { useEffect, useRef, useState, useCallback } from "react";
import { Image, Platform, View } from "react-native";
import { ZodError } from "zod";
import { RequestError } from "../../services/api";
import { collectionHistory } from "../../services/collection-history";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { useRouter, useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Screen,
  Copy,
  Action,
  Card,
  Field,
  Disclosure,
  Chip,
  styles,
} from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { IconBadge } from "../../components/AppIcon";
import { CaptureSteps } from "./CaptureSteps";
import { usePreferences } from "../../theme/preferences";
import { useSessionApi } from "../../services/session";
import { local, type Draft } from "../../services/local";
import { syncDraft } from "../../services/outbox";
import { prepareImage } from "./prepare";
import { resumeDraftPhoto } from "./resume";
export function CaptureScreen() {
  const { t, preferences } = usePreferences();
  const { api, owner } = useSessionApi();
  const router = useRouter();
  const query = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const mounted = useRef(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const capturing = useRef(false);
  const saving = useRef(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [errorStep, setErrorStep] = useState<"photo" | "save">("photo");
  useFocusEffect(
    useCallback(
      () => () => {
        setCameraOpen(false);
      },
      [],
    ),
  );
  useEffect(() => {
    mounted.current = true;
    void local
      .drafts(owner)
      .then((values) =>
        setDrafts(values.filter((item) => item.stage !== "complete")),
      );
    return () => {
      mounted.current = false;
    };
  }, [owner]);
  async function accept(uri: string, width: number, height: number) {
    setCameraOpen(false);
    setBusy(true);
    setError(null);
    setErrorStep("photo");
    try {
      const id = randomUUID();
      const original = await local.retain(owner, id, uri);
      let next: Draft = {
        id,
        owner,
        observationId: randomUUID(),
        photoId: randomUUID(),
        capturedAt: new Date().toISOString(),
        original,
        width,
        height,
        derivative: null,
        nickname: "",
        place: "",
        text: "",
        ownership: "observed",
        stage: "draft",
        failure: null,
      };
      await local.save(next);
      if (mounted.current) {
        setDraft(next);
        setDrafts((items) => [
          ...items.filter((item) => item.id !== next.id),
          next,
        ]);
      }
      const derivative = await prepareImage(original);
      next = { ...next, derivative };
      await local.save(next);
      if (mounted.current) {
        setDraft(next);
        setDrafts((items) => [
          ...items.filter((item) => item.id !== next.id),
          next,
        ]);
      }
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  async function capture() {
    if (capturing.current || !cameraReady) return;
    capturing.current = true;
    setBusy(true);
    setError(null);
    setErrorStep("photo");
    try {
      const view = camera.current;
      if (!view) throw new Error("camera_not_ready");
      const image = await view.takePictureAsync({ quality: 1, exif: false });
      if (!image) throw new Error("capture_failed");
      await accept(image.uri, image.width, image.height);
    } catch (failure) {
      if (mounted.current) setError(failure);
    } finally {
      capturing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function openCamera() {
    setCameraReady(false);
    setCameraOpen(true);
  }
  async function gallery() {
    const selected = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      exif: false,
    });
    const image = selected.assets?.[0];
    if (!selected.canceled && image)
      await accept(image.uri, image.width, image.height);
  }
  function update(
    changes: Partial<Pick<Draft, "nickname" | "place" | "text" | "ownership">>,
  ) {
    if (!draft || busy || draft.submittedAt || draft.stage !== "draft") return;
    const next = { ...draft, ...changes };
    setDraft(next);
    void local.save(next).catch(setError);
  }
  async function save() {
    if (!draft || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    setErrorStep("save");
    try {
      const ready = await resumeDraftPhoto(api, draft);
      await local.save(ready);
      setDraft(ready);
      const result = await syncDraft(
        api,
        ready,
        preferences.locale,
        () => mounted.current,
      );
      void collectionHistory.write(owner, true).catch(() => undefined);
      await query.invalidateQueries({ queryKey: [owner, "plants"] });
      if (mounted.current) {
        setDraft(null);
        setDrafts((items) => items.filter((item) => item.id !== draft.id));
        router.push(`/plants/${result.id}`);
      }
    } catch (failure) {
      setError(failure);
      // A storage read failure must not escape the retry handler or hide the
      // in-memory draft. The original failure remains visible.
      const pending = await local.drafts(owner).catch(() => null);
      if (pending && mounted.current) {
        setDrafts(pending.filter((item) => item.stage !== "complete"));
        const current = pending.find((item) => item.id === draft.id);
        if (current) setDraft(current);
      }
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Screen>
      <PageHeader
        title={t(draft ? "detailsStep" : "capture")}
        subtitle={!draft && !cameraOpen ? t("scanIntro") : undefined}
      />
      <CaptureSteps step={draft ? 1 : 0} />
      {draft && Platform.OS === "web" && (
        <Copy muted>{t("browserDraftNotice")}</Copy>
      )}
      {cameraOpen && permission?.granted ? (
        <>
          <CameraView
            ref={camera}
            style={{ height: 320, borderRadius: 24, overflow: "hidden" }}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
            onMountError={() => {
              setCameraReady(false);
              setCameraOpen(false);
              setError(new Error("camera_unavailable"));
              setErrorStep("photo");
            }}
          />
          <Action
            icon="camera"
            title={t("shutter")}
            busy={busy}
            disabled={!cameraReady}
            onPress={() => void capture()}
          />
          <Action
            secondary
            title={t("cancel")}
            onPress={() => setCameraOpen(false)}
          />
        </>
      ) : draft ? (
        <Card>
          <Image
            accessibilityLabel={t("photo")}
            source={{ uri: draft.original }}
            resizeMode="contain"
            style={[styles.photo, { height: 210 }]}
          />
          <Copy muted>
            {t(
              draft.stage === "draft" && !draft.submittedAt
                ? "draft"
                : "pending",
            )}
          </Copy>
          <Field
            editable={!busy && !draft.submittedAt && draft.stage === "draft"}
            placeholder={t("nickname")}
            value={draft.nickname}
            onChangeText={(nickname) => update({ nickname })}
          />
          <View style={styles.row}>
            {(["observed", "owned"] as const).map((ownership) => (
              <Chip
                key={ownership}
                icon={
                  ownership === "owned" ? "heart-outline" : "compass-outline"
                }
                selected={draft.ownership === ownership}
                disabled={
                  busy || !!draft.submittedAt || draft.stage !== "draft"
                }
                title={t(ownership)}
                onPress={() => update({ ownership })}
              />
            ))}
          </View>
          <Disclosure
            title={t("optionalDetails")}
            icon="create-outline"
            initiallyOpen={Boolean(draft.place || draft.text)}
          >
            <Field
              editable={!busy && !draft.submittedAt && draft.stage === "draft"}
              placeholder={t("place")}
              value={draft.place}
              onChangeText={(place) => update({ place })}
            />
            <Field
              editable={!busy && !draft.submittedAt && draft.stage === "draft"}
              multiline
              placeholder={t("note")}
              value={draft.text}
              onChangeText={(text) => update({ text })}
            />
          </Disclosure>
          <Copy muted>{t("saveNext")}</Copy>
          <Action
            icon="checkmark-circle-outline"
            title={t(
              draft.stage === "draft" && !draft.submittedAt ? "save" : "retry",
            )}
            busy={busy}
            disabled={
              !draft.nickname.trim() || draft.failure === "record_deleted"
            }
            onPress={() => {
              void save();
            }}
          />
          {draft.failure === "record_deleted" && (
            <Copy>{t("deletedDraft")}</Copy>
          )}
          <Action
            secondary
            disabled={busy}
            icon="bookmark-outline"
            title={t("keepDraft")}
            onPress={() => {
              void local
                .drafts(owner)
                .then((items) => {
                  setDrafts(items.filter((item) => item.stage !== "complete"));
                  setDraft(null);
                  setError(null);
                })
                .catch(setError);
            }}
          />
        </Card>
      ) : (
        <>
          <Card style={{ alignItems: "center", paddingVertical: 30 }}>
            <IconBadge name="scan" size={92} />
            <Copy muted>{t("scanTip")}</Copy>
          </Card>
          <Action
            icon="camera"
            title={t("capture")}
            onPress={() => {
              setErrorStep("photo");
              if (permission?.granted) openCamera();
              else
                void requestPermission()
                  .then((result) => {
                    if (result.granted) openCamera();
                  })
                  .catch(setError);
            }}
          />
          <Action
            secondary
            icon="images-outline"
            title={t("gallery")}
            onPress={() => {
              setErrorStep("photo");
              void gallery().catch(setError);
            }}
          />
          {permission && !permission.granted && (
            <Copy muted>{t("permission")}</Copy>
          )}
          {drafts.length > 0 && <Copy large>{t("localDrafts")}</Copy>}
          {drafts.map((item) => (
            <Action
              secondary
              key={item.id}
              icon="bookmark-outline"
              title={item.nickname || t("draft")}
              onPress={() => setDraft(item)}
            />
          ))}
        </>
      )}
      <Disclosure title={t("photoPrivacy")} icon="shield-checkmark-outline">
        <Copy muted>
          {t(Platform.OS === "web" ? "webPhotoPrivacy" : "privacy")}
        </Copy>
      </Disclosure>
      {error ? (
        <View accessibilityLiveRegion="polite">
          <Copy>
            {t(
              error instanceof ZodError ||
                (error instanceof RequestError &&
                  error.code === "invalid_plant_input")
                ? "captureInvalid"
                : error instanceof RequestError &&
                    error.code === "phone_api_unreachable"
                  ? "capturePhoneApiError"
                  : errorStep === "photo" || !draft?.derivative
                    ? "capturePhotoError"
                    : error instanceof RequestError && error.status === 401
                      ? "captureAuthError"
                      : error instanceof RequestError && error.status === 503
                        ? "captureServiceError"
                        : "captureSaveError",
            )}
          </Copy>
          {draft && (
            <Copy muted>
              {t(Platform.OS === "web" ? "webDraftRecovery" : "draftRecovery")}
            </Copy>
          )}
        </View>
      ) : null}
    </Screen>
  );
}
