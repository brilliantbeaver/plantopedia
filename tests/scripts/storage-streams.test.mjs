import { test } from "node:test";
import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { defaultMaxListeners, once } from "node:events";
import { createRequire } from "node:module";
import { setImmediate, setTimeout } from "node:timers/promises";
import { readFile, writeFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import { PassThrough } from "node:stream";
import { runInNewContext } from "node:vm";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { patchTeenyRequest } from "../../scripts/patch-teeny-request.mjs";

const require = createRequire(import.meta.url);
const requireFirebase = createRequire(
  require.resolve("firebase-admin/storage"),
);
const { Storage, CRC32C } = requireFirebase("@google-cloud/storage");
const bytes = Buffer.alloc(2_369_405);
for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
const crc = new CRC32C();
crc.update(bytes);

async function fixture(t, handler) {
  assert.equal(defaultMaxListeners, 10);
  const warnings = [];
  const countWarning = (warning) => {
    if (warning.name === "MaxListenersExceededWarning") warnings.push(warning);
  };
  process.on("warning", countWarning);
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await setImmediate();
    process.removeListener("warning", countWarning);
    assert.deepEqual(
      warnings.map((warning) => warning.message),
      [],
    );
    assert.equal(defaultMaxListeners, 10);
  });
  const storage = new Storage({
    apiEndpoint: `http://127.0.0.1:${server.address().port}`,
    projectId: "offline-stream-regression",
    retryOptions: { autoRetry: false },
  });
  return storage.bucket("synthetic").file("photo.jpg");
}

function headers(overrides = {}) {
  return {
    "content-length": bytes.length,
    "x-goog-hash": `crc32c=${crc.toString()}`,
    "x-goog-stored-content-encoding": "identity",
    ...overrides,
  };
}

test("Storage downloads preserve every byte and CRC32c across twelve parallel reads without listener warnings", async (t) => {
  let requests = 0;
  const file = await fixture(t, (_req, res) => {
    requests++;
    res.writeHead(200, headers());
    res.end(bytes);
  });
  await Promise.all(
    Array.from({ length: 12 }, async () => {
      const [received] = await file.download();
      assert.deepEqual(received, bytes);
    }),
  );
  assert.equal(requests, 12);
});

test("Storage retains checksum rejection rather than accepting corrupt photo bytes", async (t) => {
  const file = await fixture(t, (_req, res) => {
    res.writeHead(200, headers({ "x-goog-hash": "crc32c=AAAAAA==" }));
    res.end(bytes);
  });
  await assert.rejects(file.download(), { code: "CONTENT_DOWNLOAD_MISMATCH" });
});

test("Storage download reports upstream HTTP failures", async (t) => {
  const file = await fixture(t, (_req, res) => {
    res.writeHead(503, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: { code: 503, message: "synthetic outage" } }),
    );
  });
  await assert.rejects(file.download(), { code: 503 });
});

test("Storage download rejects a truncated response instead of hanging or returning a partial photo", async (t) => {
  const file = await fixture(t, (_req, res) => {
    res.writeHead(200, headers());
    res.write(bytes.subarray(0, 1024));
    setTimeout(10).then(() => res.destroy());
  });
  await assert.rejects(file.download());
});

test("cancelling a Storage read closes the upstream response and stops production", async (t) => {
  let resolveClosed;
  const closed = new Promise((resolve) => {
    resolveClosed = resolve;
  });
  const file = await fixture(t, (_req, res) => {
    res.writeHead(200, headers());
    res.write(bytes.subarray(0, 1024));
    res.once("close", resolveClosed);
  });
  const stream = file.createReadStream();
  const first = once(stream, "data");
  await first;
  stream.destroy();
  await Promise.race([
    closed,
    setTimeout(1500, undefined, { ref: false }).then(() => {
      throw new Error(
        "Upstream response remained open after consumer cancellation",
      );
    }),
  ]);
  assert.equal(stream.destroyed, true);
});

test("parallel byte ranges retain backpressure and exact range contents", async (t) => {
  const start = 123;
  const end = 98_765;
  const part = bytes.subarray(start, end + 1);
  const file = await fixture(t, (req, res) => {
    assert.equal(req.headers.range, `bytes=${start}-${end}`);
    res.writeHead(
      206,
      headers({
        "content-length": part.length,
        "content-range": `bytes ${start}-${end}/${bytes.length}`,
      }),
    );
    res.end(part);
  });
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      const chunks = [];
      for await (const chunk of file.createReadStream({ start, end }))
        chunks.push(chunk);
      assert.deepEqual(Buffer.concat(chunks), part);
    }),
  );
});

const requireStorage = createRequire(
  requireFirebase.resolve("@google-cloud/storage"),
);
const transportFile = requireStorage.resolve("teeny-request");

async function controlledTransport() {
  const source = await readFile(transportFile, "utf8");
  const fetchBinding =
    "const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));";
  assert.ok(source.includes(fetchBinding));
  let deliver;
  let fail;
  const response = new Promise((resolve, reject) => {
    deliver = resolve;
    fail = reject;
  });
  const exports = {};
  // Exercise the installed transport; replace only the network fetch boundary.
  runInNewContext(
    source.replace(fetchBinding, "const fetch = () => fixtureFetch();"),
    {
      exports,
      require: createRequire(transportFile),
      Buffer,
      Headers,
      fixtureFetch: () => response,
    },
  );
  const request = exports.teenyRequest({ uri: "http://127.0.0.1/synthetic" });
  const body = new PassThrough();
  return {
    request,
    body,
    fail,
    deliver: () =>
      deliver({
        body,
        headers: new Headers(),
        url: "http://127.0.0.1/synthetic",
        status: 200,
        statusText: "OK",
      }),
  };
}

async function collect(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

test("transport supports both response/read orderings and backpressures a slow consumer", async () => {
  for (const readFirst of [true, false]) {
    const { request, body, deliver } = await controlledTransport();
    const response = once(request, "response");
    if (readFirst) request.read(0);
    deliver();
    await response;
    if (!readFirst) request.read(0);
    // No data listener consumes the request yet; the pipe must pause the body.
    const payload = Buffer.alloc(256 * 1024, 0x45);
    body.write(payload);
    await setImmediate();
    assert.equal(body.write(payload), false);
    assert.ok(request.readableLength <= payload.length);
    assert.equal(body.isPaused(), true);
    const finished = collect(request);
    body.end();
    assert.deepEqual(await finished, Buffer.concat([payload, payload]));
    assert.equal(body.getMaxListeners(), 10);
    assert.equal(request.getMaxListeners(), 10);
  }
});

test("transport destroys a response arriving after cancellation and handles late body errors", async () => {
  const { request, body, deliver } = await controlledTransport();
  const closed = once(request, "close");
  request.destroy();
  await closed;
  deliver();
  await setImmediate();
  assert.equal(body.destroyed, true);
  assert.doesNotThrow(() =>
    body.emit("error", new Error("late synthetic body error")),
  );
});

test("transport preserves the original body and fetch failures and rejects premature closure", async () => {
  for (const failure of ["body", "fetch", "premature"]) {
    const { request, body, deliver, fail } = await controlledTransport();
    const result = collect(request);
    const original = new Error("synthetic upstream error");
    const rejected = assert.rejects(result, (error) =>
      failure === "premature"
        ? error.code === "ERR_STREAM_PREMATURE_CLOSE"
        : error === original,
    );
    if (failure === "fetch") fail(original);
    else {
      deliver();
      await setImmediate();
      body.destroy(failure === "body" ? original : undefined);
    }
    await rejected;
    assert.equal(request.destroyed, true);
  }
});

test("Storage install patch is reproducible, idempotent and rejects changed versions or source", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plantopedia-storage-patch-"));
  try {
    const packageFile = join(directory, "package.json");
    const target = join(directory, "build/src/index.js");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(
      packageFile,
      JSON.stringify({ name: "teeny-request", version: "11.1.0" }),
    );
    const original = await readFile(
      new URL("./fixtures/teeny-request-11.1.0-stream.txt", import.meta.url),
      "utf8",
    );
    await writeFile(target, original + "    // GET or POST with callback\n");
    assert.equal(patchTeenyRequest(packageFile), true);
    const patched = await readFile(target, "utf8");
    assert.equal(patchTeenyRequest(packageFile), false);
    assert.equal(await readFile(target, "utf8"), patched);
    assert.ok((await readFile(transportFile, "utf8")).includes(patched));
    await writeFile(
      packageFile,
      JSON.stringify({ name: "teeny-request", version: "11.1.1" }),
    );
    assert.throws(
      () => patchTeenyRequest(packageFile),
      /Review the Storage stream workaround/,
    );
    assert.equal(await readFile(target, "utf8"), patched);
    await writeFile(
      packageFile,
      JSON.stringify({ name: "teeny-request", version: "11.1.0" }),
    );
    await writeFile(
      target,
      original.replace("options.compress = false", "options.compress = true") +
        "    // GET or POST with callback\n",
    );
    assert.throws(
      () => patchTeenyRequest(packageFile),
      /Unexpected Storage transport source/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
