import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Local transport workaround for googleapis/google-cloud-node#9185.
// The locked 11.1.0 response bridge duplicates node-fetch/Storage pipeline
// ownership. Preserve backpressure, errors and cancellation without changing
// listener limits or the SDK's authentication/checksum/retry behavior.
const originalHash =
  "e50d104b01f0c814e4933e9ebc068d921409a7b4eb7c19ac4fece5ab738b1da3";
const replacement = `    if (callback === undefined) {
        // Plantopedia: one backpressured bridge, no second pipeline owner.
        const requestStream = streamEvents(new stream_1.PassThrough());
        let responseStream;
        requestStream.once('close', () => {
            if (responseStream) responseStream.destroy();
        });
        const bridge = () => {
            if (!requestStream.destroyed) responseStream.pipe(requestStream);
        };
        requestStream.once('reading', () => {
            if (responseStream) bridge();
            else requestStream.once('response', bridge);
        });
        options.compress = false;
        teenyRequest.stats.requestStarting();
        fetch(uri, options).then(res => {
            teenyRequest.stats.requestFinished();
            responseStream = res.body;
            // Retain this handler for errors arriving after cancellation.
            responseStream.on('error', err => requestStream.destroy(err));
            responseStream.once('close', () => {
                if (!responseStream.readableEnded && !requestStream.destroyed) {
                    const err = new Error('Premature close');
                    err.code = 'ERR_STREAM_PREMATURE_CLOSE';
                    requestStream.destroy(err);
                }
            });
            if (requestStream.destroyed) {
                responseStream.destroy();
                return;
            }
            const response = fetchToRequestResponse(options, res);
            requestStream.emit('response', response);
        }, err => {
            teenyRequest.stats.requestFinished();
            requestStream.destroy(err);
        });
        return requestStream;
    }
`;

function findStorageTransport() {
  const require = createRequire(import.meta.url);
  const requireFirebase = createRequire(
    require.resolve("firebase-admin/storage"),
  );
  const requireStorage = createRequire(
    requireFirebase.resolve("@google-cloud/storage"),
  );
  return requireStorage.resolve("teeny-request/package.json");
}

export function patchTeenyRequest(packageFile = findStorageTransport()) {
  const { name, version } = JSON.parse(readFileSync(packageFile, "utf8"));
  if (name !== "teeny-request" || version !== "11.1.0")
    throw new Error(
      "Review the Storage stream workaround before changing teeny-request from 11.1.0; run tests/scripts/storage-streams.test.mjs against the replacement.",
    );
  const target = join(dirname(packageFile), "build/src/index.js");
  const source = readFileSync(target, "utf8");
  const start = source.indexOf("    if (callback === undefined) {");
  const end = source.indexOf("    // GET or POST with callback", start);
  const block = source.slice(start, end);
  if (start < 0 || end < 0)
    throw new Error(
      "Unexpected Storage transport source; review the workaround.",
    );
  if (block === replacement) return false;
  if (createHash("sha256").update(block).digest("hex") !== originalHash)
    throw new Error(
      "Unexpected Storage transport source; review the workaround.",
    );
  writeFileSync(
    target,
    source.slice(0, start) + replacement + source.slice(end),
  );
  return true;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const changed = patchTeenyRequest();
  console.log(
    changed
      ? "Applied Storage stream lifecycle fix."
      : "Storage stream lifecycle fix already applied.",
  );
}
