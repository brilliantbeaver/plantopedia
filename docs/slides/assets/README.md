# App visuals for the Plantopedia slides

## Actual app captures

These PNGs are **cropped existing evidence**, captured November 1, 2026. They are not new captures of the revised journey UI. The deck labels them “App capture · Nov 1, 2026 · cropped”. Crops retain stable plant reference information and the Save plant action; they exclude outdated home/guest navigation and old catalog-scope wording.

| Slide asset          | Source file                                       | Crop box (left, top, right, bottom) | Output    |
| -------------------- | ------------------------------------------------- | ----------------------------------- | --------- |
| `search-result.png`  | `docs/evidence/plantopedia-search.png`            | `(20, 264, 373, 852)`               | 353 × 588 |
| `plant-visitors.png` | `docs/evidence/plantopedia-profile.png`           | `(20, 90, 373, 723)`                | 353 × 633 |
| `care-save.png`      | `docs/evidence/deployment/sunflower-care-web.png` | `(20, 378, 372, 819)`               | 352 × 441 |

Source provenance: [feature evidence](../../evidence/README.md) and [deployment evidence](../../evidence/deployment/README.md). The first captures used Chrome iPhone 16 emulation and a synthetic local garden; the deployment capture comes from the controlled public web walkthrough. No real user collection or personal upload is shown. Only cropping was applied, using Pillow; colors and content were not regenerated. Crop boxes use Pillow's right/bottom-exclusive coordinates.

`provenance.json` records source SHA-256 hashes, crop coordinates, and output dimensions. The source plant photograph and app visitor art retain their original repository attribution; see the app's Sources display and `src/features/catalog/assets.ts` for photograph credits. These captures are illustrative historical evidence, not verification of current native-device behavior.

## Actual avatar artwork

The four files in `avatars/` are byte-for-byte copies of the current app assets:

- `sprout.png` ← `assets/images/pollinators/avatar-sprout.png`
- `sunshine.png` ← `assets/images/pollinators/avatar-sunshine.png`
- `meadow.png` ← `assets/images/pollinators/avatar-meadow.png`
- `pollen.png` ← `assets/images/pollinators/avatar-pollen.png`

The app's current costs are Sprout 0, Sunshine 25, Meadow 60, and Pollen guardian 120 Pollen. The illustration explicitly marks its account balance and ownership as an example. Source hashes are included in `provenance.json`. The existing artwork is reused; it is not presented as newly generated artwork.

## Interface illustrations and icons

`../app-visuals.mjs` creates focused **interface illustrations**, not screenshots. Every panel says “Interface illustration · current app labels”, and sample account/input states carry an “Example” label. English labels were checked against current source on November 7, 2026:

- Journey: `src/features/journey/copy.ts`, `Journey.tsx`
- Learning challenge: `src/features/journey/learning-copy.ts`, `PollinationLesson.tsx`
- Check-in: `src/features/catalog/activity-copy.ts`, `SpeciesContent.tsx`
- Notes: `src/app/plants/[plantId].tsx`, `src/i18n/locales/en.ts`, `ux.ts`
- Ask: `src/app/(tabs)/ask.tsx`, English/UX copy
- Scan: `src/features/capture/CaptureScreen.tsx`, English/UX/pollinator copy
- Progress/rewards: `src/features/rewards/Progress.tsx`, `rules.ts`, `reward-copy.ts`

The note and question are unsaved/unsent examples. No AI answer is fabricated. Illustrative controls are non-interactive HTML elements. Line icons are original SVG drawings made for this deck, use `currentColor`, and are decorative (`aria-hidden`).
