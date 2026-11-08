import { isIP } from "node:net";
import type { IncomingHttpHeaders } from "node:http";
import { ipKeyGenerator } from "express-rate-limit";

// Vercel overwrites X-Forwarded-For at its edge. Trust it only inside that
// runtime, never because a caller supplied a Forwarded/X-Real-IP header.
// Other hosts use the direct peer until their own proxy boundary is configured.
export function identificationRateKey(
  request: {
    headers: IncomingHttpHeaders;
    socket: { remoteAddress: string | undefined };
  },
  onVercel = process.env.VERCEL === "1",
) {
  const header = request.headers["x-forwarded-for"];
  const forwarded = typeof header === "string" ? header.trim() : "";
  const peer = request.socket.remoteAddress ?? "";
  const ip = onVercel && isIP(forwarded) ? forwarded : peer;
  // The library normalizes IPv4-mapped peers and groups IPv6 addresses by /56.
  return isIP(ip) ? ipKeyGenerator(ip) : "unknown-peer";
}
