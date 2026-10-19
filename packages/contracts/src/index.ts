import { z } from "zod";

export const Id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
export const IsoDate = z.iso.datetime({ offset: true });
export const Locale = z.enum(["en", "fr", "es", "de", "zh-Hans", "ja", "ko"]);
export type Locale = z.infer<typeof Locale>;
export const Theme = z.enum(["light", "dark", "system"]);
export const Ownership = z.enum(["observed", "owned"]);
export const Organ = z.enum(["auto", "leaf", "flower", "fruit", "bark"]);
export const VoiceSettings = z
  .object({
    voice: z
      .enum(["marin", "coral", "shimmer", "cedar", "ash", "ballad"])
      .default("marin"),
    turnTaking: z.enum(["patient", "balanced", "quick"]).default("balanced"),
    interruption: z
      .enum(["easy", "balanced", "firm", "off"])
      .default("balanced"),
    microphone: z.enum(["headset", "speaker", "busy"]).default("headset"),
    pace: z.enum(["relaxed", "normal", "brisk"]).default("normal"),
    delivery: z.enum(["calm", "expressive"]).default("calm"),
    ambience: z.enum(["off", "rain", "breeze"]).default("off"),
  })
  .strict();
export type VoiceSettings = z.infer<typeof VoiceSettings>;
export const defaultVoiceSettings = VoiceSettings.parse({});
export const Preferences = z
  .object({
    theme: Theme,
    locale: Locale,
    retainTranscripts: z.boolean(),
    voice: VoiceSettings.default(defaultVoiceSettings),
  })
  .strict();
export type Preferences = z.infer<typeof Preferences>;
export const defaultPreferences: Preferences = {
  theme: "light",
  locale: "en",
  retainTranscripts: true,
  voice: defaultVoiceSettings,
};
const versioned = {
  id: Id,
  schemaVersion: z.literal(1),
  revision: z.number().int().positive(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
};
export const Source = z.object({
  id: Id,
  title: z.string(),
  url: z.url().refine((value) => /^https?:\/\//.test(value)),
  retrievedAt: IsoDate,
  excerpt: z.string().max(2000),
});
export type Source = z.infer<typeof Source>;
export const Candidate = z.object({
  scientificName: z.string().min(1),
  authorship: z.string(),
  commonNames: z.array(z.string()),
  score: z.number().finite().min(0).max(1),
  taxonId: z.string().nullable(),
});
export type Candidate = z.infer<typeof Candidate>;
export const Plant = z.object({
  ...versioned,
  nickname: z.string().trim().min(1).max(120),
  ownership: Ownership,
  lifecycle: z.enum(["draft", "saved"]),
  verification: z.enum(["uncertain", "user_confirmed", "user_corrected"]),
  scientificName: z.string().nullable(),
  commonName: z.string().nullable(),
  coverPhotoId: Id.nullable(),
  place: z.string().max(200),
  identificationId: Id.nullable(),
});
export type Plant = z.infer<typeof Plant>;
export const Observation = z.object({
  ...versioned,
  plantId: Id,
  text: z.string().max(8000),
  capturedAt: IsoDate,
  kind: z.enum(["user_observation", "care_event"]),
});
export type Observation = z.infer<typeof Observation>;
export const Photo = z.object({
  ...versioned,
  plantId: Id,
  observationId: Id,
  mime: z.enum(["image/jpeg", "image/png"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
  hash: z.string(),
  capturedAt: IsoDate,
});
export type Photo = z.infer<typeof Photo>;
export const Identification = z.object({
  ...versioned,
  plantId: Id,
  photoIds: z.array(Id).min(1).max(5),
  candidates: z.array(Candidate).max(5),
  provider: z.literal("plantnet"),
  providerVersion: z.string(),
  status: z.enum(["ready", "no_match"]),
  needsMoreEvidence: z.boolean(),
  language: z.string(),
});
export type Identification = z.infer<typeof Identification>;
export const IdentificationSelection = z.object({
  ...versioned,
  plantId: Id,
  identificationId: Id,
  scientificName: z.string().min(1),
  candidateIndex: z.number().int().nonnegative().nullable(),
  supersedesRevision: z.number().int().positive(),
  verification: z.enum(["user_confirmed", "user_corrected"]),
});
export const Conversation = z.object({
  ...versioned,
  title: z.string().max(160),
  plantId: Id.nullable(),
  photoId: Id.nullable(),
  locale: Locale,
});
export type Conversation = z.infer<typeof Conversation>;
export const Message = z.object({
  ...versioned,
  conversationId: Id,
  role: z.enum(["user", "assistant"]),
  text: z.string().max(16000),
  sources: z.array(Source),
  evidence: z.array(
    z.object({
      plantId: Id,
      observationId: Id.nullable(),
      photoId: Id.nullable(),
      plantRevision: z.number().int().positive().optional(),
      observationRevision: z.number().int().positive().optional(),
      photoRevision: z.number().int().positive().optional(),
    }),
  ),
  transport: z.enum(["text", "voice"]),
  delivery: z.enum(["complete", "fragment", "interrupted", "unknown"]),
});
export type Message = z.infer<typeof Message>;
export const ObservationAction = z
  .object({
    type: z.literal("observation"),
    plantId: Id,
    text: z.string().trim().min(1).max(8000),
  })
  .strict();
export const TaskAction = z
  .object({
    type: z.literal("task"),
    plantId: Id,
    title: z.string().trim().min(1).max(160),
    dueAt: IsoDate,
    timezone: z.string().min(1).max(100),
    recurrence: z.enum(["none", "daily", "weekly"]),
  })
  .strict();
export const Action = z.discriminatedUnion("type", [
  ObservationAction,
  TaskAction,
]);
export type Action = z.infer<typeof Action>;
export const Proposal = z.object({
  ...versioned,
  conversationId: Id,
  action: Action,
  plantRevision: z.number().int().positive(),
  operationId: Id,
  expiresAt: IsoDate,
  status: z.enum(["pending", "confirmed", "canceled"]),
  resultId: Id.nullable(),
});
export type Proposal = z.infer<typeof Proposal>;
export const Task = z.object({
  ...versioned,
  plantId: Id,
  title: z.string(),
  dueAt: IsoDate,
  timezone: z.string(),
  recurrence: z.enum(["none", "daily", "weekly"]),
  status: z.enum(["pending", "completed", "skipped"]),
});
export type Task = z.infer<typeof Task>;
export const MemoryItem = z.object({
  ...versioned,
  plantId: Id.nullable(),
  text: z.string().max(8000),
  kind: z.enum(["user_fact", "botanical_fact", "conversation_summary"]),
  sources: z.array(
    z.object({ path: z.string(), revision: z.number().int().positive() }),
  ),
  excluded: z.boolean(),
});
export type MemoryItem = z.infer<typeof MemoryItem>;
export const PlantDetail = z.object({
  plant: Plant,
  observations: z.array(Observation),
  photos: z.array(Photo),
  identifications: z.array(Identification),
  selections: z.array(IdentificationSelection).default([]),
});
export type PlantDetail = z.infer<typeof PlantDetail>;
export const CreatePlant = z.object({
  id: Id,
  nickname: z.string().trim().min(1).max(120),
  ownership: Ownership,
  place: z.string().trim().max(200).default(""),
  capturedAt: IsoDate,
});
export const EditPlant = z
  .object({
    revision: z.number().int().positive(),
    nickname: z.string().trim().min(1).max(120).optional(),
    ownership: Ownership.optional(),
    place: z.string().max(200).optional(),
    lifecycle: z.enum(["draft", "saved"]).optional(),
  })
  .strict();
export const CreateObservation = z
  .object({ id: Id, text: z.string().trim().max(8000), capturedAt: IsoDate })
  .strict();
export const Identify = z
  .object({
    photoIds: z.array(Id).min(1).max(5),
    organs: z.array(Organ).min(1).max(5),
    locale: Locale,
  })
  .strict()
  .refine((value) => value.photoIds.length === value.organs.length, {
    message: "Image and organ counts must match",
  });
export const SelectIdentification = z
  .object({
    revision: z.number().int().positive(),
    identificationId: Id,
    candidateIndex: z.number().int().nonnegative().nullable(),
    scientificName: z.string().trim().min(1).max(200).optional(),
  })
  .strict();
export const StartConversation = z
  .object({
    id: Id,
    plantId: Id.nullable(),
    photoId: Id.nullable(),
    locale: Locale,
  })
  .strict();
export const SendMessage = z
  .object({ id: Id, text: z.string().trim().min(1).max(8000), locale: Locale })
  .strict();
export const StartVoiceTurn = z
  .object({
    id: Id,
    conversationId: Id,
    locale: Locale,
    // Signed 16-bit little-endian, 24 kHz mono; at most 30 seconds.
    audioBase64: z
      .string()
      .min(16000)
      .max(1920000)
      .regex(
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
      ),
  })
  .strict();
export const VoiceTurn = z.discriminatedUnion("status", [
  z.object({ id: Id, status: z.literal("processing") }),
  z.object({
    id: Id,
    status: z.literal("complete"),
    userText: z.string().max(8000),
    text: z.string().max(16000),
    audioBase64: z.string().max(4000000),
  }),
  z.object({ id: Id, status: z.literal("failed"), code: z.string() }),
  z.object({ id: Id, status: z.literal("cancelled") }),
]);
export type VoiceTurn = z.infer<typeof VoiceTurn>;
export const Search = z
  .object({
    query: z.string().trim().max(500),
    ownership: Ownership.optional(),
    before: IsoDate.optional(),
    after: IsoDate.optional(),
    limit: z.number().int().min(1).max(50).default(20),
    cursor: Id.optional(),
  })
  .strict();
export const PlantPage = z.object({
  items: z.array(Plant),
  nextCursor: Id.nullable(),
  limited: z.boolean(),
});
export type PlantPage = z.infer<typeof PlantPage>;
export const SyncStatus = z
  .object({
    records: z
      .array(
        z
          .object({
            type: z.enum(["plant", "photo", "task", "conversation"]),
            id: Id,
            plantId: Id.optional(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export const ApiError = z.object({
  code: z.string(),
  messageKey: z.string(),
  retryable: z.boolean(),
  requestId: z.string(),
});
export type ApiError = z.infer<typeof ApiError>;
export const MessageResult = z.object({
  user: Message,
  assistant: Message,
  proposals: z.array(Proposal),
});
export type MessageResult = z.infer<typeof MessageResult>;
export const ProposalResult = z.object({ proposal: Proposal, resultId: Id });
export function lowEvidence(candidates: readonly Candidate[]): boolean {
  const first = candidates[0];
  const second = candidates[1];
  return (
    !first ||
    first.score < 0.6 ||
    (second !== undefined && first.score - second.score < 0.15)
  );
}
export function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().trim();
}
export function providerLanguage(locale: Locale): string {
  return {
    en: "en",
    fr: "fr",
    es: "es",
    de: "de",
    "zh-Hans": "zh",
    ja: "ja",
    ko: "en",
  }[locale];
}

// PCM is mono, signed little-endian 16 bit, 24 kHz. No provider events or tools
// supplied by a client are accepted by the relay.
export const VoiceClientEvent = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("audio"),
      data: z
        .string()
        .min(4)
        .max(32000)
        .regex(/^[A-Za-z0-9+/]+={0,2}$/),
    })
    .strict(),
  z.object({ type: z.literal("mute"), muted: z.boolean() }).strict(),
  z
    .object({
      type: z.literal("played"),
      itemId: z.string().min(1).max(160),
      ms: z.number().int().min(0).max(120000),
      interrupted: z.boolean(),
    })
    .strict(),
  z.object({ type: z.literal("interrupt") }).strict(),
  z.object({ type: z.literal("stop") }).strict(),
]);
export type VoiceClientEvent = z.infer<typeof VoiceClientEvent>;
export const VoiceServerEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("duck"), active: z.boolean() }),
  z.object({
    type: z.literal("activity"),
    state: z.enum(["listening", "hearing", "thinking"]),
  }),
  z.object({ type: z.literal("audio"), itemId: z.string(), data: z.string() }),
  z.object({ type: z.literal("audio_done"), itemId: z.string() }),
  z.object({
    type: z.literal("interrupt"),
    itemId: z.string().nullable(),
    itemIds: z.array(z.string()).max(16).optional(),
  }),
  z.object({
    type: z.literal("caption"),
    role: z.enum(["user", "assistant"]),
    text: z.string(),
  }),
  z.object({ type: z.literal("completed"), id: z.string() }),
  z.object({
    type: z.literal("notice"),
    code: z.enum([
      "voice_transcript_unavailable",
      "voice_reply_incomplete",
      "voice_no_speech",
      "voice_history_unavailable",
      "voice_context_unavailable",
    ]),
  }),
  z.object({ type: z.literal("error"), code: z.string() }),
]);
export type VoiceServerEvent = z.infer<typeof VoiceServerEvent>;
