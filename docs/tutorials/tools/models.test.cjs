'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../assets/models.js');

const good = { items: [{ id: 'fern_01', nickname: 'Kitchen fern' }] };
function accept(state, http = 200, body = good) {
  const pending = M.beginNetwork(state);
  return M.resolveNetwork(pending, pending.owner, pending.generation, http, body);
}

test('two updates in one event differ from updates in separate events', () => {
  assert.equal(M.state(0, 'snapshot', 2), 1);
  assert.equal(M.state(0, 'functional', 2), 2);
  assert.equal(M.state(M.state(0, 'snapshot', 1), 'snapshot', 1), 2);
  assert.equal(M.state(7, 'snapshot', 0), 7);
});

test('rename preserves IDs, prior state, and the untouched neighbor', () => {
  const before = [{ id: 'east', nickname: 'Lemon' }, { id: 'west', nickname: 'Lemon' }];
  const after = M.rename(before, 'east', '  Balcony lemon  ');
  assert.deepEqual(before.map(x => x.nickname), ['Lemon', 'Lemon']);
  assert.deepEqual(after.map(x => x.id), ['east', 'west']);
  assert.equal(after[0].nickname, 'Balcony lemon');
  assert.notEqual(after, before);
  assert.notEqual(after[0], before[0]);
  assert.equal(after[1], before[1]);
  assert.throws(() => M.rename(before, 'east', '  '));
});

test('the declared teaching summary boundary rejects malformed identities and empty names', () => {
  assert.equal(M.inspectResponse(200, good).kind, 'success');
  assert.equal(M.inspectResponse(200, { items: [] }).kind, 'empty');
  for (const item of [{ id: ' ', nickname: 'Fern' }, { id: 'fern', nickname: '' }, { id: 'fern', nickname: '  ' }, { nickname: 'Fern' }, { id: 'a/b', nickname: 'Fern' }]) {
    assert.equal(M.inspectResponse(200, { items: [item] }).kind, 'error');
  }
  assert.equal(M.inspectResponse(503, good).kind, 'error');
  assert.equal(M.inspectResponse(200, null).kind, 'error');
});

test('a failed refresh preserves useful same-owner cache through loading and failure', () => {
  let state = accept(M.newNetwork());
  const prior = state.cache.learner_a;
  state = M.beginNetwork(state);
  assert.equal(state.pending, true);
  assert.equal(state.cache.learner_a, prior);
  state = M.resolveNetwork(state, 'learner_a', state.generation, 503, { code: 'unavailable' });
  assert.equal(state.pending, false);
  assert.equal(state.result.kind, 'error');
  assert.equal(state.cache.learner_a, prior);
  state = accept(state, 200, { items: [{ id: ' ', nickname: '' }] });
  assert.equal(state.result.kind, 'error');
  assert.equal(state.cache.learner_a, prior);
});

test('initial failure is distinct from a cached empty success followed by failure', () => {
  const initial = accept(M.newNetwork(), 503, {});
  assert.equal(Object.hasOwn(initial.cache, initial.owner), false);
  let empty = accept(M.newNetwork(), 200, { items: [] });
  empty = accept(empty, 503, {});
  assert.deepEqual(empty.cache.learner_a.items, []);
  assert.equal(empty.result.kind, 'error');
});

test('owner changes and cancellation reject late results without corrupting either cache', () => {
  let state = accept(M.newNetwork());
  state = M.beginNetwork(state);
  const oldGeneration = state.generation;
  state = M.changeNetworkOwner(state, 'learner_b');
  const unchanged = M.resolveNetwork(state, 'learner_a', oldGeneration, 200, good);
  assert.equal(unchanged, state);
  assert.equal(Object.hasOwn(state.cache, 'learner_b'), false);
  state = accept(state, 200, { items: [{ id: 'rose_02', nickname: 'Patio rose' }] });
  assert.equal(state.cache.learner_b.items[0].id, 'rose_02');
  assert.equal(state.cache.learner_a.items[0].id, 'fern_01');
  state = M.changeNetworkOwner(state, 'learner_a');
  state = M.beginNetwork(state);
  const cancelledGeneration = state.generation;
  state = M.cancelNetwork(state);
  assert.equal(M.resolveNetwork(state, state.owner, cancelledGeneration, 200, { items: [] }), state);
  assert.equal(state.cache.learner_a.items[0].id, 'fern_01');
});

test('camera preparation cannot precede retention and persistence; failure leaves recovery evidence', () => {
  let state = M.newCamera();
  assert.equal(M.cameraStep(state, 'capture'), state);
  state = M.cameraStep(state, 'deny');
  assert.equal(M.cameraStep(state, 'ready'), state);
  state = M.cameraStep(state, 'library');
  assert.equal(state.photo, true);
  assert.equal(M.cameraStep(state, 'prepare'), state);
  state = M.cameraStep(state, 'retain');
  assert.equal(M.cameraStep(state, 'prepare'), state);
  state = M.cameraStep(state, 'persist');
  state = M.cameraStep(state, 'failPrepare');
  assert.equal(state.retained, true);
  assert.equal(state.draftSaved, true);
  assert.equal(state.derivative, false);
  assert.match(state.error, /still available/);
  state = M.cameraStep(state, 'prepare');
  assert.equal(state.derivative, true);
  assert.equal(state.error, '');
});

test('camera capture requires permission plus readiness and new photo resets later steps', () => {
  let state = M.cameraStep(M.newCamera(), 'grant');
  assert.equal(M.cameraStep(state, 'capture'), state);
  state = M.cameraStep(state, 'ready');
  state = M.cameraStep(state, 'capture');
  state = M.cameraStep(M.cameraStep(M.cameraStep(state, 'retain'), 'persist'), 'prepare');
  assert.equal(state.derivative, true);
  state = M.cameraStep(state, 'library');
  assert.equal(state.retained, false);
  assert.equal(state.draftSaved, false);
  assert.equal(state.derivative, false);
});

test('voice accepts current callbacks and rejects the same callback after End and new Start', () => {
  let state = M.voiceStep(M.newVoice(), 'start');
  const firstRun = state.generation;
  state = M.voiceStep(state, 'callback', firstRun);
  assert.equal(state.phase, 'listening');
  assert.equal(state.accepted, 1);
  state = M.voiceStep(state, 'end');
  state = M.voiceStep(state, 'callback', firstRun);
  assert.equal(state.phase, 'idle');
  assert.equal(state.stale, 1);
  state = M.voiceStep(state, 'start');
  const currentRun = state.generation;
  assert.notEqual(currentRun, firstRun);
  state = M.voiceStep(state, 'callback', firstRun);
  assert.equal(state.phase, 'connecting');
  assert.equal(state.stale, 2);
  state = M.voiceStep(state, 'callback', currentRun);
  assert.equal(state.phase, 'listening');
  assert.equal(state.accepted, 2);
});

test('interrupting a reply clears playback while keeping the voice session active', () => {
  let state = M.voiceStep(M.newVoice(), 'start');
  state = M.voiceStep(state, 'callback', state.generation);
  state = M.voiceStep(state, 'playback', state.generation);
  const generation = state.generation;
  assert.equal(state.playing, true);
  state = M.voiceStep(state, 'interrupt');
  assert.equal(state.phase, 'listening');
  assert.equal(state.playing, false);
  assert.equal(state.generation, generation);
  state = M.voiceStep(state, 'end');
  assert.equal(state.phase, 'idle');
  assert.equal(state.playing, false);
});

test('lost acknowledgement reuses operation identity; owner change and deletion stop writes', () => {
  let state = M.outboxStep(M.newOutbox(), true);
  assert.equal(state.checkpoint, 0);
  assert.equal(state.accepted.length, 1);
  state = M.outboxStep(state, false);
  assert.equal(state.checkpoint, 1);
  assert.equal(state.accepted.length, 1);
  const attempts = state.attempts;
  assert.equal(M.outboxStep({ ...state, activeOwner: 'learner_b' }, false).attempts, attempts);
  assert.equal(M.outboxStep({ ...state, deleted: true }, false).attempts, attempts);
  state = M.outboxStep(M.outboxStep(state, false), false);
  assert.equal(state.checkpoint, 3);
  assert.equal(M.outboxStep(state, false).accepted.length, 3);
});
