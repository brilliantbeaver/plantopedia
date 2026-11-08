import { expect, jest, test } from "@jest/globals";
import { createOpenAIIdentification } from "../src/providers/openai-identification.js";
import {
  withAnimalFallback,
  withPlantFallback,
} from "../src/providers/identification-fallback.js";
import { createKindwise } from "../src/providers/kindwise.js";
import { createPlantnet } from "../src/providers/plantnet.js";
import { AppError } from "../src/application/errors.js";
import type { Config } from "../src/config/env.js";

const images = [{ bytes: Buffer.from("synthetic_fixture"), organ: "auto" }];
const config = {
  OPENAI_API_KEY: "test_only_not_a_key",
  PLANTNET_API_KEY: "test_only",
  PLANTNET_PROJECT: "all",
} as Config;
function response(value: unknown, status = "completed") {
  return new Response(
    JSON.stringify({
      object: "response",
      id: "resp_fixture",
      status,
      output: [
        {
          type: "message",
          id: "msg_fixture",
          role: "assistant",
          status: "completed",
          content: [
            {
              type: "output_text",
              text: JSON.stringify(value),
              annotations: [],
            },
          ],
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
const plant = {
  subject: "plant",
  scientificName: "Helianthus annuus",
  commonName: "Sunflower",
  possibleSting: false,
};
const animal = {
  subject: "animal",
  scientificName: "Apis mellifera",
  commonName: "Honey bee",
  possibleSting: true,
};

test("successful and no-match primary results do not spend an OpenAI call", async () => {
  const fallback = {
    identify: jest.fn(async () => ({ candidates: [], version: "fallback" })),
  };
  for (const candidates of [
    [],
    [
      {
        scientificName: "Helianthus annuus",
        commonNames: [],
        authorship: "",
        score: 0.4,
        taxonId: null,
      },
    ],
  ]) {
    const original = { candidates, version: "primary" };
    expect(
      await withPlantFallback(
        { identify: async () => original },
        fallback,
      ).identify(images, "en"),
    ).toEqual(original);
  }
  expect(fallback.identify).not.toHaveBeenCalled();
});

test.each([402, 429, 401, 500])(
  "Pl@ntNet HTTP %i falls back once with source evidence and no confidence fabrication",
  async (status) => {
    const prior = global.fetch;
    const primary = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status }));
    global.fetch = primary;
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(response(plant));
    try {
      const result = await withPlantFallback(
        createPlantnet(config),
        createOpenAIIdentification(config, fetcher).plant,
      ).identify(images, "fr");
      expect(result).toMatchObject({
        provider: "openai_vision",
        version: "gpt-6.1-sol",
        fallback: { from: "plantnet" },
        candidates: [{ score: 0, taxonId: null, assessment: "visual_guess" }],
      });
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledTimes(1);
      const body = JSON.parse(String(fetcher.mock.calls[0]![1]!.body));
      expect(body).toMatchObject({
        model: "gpt-6.1-sol",
        store: false,
        text: { format: { strict: true } },
      });
      expect(body.input[0].content[1].image_url).toContain(
        images[0]!.bytes.toString("base64"),
      );
      expect(body.instructions).toContain("locale fr");
    } finally {
      global.fetch = prior;
    }
  },
);

test.each(["credit", "malformed", "timeout"])(
  "Kindwise %s failure invokes one conservative animal fallback",
  async (kind) => {
    const prior = global.fetch;
    const primary = jest.fn<typeof fetch>();
    if (kind === "timeout")
      primary.mockRejectedValue(new DOMException("deadline", "TimeoutError"));
    else
      primary.mockResolvedValue(
        new Response(kind === "malformed" ? "not-json" : "{}", {
          status: kind === "credit" ? 402 : 200,
        }),
      );
    global.fetch = primary;
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(response(animal));
    try {
      const result = await withAnimalFallback(
        createKindwise("test_only"),
        createOpenAIIdentification(config, fetcher).animal,
      ).identify(images[0]!.bytes, "operation_fixture");
      expect(result).toMatchObject({
        id: "operation_fixture",
        provider: "openai_vision:gpt-6.1-sol",
        scientificName: "Apis mellifera",
        speciesId: null,
        score: 0,
        verdict: "uncertain",
        canSting: "possible",
        plants: [],
        sourceUrl: null,
        fallback: {
          from: "kindwise_insect_v1",
          reason:
            kind === "credit"
              ? "credit_or_quota"
              : kind === "malformed"
                ? "invalid_response"
                : "timeout",
        },
      });
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = prior;
    }
  },
);

test("non-subject or invented taxon never becomes a plant candidate", async () => {
  for (const value of [
    { ...plant, subject: "other" },
    { ...plant, scientificName: "made_up_identifier" },
  ]) {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(response(value));
    expect(
      (
        await createOpenAIIdentification(config, fetcher).plant.identify(
          images,
          "en",
        )
      ).candidates,
    ).toEqual([]);
  }
});
test.each(["quota", "malformed", "incomplete", "refusal"])(
  "OpenAI %s fails safely with no SDK retry or synthetic result",
  async (kind) => {
    const fetcher = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        kind === "quota"
          ? new Response("{}", { status: 429 })
          : kind === "malformed"
            ? response({ unexpected: true })
            : kind === "refusal"
              ? response(null)
              : response(plant, "incomplete"),
      );
    const provider = createOpenAIIdentification(config, fetcher);
    await expect(provider.plant.identify(images, "en")).rejects.toMatchObject({
      code: "identification_fallback_unavailable",
      retryable: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
test("local validation or authorization failure cannot dispatch fallback", async () => {
  const fallback = {
    identify: jest.fn(async () => ({ candidates: [], version: "unused" })),
  };
  const primary = {
    identify: async () => {
      throw new AppError(401, "unauthorized");
    },
  };
  await expect(
    withPlantFallback(primary, fallback).identify(images, "en"),
  ).rejects.toMatchObject({ code: "unauthorized" });
  expect(fallback.identify).not.toHaveBeenCalled();
});
