import type {
  Candidate,
  Locale,
  Message,
  Source,
  VoiceTurn,
  VoiceSettings,
} from "@plantopedia/contracts";
import type { Auth, Identity } from "../http/identity.js";
import type { Repository, PhotoStorage } from "../storage/repository.js";
export interface IdentificationProvider {
  identify(
    images: readonly { bytes: Buffer; organ: string }[],
    locale: Locale,
  ): Promise<{ candidates: Candidate[]; version: string }>;
}
export interface ResearchProvider {
  search(query: string): Promise<Source[]>;
}
export interface AssistantProvider {
  respond(input: {
    instructions: string;
    history: readonly Message[];
    text: string;
    tools: ToolDefinition[];
    execute: ToolExecutor;
  }): Promise<string>;
  embed(text: string): Promise<number[]>;
  inspect(bytes: Buffer, prompt: string): Promise<string>;
}
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
export type ToolExecutor = (name: string, args: unknown) => Promise<unknown>;
export interface PreparedVoiceTurn {
  voice?: VoiceSettings;
  audioBase64: string;
  instructions: string;
  history: Message[];
  tools: ToolDefinition[];
  execute: ToolExecutor;
  complete: (userText: string, text: string) => Promise<Message[]>;
}
export interface LiveVoiceConnection {
  receive(event: unknown): void;
  close(): void;
}
export interface VoiceProvider {
  connect?(
    auth: Auth,
    prepare: (
      id: string,
      prior: Message[],
      signal: AbortSignal,
    ) => Promise<PreparedVoiceTurn>,
    emit: (event: unknown) => void,
    ended: () => void,
  ): LiveVoiceConnection;

  start(
    auth: Auth,
    input: { id: string; conversationId: string },
    prepare: (
      prior: Message[],
      signal: AbortSignal,
    ) => Promise<PreparedVoiceTurn>,
  ): Promise<VoiceTurn>;
  status(auth: Auth, id: string): Promise<VoiceTurn>;
  close(auth: Auth, id: string): Promise<void>;
  closeUser(uid: string): Promise<void>;
  shutdown(): Promise<void>;
}
export interface Tracer {
  run<T>(kind: string, work: () => Promise<T>): Promise<T>;
  flush(): Promise<void>;
}
export interface Dependencies {
  repository: Repository;
  photos: PhotoStorage;
  identity: Identity;
  identification: IdentificationProvider;
  research: ResearchProvider;
  assistant: AssistantProvider;
  voice: VoiceProvider;
  tracer: Tracer;
  now: () => Date;
  id: () => string;
  embeddingModel: string;
  embeddingDimensions: number;
}
