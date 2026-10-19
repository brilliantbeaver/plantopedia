import { test, expect } from "@jest/globals";
import { fixtures } from "./fixtures.js";
import { plantService } from "../src/application/plants.js";
import { companionService } from "../src/application/companion.js";
import { Message, MemoryItem } from "@plantopedia/contracts";
import { memoryService } from "../src/application/memory.js";
const auth = { uid: "user_a", sessionId: "session_user_a" };
const capturedAt = "2026-10-18T12:00:00.000Z";
test.each(["forgotten_during", "revised_during", "forgotten_after"])(
  "a tool-free follow-up inherits historical evidence: %s",
  async (mode) => {
    const { deps } = fixtures();
    const plants = plantService(deps);
    const companion = companionService(deps);
    const memory = memoryService(deps);
    await plants.create(auth, "create", {
      id: "plant",
      nickname: "Tree",
      ownership: "observed",
      capturedAt,
    });
    await plants.observe(auth, "plant", "observe", {
      id: "note",
      text: "Private purple buds",
      capturedAt,
    });
    await memory.processBatch();
    await companion.start(auth, "chat", {
      id: "chat",
      plantId: null,
      photoId: null,
      locale: "en",
    });
    deps.assistant.respond = async (input) => {
      await input.execute("get_plant", { plantId: "plant" });
      return "Private purple buds";
    };
    const first = await companion.send(auth, "chat", "first", {
      id: "first",
      text: "Recall",
      locale: "en",
    });
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let ready = () => {};
    const entered = new Promise<void>((resolve) => {
      ready = resolve;
    });
    deps.assistant.respond = async (input) => {
      expect(
        input.history.some((message) => message.id === first.assistant.id),
      ).toBe(true);
      ready();
      await gate;
      return "Translated private purple buds";
    };
    const followInput = { id: "follow", text: "Translate that", locale: "fr" };
    const answer = companion
      .send(auth, "chat", "follow", followInput)
      .catch((error: unknown) => error);
    await entered;
    if (mode === "forgotten_after") {
      release();
      await answer;
    }
    if (mode === "revised_during") {
      await plants.edit(auth, "plant", "edit", {
        revision: (await plants.detail(auth, "plant")).plant.revision,
        nickname: "Corrected tree",
      });
    } else {
      const item = (
        await deps.repository.list("users/user_a/memory_items", MemoryItem)
      )[0];
      if (!item) throw new Error("missing fixture memory");
      await memory.forget(auth, item.id);
    }
    release();
    if (mode !== "forgotten_after")
      await expect(answer).resolves.toMatchObject({ status: 410 });
    expect(
      (await companion.history(auth, "chat")).filter(
        (message) => message.role === "assistant",
      ),
    ).toEqual([]);
    if (mode === "forgotten_after")
      await expect(
        companion.send(auth, "chat", "follow", followInput),
      ).rejects.toMatchObject({ status: 410 });
  },
);
test("a deleted retrieved plant cannot be written back into a general conversation by a late answer", async () => {
  const { deps } = fixtures();
  const plants = plantService(deps);
  const companion = companionService(deps);
  await plants.create(auth, "create", {
    id: "plant",
    nickname: "Private tree",
    ownership: "observed",
    capturedAt,
  });
  await companion.start(auth, "chat", {
    id: "chat",
    plantId: null,
    photoId: null,
    locale: "en",
  });
  let release: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let found: () => void = () => {};
  const retrieved = new Promise<void>((resolve) => {
    found = resolve;
  });
  deps.assistant.respond = async (input) => {
    await input.execute("search_my_plants", { query: "Private tree" });
    found();
    await wait;
    return "Private tree answer";
  };
  const result = companion
    .send(auth, "chat", "send", {
      id: "message",
      text: "Recall my tree",
      locale: "en",
    })
    .catch((error: unknown) => error);
  await retrieved;
  await plants.remove(auth, "plant");
  release();
  await expect(result).resolves.toMatchObject({ status: 410 });
  expect(
    (await companion.history(auth, "chat")).some(
      (message) => message.role === "assistant",
    ),
  ).toBe(false);
  expect(
    (
      await deps.repository.list(
        "users/user_a/conversations/chat/messages",
        Message,
      )
    ).some((message) => message.text === "Private tree answer"),
  ).toBe(false);
});
test("a new locale overrides stored conversation language without altering original messages", async () => {
  const { deps } = fixtures();
  const companion = companionService(deps);
  await companion.start(auth, "chat", {
    id: "chat",
    plantId: null,
    photoId: null,
    locale: "en",
  });
  expect((await companion.tools(auth, "chat", "ja")).instructions).toContain(
    "Locale: ja.",
  );
  let instructions = "";
  deps.assistant.respond = async (input) => {
    instructions = input.instructions;
    return "Bonjour";
  };
  await companion.send(auth, "chat", "send", {
    id: "message",
    text: "Bonjour",
    locale: "fr",
  });
  expect(instructions).toContain("Locale: fr.");
  expect((await companion.conversation(auth, "chat")).locale).toBe("en");
});

test.each(["revision", "forgotten"] as const)(
  "late output cannot persist %s source evidence",
  async (change) => {
    const { deps } = fixtures();
    const plants = plantService(deps);
    const companion = companionService(deps);
    const memory = memoryService(deps);
    await plants.create(auth, "create", {
      id: "plant",
      nickname: "Tree",
      ownership: "observed",
      capturedAt,
    });
    await plants.observe(auth, "plant", "observe", {
      id: "note",
      text: "Private green leaf",
      capturedAt,
    });
    await memory.processBatch();
    await companion.start(auth, "chat", {
      id: "chat",
      plantId: null,
      photoId: null,
      locale: "en",
    });
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let ready = () => {};
    const entered = new Promise<void>((resolve) => {
      ready = resolve;
    });
    deps.assistant.respond = async (input) => {
      await input.execute("get_plant", { plantId: "plant" });
      ready();
      await gate;
      return "Stale private answer";
    };
    const sending = companion
      .send(auth, "chat", "send", {
        id: "message",
        text: "Recall",
        locale: "en",
      })
      .catch((error: unknown) => error);
    await entered;
    if (change === "revision") {
      const current = await plants.detail(auth, "plant");
      await plants.edit(auth, "plant", "edit", {
        revision: current.plant.revision,
        nickname: "Corrected tree",
      });
    } else {
      const items = await deps.repository.list(
        "users/user_a/memory_items",
        MemoryItem,
      );
      const item = items[0];
      if (!item) throw new Error("missing fixture memory");
      await memory.forget(auth, item.id);
    }
    release();
    await expect(sending).resolves.toMatchObject({ status: 410 });
    expect(
      (await companion.history(auth, "chat")).filter(
        (item) => item.role === "assistant",
      ),
    ).toEqual([]);
  },
);
