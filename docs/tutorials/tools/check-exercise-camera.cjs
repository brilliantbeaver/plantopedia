/* global __dirname */
// Control-flow probes for the actual teaching component. These do not emulate
// camera hardware, render layout, or replace acceptance on a real phone.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const file = path.resolve(__dirname, '../exercises/07-camera/solution.tsx');
const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
function harness() {
  let startFocus, cleanup, calls = 0, refCount = 0, stateCount = 0, finish;
  const state = [true, true, false, null, ''];
  const changes = [];
  const pending = new Promise(resolve => { finish = resolve; });
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: {
      useCallback: f => f,
      useRef: initial => ({ current: refCount++ === 0
        ? { takePictureAsync: () => { calls++; return pending; } } : initial }),
      useState: () => {
        const index = stateCount++;
        return [state[index], value => changes.push({ index, value })];
      },
    },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true, canAskAgain: true }, async () => {}] },
    'expo-router': { useFocusEffect: f => { startFocus = f; cleanup = f(); } },
    'react-native': { Image: 'Image', Linking: {}, Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  };
  const context = { exports: {}, require: name => modules[name] };
  vm.runInNewContext(code, context);
  const tree = context.exports.default();
  function find(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Pressable') return node;
    for (const child of [].concat(node.props?.children ?? [])) {
      const result = find(child);
      if (result) return result;
    }
  }
  const press = find(tree).props.onPress;
  return { press, blur: () => cleanup(), refocus: () => { cleanup = startFocus(); },
    calls: () => calls, finish: () => finish({ uri: 'temporary-photo' }),
    photoChanges: () => changes.filter(change => change.index === 3) };
}
(async () => {
  const blurred = harness();
  blurred.blur(); blurred.press();
  assert.equal(blurred.calls(), 0, 'A queued press after focus cleanup must not call the camera.');

  const rapid = harness();
  rapid.press(); rapid.press();
  assert.equal(rapid.calls(), 1, 'A synchronous ref lock must reject a second pending capture.');
  rapid.finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(rapid.photoChanges().length, 1);

  const previousFocus = harness();
  previousFocus.press(); previousFocus.blur(); previousFocus.refocus();
  previousFocus.finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(previousFocus.photoChanges().length, 0,
    'An older focus session must not replace the current photo.');
  console.log('3 camera control-flow probes passed: blur, duplicate press, stale focus result.');
})().catch(error => { console.error(error); process.exitCode = 1; });
