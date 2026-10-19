import { useEffect, useRef, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useClerk } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { Locale, Preferences } from "@plantopedia/contracts";
import { z } from "zod";
import {
  Screen,
  Copy,
  Action,
  Card,
  Chip,
  Disclosure,
  ConfirmDialog,
  Feedback,
  SectionHeader,
  styles,
} from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { IconBadge } from "../../components/AppIcon";
import { usePreferences } from "../../theme/preferences";
import { useSessionApi } from "../../services/session";
import { local } from "../../services/local";
import { collectionHistory } from "../../services/collection-history";
import { VoiceSettingsCard } from "../../components/VoiceSettingsCard";
const locales: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  "zh-Hans": "简体中文",
  ja: "日本語",
  ko: "한국어",
};
export default function Settings() {
  const { preferences, setPreferences, t, colors } = usePreferences();
  const { api, owner, release } = useSessionApi();
  const { signOut } = useClerk();
  const query = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failedSave, setFailedSave] = useState(false);
  const pending = useRef<Preferences | null>(null);
  const writing = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    let mounted = true;
    const started = revision.current;
    void api
      .request("/me/preferences", Preferences)
      .then((value) => {
        if (mounted && revision.current === started) setPreferences(value);
      })
      .catch((error: unknown) => {
        if (mounted) setError(error);
      });
    return () => {
      mounted = false;
    };
    // setPreferences is recreated by the context; don't refetch after each edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);
  function update(value: Preferences) {
    revision.current++;
    setError(null);
    setSaved(false);
    setFailedSave(false);
    setPreferences(value);
    pending.current = value;
    if (writing.current) return;
    writing.current = true;
    setSaving(true);
    void (async () => {
      try {
        while (pending.current) {
          const next = pending.current;
          pending.current = null;
          try {
            await api.request("/me/preferences", Preferences, {
              method: "PATCH",
              body: next,
            });
            if (!pending.current) setSaved(true);
          } catch (error) {
            if (!pending.current) {
              setError(error);
              setFailedSave(true);
            }
          }
        }
      } finally {
        writing.current = false;
        setSaving(false);
      }
    })();
  }
  async function leave() {
    await release();
    query.clear();
    await signOut();
  }
  return (
    <Screen>
      <PageHeader title={t("settings")} />
      <VoiceSettingsCard
        value={preferences.voice}
        onChange={(voice) => update({ ...preferences, voice })}
      />
      {saving ? (
        <Copy muted>{t("voiceSaving")}</Copy>
      ) : saved ? (
        <Copy muted>{t("voiceSaved")}</Copy>
      ) : null}
      <Feedback error={error} />
      {failedSave && (
        <Action
          secondary
          icon="refresh-outline"
          title={t("voiceSaveRetry")}
          onPress={() => update(preferences)}
        />
      )}
      <Card>
        <View style={styles.inline}>
          <IconBadge name="color-palette-outline" tone="sun" />
          <SectionHeader title={t("appearance")} />
        </View>
        <View style={styles.row}>
          {(["light", "dark", "system"] as const).map((theme) => (
            <Chip
              key={theme}
              selected={preferences.theme === theme}
              icon={
                theme === "light"
                  ? "sunny-outline"
                  : theme === "dark"
                    ? "moon-outline"
                    : "phone-portrait-outline"
              }
              title={t(theme)}
              onPress={() => update({ ...preferences, theme })}
            />
          ))}
        </View>
      </Card>
      <Card>
        <Disclosure
          title={t("language")}
          summary={locales[preferences.locale]}
          icon="language-outline"
        >
          <View style={styles.row}>
            {Locale.options.map((locale) => (
              <Chip
                key={locale}
                selected={preferences.locale === locale}
                title={locales[locale]}
                onPress={() => update({ ...preferences, locale })}
              />
            ))}
          </View>
        </Disclosure>
      </Card>
      <Card>
        <View style={styles.inline}>
          <IconBadge name="shield-checkmark-outline" tone="water" />
          <SectionHeader title={t("privacySettings")} />
        </View>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 23,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            {t("retain")}
          </Text>
          <Switch
            accessibilityLabel={t("retain")}
            value={preferences.retainTranscripts}
            trackColor={{ true: colors.primary }}
            onValueChange={(retainTranscripts) =>
              update({ ...preferences, retainTranscripts })
            }
          />
        </View>
        <Copy muted>{t("retainHelp")}</Copy>
      </Card>
      <Card>
        <SectionHeader title={t("account")} />
        <Action
          secondary
          icon="log-out-outline"
          title={t("signOut")}
          busy={leaving}
          onPress={() => {
            setLeaving(true);
            void leave()
              .catch(setError)
              .finally(() => setLeaving(false));
          }}
        />
        <Disclosure title={t("moreOptions")} icon="ellipsis-horizontal">
          <Action
            destructive
            icon="trash-outline"
            title={t("deleteAccount")}
            onPress={() => setDeleting(true)}
          />
        </Disclosure>
      </Card>
      <ConfirmDialog
        visible={deleting}
        title={t("deleteAccount")}
        message={t("deleteAccountWarning")}
        confirmLabel={t("confirm")}
        destructive
        onCancel={() => setDeleting(false)}
        onConfirm={async () => {
          await api.request("/me", z.object({ deleted: z.boolean() }), {
            method: "DELETE",
          });
          await local.purgeOwner(owner);
          await collectionHistory.clear(owner).catch(() => undefined);
          await leave();
        }}
      />
    </Screen>
  );
}
