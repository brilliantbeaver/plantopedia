import { AsyncLocalStorage } from "node:async_hooks";
import { Client } from "langsmith";
import { RunTree } from "langsmith/run_trees";
import type { Config } from "../config/env.js";
import type { Tracer } from "../application/ports.js";
export function createTracer(config: Config): Tracer {
  if (!config.LANGSMITH_TRACING)
    return { run: (_kind, work) => work(), async flush() {} };
  const client = new Client({
    apiKey: config.LANGSMITH_API_KEY,
    apiUrl: config.LANGSMITH_ENDPOINT,
    hideInputs: true,
    hideOutputs: true,
    omitTracedRuntimeInfo: true,
    timeout_ms: 1500,
    maxIngestMemoryBytes: 1024 * 1024,
    callerOptions: { maxRetries: 0 },
    ...(config.LANGSMITH_WORKSPACE_ID
      ? { workspaceId: config.LANGSMITH_WORKSPACE_ID }
      : {}),
  });
  const current = new AsyncLocalStorage<RunTree>();
  const pending = new Set<Promise<unknown>>();
  function enqueue(work: () => Promise<unknown>) {
    if (pending.size >= 100) return;
    const task = Promise.resolve()
      .then(work)
      .catch(() => undefined);
    pending.add(task);
    void task.finally(() => pending.delete(task));
    return task;
  }
  return {
    async run(kind, work) {
      const name = [
        "request",
        "conversation",
        "identification",
        "retrieval",
        "confirmed_write",
        "voice",
      ].includes(kind)
        ? kind
        : "operation";
      const parent = current.getStore();
      let run: RunTree;
      try {
        run = new RunTree({
          name,
          run_type: "chain",
          project_name: config.LANGSMITH_PROJECT,
          client,
          tracingEnabled: true,
          inputs: {},
          ...(parent ? { parent_run: parent } : {}),
        });
      } catch {
        return work();
      }
      const posted = enqueue(() => run.postRun());
      return current.run(run, async () => {
        const start = performance.now();
        let status = "success";
        try {
          return await work();
        } catch (error) {
          status = "failed";
          throw error;
        } finally {
          if (posted)
            enqueue(async () => {
              await posted;
              await run.end({}, undefined, undefined, {
                status,
                durationMs: Math.round(performance.now() - start),
              });
              await run.patchRun();
            });
        }
      });
    },
    async flush() {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.allSettled([...pending]),
          new Promise((resolve) => {
            timer = setTimeout(resolve, 1800);
            timer.unref();
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
