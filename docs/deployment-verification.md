# Vercel app, tutorials and identification verification

Run date: 2026-11-01, America/Los_Angeles (some UTC timestamps are 2026-11-02).

## Deployment and publication

The existing `plantopedia` Vercel project serves the Expo web export and Node API together. Public origin: **https://plantopedia-nine.vercel.app**. Native app installation remains a separate EAS workflow. Production candidates are built from source on Vercel/Linux, verified before promotion, and keep the existing Node 22/Express/Build Output API architecture.

The tutorial entry is `/tutorials`, which redirects to `/tutorials/` so relative assets resolve. The course reader, ten lessons, notebooks, downloads and styles/scripts are published by `scripts/publish-tutorials.mjs`. The publisher allowlists course files and referenced repository snapshots; it does not expose the repository or `docs` wholesale. Source examples are escaped read-only HTML under `/tutorials/source/`. Raw `.env`, unlisted files, missing assets and unknown routes return 404. Tutorial responses include a restricted CSP and no-sniff/referrer headers. ZIP downloads have their existing checksum/CRC validation.

`scripts/package-vercel-output.mjs` preserves API/Clerk routes and explicitly routes Explore, My Garden, Scan, Ask, Settings, tasks, search, progress, catalog species and sightings. Root opens Explore. Shared navigation and deep-link behavior remain in Expo Router.

## Secure environment handling

Local `.env` remains ignored and permission-restricted. Only the explicit server/build allowlist in `scripts/vercel-production-env.mjs` was uploaded over authenticated HTTPS to the existing Vercel project, targeting production. Credentials use Vercel sensitive variables; nonsecret configuration uses encrypted variables. Upload responses and variable names/types/targets were verified without printing values. Thirty-three production entries were synchronized in this run.

Production overrides disable Firebase emulators, set the exact public origin, preserve the matching live Clerk proxy/issuer, and force trace input/output redaction. The Vercel control-plane token, Google OAuth credentials managed by Clerk, emulator addresses and irrelevant local settings were excluded. No secret was placed in client configuration, code, tutorials or deployment arguments. `.vercelignore` excludes `.env` variants, private keys, local dependencies and generated outputs. The packager rejects private traced files rather than silently including them.

Both Kindwise product keys authenticated against nonbillable usage endpoints. Plant.id and insect.id have separate allocations; account usage endpoints reported credits available. No Kindwise image identification was run. The plant.id key is stored but unused by the active Pl@ntNet plant primary. See `identification-failover.md` for the real OpenAI fallback path.

Public photo submission remains **disabled** (`ALLOW_PUBLIC_IDENTIFICATION=false`, `IDENTIFICATION_RETENTION_APPROVED=false`) pending suitable retention/improvement terms. The app/tutorials and offline guest guide still work. The global public budget is configured to ten operations/day for a future reviewed enablement. Signed-in plant ID retains its existing authenticated live-provider path. Configuring credentials did not override the original privacy requirement.

## Checks

The initial stale dependency installation was replaced with `npm ci --include=dev` using pinned Node 22.23.1. Earlier dependency-related unit/lint failures recorded in the feature review were resolved without upgrading the framework or changing the lockfile. Vercel CLI 65.8.0 was installed and authenticated; the local CLI directory is outside the shell's default PATH, so the deploy helper resolves the installed global executable.

Validation commands:

```sh
npm run build:api
npm run typecheck
npm run lint
npm run test:unit
npm run test:functional
npm run test:components
npm run test:bundle-secrets
python3 docs/tutorials/tools/verify_artifacts.py
git diff --check
```

The controlled live OpenAI image check returned `Helianthus annuus`, marked `visual_guess`, with exact model `gpt-6.1-sol` after an injected quota error; duration 2.437 seconds. It verifies real model/image/schema access, not primary credit exhaustion or biological accuracy. Tests use fake providers and safe images.

The first live log inspection exposed Express rate-limit warnings about Vercel's `Forwarded` and `X-Forwarded-For` headers. The public relay now uses an explicit platform-aware key generator, rather than broadening global proxy trust or merely disabling validation. Tests verify spoofed headers on direct hosts, malformed/list headers, separate platform addresses, IPv6 subnet grouping, and no proxy warnings. Functional verification after this fix passes 26 suites / 209 tests; type checking and lint also pass. The corrected build is verified and promoted separately below.

### Final promoted result

Production deployment **`dpl_8ZxEa5gsgdaxh5o5Qk9tDxB52eDx`** is READY and promoted at `https://plantopedia-nine.vercel.app`. Its unique URL is `https://plantopedia-8i7w2m4qh-brilliantbeaver.vercel.app`. The public HTML matches the verified export. The preceding compatible app deployment is `dpl_5AQjdisdtvND7PHCPfcoWCHCm4Ht` (`plantopedia-32c9enuak-brilliantbeaver.vercel.app`), which predates the proxy-warning fix.

| Gate | Observed result |
| --- | --- |
| Vercel Linux source build | Pass: contracts, Expo export, tutorial publication, API TypeScript compilation and traced Build Output packaging. |
| Local API build, type checking, lint, whitespace | Pass under Node 22.23.1. |
| Unit and script suites | Pass: 13 Jest suites / 95 tests; 72 Node script tests after the concurrent tutorial merge. |
| Functional API/provider suites | Pass: 26 suites / 209 tests, including fallback/replay and proxy/spoofing cases. |
| Component suites | Pass: 28 suites / 148 tests; the final disclosure fix also passed its focused eight-test suite. |
| Client secret-bundle guard | Pass for iOS/Android/web JavaScript, source maps and public Expo configuration. |
| Actual exported private-value scan | Pass: 184 published files, zero local private values found. |
| Deployed routes/static files | Pass: 26 expected routes/statuses and **all 184 files compared byte-for-byte**, including fonts, bundles, tutorial sources and downloads. |
| Public health/auth boundaries | Health/readiness 200; unauthenticated private plants 401; `.env`, missing/private tutorial sources and unknown paths 404. |
| Proxy correction on live candidate | The public-relay probe exercised actual Vercel forwarding headers; expected gated 503, no image submission. Subsequent error/fatal runtime query returned **zero entries** for this deployment's verification window. |
| Real OpenAI fallback | Pass on a licensed controlled sunflower image after an injected primary quota failure; exact model `gpt-6.1-sol`, unverified suggestion, 2.437 s. |
| Live guest app browser | Pass: seven flows, including typo search, care, durable photo-free save, delete/Undo, rewards, loaded offline search, and 320/768-pixel layouts; no page exceptions. |
| Live tutorial browser | Pass: **33/33 groups**, all ten lessons, quiz/lab interactions, notes/storage failure, mobile layouts, downloads, file opening and JavaScript-free reader; no runtime exceptions or missing assets. |
| Course artifact verifier | Pass: ten notebooks, thirty quizzes, SVG parsing and thirteen ZIP integrity/safe-path/checksum checks. |

Evidence: `docs/evidence/deployment/`, the tutorial's `review/browser-verification.json`, and the HTTP report in `docs/evidence/deployment/http-verification.txt`. Test mocks are not evidence of native camera, real account login, real exhausted-provider credits, or biological accuracy.

The release was frozen in an isolated source snapshot because another session merged tutorial publication changes during upload. The final snapshot includes that publisher and the runtime correction. It excludes `.env` and preserves the shared workspace's unrelated edits. Feature changes remain in the working tree; review and commit them before a future Git-triggered deployment so a deployment of the older Git source does not replace the live feature implementation. No unrelated changes were swept into a commit or push.

## Deployment runbook

Use the existing linked project and reviewed production environment. `npm run deploy:vercel -- --yes` uploads source and builds on Linux; local secret-bearing `.env` is excluded. The command creates a production candidate with `--skip-domain`. Vercel can assign a project alias even when the established public domain is not moved; inspect actual aliases before claiming promotion.

Verify the candidate with `scripts/check-vercel-deployment.mjs <candidate URL>` using an authenticated Vercel CLI for protected deployment access. Match the generated public files to that exact source/build configuration. The checker exercises 26 route expectations and compares every published file byte-for-byte. `vercel promote <candidate URL> --yes` is the explicit public-domain promotion step. Record the previous deployment for rollback; do not rebuild or redeploy the previous source merely to roll back.

Run the tutorial browser harness against the public deployed `/tutorials/` URL and check the app's guest search/profile/care/garden routes. Use controlled browser data, not a user's cloud collection. Review runtime status/logs without outputting request bodies or credentials. Never disable deployment protection globally for verification.

## Remaining evidence gates

Provider retention approval/public upload enablement, a real Kindwise image response, actual exhausted-primary billing behavior, physical-device capture/permissions/accessibility/process-death checks, full Google login and continuous native voice acceptance remain separate gates. No native app binary was deployed by this web task. Existing Vercel hosted worker/voice limitations remain documented in `notes/vercel-deployment-status.md`.
