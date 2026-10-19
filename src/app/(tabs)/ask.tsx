import { useState, useRef, useCallback } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { Proposal, type Locale } from "@plantopedia/contracts";
import {
  Screen,
  Copy,
  Action,
  Card,
  Field,
  Feedback,
  styles,
  Disclosure,
  IconButton,
  ConfirmDialog,
  SectionHeader,
} from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { AppIcon, IconBadge } from "../../components/AppIcon";
import { GlassSurface } from "../../theme/GlassSurface";
import { PrivatePhoto } from "../../components/PrivatePhoto";
import { MessageContent } from "../../components/MessageContent";
import { VoiceDock } from "../../components/VoiceDock";
import { useSessionApi } from "../../services/session";
import { useReducedMotion } from "../../theme/use-reduced-motion";
import { usePreferences } from "../../theme/preferences";
export default function Ask() {
  const { conversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();
  return (
    <AskConversation
      key={conversationId ?? "general"}
      routeId={conversationId ?? null}
    />
  );
}
function AskConversation({ routeId }: { routeId: string | null }) {
  const { api, owner, voice } = useSessionApi();
  const { t, preferences, colors } = usePreferences();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const query = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(
    routeId ?? null,
  );
  const [text, setText] = useState("");
  const [messageId, setMessageId] = useState(randomUUID);
  const submitted = useRef<{ id: string; text: string; locale: Locale } | null>(
    null,
  );
  const chatDraft = useRef<{ id: string; locale: Locale } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);
  const [autoRecord, setAutoRecord] = useState(false);
  const consumeVoiceStart = useCallback(() => setAutoRecord(false), []);
  const scroll = useRef<ScrollView>(null);
  const textDrafts = useRef(new Map<string, string>());
  const conversations = useQuery({
    queryKey: [owner, "conversations"],
    queryFn: api.conversations,
  });
  const messages = useQuery({
    queryKey: [owner, "messages", conversationId],
    queryFn: () => api.messages(conversationId ?? ""),
    enabled: !!conversationId,
    refetchInterval: conversationId ? 5000 : false,
  });
  const proposals = useQuery({
    queryKey: [owner, "proposals", conversationId],
    queryFn: () => api.proposals(conversationId ?? ""),
    enabled: !!conversationId,
    refetchInterval: conversationId ? 3000 : false,
  });
  async function ensureConversation() {
    if (conversationId) return conversationId;
    chatDraft.current ??= { id: randomUUID(), locale: preferences.locale };
    const created = await api.startConversation(
      {
        id: chatDraft.current.id,
        plantId: null,
        photoId: null,
        locale: chatDraft.current.locale,
      },
      `chat_${chatDraft.current.id}`,
    );
    setConversationId(created.id);
    void query.invalidateQueries({ queryKey: [owner, "conversations"] });
    return created.id;
  }
  const beginVoice = useMutation({
    mutationFn: ensureConversation,
    onSuccess: () => setAutoRecord(true),
    onError: () => {
      void voice?.transport.disconnect();
    },
  });
  const send = useMutation({
    mutationFn: async () => {
      const id = await ensureConversation();
      submitted.current ??= { id: messageId, text, locale: preferences.locale };
      return api.send(id, submitted.current, submitted.current.id);
    },
    onSuccess: async () => {
      setText("");
      setMessageId(randomUUID());
      submitted.current = null;
      await query.invalidateQueries({ queryKey: [owner] });
    },
  });
  async function decide(id: string, action: "confirm" | "cancel") {
    try {
      await api.request(`/action-proposals/${id}/${action}`, Proposal, {
        method: "POST",
        key: randomUUID(),
      });
      await query.invalidateQueries({ queryKey: [owner] });
    } catch (failure) {
      setError(failure);
    }
  }
  const current = conversations.data?.find(
    (item) => item.id === conversationId,
  );
  function newConversation() {
    textDrafts.current.set(conversationId ?? "general", text);
    setConversationId(null);
    setText("");
    setMessageId(randomUUID());
    submitted.current = null;
    chatDraft.current = null;
    send.reset();
    beginVoice.reset();
    setError(null);
    setHistoryOpen(false);
    setAutoRecord(false);
  }
  const busy = send.isPending || beginVoice.isPending;
  return (
    <Screen scrollRef={scroll}>
      <PageHeader
        title={t("ask")}
        actions={
          <IconButton
            icon="time-outline"
            label={t("history")}
            expanded={historyOpen}
            onPress={() => setHistoryOpen((value) => !value)}
          />
        }
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Action
          secondary
          compact
          icon="add"
          title={t("newChat")}
          disabled={busy}
          onPress={newConversation}
        />
        {!!conversationId && (
          <IconButton
            icon="arrow-down"
            label={t("jumpLatest")}
            onPress={() =>
              scroll.current?.scrollToEnd({ animated: !reducedMotion })
            }
          />
        )}
      </View>
      {historyOpen && (
        <Card>
          <SectionHeader title={t("history")} />
          <Feedback
            loading={conversations.isPending}
            error={conversations.error}
          />
          {conversations.isError && (
            <Action
              secondary
              icon="refresh"
              title={t("tryAgain")}
              onPress={() => void conversations.refetch()}
            />
          )}
          {conversations.data?.map((item) => (
            <Action
              key={item.id}
              secondary
              compact
              icon="chatbubble-outline"
              selected={item.id === conversationId}
              title={item.title}
              disabled={busy}
              onPress={() => {
                textDrafts.current.set(conversationId ?? "general", text);
                setConversationId(item.id);
                setText(textDrafts.current.get(item.id) ?? "");
                setMessageId(randomUUID());
                submitted.current = null;
                send.reset();
                setError(null);
                setHistoryOpen(false);
                setAutoRecord(false);
              }}
            />
          ))}
        </Card>
      )}
      {current?.plantId && (
        <Card style={{ padding: 14 }}>
          <View style={styles.inline}>
            {!!current.photoId && (
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: colors.muted,
                }}
              >
                <PrivatePhoto
                  plantId={current.plantId}
                  photoId={current.photoId}
                  style={{ width: 58, height: 58, borderRadius: 16 }}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Copy muted>{t("talking")}</Copy>
              <SectionHeader title={current.title} />
            </View>
            <IconButton
              icon="arrow-forward"
              label={t("details")}
              onPress={() => router.push(`/plants/${current.plantId}`)}
            />
          </View>
        </Card>
      )}
      {!conversationId && (
        <Card>
          <IconBadge name="chatbubbles" tone="water" size={60} />
          <Copy large>{t("chatWelcome")}</Copy>
          <Copy muted>{t("chatIntro")}</Copy>
          {(["promptCare", "promptRecall", "promptExplore"] as const).map(
            (prompt, index) => (
              <Action
                key={prompt}
                secondary
                icon={
                  index === 0
                    ? "heart-outline"
                    : index === 1
                      ? "leaf-outline"
                      : "trail-sign-outline"
                }
                title={t(prompt)}
                onPress={() => setText(t(prompt))}
              />
            ),
          )}
        </Card>
      )}
      <Feedback
        error={error ?? messages.error ?? send.error ?? beginVoice.error}
        loading={messages.isPending && !!conversationId}
      />
      {messages.data?.map((message) => (
        <Card
          key={message.id}
          style={{
            backgroundColor:
              message.role === "user" ? colors.muted : colors.surface,
            alignSelf: message.role === "user" ? "flex-end" : "stretch",
            maxWidth: message.role === "user" ? "94%" : "100%",
            padding: 16,
          }}
        >
          <View style={styles.inline}>
            <AppIcon
              name={
                message.role === "assistant" ? "sparkles" : "person-outline"
              }
              size={18}
              color={colors.primary}
            />
            <Text
              style={{
                color: colors.secondary,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {message.role === "assistant" ? "Plantopedia AI" : t("you")}
            </Text>
          </View>
          <MessageContent
            message={message}
            onOpenPlant={(id) => router.push(`/plants/${id}`)}
          />
        </Card>
      ))}
      {proposals.data
        ?.filter((proposal) => proposal.status === "pending")
        .map((proposal) => (
          <Card key={proposal.id}>
            <View style={styles.inline}>
              <IconBadge name="checkmark-done-outline" tone="sun" />
              <SectionHeader title={t("proposed")} />
            </View>
            <Copy>
              {proposal.action.type === "observation"
                ? proposal.action.text
                : `${proposal.action.title} · ${new Intl.DateTimeFormat(preferences.locale, { dateStyle: "medium", timeStyle: "short", timeZone: proposal.action.timezone }).format(new Date(proposal.action.dueAt))}`}
            </Copy>
            <View style={styles.row}>
              <Action
                icon="checkmark"
                title={t("confirm")}
                onPress={() => {
                  void decide(proposal.id, "confirm");
                }}
              />
              <Action
                secondary
                icon="close"
                title={t("cancel")}
                onPress={() => {
                  void decide(proposal.id, "cancel");
                }}
              />
            </View>
          </Card>
        ))}
      <GlassSurface style={{ gap: 10 }}>
        <Field
          multiline
          placeholder={t("composer")}
          value={text}
          onChangeText={setText}
          editable={!busy && !send.isError}
        />
        <Action
          title={t(send.isError ? "retry" : "send")}
          icon={send.isError ? "refresh" : "arrow-up"}
          busy={send.isPending}
          disabled={!text.trim() || beginVoice.isPending}
          onPress={() => send.mutate()}
        />
        {send.isError && (
          <Action
            secondary
            title={t("newAttempt")}
            onPress={() => setRetryOpen(true)}
          />
        )}
      </GlassSurface>
      {conversationId ? (
        <VoiceDock
          key={`${conversationId}/${preferences.locale}`}
          conversationId={conversationId}
          startOnMount={autoRecord}
          onStarted={consumeVoiceStart}
        />
      ) : (
        <Action
          secondary
          icon="mic"
          title={t("startVoice")}
          busy={beginVoice.isPending}
          disabled={send.isPending}
          onPress={() => {
            voice?.transport.prime?.();
            beginVoice.mutate();
          }}
        />
      )}
      <Disclosure title={t("aboutCompanion")} icon="information-circle-outline">
        <Copy muted>{t("ai")}</Copy>
        {!current?.plantId && <Copy muted>{t("noContext")}</Copy>}
      </Disclosure>
      <ConfirmDialog
        visible={retryOpen}
        title={t("newAttempt")}
        message={t("retryCost")}
        confirmLabel={t("confirm")}
        onCancel={() => setRetryOpen(false)}
        onConfirm={async () => {
          submitted.current = null;
          setMessageId(randomUUID());
          send.reset();
        }}
      />
    </Screen>
  );
}
