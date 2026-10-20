import { Buffer } from "node:buffer";

// Keep local browser auth and its API on the same development Clerk instance.
// This profile never changes the ignored production/native .env or Vercel.
export function localWebEnvironment(base, development, inherited = {}) {
  const publishableKey = development.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = development.CLERK_SECRET_KEY;
  if (
    !/^pk_test_[A-Za-z0-9=]+$/.test(publishableKey ?? "") ||
    !/^sk_test_.+/.test(secretKey ?? "")
  ) {
    throw new Error(
      "Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... and CLERK_SECRET_KEY=sk_test_... from the same Clerk Development instance in .env.clerk.local. Production keys cannot authenticate localhost browser sessions.",
    );
  }
  const decoded = Buffer.from(publishableKey.slice(8), "base64").toString(
    "utf8",
  );
  const frontendApi = decoded.endsWith("$") ? decoded.slice(0, -1) : "";
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.accounts\.dev$/.test(frontendApi))
    throw new Error(
      "The development publishable key must identify a Clerk accounts.dev instance.",
    );
  const env = { ...base, ...development };
  const port = env.PORT || "3001";
  if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535)
    throw new Error(
      "Local API PORT must be an integer between 1024 and 65535.",
    );
  // Preserve only the inherited operating environment, not ambient app keys.
  const system = Object.fromEntries(
    [
      "PATH",
      "HOME",
      "TMPDIR",
      "USER",
      "SHELL",
      "LANG",
      "TERM",
      "SystemRoot",
    ].flatMap((key) =>
      inherited[key] === undefined ? [] : [[key, inherited[key]]],
    ),
  );
  return {
    ...system,
    ...env,
    NODE_ENV: "development",
    EXPO_NO_DOTENV: "1",
    EXPO_NO_CLIENT_ENV_VARS: "0",
    EXPO_PUBLIC_API_BASE_URL: `http://127.0.0.1:${port}`,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
    EXPO_PUBLIC_CLERK_PROXY_URL: "",
    CLERK_PUBLISHABLE_KEY: publishableKey,
    CLERK_SECRET_KEY: secretKey,
    CLERK_ISSUER_URL: `https://${frontendApi}`,
    CLERK_PROXY_URL: "",
    SERVER_HOST: "127.0.0.1",
    PORT: port,
    PLANTOPEDIA_AUTO_START_API: "true",
    PLANTOPEDIA_PHONE_API: "false",
  };
}
