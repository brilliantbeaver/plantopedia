/* Deterministic teaching models. No React/native runtime, live accounts, or durable storage. */
(function (root) {
  'use strict';
  const models = {
    runtime(platform, custom) {
      if (platform === 'web') return { renderer: 'React Native Web → browser DOM', host: 'Web browser', available: !custom, reason: custom ? 'A custom native module cannot run in a browser. Use a web adapter or a development build on a device.' : 'Shared components render through React Native Web. This does not exercise native camera or audio.' };
      return { renderer: `React Native → ${platform === 'ios' ? 'iOS' : 'Android'} native views`, host: custom ? 'Your development build' : 'Matching SDK 57 Expo Go', available: true, reason: custom ? 'A development build compiles your custom module into your own native app. A Metro reload cannot add a native module to Expo Go.' : 'Expo Go can preview supported modules. Verify the device host matches the repository SDK.' };
    },
    state(count, strategy, taps) {
      if (!Number.isInteger(taps) || taps < 0) throw new Error('Expected a nonnegative integer update count');
      return strategy === 'snapshot' && taps > 0 ? count + 1 : count + taps;
    },
    toggle(items, id) { return items.map(item => item.id === id ? { ...item, favorite: !item.favorite } : item); },
    rename(items, id, nickname) {
      const name = nickname.trim();
      if (!name) throw new Error('Please enter a nickname with at least one visible character.');
      return items.map(item => item.id === id ? { ...item, nickname: name } : item);
    },
    route(id) { return `/plants/${encodeURIComponent(id)}`; },
    /* TeachingSummaryPage only: {items:[{id,nickname}]}. Not the full production PlantPage schema. */
    inspectResponse(status, body) {
      if (!(status >= 200 && status < 300)) return { kind: 'error', message: `HTTP ${status}: the request completed, but the operation failed.` };
      const valid = body && Array.isArray(body.items) && body.items.every(item => item && typeof item.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(item.id) && typeof item.nickname === 'string' && item.nickname.trim().length > 0 && item.nickname.trim().length <= 120);
      if (!valid) return { kind: 'error', message: 'The teaching summary JSON shape is unexpected. Do not cache it as valid data.' };
      return { kind: body.items.length ? 'success' : 'empty', message: body.items.length ? `Validated ${body.items.length} teaching summaries.` : 'The request succeeded. This teaching collection has no specimens yet.' };
    },
    key(owner) { return [owner, 'plants']; },
    newNetwork(owner = 'learner_a') { return { owner, generation: 0, pending: false, result: null, cache: {} }; },
    beginNetwork(state) { return { ...state, generation: state.generation + 1, pending: true, result: null }; },
    cancelNetwork(state) { return { ...state, generation: state.generation + 1, pending: false, result: null }; },
    changeNetworkOwner(state, owner) { return { ...models.cancelNetwork(state), owner }; },
    resolveNetwork(state, owner, generation, http, body) {
      if (!state.pending || owner !== state.owner || generation !== state.generation) return state;
      const result = models.inspectResponse(http, body);
      const cache = result.kind === 'error' ? state.cache : { ...state.cache, [owner]: structuredClone(body) };
      return { ...state, pending: false, result, cache };
    },
    mayRead(identity, owner) { return Boolean(identity && identity === owner); },
    glass(platform, supported, reduce) { return platform === 'ios' && supported && !reduce ? 'Native glass, after capability checks' : 'Opaque surface with clear borders'; },
    newCamera() { return { permission: 'unknown', ready: false, photo: false, retained: false, draftSaved: false, derivative: false, error: '' }; },
    cameraStep(state, action) {
      if (action === 'reset') return models.newCamera();
      if (action === 'grant') return { ...state, permission: 'granted', ready: false };
      if (action === 'deny') return { ...state, permission: 'denied', ready: false };
      if (action === 'ready' && state.permission === 'granted') return { ...state, ready: true };
      if (action === 'library' || (action === 'capture' && state.permission === 'granted' && state.ready)) return { ...state, photo: true, retained: false, draftSaved: false, derivative: false, error: '' };
      if (action === 'retain' && state.photo) return { ...state, retained: true };
      if (action === 'persist' && state.retained) return { ...state, draftSaved: true };
      if ((action === 'prepare' || action === 'failPrepare') && state.retained && state.draftSaved) return { ...state, derivative: action === 'prepare', error: action === 'failPrepare' ? 'Preparation failed. The original and saved draft are still available for retry.' : '' };
      return state;
    },
    newVoice() { return { phase: 'idle', generation: 0, stale: 0, accepted: 0, playing: false }; },
    voiceStep(state, action, eventGeneration) {
      if (action === 'start' && state.phase === 'idle') return { ...state, phase: 'connecting', generation: state.generation + 1, playing: false };
      if (action === 'end') return { ...state, phase: 'idle', generation: state.generation + 1, playing: false };
      if (action === 'interrupt' && state.phase !== 'idle') return { ...state, phase: 'listening', playing: false };
      if (action === 'callback' || action === 'playback') {
        if (eventGeneration !== state.generation || state.phase === 'idle') return { ...state, stale: state.stale + 1 };
        return { ...state, accepted: state.accepted + 1, phase: action === 'playback' ? 'speaking' : 'listening', playing: action === 'playback' };
      }
      return state;
    },
    newOutbox() { return { owner: 'learner_a', activeOwner: 'learner_a', id: 'fern_01', checkpoint: 0, accepted: [], attempts: 0, log: [], deleted: false }; },
    outboxStep(previous, lost) {
      const state = { ...previous, accepted: [...previous.accepted], log: [...previous.log] };
      if (state.activeOwner !== state.owner) { state.log.push('STOP: the active account does not own this draft.'); return state; }
      if (state.deleted) { state.log.push('STOP: server reports this specimen deleted; do not recreate it.'); return state; }
      const operations = ['plant', 'observation', 'photo'];
      if (state.checkpoint >= operations.length) { state.log.push('Already complete. No extra write.'); return state; }
      const operation = operations[state.checkpoint], key = `${operation}_${state.id}`;
      state.attempts += 1;
      const existing = state.accepted.includes(key);
      if (!existing) state.accepted.push(key);
      state.log.push(`${state.attempts}. ${key}: ${existing ? 'server reused the prior result' : 'server accepted one write'}.`);
      if (lost) state.log.push('The response was lost. Local checkpoint stays unchanged. Retry the same key.');
      else { state.checkpoint += 1; state.log.push(`Acknowledged. Checkpoint → ${['draft', 'plant', 'observation', 'complete'][state.checkpoint]}.`); }
      return state;
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = models;
  else root.CourseModels = models;
})(typeof globalThis !== 'undefined' ? globalThis : this);
