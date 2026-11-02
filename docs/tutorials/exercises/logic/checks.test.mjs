import test from "node:test";
import assert from "node:assert/strict";
const mode = process.env.LAB_MODE ?? "solution";
if (!["starter", "solution"].includes(mode)) throw new Error("LAB_MODE must be starter or solution");
const lab = await import(`./${mode}.mjs`);

test("01 runtime: the local voice bridge needs a development build", () => {
  assert.equal(lab.runtimeSupportsVoice("development-build"), true);
  assert.equal(lab.runtimeSupportsVoice("expo-go"), false);
  assert.equal(lab.runtimeSupportsVoice("browser-preview"), false);
});
test("02 layout: narrow screens and large text need breathing room", () => {
  assert.equal(lab.cardLayout(390, 1), "row");
  assert.equal(lab.cardLayout(320, 1), "column");
  assert.equal(lab.cardLayout(430, 1.6), "column");
  assert.throws(() => lab.cardLayout(0, 1), /invalid_size/);
});
test("03 navigation: same species still has distinct specimen routes", () => {
  assert.equal(lab.plantHref("rosemary-east"), "/plants/rosemary-east");
  assert.equal(lab.plantHref("rosemary-west"), "/plants/rosemary-west");
  assert.throws(() => lab.plantHref("../other"), /invalid_id/);
  assert.throws(() => lab.plantHref(""), /invalid_id/);
});
test("04 state: renaming keeps the old snapshot and the stable ID", () => {
  const previous = Object.freeze([Object.freeze({ id: "east", nickname: "Rosemary" }), Object.freeze({ id: "west", nickname: "Rosemary" })]);
  const next = lab.renamePlant(previous, "east", "  Kitchen rosemary  ");
  assert.notEqual(next, previous);
  assert.equal(next[0].nickname, "Kitchen rosemary");
  assert.equal(next[0].id, "east");
  assert.equal(previous[0].nickname, "Rosemary");
  assert.equal(next[1], previous[1]);
  assert.throws(() => lab.renamePlant(previous, "east", "   "), /invalid_nickname/);
});
test("05 HTTP: a resolved fetch can still be an unsuccessful request", async () => {
  let read = false;
  await assert.rejects(lab.readPlantPage({ ok: false, status: 503, json: async () => { read = true; return { items: [] }; } }), /http_503/);
  assert.equal(read, false);
});
test("05 contract: empty success is valid; malformed data must fail", async () => {
  assert.deepEqual(await lab.readPlantPage({ ok: true, status: 200, json: async () => ({ items: [] }) }), { items: [] });
  await assert.rejects(lab.readPlantPage({ ok: true, status: 200, json: async () => ({ items: [{ id: 4, nickname: "Rosemary" }] }) }), /invalid_response/);
  await assert.rejects(lab.readPlantPage({ ok: true, status: 200, json: async () => null }), /invalid_response/);
});
test("06 identity: owner-scoped cache entries stay separate", () => {
  assert.deepEqual(lab.queryKey("alice"), ["alice", "plants"]);
  assert.deepEqual(lab.queryKey("bob"), ["bob", "plants"]);
  assert.notDeepEqual(lab.queryKey("alice"), lab.queryKey("bob"));
  assert.throws(() => lab.queryKey(""), /missing_owner/);
});
test("06 authorization: a cache key does not grant record access", () => {
  assert.equal(lab.authorizeRecord("alice", "alice"), true);
  assert.throws(() => lab.authorizeRecord("bob", "alice"), /forbidden/);
  assert.throws(() => lab.authorizeRecord(null, "alice"), /forbidden/);
});
test("07 camera: permission is only one of four capture conditions", () => {
  const ready = { permissionGranted: true, cameraReady: true, busy: false, focused: true };
  assert.equal(lab.canCapture(ready), true);
  for (const patch of [{ permissionGranted: false }, { cameraReady: false }, { busy: true }, { focused: false }]) assert.equal(lab.canCapture({ ...ready, ...patch }), false);
});
function fixtureServer() {
  const writes = new Map();
  const attempts = [];
  let loseFirstAcknowledgement = true;
  async function send(kind, draft, key) {
    attempts.push(key);
    if (!writes.has(key)) writes.set(key, { kind, id: draft.id });
    if (kind === "plant" && loseFirstAcknowledgement) {
      loseFirstAcknowledgement = false;
      throw new Error("acknowledgement_lost");
    }
  }
  return { writes, attempts, api: { createPlant: (draft, key) => send("plant", draft, key), observe: (draft, key) => send("observation", draft, key), upload: (draft, key) => send("photo", draft, key) } };
}
test("08 outbox: lost acknowledgement retries one operation with one stable key", async () => {
  const server = fixtureServer();
  const initial = { owner: "alice", id: "fern_1", stage: "draft" };
  let persisted = { ...initial };
  const store = { save: async draft => { persisted = { ...draft }; } };
  await assert.rejects(lab.syncDraft(server.api, store, initial, () => true), /acknowledgement_lost/);
  assert.equal(persisted.stage, "draft");
  const result = await lab.syncDraft(server.api, store, persisted, () => true);
  assert.equal(result.stage, "complete");
  assert.equal(persisted.stage, "complete");
  assert.equal(server.writes.size, 3);
  assert.deepEqual(server.attempts, ["plant_fern_1", "plant_fern_1", "observation_fern_1", "photo_fern_1"]);
});
test("08 account boundary: account changes stop later writes and acknowledgements", async () => {
  let sameOwner = true;
  const calls = [];
  const api = { createPlant: async () => { calls.push("plant"); sameOwner = false; }, observe: async () => { calls.push("observation"); }, upload: async () => { calls.push("photo"); } };
  const store = { save: async () => { calls.push("persist"); } };
  await assert.rejects(lab.syncDraft(api, store, { owner: "alice", id: "fern_2", stage: "draft" }, () => sameOwner), /account_changed/);
  assert.deepEqual(calls, ["plant"]);
});
test("08 resume: a recorded observation skips earlier acknowledged steps", async () => {
  const calls = [];
  const api = { createPlant: async () => { calls.push("plant"); }, observe: async () => { calls.push("observation"); }, upload: async (_draft, key) => { calls.push(key); } };
  const store = { save: async draft => { calls.push(draft.stage); } };
  const result = await lab.syncDraft(api, store, { owner: "alice", id: "fern_3", stage: "observation" }, () => true);
  assert.equal(result.stage, "complete");
  assert.deepEqual(calls, ["photo_fern_3", "photo", "complete"]);
});
test("08 concurrency: two foreground syncs for the same draft cannot overlap", async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const api = { createPlant: async () => { await wait; }, observe: async () => {}, upload: async () => {} };
  const store = { save: async () => {} };
  const initial = { owner: "alice", id: "fern_concurrent", stage: "draft" };
  const first = lab.syncDraft(api, store, initial, () => true);
  await assert.rejects(lab.syncDraft(api, store, initial, () => true), /operation_in_progress/);
  release();
  assert.equal((await first).stage, "complete");
});
test("09 surface: accessibility preferences outrank a decorative capability", () => {
  assert.equal(lab.surfacePolicy({ supportsGlass: true, reduceTransparency: false, highContrast: false }), "glass");
  for (const policy of [{ supportsGlass: false, reduceTransparency: false, highContrast: false }, { supportsGlass: true, reduceTransparency: true, highContrast: false }, { supportsGlass: true, reduceTransparency: false, highContrast: true }, {}]) assert.equal(lab.surfacePolicy(policy), "opaque");
});
test("09 voice: a socket cleanup failure does not leave the microphone active", async () => {
  const calls = [];
  let microphoneActive = true;
  const cleanup = lab.createVoiceCleanup({ closeSocket: () => { calls.push("socket"); throw new Error("closed"); }, stopMicrophone: async () => { calls.push("microphone"); microphoneActive = false; } });
  await cleanup(); await cleanup();
  assert.deepEqual(calls, ["socket", "microphone"]);
  assert.equal(microphoneActive, false);
});
test("10 evidence: missing acceptance evidence blocks a release claim", () => {
  const report = { typecheck: true, logicTests: true, deviceCamera: true, deniedPermission: true, offlineRestart: true, accountSwitch: true, voiceCleanup: true, largeText: true };
  assert.deepEqual(lab.releaseBlockers(report), []);
  assert.deepEqual(lab.releaseBlockers({ ...report, offlineRestart: false, voiceCleanup: undefined }), ["offlineRestart", "voiceCleanup"]);
});
