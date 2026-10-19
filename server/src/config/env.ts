import { createPrivateKey } from "node:crypto";
import { z } from "zod";
import { isWebOrigin } from "./browser-origins.js";

const bool = (fallback: boolean) =>
  z
    .enum(["true", "false"])
    .default(String(fallback) === "true" ? "true" : "false")
    .transform((value) => value === "true");
const optional = z.string().default("");
const Env = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SERVER_HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  WEB_ALLOWED_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().refine(isWebOrigin)).max(16)),
  ALLOW_LIVE_PROVIDERS: bool(false),
  USE_FIREBASE_EMULATORS: bool(true),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIRESTORE_DATABASE_ID: z.string().min(1).default("(default)"),
  FIREBASE_STORAGE_BUCKET: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: optional,
  FIREBASE_PRIVATE_KEY: optional,
  FIRESTORE_EMULATOR_HOST: optional,
  FIREBASE_STORAGE_EMULATOR_HOST: optional,
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z
    .union([z.literal(""), z.string().regex(/^pk_(test|live)_[A-Za-z0-9=]+$/)])
    .default(""),
  CLERK_PROXY_URL: z
    .string()
    .default("")
    .refine((value) => {
      if (!value) return true;
      if (!URL.canParse(value)) return false;
      const url = new URL(value);
      return url.protocol === "https:" && value === `${url.origin}/__clerk`;
    }),
  CLERK_ISSUER_URL: z.string().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.protocol === "https:" && value === url.origin;
  }),
  PLANTNET_API_KEY: optional,
  PLANTNET_PROJECT: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .default("all"),
  OPENAI_API_KEY: optional,
  OPENAI_REALTIME_MODEL: z
    .literal("gpt-realtime-2.1")
    .default("gpt-realtime-2.1"),
  OPENAI_BACKEND_MODEL: z.string().default("gpt-6-luna"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  OPENAI_EMBEDDING_DIMENSIONS: z.coerce
    .number()
    .int()
    .min(1)
    .max(2048)
    .default(1536),
  TAVILY_API_KEY: optional,
  LANGSMITH_TRACING: bool(false),
  LANGSMITH_API_KEY: optional,
  LANGSMITH_PROJECT: z.string().default("plantopedia-local"),
  LANGSMITH_ENDPOINT: z.url().default("https://api.smith.langchain.com"),
  LANGSMITH_WORKSPACE_ID: optional,
  LANGSMITH_HIDE_INPUTS: bool(true),
  LANGSMITH_HIDE_OUTPUTS: bool(true),
});
export type Config = z.infer<typeof Env>;
const configured = (value: string) =>
  value.length > 10 && !/^(replace|demo|your)[_-]/i.test(value);
export function parseConfig(
  input: Readonly<Record<string, string | undefined>>,
): Config {
  const result = Env.safeParse(input);
  if (!result.success) {
    const invalid = [
      ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
    ];
    const hint = invalid.includes("CLERK_ISSUER_URL")
      ? "\nCLERK_ISSUER_URL must be the full HTTPS Clerk issuer, e.g. https://your-instance.clerk.accounts.dev (include https://; no trailing slash, path, query, or credentials). Use the issuer from the same Clerk instance as your keys."
      : "";
    throw new Error(`Invalid configuration: ${invalid.join(", ")}${hint}`);
  }
  const config = result.data;
  if (config.CLERK_PROXY_URL && !config.CLERK_PUBLISHABLE_KEY)
    throw new Error(
      "CLERK_PROXY_URL requires CLERK_PUBLISHABLE_KEY from the same Clerk instance",
    );
  if (config.USE_FIREBASE_EMULATORS) {
    const invalid: string[] = [];
    if (!config.FIREBASE_PROJECT_ID.startsWith("demo-"))
      invalid.push(
        "FIREBASE_PROJECT_ID (must start with demo- when USE_FIREBASE_EMULATORS=true)",
      );
    if (!/^127\.0\.0\.1:\d+$/.test(config.FIRESTORE_EMULATOR_HOST))
      invalid.push(
        "FIRESTORE_EMULATOR_HOST (use 127.0.0.1:PORT without http://)",
      );
    if (!/^127\.0\.0\.1:\d+$/.test(config.FIREBASE_STORAGE_EMULATOR_HOST))
      invalid.push(
        "FIREBASE_STORAGE_EMULATOR_HOST (use 127.0.0.1:PORT without http://)",
      );
    if (invalid.length)
      throw new Error(`Invalid emulator configuration: ${invalid.join(", ")}`);
  } else {
    const invalid: string[] = [];
    const emulatorHosts = (
      ["FIRESTORE_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"] as const
    ).filter((name) => config[name]);
    if (emulatorHosts.length)
      invalid.push(
        `Remove emulator hosts in real Firebase mode: ${emulatorHosts.join(", ")}. Leave them empty in .env and unset any shell/hosting overrides.`,
      );
    if (
      Boolean(config.FIREBASE_CLIENT_EMAIL) !==
      Boolean(config.FIREBASE_PRIVATE_KEY)
    )
      invalid.push(
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be set together, or both left empty for configured Application Default Credentials.",
      );
    if (config.FIREBASE_PRIVATE_KEY) {
      let validPrivateKey: boolean;
      try {
        validPrivateKey =
          createPrivateKey(config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"))
            .asymmetricKeyType === "rsa";
      } catch {
        validPrivateKey = false;
      }
      if (!validPrivateKey)
        invalid.push(
          "FIREBASE_PRIVATE_KEY must contain the service-account JSON's full RSA private_key PEM, including BEGIN/END PRIVATE KEY lines and newlines; private_key_id is only an identifier.",
        );
    }
    if (invalid.length)
      throw new Error(
        `Invalid hosted Firebase configuration:\n${invalid.join("\n")}`,
      );
  }
  if (config.ALLOW_LIVE_PROVIDERS) {
    const missing = (
      ["PLANTNET_API_KEY", "OPENAI_API_KEY", "TAVILY_API_KEY"] as const
    ).filter((key) => !configured(config[key]));
    if (missing.length)
      throw new Error(`Missing configuration: ${missing.join(", ")}`);
  }
  if (!config.LANGSMITH_HIDE_INPUTS || !config.LANGSMITH_HIDE_OUTPUTS)
    throw new Error("Trace input/output redaction must remain enabled");
  if (config.LANGSMITH_TRACING && !configured(config.LANGSMITH_API_KEY))
    throw new Error("Missing configuration: LANGSMITH_API_KEY");
  return config;
}
