import { createServer } from "node:http";
import { watchManagedParent } from "../../../server/src/runtime/managed-parent.ts";

let mode = process.env.FIXTURE_MODE;
if (mode === "exit") process.exit(1);
let checks = 0;
const server = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/block") {
    res.end("{}");
    res.once("finish", () => {
      setImmediate(() => {
        // Simulate provider/native code blocking the API event loop.
        for (;;) {
          /* intentionally blocked */
        }
      });
    });
    return;
  }
  if (req.url === "/recover" && req.method === "POST") mode = "ready";
  if (req.url === "/health") {
    res.end(JSON.stringify({ service: "plantopedia-api", status: "ok" }));
  } else {
    if (mode === "slow-readiness") return;
    checks++;
    const unavailable =
      [
        "unready",
        "exit-during-readiness",
        "permission_denied",
        "PRIVATE_DIAGNOSTIC_SENTINEL",
      ].includes(mode) ||
      (mode === "transient" && checks < 3);
    res.statusCode = unavailable ? 503 : 200;
    res.end(
      JSON.stringify({
        status: unavailable ? "unavailable" : "ready",
        checks: {
          database: unavailable ? "unavailable" : "ready",
          photoStorage: "ready",
        },
        reasons: { database: mode },
        attempt: checks,
      }),
    );
    if (mode === "exit-during-readiness") setImmediate(() => process.exit(1));
  }
});
if (mode !== "hang")
  server.listen(Number(process.env.FIXTURE_PORT), "127.0.0.1");
else setInterval(() => {}, 1000);
function shutdown() {
  server.closeAllConnections();
  server.close(() => process.exit(0));
  if (!server.listening) process.exit(0);
}
process.on("SIGTERM", shutdown);
watchManagedParent(shutdown);
