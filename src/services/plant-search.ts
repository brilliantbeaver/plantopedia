import { PlantSearchResults, type Locale } from "@plantopedia/contracts";
import { PublicEnv } from "../config/public-env";
import { RequestError, responseError } from "./api";

export async function searchPlants(
  query: string,
  locale: Locale,
  signal?: AbortSignal,
) {
  // Text search is public. A Clerk session is never required or sent here.
  const base = PublicEnv.shape.apiBaseUrl.safeParse(
    process.env.EXPO_PUBLIC_API_BASE_URL,
  );
  if (!base.success) throw new RequestError(0, "configuration", false);
  const url = `${base.data.replace(/\/$/, "")}/public/plants/search?q=${encodeURIComponent(query)}&lang=${encodeURIComponent(locale)}`;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort);
  const timeout = setTimeout(abort, 24_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw await responseError(response);
    const result = PlantSearchResults.safeParse(await response.json());
    if (!result.success) throw new RequestError(502, "provider_contract", true);
    return result.data;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
