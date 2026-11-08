import { beforeEach, afterEach, expect, jest, test } from "@jest/globals";
import type { PlantSearchHit } from "@plantopedia/contracts";
const create = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.unstable_mockModule("openai", () => ({
  default: class {
    responses = { create };
  },
}));
const { createPlantPhotoFilter, potentialPlantPhoto } =
  await import("../src/providers/plant-search-images.js");
let warnings: jest.SpiedFunction<typeof console.warn>;
beforeEach(() => {
  create.mockReset();
  warnings = jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warnings.mockRestore());
const hit = (id: string, filename = `${id}.jpg`): PlantSearchHit => ({
  id,
  title: id,
  description: "Plant source",
  url: `https://flora.example/${id}`,
  image: {
    url: `https://images.example/${filename}`,
    sourceUrl: `https://flora.example/${id}`,
  },
});
const reviewed = (
  items: { index: number; plantPhoto: boolean; relevant: boolean }[],
) => ({ status: "completed", output_text: JSON.stringify({ images: items }) });

test("actual visual evidence rejects buildings, cars and irrelevant plants while preserving text results", async () => {
  create
    .mockResolvedValueOnce(
      reviewed([{ index: 0, plantPhoto: true, relevant: true }]),
    )
    .mockResolvedValueOnce(
      reviewed([{ index: 0, plantPhoto: false, relevant: false }]),
    )
    .mockResolvedValueOnce(
      reviewed([{ index: 0, plantPhoto: false, relevant: false }]),
    )
    .mockResolvedValueOnce(
      reviewed([{ index: 0, plantPhoto: true, relevant: false }]),
    );
  const filter = createPlantPhotoFilter({ OPENAI_API_KEY: "fixture" });
  const output = await filter(
    [hit("lavender"), hit("building"), hit("car"), hit("wrong_flower")],
    "lavender",
  );
  expect(output).toHaveLength(4);
  expect(output[0]?.image?.plantVerified).toBe(true);
  expect(output.slice(1).every((item) => !item.image)).toBe(true);
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      store: false,
      text: {
        format: expect.objectContaining({
          name: "plant_photo_review",
          strict: true,
        }),
      },
      input: [
        {
          role: "user",
          content: expect.arrayContaining([
            expect.objectContaining({
              type: "input_image",
              image_url: "https://images.example/car.jpg",
            }),
          ]),
        },
      ],
    }),
  );
  await filter([hit("lavender"), hit("building")], "lavender");
  expect(create).toHaveBeenCalledTimes(4);
});
test("logos, icons, placeholders and unsafe URLs are removed before any vision request", async () => {
  const filter = createPlantPhotoFilter({ OPENAI_API_KEY: "fixture" });
  const output = await filter(
    [
      hit("logo", "site-logo.png"),
      hit("icon", "favicon.ico"),
      hit("placeholder", "placeholder.jpg"),
      hit("svg", "plant.svg"),
    ],
    "lavender",
  );
  expect(output.every((item) => !item.image)).toBe(true);
  expect(create).not.toHaveBeenCalled();
  expect(potentialPlantPhoto("https://localhost/image.jpg")).toBe(false);
  expect(potentialPlantPhoto("https://[invalid")).toBe(false);
});
test.each(["outage", "malformed", "incomplete", "duplicate", "missing"])(
  "%s verification hides unverified images and keeps source text",
  async (state) => {
    if (state === "outage")
      create.mockRejectedValue(new Error("private-key-sentinel"));
    else if (state === "malformed")
      create.mockResolvedValue({ status: "completed", output_text: "invalid" });
    else if (state === "incomplete")
      create.mockResolvedValue({ status: "incomplete" });
    else
      create.mockResolvedValue(
        reviewed(
          state === "missing"
            ? []
            : [
                { index: 0, plantPhoto: true, relevant: true },
                { index: 0, plantPhoto: true, relevant: true },
              ],
        ),
      );
    const output = await createPlantPhotoFilter({ OPENAI_API_KEY: "fixture" })(
      [hit("lavender")],
      "lavender",
    );
    expect(output[0]).toMatchObject({
      title: "lavender",
      url: "https://flora.example/lavender",
    });
    expect(output[0]?.image).toBeUndefined();
    expect(JSON.stringify(warnings.mock.calls)).not.toContain("sentinel");
  },
);
