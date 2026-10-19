import { createHash } from "node:crypto";
import { Source } from "@plantopedia/contracts";

export type SearchFailureReason =
  | "credentials"
  | "quota"
  | "rate_limit"
  | "timeout"
  | "request"
  | "network"
  | "invalid_response"
  | "upstream";

export class SearchFailure extends Error {
  constructor(readonly reason: SearchFailureReason) {
    super(reason);
  }
}

// The Tavily SDK sometimes retains only a message, while OpenAI exposes status.
// Inspect messages solely for classification; never return or log their contents.
export function searchFailure(error: unknown): SearchFailure {
  if (error instanceof SearchFailure) return error;
  const status =
    error && typeof error === "object" && "status" in error
      ? error.status
      : undefined;
  const message = error instanceof Error ? error.message : "";
  if (
    status === 401 ||
    status === 403 ||
    /invalid api key|unauthorized|forbidden|authentication/i.test(message)
  )
    return new SearchFailure("credentials");
  if (
    status === 432 ||
    status === 433 ||
    /quota|usage limit|pay.as.you.go limit|credits.*exhaust|insufficient_quota/i.test(
      message,
    )
  )
    return new SearchFailure("quota");
  if (
    status === 429 ||
    /rate.limit|excessive requests|too many requests/i.test(message)
  )
    return new SearchFailure("rate_limit");
  if (
    /timed?\s*out|timeout/i.test(message) &&
    !/fetch_timeout|must be|invalid/i.test(message)
  )
    return new SearchFailure("timeout");
  if (
    status === 400 ||
    status === 422 ||
    /fetch_timeout|invalid.*parameter|validation error/i.test(message)
  )
    return new SearchFailure("request");
  if (
    /ECONNRESET|ENOTFOUND|ECONNREFUSED|connection error|fetch failed/i.test(
      message,
    )
  )
    return new SearchFailure("network");
  return new SearchFailure("upstream");
}

export function searchSources(
  items: { title: unknown; url: unknown; excerpt: unknown }[],
): Source[] {
  const sources = new Map<string, Source>();
  for (const item of items) {
    const parsed = Source.safeParse({
      id:
        typeof item.url === "string"
          ? `web_${createHash("sha256").update(item.url).digest("hex").slice(0, 24)}`
          : "invalid",
      title:
        typeof item.title === "string" ? item.title.slice(0, 300) : item.title,
      url: item.url,
      excerpt:
        typeof item.excerpt === "string"
          ? item.excerpt.slice(0, 1500)
          : item.excerpt,
      retrievedAt: new Date().toISOString(),
    });
    if (
      parsed.success &&
      parsed.data.title.trim() &&
      parsed.data.excerpt.trim()
    )
      sources.set(parsed.data.url, parsed.data);
  }
  if (items.length && !sources.size)
    throw new SearchFailure("invalid_response");
  return [...sources.values()].slice(0, 4);
}
