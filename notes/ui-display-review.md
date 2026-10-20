# Plantopedia display review — 2026-10-19

The botanical visual identity, readable type, and consistent rounded controls work well. The main defects were shared infrastructure and embedded authentication styles, so the corrections preserve the existing design across screens.

## Findings and corrections

| Priority | Finding                                                                                                                                                                                  | Correction                                                                                                                                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Production's Ionicons font returned HTTP 404. Its exported URL contained `assets/node_modules`, which deployment tooling excludes. Every shared icon depended on this file.              | A Metro export asset plugin writes dependency assets and their bundle URLs under `assets/vendor`. Development Metro paths remain unchanged. The deployment verifier now rejects excluded asset paths and missing referenced files. |
| High     | Clerk's embedded card retained `margin-inline: -1px` and a negative block margin inside an overflow-clipped card box. This cut off the left border of the Google button and email field. | Reset the card's logical margins and let the card box show its contents. Apply explicit input/button borders and visible focus outlines.                                                                                           |
| Medium   | The Google icon could shrink away on a 320px-wide login screen.                                                                                                                          | Preserve the provider icon's width, reduce horizontal button padding, and allow its label to wrap.                                                                                                                                 |
| Medium   | Private images disappeared while loading or after authentication/network failures; image decode errors had no fallback.                                                                  | Reserve the image's layout, display loading feedback, and show a localized accessible unavailable state. Failed authentication never falls back to a public URL.                                                                   |
| Medium   | Wide plant-profile and conversation photo frames cropped away useful plant detail.                                                                                                       | Use `contain` for primary plant photos, conversation references, and capture previews. Collection thumbnails retain `cover`.                                                                                                       |
| Medium   | Primary buttons used their own background color for the focus border, making keyboard focus difficult to see.                                                                            | Add an offset web focus outline. Shared icons also reserve their dimensions to prevent layout movement while the font loads.                                                                                                       |

## Review coverage

- Read-only production review: sign-in, Explore, Plants, plant profile, Scan, Ask, and Settings.
- Corrected static-export preview in Chrome: sign-in at desktop and phone widths, including 393px and 320px; narrow Scan, Ask, and Settings; shared navigation icons, wrapping button labels, and composer clearance above navigation.
- Keyboard checks: complete, visible focus outlines on sign-in and primary capture actions without submitting either action.
- Source and component checks cover photo loading, rejected private requests, decode failures, identity changes, cleanup, capture previews, and message photo references.

## Validation

- `npm run typecheck` and `npm run lint` passed.
- All 25 component suites passed: 131 tests.
- Six deployment/export regression tests passed.
- Production-configured Expo export and the deployment verifier passed; 14 directly referenced asset URLs were verified on disk.
- All 20 exported font/image files returned HTTP 200 with the expected byte lengths from the static preview.
- `vercel deploy --dry --json` included all 20 public assets, including the 389,724-byte Ionicons font under `assets/vendor`, while excluding installed dependencies and environment files.
- `git diff --check` passed.

## Production delivery

The corrections were deployed and promoted on 2026-10-20 UTC (2026-10-19 Pacific) to [plantopedia-nine.vercel.app](https://plantopedia-nine.vercel.app). Vercel deployment: [`dpl_Achehag4bPtm4BWKAHkjafoBQt5Z`](https://vercel.com/brilliantbeaver/plantopedia/Achehag4bPtm4BWKAHkjafoBQt5Z).

The candidate passed API health/readiness checks before promotion. Its HTML-referenced JavaScript and Ionicons font matched the local export by SHA-256. After promotion, the public login, Plants, Scan, Ask, Settings, health, and readiness endpoints returned 200. Missing authentication returned 401 for `/v1/plants`; `/.env.clerk.local` returned 404. All 20 public font/image files and the entry bundle matched the local export byte-for-byte.

The local preview uses a development Clerk instance and has no running API, so its API-dependent screens show expected connection errors. Live production data was reviewed separately before the corrections. Full authenticated flows, real-device browsers, and dark-theme rendering have not been revalidated with the corrected deployment.

The existing deployment workflow is still required: `npm run deploy:vercel` builds public assets before uploading. Its staged deployment uses `--skip-domain`; this release was then promoted explicitly. A plain Git-triggered deployment still cannot supply the ignored, locally generated web export.
