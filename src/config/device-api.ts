/** Diagnose failed requests, not a runtime type: iOS simulators can share host loopback. */
export function loopbackApiOnRemoteDevice(apiUrl: string, metroHost?: string) {
  if (!metroHost) return false;
  try {
    const loopback = (host: string) =>
      ["localhost", "127.0.0.1", "[::1]"].includes(host);
    const api = new URL(apiUrl);
    const metro = new URL(`http://${metroHost}`);
    return loopback(api.hostname) && !loopback(metro.hostname);
  } catch {
    return false;
  }
}
