# Exercise adversarial review

This review used a separate agent context and read the downloadable exercises, their generator, the repository’s actual root layout, session API, contracts, and storage patterns. It challenged runnable placement, state ownership, partial failure, native lifecycle claims, and what the tests actually prove. It was not a cross-model review or native-device acceptance run. All fixes were confined to `docs/tutorials`.

## Verified findings and fixes

1. **Medium — a queued camera press could start after route focus ended.** Before the fix, `07-camera/solution.tsx:20` checked the render’s readiness and the capture lock, but omitted the synchronous `focused.current` guard. A press callback retained from the previous render could still reach `takePictureAsync` after focus cleanup and before React committed the unmounted camera. A direct control-flow reproduction against the compiled teaching component produced one camera call after cleanup. The handler now checks current focus and permission at `07-camera/solution.tsx:22`. The same probe now produces zero calls.

2. **Medium — an old capture result could become the new route session’s preview.** Checking only a focus boolean did not distinguish “still in the original focus session” from “blurred and returned before the promise resolved.” The component now advances a focus version on entry and exit and compares the captured version before displaying a result or failure. See `07-camera/solution.tsx:18` and `07-camera/solution.tsx:27`. A probe starts capture, blurs, refocuses, and resolves the old result; no new photo state is set.

3. **Medium — several copy-ready screens could sit under the phone’s status area or clip enlarged text.** The real root stack hides its header; `SafeAreaProvider` supplies inset information but does not apply padding to a child View. Navigation, state, network, validation, camera, offline, and locale solutions previously used a plain padded View or ScrollView at the route root. Their worked screens now use `SafeAreaView`, and content that can grow uses `ScrollView`. Lessons 01 and 02 also gained scrolling so their large-text acceptance instruction does not depend on one viewport height. Current examples include `03-navigation/solution/src/app/workshop/index.tsx:6`, `05-network/solution.tsx:8`, and `08-offline/solution/OfflineLab.tsx:35`. Layout itself still needs phone verification.

4. **Medium — a successful local save could be reported as a failed save.** The original offline handler awaited `saveDraft`, then awaited a separate `loadDrafts` inside the same catch block. A committed write followed by a failed reread displayed “The local save failed,” retained the input, and assigned another random ID on the next press. The worked screen now displays the successfully written record directly through an immutable update after `saveDraft` resolves, instead of treating a later read as evidence that the write failed. See `08-offline/solution/OfflineLab.tsx:26`. It also waits for the owner’s initial load before allowing a save, preventing a late initial result from replacing the newly added row.

5. **Low — sequential lessons could leave two competing `/workshop` routes.** The single-file exercises use `src/app/workshop.tsx`, while navigation uses `src/app/workshop/index.tsx`. The workspace README now explicitly instructs the reader to remove the previous temporary route when switching between those structures. The route fixture remains outside `src/app`, and the navigation exercise mirrors copy-ready directories.

6. **Low — the dependency-free response model did not state its reduced contract boundary precisely enough.** `logic/readPlantPage` checks a deliberately small display shape of `items`, string IDs, and string nicknames. It does not validate the actual full PlantPage contract. The workspace README and model header now state that limit explicitly; the real TSX API exercise continues to call the existing client, which validates the full schema.

7. **Low — blocked browser camera permission needed browser-specific recovery guidance.** `Linking.openSettings` is a native settings workflow. The camera solution now gives web readers site-permission and reload instructions, and retains native app settings guidance for native platforms. The permission screen also explains the secure-browser requirement.

The exercise generator was updated with the fixes and rerun. Regeneration therefore preserves the corrected files.

## Claims exercised independently

- `node --test docs/tutorials/exercises/logic/checks.test.mjs`: 16 worked checks passed.
- `LAB_MODE=starter node --test docs/tutorials/exercises/logic/checks.test.mjs`: all 16 intentionally unfinished checks failed. This confirms that the default green run is the worked solution, not the learner’s unfinished file.
- `./node_modules/.bin/tsc --noEmit -p docs/tutorials/exercises/tsconfig.json`: the worked TSX examples and helper files passed against this repository’s installed packages.
- `node docs/tutorials/tools/check-exercise-camera.cjs`: three control-flow probes passed for a queued press after blur, duplicate rapid presses, and a stale result after refocusing. These execute the actual transpiled teaching component with controlled hook/native boundaries; they do not run camera hardware.
- `node docs/tutorials/tools/check-foundation-snippets.cjs`: all 11 embedded TS/TSX examples in lessons 01–05 passed their declared virtual placements with this repository’s compiler settings. This caught and corrected an optional `fetch` signal property that was incompatible with `exactOptionalPropertyTypes`.

## Limits and tests that cannot establish the larger claim

The 16 logic checks exercise pure teaching models. Their passing result does not test the TSX screen’s layout, operating-system permission behavior, native camera concurrency, SQLite durability after process termination, real account changes, actual WebSocket audio cleanup, signing, or deployment. The README names this boundary; the camera probes add component control-flow evidence but do not remove the need for device acceptance.

The lost-acknowledgement fixture demonstrates reuse of a stable operation key with a cooperating server. It is not a complete authorization, payload-conflict, or multi-account server implementation. The actual application’s server authorization and idempotency contract must still be traced for the production capstone. A fixture map keyed only by operation key cannot establish cross-account isolation.

The light-palette examples do not establish dark-theme support. The platform exercise explicitly says to integrate production preferences before claiming that support. The capstone’s immediate fixture promises also cannot reliably expose a visibly long pending state; the README points to the HTML latency lab for that experiment.

No unresolved blocking issue was found in the declared teaching-model scope after these fixes. Native layout, camera/permission handling, real storage durability, and authenticated backend behavior remain acceptance work for the learner’s actual Expo run, rather than claims made by these automated checks.
