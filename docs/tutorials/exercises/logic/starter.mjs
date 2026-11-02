/** Replace the TODOs. Run with LAB_MODE=starter; compare behavior rather than text. */
export function runtimeSupportsVoice(_runtime) { return false; } // TODO 01
export function cardLayout(_width, _fontScale) { return "row"; } // TODO 02
export function plantHref(_id) { return "/plants/rosemary"; } // TODO 03
export function renamePlant(plants, _id, _nickname) { return plants; } // TODO 04
export async function readPlantPage(response) { return response.json(); } // TODO 05
export function queryKey(_owner) { return ["plants"]; } // TODO 06
export function authorizeRecord(_authenticatedOwner, _recordOwner) { return true; } // TODO 06
export function canCapture({ permissionGranted }) { return permissionGranted; } // TODO 07
export async function syncDraft(_api, _store, initial, _sameOwner) { return initial; } // TODO 08
export function surfacePolicy(_preferences) { return "glass"; } // TODO 09
export function createVoiceCleanup(_resources) { return async () => {}; } // TODO 09
export function releaseBlockers(_report) { return []; } // TODO 10
