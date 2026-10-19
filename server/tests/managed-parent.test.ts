import { test, expect, jest } from "@jest/globals";
import { EventEmitter } from "node:events";
import { watchManagedParent } from "../src/runtime/managed-parent.js";

test("standalone APIs ignore IPC state and do not register parent listeners", () => {
  const shutdown = jest.fn();
  const runtime = Object.assign(new EventEmitter(), {
    env: {},
    connected: false,
  });
  watchManagedParent(shutdown, runtime);
  expect(shutdown).not.toHaveBeenCalled();
  expect(runtime.listenerCount("disconnect")).toBe(0);
});

test("a managed API shuts down once when its parent disappears", () => {
  const shutdown = jest.fn();
  const runtime = Object.assign(new EventEmitter(), {
    env: { PLANTOPEDIA_MANAGED_API: "true" },
    connected: true,
  });
  watchManagedParent(shutdown, runtime);
  runtime.emit("disconnect");
  runtime.emit("disconnect");
  expect(shutdown).toHaveBeenCalledTimes(1);
});

test("a parent lost during imports is detected before the API is left running", () => {
  const shutdown = jest.fn();
  const runtime = Object.assign(new EventEmitter(), {
    env: { PLANTOPEDIA_MANAGED_API: "true" },
    connected: false,
  });
  watchManagedParent(shutdown, runtime);
  expect(shutdown).toHaveBeenCalledTimes(1);
});
