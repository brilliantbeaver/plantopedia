# Course verification and review

This course was created under `docs/tutorials` on November 1, 2026 (America/Los_Angeles). It teaches the inspected Plantopedia repository and keeps production application files outside the tutorial change. The existing checkout contained unrelated work, which was preserved.

## Delivered materials

- Ten progressive lessons, 47 teaching sections, and 30 explained multiple-choice checks.
- Ten interactive browser experiments, editable sketches, guided exercises, notes, and self-reported progress.
- Thirteen original SVG assets, including concept diagrams, the botanical phone illustration, and the brand mark.
- Ten self-contained Jupyter notebooks with embedded illustrations, optional controls, predictions, checks, and Expo examples.
- Ten exercise folders with editable TSX starters, worked solutions, a fixture-backed capstone, and a shared Node workbook.
- A JavaScript-free complete reader, ten per-lesson ZIPs, three bundle ZIPs, and a SHA-256 download manifest.

## Checks actually completed

| Check | Result | Scope |
| --- | --- | --- |
| Browser integration | 33/33 groups passed. | Dedicated Playwright Chromium shell. All ten routes, quiz feedback/retry, persistence, text escaping, export, section jumps, all teaching labs, cancellation/account changes, 390px layouts/menu/Escape, direct file opening, storage failure, static reader with JavaScript disabled, and download endpoints. No runtime exceptions or missing assets. |
| Exercise behavior | 16/16 passed. | Dependency-free Node solution workbook. All 16 unfinished starter cases fail as intended until implemented. |
| Browser model behavior | 11/11 passed. | State batching, immutable rename, bounded response validation, preserved cache, owner changes, cancellation, preparation recovery, actual generation checks, interruption, lost acknowledgments, and stop conditions. |
| Pinned Node runtime | 27/27 combined logic cases passed under Node 22.23.1. | The course's executable JavaScript models; no native or server acceptance is implied. |
| Worked TSX and helpers | TypeScript check passed. | Installed repository dependencies and isolated exercise configuration; deliberately unfinished starters excluded. |
| Embedded TypeScript examples | 21 snippets passed semantic checks. | Eleven foundation and ten advanced examples checked in virtual source placements. The lesson-10 example uses Jest types, since the app configuration excludes test files. |
| Lesson-10 component example | 1/1 Jest test passed. | The actual RetryNotice example under the repository's mobile runner. |
| Camera lifecycle probes | 3/3 passed. | Actual teaching component control flow: queued press after blur, repeated press, and stale result after refocus. Native hardware is not emulated. |
| Notebook schema and execution | 20/20 fresh-kernel runs passed. | All ten notebooks with ipywidgets and again with the optional widgets disabled, using Python 3.14.6. Widget-mode output is retained in the notebooks. |
| Python minimum-version check | 10/10 passed on Python 3.9.6. | Sequential execution of every notebook code cell with widgets disabled. This additional check used IPython display in a plain interpreter, not an ipykernel. |
| JavaScript syntax/lint | Passed. | Entire docs/tutorials tree, including starters and verification scripts. Intentionally unused starter bindings have a documented lint exception; the offline example initializes loading in state and in its owner-change action. |
| Vectors and packaging | Checked by the artifact verifier. | SVG XML/viewBoxes, unique HTML IDs/local targets, notebook/quiz presence, ZIP CRC/safe paths, content equality, and external checksums. Machine-readable results are in artifact-verification.json after packaging. |

The browser runner initially used managed Chrome, whose administrator policy later disabled remote debugging and closed that test connection. Those interrupted results were replaced by a full successful run using the dedicated testing Chromium shell. No Chrome policy was changed. The diagnostic is retained in the browser report.

## Adversarial review and confirmed repairs

The work was divided among content, exercise, renderer, and review roles. Reviewers challenged other authors' work, and the lead verified findings against the files or a concrete trigger. These are independent task contexts, not claims of different model families.

- [Plan, content, and browser models](content-and-models-review.md): repaired missing cached-refresh behavior, unreachable preparation failures, a fake stale-callback demonstration, mismatched layout/state controls, an overbroad response-validator claim, a batching diagram ambiguity, and voice-interruption wording.
- [Exercise review](exercises-review.md): repaired safe-area/scroll handling, camera focus races and stale results, an offline save-error message, route-placement conflicts, reduced-contract wording, and platform recovery instructions.
- [Notebook and packaging review](notebooks-review.md): closed SQLite connections before temporary-directory cleanup, matched notebook directions to actual controls, removed stale embedded manifests, and supplied bundle-specific starting instructions.
- [Visual design review](design-review.md): inspected desktop and mobile renders, calculated representative contrast ratios, added a direct experiment jump, and preserved full SVG label width on narrow screens. Glass surfaces retain an opaque mode and system-preference fallbacks.

The lead also corrected an image-size-control reference that the lab did not implement, clarified route-focus disconnection versus controller lifetime, and updated snippets to the current lazy `database()` opener and required plant draft `mode`. These source changes were detected during semantic checking while the shared app checkout was evolving.

## Evidence limits

The HTML experiments are JavaScript models, and the notebooks execute Python analogies. Neither executes React Native. Their fixture data is explicit. They do not exercise live Clerk, Firebase, plant-identification providers, native camera/audio, real permission prompts, EAS signing, or deployed infrastructure. No new service was provisioned, no app was published, and no production deployment was performed.

Native retained files after process restart, real photo orientation and metadata, microphone release, acoustic interruption behavior, large-text rendering on actual devices, and signed-build acceptance require the app's documented platform workflow. The course describes those checks without presenting them as completed. Browser checks were performed in Chromium; they are not a Safari/Firefox matrix or a formal accessibility certification.

See [browser-verification.json](browser-verification.json), [notebook-execution.json](notebook-execution.json), [python39-compatibility.json](python39-compatibility.json), and [artifact-verification.json](artifact-verification.json) for machine-readable records. The reusable checks are under `tools/` and the exercise workbook.
