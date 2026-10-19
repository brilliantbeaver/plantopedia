import { z } from "zod";
export const PublicEnv = z.object({
  apiBaseUrl: z
    .url()
    .refine(
      (value) =>
        value.startsWith("https://") ||
        /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(value),
    ),
  clerkPublishableKey: z.string().regex(/^pk_(test|live)_[A-Za-z0-9=]+$/),
});
export const publicConfig = PublicEnv.safeParse({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
});
