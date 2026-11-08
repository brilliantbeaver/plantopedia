// Deliberate server/build allowlist. Never upload an entire local .env file.
const allowed = [
  "FIREBASE_PROJECT_ID",
  "FIRESTORE_DATABASE_ID",
  "FIREBASE_STORAGE_BUCKET",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_PROXY_URL",
  "CLERK_ISSUER_URL",
  "PLANTNET_API_KEY",
  "PLANTNET_PROJECT",
  "KINDWISE_PLANTID_API_KEY",
  "KINDWISE_INSECTID_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_REALTIME_MODEL",
  "OPENAI_BACKEND_MODEL",
  "OPENAI_EMBEDDING_MODEL",
  "OPENAI_EMBEDDING_DIMENSIONS",
  "TAVILY_API_KEY",
  "LANGSMITH_TRACING",
  "LANGSMITH_API_KEY",
  "LANGSMITH_PROJECT",
  "LANGSMITH_ENDPOINT",
  "LANGSMITH_WORKSPACE_ID",
];
export function productionEnvironment(input, origin) {
  const url = new URL(origin);
  if (url.protocol !== "https:" || origin !== url.origin)
    throw new Error("Production requires an exact HTTPS origin");
  if (
    !input.CLERK_SECRET_KEY?.startsWith("sk_live_") ||
    !input.CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_")
  )
    throw new Error("Production requires matching live Clerk configuration");
  if (
    input.CLERK_PROXY_URL !== `${origin}/__clerk` ||
    input.CLERK_ISSUER_URL !== `${origin}/__clerk`
  )
    throw new Error(
      "Review the production Clerk proxy/issuer instead of copying local settings",
    );
  const values = Object.fromEntries(
    allowed.filter((k) => input[k]).map((k) => [k, input[k]]),
  );
  Object.assign(values, {
    NODE_ENV: "production",
    USE_FIREBASE_EMULATORS: "false",
    WEB_ALLOWED_ORIGINS: origin,
    ALLOW_LIVE_PROVIDERS:
      input.ALLOW_LIVE_PROVIDERS === "true" ? "true" : "false",
    LANGSMITH_HIDE_INPUTS: "true",
    LANGSMITH_HIDE_OUTPUTS: "true",
    LANGSMITH_PROJECT:
      input.LANGSMITH_PROJECT?.replace(/-local$/, "-production") ||
      "plantopedia-production",
    // Credentials alone are not provider-retention approval.
    ALLOW_PUBLIC_IDENTIFICATION: "false",
    IDENTIFICATION_RETENTION_APPROVED: "false",
    PUBLIC_IDENTIFICATION_DAILY_LIMIT: "10",
  });
  return Object.entries(values).map(([key, value]) => ({
    key,
    value,
    target: ["production"],
    type: /(?:API_KEY|SECRET_KEY|PRIVATE_KEY)$/.test(key)
      ? "sensitive"
      : "encrypted",
  }));
}
