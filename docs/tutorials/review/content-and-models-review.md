# Independent plan, content, and teaching-model review

Initial read-only review on 2026-11-01 covered lessons 01–05, browser models/labs, SVG sources, and relevant application code. I authored lessons 06–10; my review of those lessons is not independent evidence. Findings below refer to the initial draft. The lead then authorized fixes to browser models/labs and diagram sources.

## Plan assumptions challenged

| Claim | Result | Evidence and boundary |
| --- | --- | --- |
| Ten lessons form a progressive path. | HOLDS. | Lesson 03 connects route identity to later API loading (`content/03-navigation.json:41`); lesson 04 gives Query responsibility for loaded detail (`content/04-state.json:41`); lesson 05 postpones uncertain-write replay to the outbox (`content/05-network.json:74`). |
| Browser experiments provide the promised learning interactions. | BROKEN in initial draft. | The explicit teaching boundary at `assets/labs.js:9` is appropriate, but several controls cannot perform the experiments named in lesson instructions. Findings 1–4 identify reachable mismatches. |
| Models are not represented as real native execution. | HOLDS, with a response-validation caveat. | `assets/labs.js:9` says labs do not run React Native, call the API, store real drafts, or access hardware. Lesson 01 (`content/01-foundations.json:19`) distinguishes Python models from TSX in Expo. Finding 5 requests an equally precise small-schema boundary. |
| No new services are needed for course materials. | HOLDS. | Lesson 05 uses existing session services; lesson 01 (`content/01-foundations.json:74`) explicitly retains Clerk/Firebase prerequisites for configured cloud development. Do not extend the no-account course-reading claim to full cloud acceptance. |
| Glass remains accessible on narrow screens. | NOT REACHED visually in this pass. | CSS provides solid surfaces, reduced transparency/motion, contrast and forced-color paths; SVGs have descriptions. Actual keyboard/zoom/narrow-screen review is still required. |
| Jupyter notebooks and Expo exercises execute correctly. | NOT REACHED in this pass. | Notebooks were being generated. Clean-kernel execution, downloadable-kit paths, actual TSX checks, and native acceptance remain separate evidence. |

The plan's main teaching risk is translation overhead. HTML plus Expo should remain a complete primary path for a JavaScript learner. Python notebooks should explain the relationship to TypeScript and be optional reinforcement, rather than silently adding another language prerequisite.

## Findings in the initial draft

### 1. Medium: cached records disappear in the failure case the network lesson promises to preserve

**Location:** `assets/labs.js:41`–`:47`; requested behavior at `content/05-network.json:86`, `:135`.

**Trigger:** Send the successful fixture, then send API unavailable for the same account. The lab writes `cache[owner]=body` but never reads it into the view. Loading and failure replace the records, so the learner cannot demonstrate the requested failed refresh with useful cached data.

**Fix:** Render only the current owner's cached cards during refresh and after a refresh failure, with a separate update message. Keep an initial failure without data distinct. Verify success → 503, success → malformed refresh, switching accounts, and cancellation.

### 2. Medium: the camera experiment cannot reach preparation failure or derivative recovery

**Location:** `assets/labs.js:55`–`:59`; compare lesson 07's preparation-failure lab instructions.

**Trigger:** Follow the instruction to fail preparation after retaining an original. The initial controls stop at permission/readiness/selection/retention; there is no saved draft, derivative, preparation failure, or retry. The central recovery claim is stated but cannot be exercised.

**Fix:** Add saved-draft and prepared-derivative states, require retention plus persistence before preparation, and preserve both after forced preparation failure. Verify a failed preparation followed by a successful retry, including the denied-camera/library path.

### 3. Medium: voice callbacks are declared stale without a guard being exercised

**Location:** `assets/labs.js:66`–`:69`.

**Trigger:** Deliver an old callback before start, while connected, or after end/new start. The action always increments `stale`; no callback captures a generation and no comparison occurs. A test that checks the ignored count would pass even with no stale-event guard.

**Fix:** Capture the event generation and pass it through a pure event transition. Demonstrate a current callback accepted and the same callback ignored after End/new Start. Include reply playback/interruption if lesson instructions continue requesting interruption.

### 4. Medium: state and layout controls omit actions named in the instructions

**Location:** `content/02-components.json:81` versus `assets/labs.js:26`; `content/04-state.json:86` versus `assets/labs.js:37`–`:39`.

**Trigger:** Adjust text size in lesson 02, or rename a specimen in lesson 04. The layout lab has no size control; the state lab only toggles favorite. The instructions are not completable as written.

**Fix:** Add a bounded font-size control and a nickname/rename action. Show previous/next state or reference evidence so preserving the previous array is observable, rather than only asserted.

### 5. Low: the small response validator needs an explicit teaching-shape boundary

**Location:** `assets/models.js:15`–`:18`; `assets/labs.js:42`, `:46`.

**Trigger:** `inspectResponse(200,{items:[{id:' ',nickname:''}]})` returns success and “Validated 1 specimen records.” The full production `PlantPage` requires valid IDs, nonempty nickname, versioned fields, `nextCursor`, and `limited` (`packages/contracts/src/index.ts:5`, `:67`, `:299`). A smaller model is appropriate, but the initial message can imply equivalence with the actual schema taught nearby.

**Fix:** Name and validate a bounded TeachingSummaryPage, state that it is not full PlantPage validation, and use “teaching summaries” in feedback. Test empty/whitespace/malformed IDs and nicknames. Do not claim these checks cover the full shared contract.

### 6. Low: the state diagram conflates two updates with two separate user events

**Location:** `tools/generate_visuals.py:66`; generated `assets/state.svg` says “Tap twice.”

**Trigger:** Interpret this as two distinct presses. Separate events receive separate snapshots; the lesson's contrast is two updates within one event. The model reproduces the distinction: `state(0,'snapshot',2)===1`, while `state(state(0,'snapshot',1),'snapshot',1)===2`.

**Fix:** Label the stage “One event” and “queue two updaters,” so the graphic communicates its boundary independently of the paragraph.

### 7. Low: voice cleanup caption ambiguously includes conversational interruption

**Location:** `tools/generate_visuals.py:104`; generated `assets/voice.svg` says cleanup occurs on interruption.

**Trigger:** Read interruption as interrupting the AI's reply. Reply interruption clears unheard playback and returns to listening; it does not necessarily close the socket/microphone. `src/platform/live-voice.ts:101`–`:125` separates reply interruption from full cleanup at `:72`. Navigation cleanup is real (`VoiceDock.tsx:188`–`:195`), although the owner-scoped controller object survives routes.

**Fix:** Name full-session boundaries as End/background/route blur/error/account change, and explain reply interruption separately. Do not confuse the controller object's lifetime with an active connection's lifetime.

## Evidence anchors and verification limits

At initial read, models.js had 43 lines ending `})(typeof globalThis !== 'undefined' ? globalThis : this);`; labs.js had 78 lines ending `})();`. Lessons 01–05 had 171, 172, 174, 182, and 187 lines, each ending `}`. The SVG generator had 116 lines ending `print('Wrote',len(list(OUT.glob('*.svg'))),'original SVG illustrations')`. Numbered source reads and pure-model calls supported the findings.

No browser/Python test proves OS permissions, camera orientation, phone-file survival, microphone release, audio quality, native glass availability, store signing, or provider readiness. Syntax/typechecks do not establish usability or complete learner instructions. A stale-counter assertion could pass for the wrong reason in the initial voice lab. A cache-entry assertion could also pass while the network view still erased the cards. Tests must assert the promised transitions and visible results.

No blocking factual defect was found in the written 01–05 explanation of identity, state, cache, authorization, or persistence. The confirmed issues are experiment/control drift and diagram precision.

Initial verdict: needs-attention

## Fix verification

All seven findings were addressed in the browser-model and diagram sources. The lab now includes text size and immutable rename controls; cached same-owner records remain visible during refresh/failure; camera preparation can fail and retry without losing the retained original or persisted draft; voice callbacks carry captured generations and compare them against the current run; reply interruption returns to listening while End advances the generation and closes simulated resources. The response model explicitly declares a smaller TeachingSummaryPage boundary. State and voice diagram captions were corrected and all thirteen SVGs regenerated.

`node --check docs/tutorials/assets/labs.js` and the corresponding models syntax check passed. `node --test docs/tutorials/tools/models.test.cjs` passed **11/11** behavioral tests. These cover the previously untested success→failed refresh, A→B→A owner cache separation, cancellation/late result rejection, denied-camera library recovery, retain/persist/prepare failure/retry, current/old voice generations, reply interruption versus End, immutable rename, summary validation, and uncertain outbox replay.

The pure tests support the state transitions; they do not prove DOM rendering. A rendered browser pass still needs to assert that the controls exist, cached cards actually stay visible, labels wrap, and the final generated course remains keyboard usable. The lead owns that final UI pass and clean-kernel notebook execution.

Fix verdict: approve for the reviewed model/diagram changes, subject to the separate rendered UI and notebook checks.
