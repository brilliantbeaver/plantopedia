/** Pure JavaScript teaching models. These functions do not run React or native APIs.
 * readPlantPage checks only the declared items/id/nickname display shape, not the full server schema. */
export function runtimeSupportsVoice(runtime) {
  return runtime === "development-build";
}
export function cardLayout(width, fontScale) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(fontScale) || fontScale <= 0) throw new Error("invalid_size");
  return width < 360 || fontScale > 1.3 ? "column" : "row";
}
export function plantHref(id) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error("invalid_id");
  return `/plants/${encodeURIComponent(id)}`;
}
export function renamePlant(plants, id, nickname) {
  const clean = nickname.trim();
  if (!clean) throw new Error("invalid_nickname");
  return plants.map(plant => plant.id === id ? { ...plant, nickname: clean } : plant);
}
export async function readPlantPage(response) {
  if (!response.ok) throw new Error(`http_${response.status}`);
  const body = await response.json();
  if (!body || !Array.isArray(body.items) || body.items.some(plant => !plant || typeof plant.id !== "string" || typeof plant.nickname !== "string")) throw new Error("invalid_response");
  return { items: body.items.map(plant => ({ id: plant.id, nickname: plant.nickname })) };
}
export function queryKey(owner) {
  if (typeof owner !== "string" || !owner.trim()) throw new Error("missing_owner");
  return [owner, "plants"];
}
export function authorizeRecord(authenticatedOwner, recordOwner) {
  if (!authenticatedOwner || authenticatedOwner !== recordOwner) throw new Error("forbidden");
  return true;
}
export function canCapture({ permissionGranted, cameraReady, busy, focused }) {
  return permissionGranted === true && cameraReady === true && busy === false && focused === true;
}
const running = new Set();
/** Resumable foreground model. Stable keys require a server that honors idempotency. */
export async function syncDraft(api, store, initial, sameOwner) {
  const scope = `${initial.owner}/${initial.id}`;
  if (running.has(scope)) throw new Error("operation_in_progress");
  running.add(scope);
  let draft = { ...initial };
  const assertOwner = () => { if (!sameOwner()) throw new Error("account_changed"); };
  async function advance(stage) {
    assertOwner();
    draft = { ...draft, stage };
    await store.save(draft);
  }
  try {
    assertOwner();
    if (draft.stage === "draft") {
      await api.createPlant(draft, `plant_${draft.id}`);
      await advance("plant");
    }
    assertOwner();
    if (draft.stage === "plant") {
      await api.observe(draft, `observation_${draft.id}`);
      await advance("observation");
    }
    assertOwner();
    if (draft.stage === "observation") {
      await api.upload(draft, `photo_${draft.id}`);
      await advance("photo");
    }
    assertOwner();
    if (draft.stage === "photo") await advance("complete");
    if (draft.stage !== "complete") throw new Error("invalid_stage");
    return draft;
  } finally { running.delete(scope); }
}
export function surfacePolicy({ supportsGlass, reduceTransparency, highContrast }) {
  return supportsGlass === true && reduceTransparency === false && highContrast === false ? "glass" : "opaque";
}
export function createVoiceCleanup({ closeSocket, stopMicrophone }) {
  let cleanup;
  return () => {
    cleanup ??= Promise.allSettled([
      Promise.resolve().then(closeSocket),
      Promise.resolve().then(stopMicrophone),
    ]);
    return cleanup;
  };
}
export function releaseBlockers(report) {
  return ["typecheck", "logicTests", "deviceCamera", "deniedPermission", "offlineRestart", "accountSwitch", "voiceCleanup", "largeText"].filter(key => report[key] !== true);
}
