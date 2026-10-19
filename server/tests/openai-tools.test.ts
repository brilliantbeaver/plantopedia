import { beforeEach, expect, jest, test } from "@jest/globals";
import { parseConfig } from "../src/config/env.js";
import type { AssistantProvider } from "../src/application/ports.js";
const create =
  jest.fn<
    (...args: unknown[]) => Promise<{ output: unknown[]; output_text: string }>
  >();
jest.unstable_mockModule("openai", () => ({
  default: class {
    responses = { create };
  },
}));
const { createAssistant } = await import("../src/providers/openai.js");
const config = parseConfig({
  NODE_ENV: "test",
  CLERK_SECRET_KEY: "fixture",
  CLERK_ISSUER_URL: "https://fixture.example.invalid",
  FIREBASE_PROJECT_ID: "demo-plantopedia",
  FIREBASE_STORAGE_BUCKET: "demo-bucket",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
  OPENAI_API_KEY: "fixture",
});
const call = (name: string, id: string) => ({
  type: "function_call",
  name,
  call_id: id,
  arguments: JSON.stringify({ photoId: id }),
});
const input = (
  execute: Parameters<AssistantProvider["respond"]>[0]["execute"],
) => ({
  instructions: "fixture",
  history: [],
  text: "Which photos have pink flowers?",
  tools: [],
  execute,
});
beforeEach(() => create.mockReset());
test("independent photo inspections start together and return outputs to their corresponding calls", async () => {
  create
    .mockResolvedValueOnce({
      output: [call("inspect_photo", "rose"), call("inspect_photo", "tree")],
      output_text: "",
    })
    .mockResolvedValue({
      output: [],
      output_text: "The rose photo has pink petals.",
    });
  const started: string[] = [];
  let release: () => void = () => {};
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  const execute = jest.fn(async (_name: string, raw: unknown) => {
    const id = (raw as { photoId: string }).photoId;
    started.push(id);
    if (started.length === 2) release();
    await barrier;
    return { description: id === "rose" ? "Pink petals" : "Green leaves" };
  });
  const reply = createAssistant(config).respond(input(execute));
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(started).toEqual(["rose", "tree"]);
  expect(await reply).toContain("pink petals");
  expect(create.mock.calls[1]?.[0]).toMatchObject({
    input: expect.arrayContaining([
      expect.objectContaining({
        call_id: "rose",
        output: JSON.stringify({ description: "Pink petals" }),
      }),
      expect.objectContaining({
        call_id: "tree",
        output: JSON.stringify({ description: "Green leaves" }),
      }),
    ]),
  });
});
test("a tool outage is explicitly a failed lookup, not an empty result", async () => {
  create
    .mockResolvedValueOnce({
      output: [call("list_recent_uploads", "list")],
      output_text: "",
    })
    .mockResolvedValue({
      output: [],
      output_text: "I couldn't check the photos right now.",
    });
  await createAssistant(config).respond(
    input(async () => {
      throw new Error("private failure sentinel");
    }),
  );
  const serialized = JSON.stringify(create.mock.calls[1]?.[0]);
  expect(serialized).toContain("tool_failed");
  expect(serialized).toContain("not evidence of an empty collection");
  expect(serialized).not.toContain("private failure sentinel");
});
test("proposal calls remain sequential", async () => {
  create
    .mockResolvedValueOnce({
      output: [call("propose_observation", "one"), call("propose_task", "two")],
      output_text: "",
    })
    .mockResolvedValue({ output: [], output_text: "Please confirm." });
  let active = 0;
  await createAssistant(config).respond(
    input(async () => {
      expect(active++).toBe(0);
      await new Promise<void>((resolve) => setImmediate(resolve));
      active--;
      return { status: "pending" };
    }),
  );
});
