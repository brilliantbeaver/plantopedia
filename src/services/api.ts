import { z } from "zod";
import {
  ApiError,
  Conversation,
  Identification,
  Message,
  MessageResult,
  Observation,
  Plant,
  PlantDetail,
  PlantPage,
  Preferences,
  Proposal,
  Task,
  VoiceTurn,
} from "@plantopedia/contracts";
import { publicConfig } from "../config/public-env";
import { phoneApiUnreachable } from "../platform/api-endpoint";
export class RequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(code);
  }
}
export function connectionError(error: unknown) {
  if (publicConfig.success && phoneApiUnreachable(publicConfig.data.apiBaseUrl))
    return new RequestError(0, "phone_api_unreachable", false);
  return error;
}
export async function responseError(response: {
  status: number;
  json(): Promise<unknown>;
}): Promise<RequestError> {
  const body = await response.json().catch(() => null);
  const error = ApiError.safeParse(body);
  return new RequestError(
    response.status,
    error.success ? error.data.code : "request_failed",
    error.success ? error.data.retryable : response.status >= 500,
  );
}
export function apiClient(getToken: () => Promise<string | null>) {
  let lifecycle = new AbortController();
  async function token() {
    const value = await getToken();
    lifecycle.signal.throwIfAborted();
    return value;
  }
  async function request<T>(
    route: string,
    schema: z.ZodType<T>,
    options: {
      method?: string;
      body?: unknown;
      key?: string;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    if (!publicConfig.success)
      throw new RequestError(0, "configuration", false);
    const bearer = await token();
    if (!bearer) throw new RequestError(401, "unauthorized", false);
    const response = await fetch(
      `${publicConfig.data.apiBaseUrl.replace(/\/$/, "")}/v1${route}`,
      {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${bearer}`,
          ...(options.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(options.key ? { "Idempotency-Key": options.key } : {}),
        },
        ...(options.body !== undefined
          ? { body: JSON.stringify(options.body) }
          : {}),
        signal: AbortSignal.any([
          lifecycle.signal,
          options.signal ?? AbortSignal.timeout(27000),
        ]),
      },
    ).catch((error: unknown) => {
      // Do not reject a functioning simulator connection based on Metro's LAN
      // address. Explain loopback only after the request actually fails.
      throw lifecycle.signal.aborted || options.signal?.aborted
        ? error
        : connectionError(error);
    });
    if (!response.ok) {
      throw await responseError(response);
    }
    const json: unknown = await response.json();
    return schema.parse(json);
  }
  return {
    activate() {
      if (lifecycle.signal.aborted) lifecycle = new AbortController();
    },
    dispose() {
      lifecycle.abort();
    },
    request,
    async voiceConnection() {
      if (!publicConfig.success)
        throw new RequestError(0, "configuration", false);
      const bearer = await token();
      if (!bearer) throw new RequestError(401, "unauthorized", false);
      return {
        url: `${publicConfig.data.apiBaseUrl.replace(/\/$/, "").replace(/^http/, "ws")}/v1/voice/session`,
        token: bearer,
      };
    },
    plants: () => request("/plants", PlantPage),
    plant: (id: string) => request(`/plants/${id}`, PlantDetail),
    conversations: () => request("/conversations", z.array(Conversation)),
    messages: (id: string) =>
      request(`/conversations/${id}/messages`, z.array(Message)),
    proposals: (id: string) =>
      request(`/conversations/${id}/action-proposals`, z.array(Proposal)),
    tasks: () => request("/tasks", z.array(Task)),
    preferences: () => request("/me/preferences", Preferences),
    createPlant: (body: unknown, key: string) =>
      request("/plants", Plant, { method: "POST", body, key }),
    observe: (id: string, body: unknown, key: string) =>
      request(`/plants/${id}/observations`, Observation, {
        method: "POST",
        body,
        key,
      }),
    identify: (id: string, body: unknown, key: string) =>
      request(`/plants/${id}/identifications`, Identification, {
        method: "POST",
        body,
        key,
      }),
    startConversation: (body: unknown, key: string) =>
      request("/conversations", Conversation, { method: "POST", body, key }),
    send: (id: string, body: unknown, key: string) =>
      request(`/conversations/${id}/messages`, MessageResult, {
        method: "POST",
        body,
        key,
      }),
    startVoiceTurn: (body: unknown, key: string, signal?: AbortSignal) =>
      request("/voice/turns", VoiceTurn, {
        method: "POST",
        body,
        key,
        ...(signal ? { signal } : {}),
      }),
    voiceTurn: (id: string, signal?: AbortSignal) =>
      request(`/voice/turns/${id}`, VoiceTurn, {
        ...(signal ? { signal } : {}),
      }),
    cancelVoiceTurn: (id: string) =>
      request(`/voice/turns/${id}`, z.object({ cancelled: z.boolean() }), {
        method: "DELETE",
      }),
    token,
  };
}
export type ApiClient = ReturnType<typeof apiClient>;
