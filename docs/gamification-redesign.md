# Student journey revision

## Problem and design contract

Guests see search without a learning purpose. Signed-in students see unexplained Pollen and levels, a daily quest without a completion rule, and milestones buried in an avatar shop.

The core route is **Explore a plant → Save a plant → Notice changes on three different days**. These are independent checkpoints, not unlock gates. A garden, camera, planting purchase, or consecutive-day streak is not required. The separate practice challenge connects pollen transfer with seed production and explains mistakes without rewarding guesses. Planting is optional.

## Implementation plan

1. Add a public Journey destination and prominent home invitation. Use botanical vector art, numbered steps, named status labels, and one next action.
2. Derive milestones from discovery claims, successfully loaded saved plants, and distinct care days. Failed/loading queries must not masquerade as zero progress. Guest preview must not imply persistence.
3. Provide a short retryable pollination question and next exploration action. Explain how locally native plant variety and seasonal flowers support habitat; never equate game points with measured biodiversity.
4. Explain Pollen, quest completion rules, avatar costs, XP limits, and care days. Repair active-day rollover and owner-specific feedback.
5. Surface local suitability and actual-planting guidance beside actions. Withhold planting rewards for Chinese wisteria where suitability is unverified.
6. Test milestone derivation, guest access, quiz feedback, rollover, and regional guards. Run type, lint, component and reward checks. Inspect responsive rendering when available.

## Adversarial review criteria

- No fake completion from unavailable metadata, pending saves, quiz guesses, or guest previews.
- No garden requirement or streak punishment.
- Next actions reach usable destinations; exploration uses search because direct species links currently bypass discovery awards.
- Deleting saved plants can reopen the save checkpoint; later completed checkpoints remain visible.
- Local suitability is not known beyond the catalog's limited region data.
- Pollen is cosmetic game currency, not an ecological impact score. Existing one-level-per-day accounting remains and must be explained.
- Large text wraps, controls have labels and adequate touch sizes, and status never depends only on color.

## Scientific basis

[USDA NRCS](https://www.nrcs.usda.gov/conservation-basics/animals/insects-pollinators) describes pollen transfer and seed production. The [US Forest Service guide](https://www.fs.usda.gov/wildflowers/pollinators/documents/AttractingPollinatorsV5.pdf) connects native plants with pollinator habitat. The app does not measure regional biodiversity change.

## Workspace

This revision builds on existing uncommitted work and does not reset or commit it. Reward accounting is preserved except the conservative invasive-plant guard.

## Implemented and reviewed

- Added public `/journey`, illustrated home invitation, independent recorded-activity checkpoints, and a next-action route for unsupported saved plants.
- Added a seven-language pollination practice activity with misconception feedback, accessible vector labels, and iOS announcements. It records no mastery or rewards.
- Clarified Pollen, XP, quest completion, avatar names/costs, and planting limits; moved observation controls and regional guidance into view.
- Fixed active-midnight settlement, transient reward dismissal/account isolation, and Wisteria exclusion at both action and settlement boundaries.
- Preserved Journey on sign-in return and used scientific-name fallback when a saved plant has a noncatalog species ID.

The parallel adversarial reviews found and resolved unsupported-plant navigation dead ends, stale-progress disclosure, inaccessible progressbar semantics, hidden planting limits, legacy Wisteria receipt bypass, duplicate avatar labels, and the repeatedly suggested sunflower after all checkpoints finish.

## Verification

- App and server TypeScript checks pass.
- Targeted ESLint passes for changed implementation and new tests.
- Full component run: 35 suites, 212 tests passed (React test act warnings remain in existing asynchronous harnesses).
- Full unit run: 15 suites, 102 tests passed; 72 script tests passed.
- Additional iOS lesson-feedback check: focused lesson suite, 12 tests passed.
- Expo production web export succeeded, including the new Journey route.
- Browser host was unavailable; native Chrome inspection timed out. No visual browser or physical-device acceptance is claimed. Large-text layout and VoiceOver behavior still require device observation despite structural accessibility tests.

## Student tutorial

The [illustrated tutorial](biodiversity-journey-guide.html) and [text walkthrough](biodiversity-journey-guide.md) explain the actual learning and reward flows. Science is attributed to USDA/US Forest Service sources. The guide explicitly separates app activity, learning practice, and real ecological outcomes.

Tutorial validation: the standalone HTML contains five accessible original SVG illustrations, valid section links, and no remote asset dependencies. An independent accuracy review checked it against the app. Document rendering exposed print overlaps; these were corrected and the resulting 11-page print layout inspected. Browser rendering remains unverified because the browser host was unavailable.

Classroom presentation: [12-slide deck](slides/index.html), with Light/Dark/System controls, keyboard navigation, presenter notes, and printable static exports. All 11 control/structure tests pass. All 12 slides were rendered as one page each in both themes and visually reviewed; a caption overlap on slide 4 was corrected and rerendered. Independent review also caught and fixed dark-mode print specificity and skip-link navigation resetting the active slide. This is document-render and harness verification, not an interactive browser acceptance run.
