# Web and API production deployment — 2026-10-19

## Latest release: UI display and exported assets

Deployed and promoted on 2026-10-20 UTC (2026-10-19 Pacific). The public site is [plantopedia-nine.vercel.app](https://plantopedia-nine.vercel.app), now serving [`dpl_Achehag4bPtm4BWKAHkjafoBQt5Z`](https://vercel.com/brilliantbeaver/plantopedia/Achehag4bPtm4BWKAHkjafoBQt5Z).

This release fixes missing icon fonts, clipped Clerk form borders, narrow-screen provider icons, private-photo loading/error display, photo cropping, and keyboard focus visibility. Exported dependency assets now use `assets/vendor` so Vercel upload exclusions cannot discard them. The earlier `assets/node_modules` exception did not reliably preserve the font in the subsequent production deployment.

The normal cloud build completed successfully. The candidate passed health/readiness and artifact checks before promotion. After promotion, all five checked page routes, `/health`, and `/ready` returned 200; unauthenticated `/v1/plants` returned 401 and the private environment-file path returned 404. All 20 exported font/image files and the HTML-referenced JavaScript matched the verified local build. Local validation passed typecheck, lint, 131 component tests, and six export/deployment regression tests. See [the display review](ui-display-review.md) for coverage and remaining acceptance boundaries.

## Previous authentication release

The current Expo web and API revision was deployed and promoted to production successfully. Production Google login now creates an active session. A subsequent exact-issuer mismatch was fixed; real production-session requests now successfully read plants, conversations and preferences. The new production account is empty while the matching Development account owns the saved records; copying awaits the user’s choice. Full data/provider acceptance remains separate.

| Item | Value |
| --- | --- |
| Public web and API | https://plantopedia-nine.vercel.app |
| Project | https://vercel.com/brilliantbeaver/plantopedia |
| Deployment | https://vercel.com/brilliantbeaver/plantopedia/8Qt3q9eDt87Uv3cHXbPGnQtaNLbv |
| Deployment ID | `dpl_8Qt3q9eDt87Uv3cHXbPGnQtaNLbv` |
| Source commit | `1cabab2b22d417bb588223037936bdcf8bead4c8` (isolated deployment checkout) |
| Status | `READY`, production; public alias verified against the new deployment |
| Runtime | Express, Node.js 22, region `iad1` |

Deployment used an isolated committed source copy and an Expo web export generated before upload. Private environment files were excluded from uploads. Existing production environment variables were reused. The candidate was checked using Vercel's protection-aware CLI before promotion, then checked again through the public URL. See the [local Clerk runbook](clerk-local-and-google.md) for the separate local development diagnostic exposure and required development-secret rotation.

The project's registered domain is `plantopedia-nine.vercel.app`. `plantopedia.vercel.app` is not a domain of this project and currently serves a different site.

## Verified

Latest issuer/asset correction: authenticated production-session reads return 200 for plants, conversations and preferences. Missing, invalid and Development tokens remain rejected. The exported Ionicons font now returns 200 and matches the local artifact. 44 configuration/identity tests, 177 backend tests, typecheck and lint passed. Saved Development data has not been copied; the user’s choice is pending.


Earlier callback deployment (2026-10-19 22:43 UTC):

- `/login`, `/plants`, `/health` and `/ready` return 200; unauthenticated `/v1/plants` returns 401; `/.env.clerk.local` returns 404.
- The deployed HTML-referenced JavaScript exactly matches the verified candidate SHA-256. Production Clerk's proxied environment returns 200. Google initiation uses the supplied client ID and the existing `/__clerk/v1/oauth_callback`, and reaches Google's sign-in page with 200.
- Web auth now mounts Clerk's hash-routed SignIn and sets app-hosted `/login` URLs. Thirteen component tests, three export-verifier fixtures, typecheck and lint passed; independent adversarial reviews were triaged.
- Vercel cloud builds were queued; the promoted candidate used local prebuilt output with exact official Linux ARM64 sharp 0.35.5 and libvips 1.3.4 packages added for the production architecture. The earlier macOS-only candidate returned API 500 and was never promoted to the public domain. API health/readiness passed before and after the corrected candidate was promoted.
- Clerk's instance-level sign-in/sign-up defaults still point to the unreachable Account Portal. The app overrides them, but dashboard Paths/Account Portal settings and real Google callback acceptance remain pending. Browser work was deferred because Chrome was actively sharing the desktop in a meeting. Start fresh at `https://plantopedia-nine.vercel.app/login`; reloading an old accounts-host callback cannot use the new app.

Earlier web/auth deployment checks:

- Root returns 307 to `/plants`; `/plants` and `/settings` return HTML with HTTP 200.
- `/health` and `/ready` return 200; unauthenticated `/v1/plants` returns 401.
- `/.env.clerk.local` and `/server.js` return 404.
- Deployed web JavaScript matches the locally scanned export by SHA-256; checked secret values are absent.
- Typecheck and lint passed, along with 49 script tests, 6 web-auth unit tests and 12 authentication component tests.
- A synthetic development session was accepted by the local API and rejected by production; the temporary user/session were deleted.
- Local Google flow reached the account chooser. Production initially failed due to an empty client ID; after saving the supplied Google credentials in Clerk, a fresh redirect matches the provided client ID and Google returns its sign-in page without an authorization error. Neither is evidence of completed real-user end-to-end sign-in.

Earlier API deployment checks (the complete backend suite was not rerun for the web/auth-only changes):

- `npm run build:api` succeeded; all 176 backend tests across 22 suites passed.
- `/health`: HTTP 200.
- `/ready`: HTTP 200; Firestore and photo Storage reported ready.
- `/__clerk/v1/environment`: HTTP 200.
- `/v1/plants`: HTTP 401 for missing and invalid bearer tokens, with `Cache-Control: private, no-store`.
- Public `/v1/voice/session`: WebSocket upgrade succeeded; invalid authentication produced `unauthorized` and the connection closed.
- Initial deployment log queries returned no runtime errors and no HTTP 5xx records. This is a short acceptance window, not ongoing monitoring.

## Keys and settings

No required server credential names are missing from Vercel production. Firebase service-account credentials, Clerk live keys, `OPENAI_API_KEY`, `PLANTNET_API_KEY`, `TAVILY_API_KEY`, and optional `LANGSMITH_API_KEY` are present. Credential presence does not establish paid-provider entitlement or quota.

Production configuration was checked: `NODE_ENV=production`, `ALLOW_LIVE_PROVIDERS=true`, `USE_FIREBASE_EMULATORS=false`, and LangSmith tracing with input/output redaction enabled. The allowed browser origin and Clerk proxy use the public API host.

The existing [Clerk runbook](clerk-production-setup.md) records EAS production configuration for `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `EXPO_PUBLIC_CLERK_PROXY_URL`. EAS configuration was not re-queried or changed during this deployment.

## Remaining setup and acceptance

**Google login acceptance:** production Google sign-in created an active session, and authenticated reads now return 200 after correcting the issuer. Development tokens are rejected by Production. Decide whether to copy the existing Development data into the new Production account. Google consent-screen audience/publication and installed-device callbacks remain separate checks. The exact origin, redirect URI and evidence are in the [Google setup section](clerk-local-and-google.md#production-google-oauth-configured-and-authorization-request-verified). No application redeployment was needed for that Clerk setting change. Also rotate the development Clerk secret exposed in the earlier local bundler diagnostic.

1. **Background worker:** the Vercel entrypoint does not start the worker in `server/src/index.ts`. Account/plant deletion processing and memory embeddings need a separately scheduled or durable worker with retries and concurrency controls. Deploying the HTTP API does not enable these jobs.
2. **Voice and rate limits:** session ownership, jobs/audio results, and rate limits remain in process-local memory. Shared coordination and reconnect/timeout behavior need implementation and multi-instance acceptance. The WebSocket probe above establishes transport and rejection of invalid credentials only.
3. **Installed mobile app:** build with the EAS production environment, then complete signup/email verification, sign-in, password reset, and valid-token API access on a device. Confirm operation without Metro or the development computer.
4. **Full data/provider flows:** exercise photo upload/read/delete, plant identification, research, chat, voice, and memory retrieval. Readiness checks establish database read and Storage listing, not write/delete permissions, Firestore vector-index readiness, paid-provider model access, billing, or quotas.
5. **Operational follow-up:** configure ongoing monitoring/alerts. The remote install reported 65 workspace dependency audit findings (15 moderate, 50 high); triage their runtime relevance and fixes separately. No dependency versions were changed by this deployment.

See [the existing deployment gates](vercel-project-setup.md#backend-deployment-gates) for implementation details. The deployment uses Vercel's supported [Express hosting](https://vercel.com/docs/frameworks/backend/express).
