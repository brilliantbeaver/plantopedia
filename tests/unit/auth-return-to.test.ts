import { safeReturnTo } from "../../src/features/auth/return-to.js";

test("login resumes only supported app routes and their relevant query parameters", () => {
  for (const route of [
    "/",
    "/explore",
    "/journey",
    "/scan",
    "/plants",
    "/plants/my_plant",
    "/progress",
    "/species/ncsu_helianthus_annuus",
    "/sightings/bug_1",
  ])
    expect(safeReturnTo(route)).toBe(route);
  expect(
    safeReturnTo("/search?q=sunflower&redirect=https://evil.invalid"),
  ).toBe("/search?q=sunflower");
  expect(safeReturnTo("/ask?conversationId=chat_1")).toBe(
    "/ask?conversationId=chat_1",
  );
  expect(safeReturnTo(`/search?q=${"x".repeat(200)}`)).toBe(
    `/search?q=${"x".repeat(120)}`,
  );
});

test("login rejects external redirects, auth loops, and malformed deep links", () => {
  for (const value of [
    undefined,
    ["/scan"],
    "https://evil.invalid",
    "//evil.invalid",
    "/\\evil.invalid",
    "/login",
    "/sso-callback",
    "/plants/invalid/id",
    "/species/%2fevil.invalid",
    "javascript:alert(1)",
  ])
    expect(safeReturnTo(value)).toBe("/plants");
});
