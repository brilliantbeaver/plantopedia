/** Only app routes can be resumed after login; reject external URLs and auth loops. */
export function safeReturnTo(raw: unknown): string {
  if (
    typeof raw !== "string" ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\")
  )
    return "/plants";
  try {
    const url = new URL(raw, "https://plantopedia.local");
    if (
      url.origin !== "https://plantopedia.local" ||
      !/^\/(?:explore|journey|search|scan|ask|progress|settings|plants(?:\/[A-Za-z0-9_-]+)?|species\/[A-Za-z0-9_-]+|sightings\/[A-Za-z0-9_-]+)?$/.test(
        url.pathname,
      )
    )
      return "/plants";
    // These are the only route parameters used by resumable screens.
    const params = new URLSearchParams();
    const query = url.searchParams.get("q");
    const conversationId = url.searchParams.get("conversationId");
    if ((url.pathname === "/search" || url.pathname === "/plants") && query)
      params.set("q", query.slice(0, 120));
    if (
      url.pathname === "/ask" &&
      conversationId &&
      /^[A-Za-z0-9_-]{1,128}$/.test(conversationId)
    )
      params.set("conversationId", conversationId);
    return url.pathname + (params.size ? `?${params}` : "");
  } catch {
    return "/plants";
  }
}
