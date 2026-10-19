import { describe, expect, jest, test } from "@jest/globals";
import { z } from "zod";
import { Photo, Plant } from "@plantopedia/contracts";
import { fixtures } from "./fixtures.js";
import { plantService } from "../src/application/plants.js";
import { companionService } from "../src/application/companion.js";
import { hash } from "../src/application/core.js";
const auth = { uid: "user_a", sessionId: "session_user_a" };
const other = { uid: "user_b", sessionId: "session_user_b" };
const date = "2026-10-18T12:00:00.000Z";
const Uploads = z.object({
  items: z.array(
    z.object({
      plant: Plant,
      photoId: z.string(),
      uploadedAt: z.string(),
      pixelsInspected: z.boolean(),
    }),
  ),
  limited: z.boolean(),
});
async function setup() {
  const data = fixtures();
  const plants = plantService(data.deps);
  const companion = companionService(data.deps);
  async function upload(
    plantId: string,
    nickname: string,
    photoId: string,
    uploadedAt: string,
    owner = auth,
  ) {
    if (!data.documents.has(`users/${owner.uid}/plants/${plantId}`))
      await plants.create(owner, `create_${plantId}`, {
        id: plantId,
        nickname,
        ownership: "observed",
        capturedAt: date,
      });
    await plants.observe(owner, plantId, `observe_${photoId}`, {
      id: `note_${photoId}`,
      text: "",
      capturedAt: date,
    });
    const photo = Photo.parse({
      id: photoId,
      schemaVersion: 1,
      revision: 1,
      createdAt: uploadedAt,
      updatedAt: uploadedAt,
      plantId,
      observationId: `note_${photoId}`,
      mime: "image/jpeg",
      width: 10,
      height: 10,
      bytes: 3,
      hash: "fixture",
      capturedAt: "2020-01-01T00:00:00.000Z",
    });
    data.documents.set(
      `users/${owner.uid}/plants/${plantId}/photos/${photoId}`,
      photo,
    );
    data.files.set(
      `users/${owner.uid}/plants/${plantId}/photos/${photoId}.jpg`,
      Buffer.from(photoId),
    );
  }
  await companion.start(auth, "chat", {
    id: "chat_a",
    plantId: null,
    photoId: null,
    locale: "en",
  });
  return { ...data, plants, companion, upload };
}
describe("general conversation collection context", () => {
  test("recent photo lookup works with empty notes and unavailable embeddings, ordered by upload date across old and new plants", async () => {
    const data = await setup();
    await data.upload(
      "plant_a",
      "Hydrangea",
      "photo_z",
      "2026-10-16T12:00:00.000Z",
    );
    await data.upload(
      "plant_b",
      "Pink roses",
      "photo_b",
      "2026-10-17T12:00:00.000Z",
    );
    await data.upload("plant_a", "Hydrangea", "photo_a", date);
    await data.upload(
      "private_b",
      "Other owner's photo",
      "photo_private",
      "2026-10-19T12:00:00.000Z",
      other,
    );
    data.deps.assistant.embed = jest.fn(async () => {
      throw new Error("index unavailable");
    });
    // Reproduces the original failure: text retrieval cannot see flower pixels.
    expect(
      (
        await data.companion.retrieve(auth, {
          query: "reddish to pinkish flowers",
        })
      ).items,
    ).toEqual([]);
    const toolkit = await data.companion.tools(auth, "chat_a");
    expect(toolkit.instructions).toContain("Pink roses");
    expect(toolkit.instructions).not.toContain("Other owner's photo");
    const recent = Uploads.parse(
      await toolkit.execute("list_recent_uploads", { limit: 2 }),
    );
    expect(recent.items.map((item) => item.photoId)).toEqual([
      "photo_a",
      "photo_b",
    ]);
    expect(recent.limited).toBe(true);
    expect(recent.items.every((item) => !item.pixelsInspected)).toBe(true);
    expect(toolkit.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          plantId: "plant_a",
          photoId: "photo_a",
          observationRevision: 1,
          photoRevision: 1,
        }),
      ]),
    );
  });
  test("a question about pink flowers can browse and inspect existing photos without selecting a plant", async () => {
    const data = await setup();
    await data.upload("rose", "Garden flowers", "rose_photo", date);
    await data.upload(
      "tree",
      "Olive tree",
      "tree_photo",
      "2026-10-17T12:00:00.000Z",
    );
    const inspect = jest.fn(async (bytes: Buffer) =>
      bytes.toString() === "rose_photo"
        ? "Pink petals are visible."
        : "Green leaves, no visible flowers.",
    );
    data.deps.assistant.inspect = inspect;
    data.deps.assistant.respond = async (request) => {
      expect(request.text).toContain("recent uploads");
      const photos = Uploads.parse(
        await request.execute("list_recent_uploads", {}),
      );
      const results = await Promise.all(
        photos.items.map((item) =>
          request.execute("inspect_photo", {
            plantId: item.plant.id,
            photoId: item.photoId,
            question: "Are reddish or pink flowers visible?",
          }),
        ),
      );
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            interpretation: "Pink petals are visible.",
          }),
        ]),
      );
      return "Your Garden flowers photo shows pink petals. The olive tree photo shows leaves without visible flowers.";
    };
    const result = await data.companion.send(auth, "chat_a", "send_a", {
      id: "message_a",
      text: "Which of my recent uploads have reddish to pinkish flowers?",
      locale: "en",
    });
    expect(inspect).toHaveBeenCalledTimes(2);
    expect(result.assistant.text).toContain("pink petals");
    expect(result.assistant.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ photoId: "rose_photo" }),
      ]),
    );
    expect(
      (await data.companion.history(auth, "chat_a")).map((item) => item.role),
    ).toContain("assistant");
  });
  test("forgetting, deletion, other owners and revoked sessions cannot expose photos to vision", async () => {
    const data = await setup();
    await data.upload("rose", "Rose", "forgotten", date);
    await data.upload("private_b", "Private", "private_photo", date, other);
    data.documents.set(
      `users/user_a/memory_exclusions/${hash("plants/rose/observations/note_forgotten")}`,
      { excluded: true },
    );
    const inspect = jest.fn(async () => "must not run");
    data.deps.assistant.inspect = inspect;
    const tools = await data.companion.tools(auth, "chat_a");
    expect(
      Uploads.parse(await tools.execute("list_recent_uploads", {})).items,
    ).toEqual([]);
    await expect(
      tools.execute("inspect_photo", {
        plantId: "rose",
        photoId: "forgotten",
        question: "color",
      }),
    ).rejects.toMatchObject({ code: "source_forgotten" });
    await expect(
      tools.execute("inspect_photo", {
        plantId: "private_b",
        photoId: "private_photo",
        question: "color",
      }),
    ).rejects.toMatchObject({ status: 404 });
    await data.plants.remove(auth, "rose");
    expect(
      Uploads.parse(await tools.execute("list_recent_uploads", {})).items,
    ).toEqual([]);
    data.revoked.add(auth.sessionId);
    await expect(
      tools.execute("list_recent_uploads", {}),
    ).rejects.toMatchObject({ status: 401 });
    expect(inspect).not.toHaveBeenCalled();
  });
  test("a photo deleted while the answer is generated cannot be saved as current evidence", async () => {
    const data = await setup();
    await data.upload("rose", "Rose", "photo_a", date);
    data.deps.assistant.respond = async (request) => {
      await request.execute("list_recent_uploads", {});
      data.documents.delete("users/user_a/plants/rose/photos/photo_a");
      return "Stale answer";
    };
    await expect(
      data.companion.send(auth, "chat_a", "send_a", {
        id: "message_a",
        text: "My recent uploads?",
        locale: "en",
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      (await data.companion.history(auth, "chat_a")).some(
        (item) => item.role === "assistant",
      ),
    ).toBe(false);
  });
  test("lookup outages fail rather than masquerading as an empty collection", async () => {
    const data = await setup();
    await data.upload("rose", "Rose", "photo_a", date);
    const tools = await data.companion.tools(auth, "chat_a");
    data.deps.repository.recent = async () => {
      throw new Error("database unavailable");
    };
    await expect(tools.execute("list_recent_uploads", {})).rejects.toThrow(
      "database unavailable",
    );
  });
  test("voice turns receive the same collection overview and recent-upload tool", async () => {
    const data = await setup();
    await data.upload("rose", "Saved roses", "photo_a", date);
    const turn = await data.companion.prepareVoice(
      auth,
      {
        id: "voice_a",
        conversationId: "chat_a",
        locale: "en",
        audioBase64: Buffer.alloc(12000).toString("base64"),
      },
      [],
      new AbortController().signal,
    );
    expect(turn.instructions).toContain("Saved roses");
    expect(
      Uploads.parse(await turn.execute("list_recent_uploads", {})).items[0]
        ?.photoId,
    ).toBe("photo_a");
  });
});
