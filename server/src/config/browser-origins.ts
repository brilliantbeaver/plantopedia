export interface BrowserOriginOptions {
  allowedOrigins?: readonly string[];
}

export function isWebOrigin(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    ["https:", "http:"].includes(url.protocol) &&
    value === url.origin &&
    !url.hostname.includes("*")
  );
}

// Clients without Origin still authenticate. React Native Android WebSockets
// send the API's HTTP(S) origin, which must be configured for hosted endpoints.
// HTTP and WebSocket transports share exact origins, never globs.
export function browserOriginAllowed(
  origin: string | undefined,
  allowedOrigins: readonly string[] = [],
): boolean {
  return (
    origin === undefined ||
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
    (isWebOrigin(origin) && allowedOrigins.includes(origin))
  );
}
