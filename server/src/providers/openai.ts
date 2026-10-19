import OpenAI from "openai";
import type { ResponseInput, Tool } from "openai/resources/responses/responses";
import type { AssistantProvider } from "../application/ports.js";
import type { Config } from "../config/env.js";
import { AppError } from "../application/errors.js";
export function createAssistant(config: Config): AssistantProvider {
  const client = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
    timeout: 18000,
    maxRetries: 0,
  });
  return {
    async respond(request) {
      const tools: Tool[] = request.tools.map((tool) => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        strict: false,
      }));
      const input: ResponseInput = [
        ...request.history.slice(-12).map((message) => ({
          role: message.role,
          content: message.text.slice(0, 2000),
        })),
        { role: "user", content: request.text },
      ];
      // One HTTP request has a single bounded overall budget; each tool also has its own limits.
      const signal = AbortSignal.timeout(24000);
      try {
        for (let round = 0; round < 4; round++) {
          const response = await client.responses.create(
            {
              model: config.OPENAI_BACKEND_MODEL,
              instructions: request.instructions,
              input,
              tools,
              store: false,
              max_output_tokens: 1200,
            },
            { signal },
          );
          for (const item of response.output) {
            if (
              item.type === "message" ||
              item.type === "function_call" ||
              item.type === "reasoning"
            )
              input.push(item);
            else throw new AppError(502, "unexpected_assistant_output");
          }
          const calls = response.output.filter(
            (item) => item.type === "function_call",
          );
          if (!calls.length) return response.output_text.slice(0, 16000);
          if (calls.length > 8) throw new AppError(502, "tool_limit");
          const executeCall = async (call: (typeof calls)[number]) => {
            let result: unknown;
            try {
              signal.throwIfAborted();
              const args: unknown = JSON.parse(call.arguments);
              result = await request.execute(call.name, args);
            } catch {
              result = {
                error: "tool_failed",
                guidance:
                  "The lookup failed. This is not evidence of an empty collection.",
              };
            }
            return {
              type: "function_call_output" as const,
              call_id: call.call_id,
              output: JSON.stringify(result),
            };
          };
          // Comparing several saved photos must fit the same request deadline.
          // Only independent, read-only tools run concurrently; proposals stay sequential.
          const readOnly = new Set([
            "list_recent_uploads",
            "search_my_plants",
            "get_plant",
            "inspect_photo",
            "search_web",
          ]);
          if (calls.every((call) => readOnly.has(call.name))) {
            input.push(...(await Promise.all(calls.map(executeCall))));
          } else {
            for (const call of calls) input.push(await executeCall(call));
          }
        }
        throw new AppError(502, "tool_limit");
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(502, "assistant_unavailable", false);
      }
    },
    async embed(text) {
      try {
        const response = await client.embeddings.create({
          model: config.OPENAI_EMBEDDING_MODEL,
          dimensions: config.OPENAI_EMBEDDING_DIMENSIONS,
          input: text.slice(0, 8000),
        });
        const item = response.data[0];
        if (!item) throw new Error("empty");
        return item.embedding;
      } catch {
        throw new AppError(502, "embedding_unavailable");
      }
    },
    async inspect(bytes, prompt) {
      try {
        const result = await client.responses.create({
          model: config.OPENAI_BACKEND_MODEL,
          instructions:
            "Describe visible botanical evidence conservatively. Do not certify edibility or diagnose disease. Distinguish observation from inference.",
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: prompt.slice(0, 2000) },
                {
                  type: "input_image",
                  image_url: `data:image/jpeg;base64,${bytes.toString("base64")}`,
                  detail: "low",
                },
              ],
            },
          ],
          store: false,
          max_output_tokens: 800,
        });
        return result.output_text;
      } catch {
        throw new AppError(502, "photo_reasoning_unavailable");
      }
    },
  };
}
