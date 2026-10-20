// A production Clerk browser session must run on its configured site. Native
// clients do not send a browser Origin and must not use this browser-only guard.
export function webAuthConfigurationError(
  publishableKey: string,
  hostname: string,
): string | null {
  const local =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "[::1]" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  return publishableKey.startsWith("pk_live_") && local
    ? "Clerk production keys cannot sign in from this local browser address. Stop Expo, add the matching Clerk Development keys to .env.clerk.local, then run npm run web:local. Native development builds can continue using the production API."
    : null;
}
