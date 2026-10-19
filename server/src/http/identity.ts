import { createClerkClient, verifyToken } from "@clerk/backend";
import { z } from "zod";
import type { Config } from "../config/env.js";
import { AppError } from "../application/errors.js";
export const Auth = z.object({
  uid: z.string().regex(/^[A-Za-z0-9_-]+$/),
  sessionId: z.string().min(1),
});
export type Auth = z.infer<typeof Auth>;
export interface Identity {
  verify(token: string): Promise<Auth>;
  active(auth: Auth): Promise<boolean>;
  deleteUser(uid: string): Promise<void>;
}
export async function verifyIdentity(
  token: string,
  options: { issuer: string; secretKey?: string; jwtKey?: string },
): Promise<Auth> {
  try {
    const { issuer, ...verification } = options;
    const claims = await verifyToken(token, verification);
    if (claims.iss !== issuer) throw new Error("issuer");
    return Auth.parse({ uid: claims.sub, sessionId: claims.sid });
  } catch {
    throw new AppError(401, "unauthorized");
  }
}
export function createIdentity(config: Config): Identity {
  const clerk = createClerkClient({ secretKey: config.CLERK_SECRET_KEY });
  return {
    async verify(token) {
      return verifyIdentity(token, {
        secretKey: config.CLERK_SECRET_KEY,
        issuer: config.CLERK_ISSUER_URL,
      });
    },
    async active(auth) {
      try {
        const session = await clerk.sessions.getSession(auth.sessionId);
        return (
          session.userId === auth.uid &&
          session.status === "active" &&
          session.expireAt > Date.now()
        );
      } catch {
        return false;
      }
    },
    async deleteUser(uid) {
      try {
        await clerk.users.deleteUser(uid);
      } catch (error) {
        if (z.object({ status: z.literal(404) }).safeParse(error).success)
          return;
        throw new AppError(502, "identity_deletion_failed", true);
      }
    },
  };
}
