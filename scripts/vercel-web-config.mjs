export function vercelWebConfig(env = process.env) {
  const preview = env.VERCEL_ENV === "preview";
  const publishableKey = env.CLERK_PUBLISHABLE_KEY;
  if (!/^pk_(live|test)_[A-Za-z0-9=]+$/.test(publishableKey ?? ""))
    throw new Error(
      `Configure CLERK_PUBLISHABLE_KEY in Vercel's ${preview ? "Preview" : "Production"} environment before building web assets.`,
    );
  const proxyUrl = env.CLERK_PROXY_URL || "";
  const live = publishableKey.startsWith("pk_live_");
  if ((!preview && !live) || (live && !proxyUrl))
    throw new Error(
      "Production Clerk requires a live public key and HTTPS /__clerk proxy.",
    );
  let proxy;
  if (proxyUrl) {
    try {
      proxy = new URL(proxyUrl);
      if (proxy.protocol !== "https:" || proxyUrl !== `${proxy.origin}/__clerk`)
        throw new Error();
    } catch {
      throw new Error("CLERK_PROXY_URL must be an exact HTTPS /__clerk URL.");
    }
  }
  const apiBaseUrl = preview
    ? env.EXPO_PUBLIC_API_BASE_URL ||
      (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "")
    : proxy.origin;
  try {
    const api = new URL(apiBaseUrl);
    if (api.protocol !== "https:" || apiBaseUrl !== api.origin)
      throw new Error();
  } catch {
    throw new Error(
      "Preview builds require VERCEL_URL or an exact HTTPS EXPO_PUBLIC_API_BASE_URL origin.",
    );
  }
  return { publishableKey, proxyUrl, apiBaseUrl };
}
