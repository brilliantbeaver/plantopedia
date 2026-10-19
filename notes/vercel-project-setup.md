# Vercel API project setup

Created 2026-10-18 and rechecked 2026-10-19 using `VERCEL_API_TOKEN` from the ignored root `.env` file. The token authenticated as `jiamingmui`. Credentials were loaded in memory and were not printed or uploaded.

## Created resources

| Setting | Verified value |
| --- | --- |
| Project | [`plantopedia`](https://vercel.com/brilliantbeaver/plantopedia) |
| Vercel team | `brilliantbeaver` (owned by `jiamingmui`, Hobby plan) |
| Project ID | `prj_PTrfrfEkG0IP5JgN8jQjhGURDVsH` |
| Intended existing repository | [`brilliantbeaver/plantopedia`](https://github.com/brilliantbeaver/plantopedia) |
| Git connection | Connected to `brilliantbeaver/plantopedia`, production branch `main` |
| Framework | Express |
| Root directory | `server` |
| Include source outside root directory | Enabled for the root lockfile and `packages/contracts` workspace |
| Node.js | `22.x`, matching the repository's engine constraint |
| Install command | `npm --prefix .. ci --include=dev` (source configuration) |
| Build command | `npm --prefix .. run build:api` |
| Output directory | `dist` (source configuration) |
| Development command | `npm run dev` (runs from `server`) |
| Fluid compute | Enabled |
| Function region | `iad1` (default; align with the Firebase database before deployment) |
| Deployment protection | Vercel default: `all_except_custom_domains` |

The existing Git remote points to `brilliantbeaver/plantopedia`; its default branch is `main`. No GitHub repository was created. `.vercel/project.json` links this checkout to the project and is ignored by Git. The user attempted a production deployment of `94be216`; it failed during Express entrypoint detection. No successful deployment or application environment variable upload has been performed by this setup work. The source configuration in `server/vercel.json` takes effect when the fix is committed and pushed; it overrides the earlier dashboard build defaults.

## Account setup

Vercel initially rejected connecting the existing repository because GitHub app access was missing. The connection is now present and was verified through the project API on 2026-10-19; no additional repository needs to be created.

Choose whether the first hosted backend uses the existing development Clerk/Firebase/provider configuration or separately provisioned staging/production resources. The local Clerk instance is a development instance; production Clerk setup requires a domain with DNS control. At the latest check, Vercel's project environment-variable list was empty.

## Entrypoint build fix

The failed deployment reported `No entrypoint found which imports express. Found possible entrypoint: src/index.ts`. Express was imported only in `src/http/app.ts`, outside the filenames Vercel checks. The original `src/index.ts` also started a listener, worker timer and process shutdown handlers without exporting a server.

- `src/server.ts` now directly imports Express, composes the existing API, attaches its voice WebSocket handler, and default-exports the unbound HTTP server. It starts no standalone worker or process lifecycle handlers.
- `src/index.ts` retains the persistent-process listener, five-second worker and shutdown behavior, using that same server. Existing `dev:api`, `start:api` and Expo-managed startup commands continue to use it.
- `server/vercel.json` selects the Express preset, installs the root workspaces including build-time development dependencies, runs the existing strict contracts/API compilation, and selects `dist` as the output directory. Vercel detects `dist/server.js` there. Installing development dependencies explicitly keeps TypeScript available when `NODE_ENV=production`.
- Packaging compiled JavaScript avoids a second Vercel TypeScript compilation pass. The installed CLI's TypeScript pass produced a Helmet default-import type error even though the normal NodeNext compiler passed; selecting the already-compiled output resolved that additional build failure without weakening type checking or changing Helmet's security headers.

Commit and push the changed source and `server/vercel.json` before retrying a Git deployment. Redeploying the earlier failed commit alone cannot include this fix. Keep the project's Root Directory set to `server` and outside-root workspace source access enabled.

## Backend deployment gates

Creating the project does not make the current server safe for serverless operation. Resolve these concrete differences before deploying the full application:

- **Hosted runtime acceptance:** the entrypoint and standalone lifecycle are now separated, with an exported HTTP server retaining voice upgrades. A protected preview must still establish hosted HTTP/WebSocket runtime behavior with the intended production configuration.
- **Background work:** the interval processes account deletion, plant deletion, and memory embeddings. Move these tasks to a durable queue/workflow or suitable scheduled worker with retry and concurrency controls. A function instance's timer is not a reliable scheduler.
- **Voice ownership and results:** `server/src/providers/voice.ts` and `realtime-session.ts` keep jobs, audio results, context, and user session ownership in process-local maps. Coordinate ownership and cancellation across instances, and persist any results needed by subsequent HTTP requests. Account deletion must reach active sessions on other instances.
- **Connection duration:** Vercel supports WebSockets on Fluid compute. Connections are pinned to one function instance and bounded by function duration: currently 300 seconds on Hobby, while `realtime-session.ts` currently permits ten minutes. Implement and verify bounded sessions or safe reconnect behavior; preserve authentication, cancellation, and interruption handling across disconnects. An upgrade to a paid plan is a separate decision, not part of this setup.
- **Abuse controls:** the Express limiter uses its default in-memory store. Use shared enforcement for limits that must apply across instances; preserve Clerk token and ownership checks.
- **Public mobile access:** the chosen production API origin must be reachable by installed apps using Clerk bearer tokens. Review the default Vercel deployment protection before device acceptance; never embed the Vercel API token or a deployment-protection bypass secret in a mobile bundle. Keep preview protection as appropriate.
- **Request sizes:** current photo uploads allow a single 2 MiB file, below Vercel's 4.5 MB HTTP payload limit. Validate multipart overhead and photo/audio response sizes; use private signed storage delivery if generated audio can exceed the response limit.
- **Configuration and data locality:** select the function region near the actual Firestore database. Inject only the server configuration allowlist into the selected Vercel environment, set `NODE_ENV=production` and `USE_FIREBASE_EMULATORS=false`, omit emulator hosts, and preserve trace redaction. Keep `VERCEL_API_TOKEN`, unrelated local variables, and mobile build credentials out of application runtime environments. Prefer federated Firebase identity when configured; otherwise use the existing least-privilege server identity securely.

Use the existing backend configuration schema in `server/src/config/env.ts` as the allowlist. Provider switches and tracing should be explicit for the chosen environment. Separate preview data and credentials from production data where possible. Never upload the entire `.env` file.

## Acceptance sequence

1. Compile contracts and the API, run the relevant backend tests, and verify the Vercel entrypoint/build output in an isolated installation.
2. Deploy a protected preview and verify `/health`, `/ready`, missing/invalid/valid Clerk tokens, owner isolation, photo upload/read, and private cache headers.
3. Verify durable workers, retries, deletion, concurrent instance behavior, and voice disconnect/reconnect around the function timeout. Test restart/deployment interruption without duplicate paid work.
4. Promote only the validated deployment and verify the assigned public API URL. Set `WEB_ALLOWED_ORIGINS` to the API origin (required for Android WebSockets) and the exact browser origin if web access is enabled.
5. Set `EXPO_PUBLIC_API_BASE_URL` and the matching Clerk publishable key in the intended Expo/EAS build environment. Install standalone iOS/Android release or preview builds and test over cellular with the Mac and Metro stopped. A development client that requires Metro does not establish standalone operation.

## Setup validation

The Vercel API confirmed the connected Git repository, the failed production deployment and an empty application environment-variable list. `.env` and `.vercel/project.json` are ignored by Git. The entrypoint regression suite covers import without listener/worker/signal effects, health/readiness, security headers, authenticated routes, WebSocket upgrade/authentication and idempotent draining. API and unit suites passed (237 tests), script suites passed (47 tests), and lint/full typecheck/API compilation passed. The local Vercel CLI production build succeeded from an isolated source copy with a clean lockfile installation, `NODE_ENV=production`, and no copied application credentials. The generated function identifies `server/dist/server.js` as its Node.js 22 Express handler. Importing that generated handler with synthetic configuration produced a non-listening HTTP server with a voice upgrade handler; after binding an ephemeral local port, `/health` returned 200 and an unauthenticated private route returned 401. No external provider or database request was needed for that check. No deployment was promoted or published. These checks establish build compatibility and local transport behavior, not hosted runtime acceptance or completion of the remaining deployment gates.

## References

- [Express on Vercel](https://vercel.com/docs/frameworks/backend/express)
- [Monorepo projects](https://vercel.com/docs/monorepos)
- [WebSockets on Vercel Functions](https://vercel.com/docs/functions/websockets)
- [Function limits](https://vercel.com/docs/functions/limitations)
- [Creating projects through the API](https://vercel.com/docs/rest-api/projects/create-a-new-project)
