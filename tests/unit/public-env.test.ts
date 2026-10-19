import { expect, test } from "@jest/globals";
import { PublicEnv } from "../../src/config/public-env.js";

const env = {
  apiBaseUrl: "https://plantopedia-nine.vercel.app",
  clerkPublishableKey: "pk_live_Zml4dHVyZSQ=",
};
test("accepts an explicit absolute Clerk proxy for independent Expo apps", () => {
  expect(PublicEnv.safeParse(env).success).toBe(true);
  expect(
    PublicEnv.parse({ ...env, clerkProxyUrl: `${env.apiBaseUrl}/__clerk` })
      .clerkProxyUrl,
  ).toBe(`${env.apiBaseUrl}/__clerk`);
});
test.each([
  "/__clerk",
  "http://example.com/__clerk",
  "https://user:secret@example.com/__clerk",
  "https://example.com/__clerk?query=1",
])("rejects unsafe proxy URL %s", (clerkProxyUrl) => {
  expect(PublicEnv.safeParse({ ...env, clerkProxyUrl }).success).toBe(false);
});
