import { jest } from "@jest/globals";
import { createKindwise } from "../src/providers/kindwise.js";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
function answer(
  name = "Apis mellifera",
  probability = 0.95,
  subject = true,
  rank = "species",
) {
  return {
    status: "COMPLETED",
    result: {
      is_insect: { binary: subject, probability: 0.99 },
      classification: {
        suggestions: [
          {
            id: "bee_id",
            name,
            probability,
            details: { rank, common_names: ["Honey bee"] },
          },
          { id: "other", name: "Bombus terrestris", probability: 0.02 },
        ],
      },
    },
  };
}
test("verified provider response shape maps scores without inventing ecology for unknown taxa", async () => {
  const fetcher = jest
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(answer()), { status: 200 }));
  global.fetch = fetcher;
  const provider = createKindwise("test_only_not_a_credential");
  const bee = await provider.identify(Buffer.from("synthetic_fixture"), "op_1");
  expect(bee.verdict).toBe("pollinator");
  expect(bee.canSting).toBe("yes");
  expect(bee.plants).toEqual(["ncsu_helianthus_annuus"]);
  const body = JSON.parse(String(fetcher.mock.calls[0]![1]!.body));
  expect(Object.keys(body).sort()).toEqual(["images", "similar_images"]);
  fetcher.mockResolvedValue(
    new Response(JSON.stringify(answer("Lucanus cervus")), { status: 200 }),
  );
  expect(
    (await provider.identify(Buffer.from("fixture"), "op_2")).verdict,
  ).toBe("uncertain");
});
test.each([
  [0.4, true, "species"],
  [0.95, false, "species"],
  [0.95, true, "genus"],
])(
  "low confidence, non-subject and genus suggestions remain uncertain",
  async (score, subject, rank) => {
    global.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify(answer("Apis mellifera", score, subject, rank)),
          { status: 200 },
        ),
      );
    const result = await createKindwise("test_only").identify(
      Buffer.from("fixture"),
      "op",
    );
    expect(result.verdict).toBe("uncertain");
    expect(result.speciesId).toBeNull();
    expect(result.canSting).toBe("possible");
  },
);
