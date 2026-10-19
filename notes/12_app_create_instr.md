# Plantopedia: application build instructions

**Voice amendment — 2026-10-18:** The user replaced GPT-Live/WebRTC and then explicit recorded turns with continuous Voice Chat using `OPENAI_REALTIME_MODEL=gpt-realtime-2.1`. [The continuous voice design](voice-turns.md) is authoritative for voice transport, UI, lifecycle, configuration and validation, and supersedes older voice-specific release checks elsewhere in this specification. Use the README's [single Expo startup workflow](../README.md#everyday-startup-one-expo-server); continuous native voice requires a custom development client.


Build a camera-first, voice-native plant companion for iOS and Android with Expo, React Native, TypeScript, and TSX. The essential experience is **photograph → review evidence → save a particular plant → talk about it → reopen and recall the correct plant and photograph**.

Recheck contracts when pinning dependencies. Read the [PRD](Plantopedia-PRD.md), [existing Clerk selection](11_clerk_auth.md#dashboard-selected-clerk-application), and [local setup guide](13_local_dev_setup.md) alongside this document. **§3 is the canonical environment template/loading contract**; its refined bootstrap and tracing defaults govern where older setup snippets differ. Preserve existing notes and local credentials.

## 1. Product decisions and scope

### 1.1 Apply Occam’s Razor

Choose the smallest implementation that satisfies the actual behavior and can be tested:

- Ship one Expo app, one TypeScript API service, and Firebase Firestore plus Cloud Storage. Keep provider credentials and privileged operations in that service.
- Use React `useState` for local interaction, `useReducer` for coordinated capture/voice transitions, a small preferences context, and TanStack Query for remote data. Introduce another state library only when a demonstrated problem requires it.
- Keep a small SQLite cache and outbox for durable drafts and offline observations. Implement explicit operations and conflict handling; extend them when requirements grow.
- Use ordinary functions and a typed tool registry for assistant actions. Each transport calls the same application functions.
- Build shared visual primitives only after a real screen needs them. Start with `Screen`, `GlassSurface`, `PrimaryButton`, `PlantCard`, `CandidateCard`, `SourceList`, and `VoiceDock`.
- Make each module earn its place through a platform boundary, provider boundary, reusable UI, or business rule. Prefer direct composition and readable functions over generalized factories.

Simplicity must preserve authorization, uncertainty, persistence, accessibility, and user control. A provider adapter is useful because it contains an external contract; a second database or generic agent framework needs separate evidence of necessity.

### 1.2 Resolve PRD conflicts explicitly

| Topic | Build decision |
| --- | --- |
| Backend | **Firebase Firestore Standard edition and private Cloud Storage** replace the PRD’s suggested Postgres/Supabase/Neon stack. SQLite is a local cache, not a second remote source of truth. |
| Authentication | Preserve the existing Expo/Clerk application selected in `11_clerk_auth.md`. Use its verified subject as the application owner ID. Firebase access goes through the API with Admin SDK; a second Firebase Auth login is unnecessary. |
| Voice | Use **continuous `gpt-realtime-2.1` sessions** through the authenticated API WebSocket, the local `PlantopediaVoice` native module and AudioWorklet/Web Audio in browsers. Only the server connects to OpenAI. See the dated voice amendment. |
| Photo reasoning | The GPT-Live model page lists audio/text input. Pl@ntNet identifies plants. A separately configured Responses backend can inspect an authorized photo when a question requires visual evidence. |
| Health | Prefer Pl@ntNet’s separately documented disease endpoint where its species/pathology coverage is suitable. Validate it before P1. The PRD’s Kindwise suggestion is a possible later decision, not an automatic extra integration. |
| Prototype versus release | A 24-hour demonstration proves the core loop. Full P0, P1, device certification, and operational readiness each have separate exit checks. |

These corrections follow the current [GPT-Live model page](https://developers.openai.com/api/docs/models/gpt-live-1), [Live overview](https://developers.openai.com/api/docs/guides/live), and [Pl@ntNet disease documentation](https://my.plantnet.org/doc/api/diseases). Documented capability does not prove access in the project’s provider accounts.

### 1.3 Trace requirements to deliverables

| Priority / PRD reference | Deliverable | Acceptance evidence |
| --- | --- | --- |
| P0 A | Camera/gallery, preserved original, upload derivative, ranked candidates, correction, uncertain save | Scan failure retains the image; successful and uncertain scans save without retyping |
| P0 B | Separate specimens, observed/owned status, profile and photo timeline | Two same-species trees remain distinct IDs with separate histories |
| P0 C | Interruptible native voice, captions, text fallback, explicit active context | iPhone and Android demonstration with selected photo, interruption, and reconnect |
| P0 D | Durable conversations, source-linked memory, structured/text/semantic retrieval, correction/deletion | Cold restart retrieves the right earlier specimen and photo; deleted evidence stays absent |
| P1 E–I | Health assessment, personalized care, confirmed reminders, environment guidance, botanical sources/safety | Each flow passes the domain and device tests in §8 |
| P2 J–K | Human-review export, private map, comparisons, milestones, walks, longitudinal learning | Add after core memory and care are reliable; real expert service needs an operating workflow |
| Cross-cutting | Light/Dark, seven languages, privacy, offline state, LangSmith, type safety | Locale/theme matrix, authorization suite, redacted telemetry, offline/restart tests |

Keep “observed” and “owned/managed” visible throughout. Observed campus trees get learning notes and revisit prompts. Watering and treatment actions require owned/managed context. Label the assistant as AI. Preserve uncertainty; do not certify edibility or imply a laboratory diagnosis or human botanist review.

## 2. Workspace, dependencies, and development workflow

### 2.1 Inspect before scaffolding

1. Read applicable `AGENTS.md`, the exact files you will change, package manifests, lockfiles, and diagnostics. Use `rg` for discovery. Do not inspect or print `.env` contents.
2. At the time of writing, this directory contains notes and reference images, with no application manifest. Its Git root is a parent Stanford repository. Confirm that again before modifying files; preserve unrelated changes.
3. Record resolved Node, npm, Expo SDK, React Native, React, TypeScript, Expo Audio, OpenAI SDK, Clerk SDK, Firebase Admin, and test-runner versions in `notes/architecture-decisions.md`. Include iOS/Android minimums, build tools, New Architecture compatibility, and physical-device results.
4. Use a supported Node LTS that meets all selected packages’ minimums. The documented Live Node example requires **Node 22.6 or newer**. Pin the compatible version in `.nvmrc` and `engines`. Use EAS cloud builds for native binaries through the committed-subtree wrapper; direct EAS source upload from the parent repository can include unrelated projects. Local Java, Android Studio, Gradle, `adb`, and Xcode are optional and must not be prerequisites for development or verification.

Generate the Expo Router TypeScript template in a **temporary sibling directory** with `npx create-expo-app@latest`. Inspect its generated structure and copy the scaffold into this root without overwriting `notes`, `.env`, or existing ignore files; exclude the scaffold’s dependencies and Git metadata. Do not initialize a nested Git repository here. Use `src/app` consistently, moving starter routes if necessary. Commit a single npm lockfile after resolving dependencies.

### 2.2 Keep three code boundaries

```text
plantopedia/
  README.md                    # setup, local runs, native releases, backend deployment
  src/
    app/                       # Expo Router routes and layouts only
      _layout.tsx
      (tabs)/                  # explore, scan, my-plants, tasks, ask
      plants/[plantId].tsx
      settings.tsx
    features/
      capture/                 # screens, reducer, image preparation
      identification/          # candidate review and correction
      plants/                  # collection, profile, observations
      conversation/            # voice/text UI, transcript assembly
      tasks/                   # P1 care and reminders
      settings/                # preferences controls
    components/                # shared presentation components
    theme/                     # semantic tokens and GlassSurface
    i18n/locales/              # en, fr, es, de, zh-Hans, ja, ko
    services/                  # authenticated API client; SQLite cache/outbox
    platform/                  # native voice/audio adapter and permissions
    config/public-env.ts
  packages/contracts/src/      # @plantopedia/contracts: schemas and DTOs
  server/
    src/
      config/                  # pure env.ts parser; production load-env.ts
      http/                    # routes, authentication, validation, errors
      application/             # plant, memory, conversation, task functions
      providers/               # plantnet, openai, tavily adapters
      storage/                 # Firebase Admin repositories and photos
      telemetry/               # sanitized LangSmith spans
      index.ts
    tests/
  tests/                       # mobile unit/component tests; never in src/app
  e2e/                         # Maestro flows and synthetic seeds
  firebase/                    # firebase.json, rules, index definitions
  notes/
  .env                         # local only, never committed or uploaded
  .env.example                 # dummy values only
  app.config.ts
  package.json
  tsconfig.json
```

Use npm workspaces for `server` and `packages/contracts`; keep Expo at this root. Give contracts explicit package exports and build them before API/mobile consumers. Start with a normal compiled package rather than custom Metro resolution. Check compatibility against [Expo monorepo guidance](https://docs.expo.dev/guides/monorepos/) during implementation.

Dependency direction is **routes → feature hooks/components → API client → contracts**. Server routes call application functions, which call concrete repositories/provider adapters. Contracts import neither React Native nor server SDKs. Mobile cannot import `server`, Admin credentials, OpenAI, Tavily, or LangSmith clients. Enforce that boundary with ESLint import restrictions.

### 2.3 Add packages by responsibility

Use `npx expo install` for Expo/native dependencies and verify config plugins against the pinned SDK. Use npm for ordinary JavaScript packages. Preserve compatible packages supplied by the template.

| Boundary | Packages / purpose |
| --- | --- |
| Mobile foundation | Expo Router, `expo-dev-client`, `react-native-safe-area-context`, `expo-secure-store` |
| Capture/local data | `expo-camera`, `expo-image-picker`, `expo-image-manipulator`, `expo-file-system`, `expo-sqlite`, `expo-crypto` for stable operation IDs |
| Presentation | `expo-glass-effect`, `expo-blur`, `expo-localization`, `i18next`, `react-i18next`; use React Native components for ordinary layout |
| Auth/server data | Existing-compatible `@clerk/expo`, its required auth-session/browser dependencies, and `@tanstack/react-query` |
| Native voice | SDK-compatible `expo-audio` and its config plugin; record bounded PCM turns locally and upload through the authenticated API |
| Contracts | `zod`, TypeScript |
| API | Express, `firebase-admin`, `@clerk/backend`, `openai`, `@tavily/core`, `langsmith`, `dotenv`, `sharp` for image sanitization; bounded multipart parsing for images |
| Verification | `jest-expo`, Jest, `@testing-library/react-native`, `supertest`, Firebase CLI/rules test tools, Maestro; server Jest config uses Node environment |
| P1 | `expo-notifications`, optional `expo-location`; sensor packages only after validating actual device capability |

Enable TypeScript `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` in mobile, contracts, and server configs. Extend Expo’s base config on mobile. Avoid `any`, unchecked casts, and non-null assertions at API/storage boundaries. Parse external JSON as `unknown`, validate with schemas, infer DTO types from them, and map Firestore timestamps to ISO strings in HTTP responses. Check schema compatibility in tests.

Create root scripts: `build:contracts`, `build:api`, `start:api`, `dev:api`, `typecheck`, `lint`, `test:unit`, `test:components`, `test:functional`, `test:rules`, `test:bundle-secrets`, and `test:e2e`. These are scripts to implement, not commands already present. `build:api` builds contracts first and then compiles the API; `start:api` runs the compiled API without a watcher or a startup build. `typecheck` must cover all three boundaries; lint must check imports and Hooks rules.

### 2.4 Use the right preview environment

- **Snack:** explore an isolated `PlantCard`, controlled input, Flexbox layout, and state example using synthetic data. Do not upload project credentials or private photographs.
- **Expo Go:** matching SDK 57 previews text/photos and other features using bundled modules. It cannot load the local `PlantopediaVoice` module needed for continuous native Voice Chat.
- **Development build:** build with EAS in the cloud and install a compatible binary containing the local audio module. Older custom clients require a rebuild. Restart Metro after plugin/dependency changes; a running process can retain old config. No local Java/Android toolchain is required.
- **Physical devices:** prove camera quality, continuous microphone/speaker routing, Bluetooth/headphones, permission denial, streaming playback, interruptions and cleanup on both platforms.

After installation/configuration, use `npx expo start`. For a loopback API, the development helper starts or reuses the API and checks database/photo-storage readiness before Metro serves the app. Dependency failures warn while Expo/API keep running; invalid configuration, unrelated listeners and API process failures still stop startup. Readiness stays 503 with safe reasons until dependencies recover, and polls share pending SDK probes. It owns only the child it creates and stops it with Expo. Hosted APIs, tests, CI, production, exports and builds skip automatic startup. Press `w` for web; press `s` to switch between the default development-client target and Expo Go, then scan the selected target's QR code. Cloud builds are first-install/native-change steps; web and native previews share Metro. See the [README startup table](../README.md#everyday-startup-one-expo-server).

Use the platform adapters in [the continuous voice design](voice-turns.md). Do not install WebRTC or its config plugin. Browser microphone access requires localhost or trusted HTTPS; physical phones need a reachable HTTPS API.

### 2.5 Create and maintain the project README

**Create `plantopedia/README.md` during scaffolding and update it with each delivered slice.** It is the practical entry point for a developer starting from a clean checkout and for an operator deploying a release. Link to this guide and [the Mac setup note](13_local_dev_setup.md) for detail; keep one canonical environment-variable table consistent with §3. Describe implemented behavior accurately and label planned capabilities. Do not publish commands for scripts or profiles that have not been created.

Give the README a table of contents and the following sections, with commands, their working directories, required accounts, and expected results:

| README section | Required contents |
| --- | --- |
| Overview and architecture | Camera-first/voice-native purpose, supported iOS/Android versions and tested devices; diagram of mobile → authenticated public API → Firebase/providers, plus streaming audio through API and provider WebSockets. Identify the mobile app, API, and shared contracts directories. |
| Prerequisites and installation | Exact pinned Node/npm requirements, Expo/EAS cloud builds, Firebase and Heroku CLIs where needed. No local Java/Android toolchain; Xcode/Android Studio are optional advanced workflows. Show cloning the parent Stanford repository, changing to `mobile-apps/experiments/plantopedia`, `npm ci`, and contract builds. State which steps require macOS, signing, billing, or a physical device. |
| Configuration | Safely create `.env` from dummy `.env.example` only when absent. Classify the two approved public mobile variables and every server-only setting, defaults, fake/live and emulator/real modes, and provider-account access checks. Never include live credentials or ask readers to print them. Explain host-injected production secrets separately from local `.env`. |
| Run the backend locally | Start isolated Firestore/Storage emulators, then `npm run dev:api`; show sanitized readiness checks and how to enable deliberate live-provider testing. Include `npm run build:api` and `npm run start:api` for a compiled-run check. Explain demo data, shutdown, and failure without production fallback. |
| Run and install the mobile app | Make `npx expo start` the single everyday command, managing a loopback API and checking readiness before Metro, with nonfatal dependency warnings and fatal configuration/process errors. Explain existing-API reuse, hosted/manual alternatives, `w` for web, `s` for native targets, the `expo-dev-client` default and Expo Go's lack of the local voice module. Separate first-time cloud build/install from daily startup, and describe physical-device HTTPS access, camera/mic permissions and native rebuild triggers. |
| Deploy the backend | Give the Heroku versus Vercel decision in §4.1.1, then a tested Heroku runbook satisfying §4.1.2: deployment root, build/start scripts, config vars, Firebase rules/indexes/IAM, one non-sleeping web dyno, public HTTPS URL, verification, logs, restart recovery, and rollback. State ongoing hosting/provider costs without promising a free always-on backend. |
| Build and distribute mobile releases | Configure `eas.json` development/preview/production profiles and matching EAS environments, native identifiers, Clerk callbacks, signing credentials, and store accounts. Build for both platforms, explain installation/internal testing and store submission/review, and specify which changes require a new native binary. Use the deployed HTTPS API URL before building; users must not need a running Mac or Metro for a release build. |
| Tests and troubleshooting | List implemented verification scripts and device/provider checks with their scope. Cover wrong API URL, auth issuer mismatch, emulator unavailability, denied permissions, unavailable models, stale native modules, router timeouts, dyno restart, and redacted diagnostics. State known limitations and link to architecture decisions. |

For mobile distribution, follow [EAS Build setup](https://docs.expo.dev/build/setup/) and [store submission](https://docs.expo.dev/deploy/submit-to-app-stores/). Pin the CLI used by the runbook. After implementing the matching profiles, include commands such as `npm run build:mobile -- build --platform android --profile production` and `npm run build:mobile -- build --platform ios --profile production`, plus the tested submission commands. Distinguish an Android installable preview APK from a store AAB, an iOS simulator build from a signed device build, and TestFlight/internal testing from a public store release. Store upload does not complete store review.

**README acceptance:** follow its steps from a fresh checkout without an existing `node_modules` directory, using synthetic data and separate test accounts. Verify the compiled backend starts, each native app installs, and a staging release works over cellular with the developer Mac/Metro stopped. Test sign-in, private photo save/read, identification, voice/text, and cold-restart recall. Record the exact revision, commands, platforms, sanitized outcomes, and any unperformed steps. Check local links, command/script/profile names, configuration parity, and absence of credentials. These are implementation gates, not checks this documentation change claims to have run.

## 3. Root `.env`, secret handling, and local modes

Keep local key/value configuration in **`plantopedia/.env`**, as requested. Merge missing variable names without replacing existing values. Commit only a dummy `.env.example`; copy it to `.env` only if `.env` does not exist. Full setup and networking instructions live in [13_local_dev_setup.md](13_local_dev_setup.md).

```dotenv
# Public mobile configuration: visible to everyone who installs the app.
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=replace_me

# Development tooling only; false opts into manual local API management.
PLANTOPEDIA_AUTO_START_API=true

# Server configuration and provider secrets.
NODE_ENV=development
SERVER_HOST=127.0.0.1
PORT=3001
ALLOW_LIVE_PROVIDERS=false
CLERK_SECRET_KEY=replace_me
CLERK_ISSUER_URL=https://replace-with-your-clerk-issuer
PLANTNET_API_KEY=replace_me
PLANTNET_PROJECT=all
OPENAI_API_KEY=replace_me
OPENAI_REALTIME_MODEL=gpt-realtime-2.1
OPENAI_BACKEND_MODEL=gpt-6-luna
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536
TAVILY_API_KEY=replace_me

# Safe local Firebase mode; Admin credentials unused with emulators.
USE_FIREBASE_EMULATORS=true
FIREBASE_PROJECT_ID=demo-plantopedia
FIREBASE_STORAGE_BUCKET=demo-plantopedia.firebasestorage.app
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Server tracing: choose the endpoint for the actual workspace region.
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=replace_me
LANGSMITH_PROJECT=plantopedia-local
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_WORKSPACE_ID=
LANGSMITH_HIDE_INPUTS=true
LANGSMITH_HIDE_OUTPUTS=true
```

The backend and embedding model names are implementation defaults to verify in the actual account. Keep `gpt-realtime-2.1` explicit; a failing model-access check must not silently switch voice models. [`gpt-6-luna`](https://developers.openai.com/api/docs/models/gpt-6-luna) supports text/image input for the separate Responses path; [`text-embedding-3-small`](https://developers.openai.com/api/docs/models/text-embedding-3-small) supplies semantic embeddings.

1. Mobile reads only the two static `process.env.EXPO_PUBLIC_*` properties above in `public-env.ts`. Expo loads root `.env` and inlines that prefix into the bundle. Never prefix provider/Admin secrets with `EXPO_PUBLIC_`, enumerate all environment variables, or put secrets in `app.config.ts` / `extra`. [Expo environment rules](https://docs.expo.dev/guides/environment-variables/).
2. Keep server `config/env.ts` a pure schema/parser accepting a supplied object. Put local-file reading in `config/load-env.ts`, called only by the production/development `index.ts` bootstrap, with `dotenv` and `override: false`. For `server/src/config/load-env.ts` and `server/dist/config/load-env.js`, use `fileURLToPath(new URL('../../../.env', import.meta.url))`; re-evaluate the path if build output changes. Construct SDK clients through factories only after this function has loaded and validated configuration. Validate an explicit allowlist. Parse boolean strings explicitly: `Boolean('false')` is true.
3. Validate real-provider mode only against needed secrets; fake mode uses deterministic adapters and rejects billable external calls. Fail with missing variable **names**, never values. Tests import the pure parser/app factory, never `index.ts` or the local loader, and supply fixture config rather than inheriting `process.env`. Make the local loader reject test mode as an additional guard. Tests use fake providers regardless of a developer’s local settings.
4. Emulator mode requires a `demo-` project ID and both loopback emulator hosts. Real Firebase mode requires removing both emulator-host variables and selecting the actual project/bucket. An unreachable emulator must fail; never fall through to production.
5. For real local Firebase Admin, keep `FIREBASE_CLIENT_EMAIL` and a quoted `FIREBASE_PRIVATE_KEY` with escaped `\n` in root `.env`. Normalize newlines after parsing if necessary. Hosted service credentials should use workload identity and host secret injection, rather than deploying a developer’s `.env` or key file.
6. Keep `.env`, `.env.*` except the dummy `.env.example`, service-account JSON, private keys, and credential-bearing logs excluded in `.gitignore`, `.easignore`, and server build contexts. Preserve the normal generated-file exclusions when creating `.easignore`. Use `chmod 600 .env`. Verify `git check-ignore -v .env`; `git ls-files --error-unmatch .env` must fail because it is untracked. Ignoring a file does not remove a prior exposure; rotate any exposed credential.
7. Inspect mobile exports/build uploads using dummy secret sentinels. Assert that bundles, source maps, Expo config output, logs, traces, and upload archives contain neither the sentinel nor private files. Do not print real environment files, source `.env` in a shell, or log SDK initialization objects.

Firebase client configuration and a Firebase Admin private key have different security roles. This architecture uses **Admin only on the server**, so it needs no mobile Firebase SDK, Firebase web API key, `GoogleService-Info.plist`, or `google-services.json`. If a later feature needs a client SDK, make that a specific architecture change with its own auth/rules design. [Expo’s Firebase integration options](https://docs.expo.dev/guides/using-firebase/).

## 4. Firebase, application contracts, and authorization

### 4.1 One trusted service

```mermaid
flowchart LR
  M[Expo iOS / Android] -->|Sign in| C[Existing Clerk app]
  M -->|Verified bearer token / HTTPS| A[TypeScript API]
  M -->|Recorded PCM / authenticated HTTP| A
  A <-->|Finite server-side WebSocket| L[OpenAI gpt-realtime-2.1]
  A --> F[(Firestore)]
  A --> S[(Private Cloud Storage)]
  A --> P[Pl@ntNet]
  A --> O[Responses backend / embeddings]
  A --> T[Tavily search]
  A -->|Sanitized spans| G[LangSmith]
```

Start with a local Node service. For hosted deployment choose a runtime that supports long-lived outbound WebSockets, session timeouts, and graceful shutdown. Run a single API instance initially, or enforce session-affine routing for status/control requests, until voice ownership is shared. Keep each sideband on its owning process; persist business actions in Firestore so a process restart cannot erase their outcome. Reconnect can create a new voice session. Multi-region orchestration is unnecessary for the first release.

#### 4.1.1 Choose the simplest public backend host

For release builds and phones on arbitrary networks, deploy the API to a publicly reachable **HTTPS endpoint** and configure that URL in `EXPO_PUBLIC_API_BASE_URL`. Authentication still protects its data and actions. Localhost and a development tunnel are development arrangements. Firebase provides storage here; a separate runtime hosts the TypeScript API. Neither host distributes the native application binary.

**Recommendation: use Heroku for the initial complete backend.** This is an architecture judgment about the fewest changes and operational steps for this service, rather than a universal ease-of-use ranking. Recheck the linked official documentation and account availability before provisioning; the comparison was verified on **2026-10-18**.

| Host | Suitability for this design | Setup consequence |
| --- | --- | --- |
| Heroku | A web dyno runs the Node process that serves HTTP and owns outbound OpenAI sidebands after session-creation responses finish. Start with one paid, non-sleeping dyno, such as Cedar Basic if its measured memory/CPU capacity suffices. Dynos still restart and have ephemeral filesystems. | **Simplest fit for the full current backend:** deploy the Node workspace, configure secrets, and run its compiled entrypoint. Keep durable records/photos in Firebase and reconnect voice after restarts. Verify current tiers and costs. [Dynos](https://devcenter.heroku.com/articles/dynos), [dyno sizes and sleep behavior](https://devcenter.heroku.com/articles/dyno-sizes). |
| Vercel | Functions can handle HTTP APIs, and current documentation includes WebSockets in **beta**. Their execution remains duration-bounded; separate requests/new connections need not reach the same instance. A WebSocket endpoint is not itself a guarantee that an outbound sideband survives after its initiating HTTP response. | Possible after an explicit voice-lifecycle/routing redesign and proof. For this guide's process-owned sessions, it adds coordination and lifecycle work. Do not select it as a drop-in full-backend deployment or split services merely to use it. [WebSockets](https://vercel.com/docs/functions/websockets), [function duration](https://vercel.com/docs/functions/configuring-functions/duration). |

Do not repeat the outdated blanket claim that Vercel cannot use WebSockets. The deciding requirement is the lifetime and ownership of **Plantopedia's outbound OpenAI connection**, including later HTTP status/control requests. Keep one Heroku service initially; adding Vercel for a future static marketing site is a separate optional decision.

#### 4.1.2 Backend deployment contract for the README

Implement and document one reproducible Heroku deployment path, using the Node buildpack and a committed deployment subtree. Include these concrete requirements:

1. **Correct build root:** this app is nested inside the Stanford Git repository. Export only the committed `mobile-apps/experiments/plantopedia` subtree as the Heroku source root, using a tested Git-subtree deployment script or equivalent reviewed export. The published root must contain `package.json`, its lockfile, `server`, and `packages/contracts`; deploying only `server` loses shared workspace dependencies. A plain push of the whole Stanford repository does not establish this build root. Exclude private files and unrelated projects; document exact first-deploy and update commands and the source revision. Do not force-push shared source history.
2. **Build and boot:** pin a supported Node version and the selected Heroku stack/buildpack. Build shared contracts and the API during deployment through `heroku-postbuild` calling `npm run build:api`; configure an app-root `Procfile` with `web: npm run start:api`. Preserve runtime contract exports and dependencies after dev-dependency pruning, and ensure `sharp` works on the host architecture. Start only the compiled API; listen on `0.0.0.0` and Heroku's injected `PORT`, never hard-code `3001` in production. [Node deployment](https://devcenter.heroku.com/articles/deploying-nodejs), [classic buildpack lifecycle](https://devcenter.heroku.com/articles/nodejs-classic-buildpack-builds).
3. **Production configuration:** use the host's protected config settings for provider/Clerk keys and Firebase credentials. Prefer a supported federated service identity when available; otherwise inject the least-privilege Firebase service-account fields from §3 and rotate them. Never upload the developer `.env`. Set `NODE_ENV=production`, `SERVER_HOST=0.0.0.0`, `USE_FIREBASE_EMULATORS=false`, actual Firebase names, and `ALLOW_LIVE_PROVIDERS=true` only after access/budget checks. Remove emulator-host variables and leave `PORT` to Heroku. Keep trace redaction enabled. Document variable names and safe entry methods, without embedding secret-bearing CLI arguments in shell history or printing config values. [Heroku config vars](https://devcenter.heroku.com/articles/config-vars).
4. **Provision and verify:** document account/login, application creation, region and non-sleeping plan selection, secret entry, deployment, and starting exactly one web dyno. Provision Firestore/Storage and deploy deny-all client rules and required indexes separately with the correct Firebase project; deploying the Node service does not deploy those resources. Verify its assigned public HTTPS URL/certificate, minimal non-sensitive health/readiness endpoints, valid/invalid-token behavior, and authorized private record/photo operations. Configure production Clerk native sign-in/callback settings before testing phones.
5. **Bound HTTP work:** keep the initial request/response contracts in §4.4; do not return `202 Accepted` or introduce background jobs for slow requests. Set upload, application, and provider deadlines within the selected router's response budget, with time for a sanitized error response. Current Common Runtime requires initial response data within 30 seconds. Abort downstream work where supported, but do not treat a timeout/disconnect as proof of cancellation. Persist known stages and use §4.4's idempotency, lease recovery, and `provider_outcome_unknown` handling when a retry cannot establish the outcome; never automatically repeat an uncertain billable call. The voice session-creation response finishes promptly while its sideband stays with the owning Node process. Do not keep an HTTP request open for the whole conversation. Test slow identification/upload and lost-response retries without duplicate writes or billing loops. If measured work later requires asynchronous acceptance, first design its typed status route, durable recovery trigger, and persisted client state as a separate change. [Heroku HTTP routing](https://devcenter.heroku.com/articles/http-routing).
6. **Restart and operate:** handle `SIGTERM` with a bounded drain within the host's shutdown window: reject new calls, close owned voice sessions, persist recoverable operation state, and exit. Keep business data in Firebase and only bounded temporary derivatives on dyno disk. Disable overlap/rolling-deploy options initially if they would break single-owner status/control routing; do not claim uninterrupted calls across a restart. Show redacted log access, deployment/version checks, application rollback, and its limits: rolling back code does not undo data writes or rules/index changes. Test a dyno restart during voice and an interrupted operation. [Shutdown behavior](https://devcenter.heroku.com/articles/dyno-shutdown-behavior).
7. **Connect real phones:** set the approved public EAS variables for the matching release environment, including the hosted HTTPS base URL and corresponding Clerk publishable key. Include the environment in the build profiles and verify the values selected during the build. Provider/Admin secrets remain on Heroku. Install the release on iPhone and Android and verify the §2.5 cellular/off-Metro acceptance flow. Backend changes must remain compatible with installed app contracts; URL/config changes embedded in the client require a deliberate mobile release/update and verification.

### 4.2 Authentication and storage access

Use the existing Clerk application identified in the auth note. Preserve compatible SDK generation; a fresh setup currently uses `@clerk/expo`. Configure `ClerkProvider` and its SecureStore token cache, native identifiers/callbacks, Native API, and sign-in methods using the [Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart). Do not provision a replacement app. Prefer the simplest supported auth UI that satisfies localization and accessibility, validating those before release.

Mobile obtains a session token and sends `Authorization: Bearer …` to the API. Server middleware uses the Clerk backend SDK to verify signature, expiry, expected issuer/application, and relevant token claims before constructing `AuthContext`. Follow [Clerk token verification](https://clerk.com/docs/guides/sessions/manual-jwt-verification); decoding a JWT is not verification. Validate authorized-party/audience claims where applicable to the chosen native token flow; do not copy a browser-only origin policy that rejects legitimate native requests.

- Derive `ownerUid` exclusively from the verified token subject. Do not accept a body/query owner ID as authority. Apply the same check to list, search, individual reads, uploads/downloads, tools, tasks, and session controls.
- Store user-owned documents below `users/{ownerUid}`. Construct paths on the server from validated opaque IDs. Reject arbitrary bucket paths, provider URLs, and unowned record references.
- All direct mobile Firestore/Storage access is denied. Deploy deny-all client rules and use Admin SDK with a least-privilege service identity. **Admin access bypasses Firebase Security Rules**; backend checks are the security boundary. [Firestore rules and server access](https://firebase.google.com/docs/firestore/security/rules-conditions).
- For the first implementation, upload/read photographs through authenticated API routes. This keeps ownership checks in one place. Stream bounded files; avoid base64 in JSON. Reconsider short-lived signed transfer URLs only when measured transfer overhead requires them.
- Add request/body/image limits, per-user quotas, provider timeouts, and safe errors. Do not log bearer tokens, SDP bodies, private URLs, or Pl@ntNet request query strings.

Provision Firestore Standard edition and a private Cloud Storage bucket in suitable regions; record actual names. Check [Firebase Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024), configure budget alerts and server-enforced limits, and use emulators for deterministic development. Billing alerts alone do not cap spend.

### 4.3 Model evidence and specimens separately

Use string IDs, `schemaVersion`, server `createdAt`/`updatedAt`, and a monotonic `revision` on mutable aggregates. Add `capturedAt` for device observation time and `recordedAt` for server receipt; keep timestamps distinguishable.

| Collection/path | Required data and invariant |
| --- | --- |
| `users/{uid}` | Preferences (`theme`, `locale`), retention choices, deletion status |
| `species/{speciesId}` | Provider taxon IDs, scientific name/authorship, localized common names, taxonomy, source/license metadata; shared botanical identity only |
| `users/{uid}/plants/{plantId}` | Nickname, `observed`/`owned`, `draft`/`saved` lifecycle, current identification revision, optional species ID, verification status, optional location/place label; one physical specimen |
| `…/plants/{plantId}/observations/{id}` | User text, captured/recorded dates, optional symptoms/location; distinguish user-reported content from generated advice |
| `…/plants/{plantId}/photos/{id}` | Observation ID, derivative object key, MIME, dimensions, hash, upload state, privacy flags; original file stays on the capturing device with its association in SQLite; no permanent public URL |
| `…/plants/{plantId}/identifications/{id}` | Immutable candidate list, provider/model version, raw provider score, date, photo IDs, selected candidate/manual correction, superseded revision |
| `users/{uid}/conversations/{id}` and `…/messages/{id}` | Authorized active plant/photo IDs, locale, provider session IDs, ordered transcript fragments/text messages, heard/interrupted/unknown delivery flags |
| `users/{uid}/memory_items/{id}` | User fact, botanical fact, or conversation summary; source record IDs/revisions, verification category, embedding/model version, invalidation state |
| `users/{uid}/tasks/{id}`, `care_events/{id}` | P1 plant, action, status, timezone/wall time/UTC, recurrence, approved action ID, care event references |
| `…/plants/{plantId}/health_assessments/{id}`, `care_plans/{id}` | P1 evidence, hypotheses, limitations, sources, reassessment date and versioned care guidance |
| `knowledge_sources/{id}` | URL/title/publisher, retrieved date, claim association, licensing/attribution; user-private sources remain user-scoped |
| `users/{uid}/operations/{operationId}` | Payload hash, type/state/stage, result IDs, lease expiry/attempt token, audit timestamps; no copied private payload/response; retries rehydrate authorized current results |

Keep long histories in paginated subcollections, not unbounded arrays on a plant document. Store images in Storage, not Firestore. Define DTO schemas in contracts, including discriminated unions for `pending`, `ready`, `no_match`, `failed`, and `needs_confirmation`. A high provider score never sets user confirmation automatically. Manual correction appends a revision and invalidates dependent summaries, rather than erasing evidence.

### 4.4 Define the API before screens

Use `/v1` routes with validated request/response schemas. Use `{ code, messageKey, retryable, requestId }` safe errors; localize them on mobile. Return `401`, `403`/non-enumerating `404`, `409` conflicts, `413` limits, and `429` throttling intentionally. Authenticate before returning private content.

| Route | Behavior |
| --- | --- |
| `GET/PATCH /v1/me/preferences` | Load/update explicit locale/theme/retention choices |
| `DELETE /v1/me` | Tombstone the account and start resumable application-data/Clerk-identity deletion |
| `GET/POST /v1/plants`; `GET/PATCH/DELETE /v1/plants/:id` | Paginated authorized collection, uncertain creation, versioned edits, deletion workflow |
| `POST /v1/plants/:id/observations` | Persist an observation even without identification |
| `PATCH/DELETE /v1/plants/:id/observations/:observationId`; `DELETE /v1/photos/:id` | Correct/remove individual evidence with source-memory invalidation and object cleanup |
| `GET /v1/plants/:id/observations`; `GET /v1/plants/:id/identifications` | Paginate profile evidence/history with stable cursors |
| `POST /v1/plants/:id/photos`; `GET /v1/photos/:id` | Authorized bounded multipart upload and private streamed retrieval |
| `POST /v1/plants/:id/identifications` | Use uploaded photo IDs, preserve failures and candidate evidence |
| `POST /v1/plants/:id/identification-selection` | Append a confirmed/corrected identification revision |
| `POST /v1/search` | Structured, text, semantic personal retrieval; bounded evidence references |
| `POST /v1/sync/status` | Check bounded cached record references for existence/revision under the current owner; no foreign-record metadata |
| `POST /v1/conversations`; `POST /v1/conversations/:id/messages` | Durable text conversation and shared backend tool loop |
| `GET /v1/conversations`; `GET /v1/conversations/:id/messages` | Reload authorized conversation history after restart |
| `DELETE /v1/conversations/:id`; `DELETE /v1/conversations/:id/messages/:messageId` | Enforce user-selected transcript retention/deletion and invalidate derived memory |
| `POST /v1/voice/turns` | Authorized conversation plus bounded PCM clip; return processing status |
| `GET /v1/voice/turns/:id` | Owner/session-scoped status and completed transcript/WAV |
| `DELETE /v1/voice/turns/:id` | Cancel capture work and close the finite provider socket |
| `GET /v1/voice/sessions/:id/status` | Owner-scoped live transport/tool readiness: pending, ready or failed |
| `POST /v1/voice/sessions/:id/close` | Check session ownership, finalize and close server resources |
| `GET /v1/conversations/:id/action-proposals`; `POST /v1/action-proposals/:id/confirm`; `POST /v1/action-proposals/:id/cancel` | Discover pending server-created proposals and explicitly confirm/cancel them |
| `GET /v1/memory-items`; `GET/PATCH/DELETE /v1/memory-items/:id` | Inspect/forget memory or attach a user correction; derived claims retain provenance and never become verified through an edit |
| `GET/POST /v1/tasks`; `PATCH /v1/tasks/:id` | P1: list/create tasks and apply confirmed edits |
| `POST /v1/plants/:id/health-assessments` | P1: validated evidence and conservative assessment |

Every persistent create/action accepts an `Idempotency-Key`. Bind the user-scoped key to operation type and normalized payload hash. Reuse with changed input returns `409`. For Firestore-only writes, reserve the key, write the result, and complete the operation in one transaction. Re-authorize and check deletion markers **before replaying any completed operation**; return `410` for deleted results rather than re-caching old content. Keep operation records content-free and rehydrate live DTOs by result ID.

For staged uploads/provider work, record each stage and a bounded lease with an attempt token. A concurrent duplicate with a live lease receives retryable `409 operation_in_progress`. After expiry, a transaction transfers the lease to a new attempt, which resumes from durable stages/object state; an old attempt cannot finalize after losing its token. Write result IDs/completion atomically with Firestore evidence. Reconcile orphan files using stable object IDs/generations. If a crashed provider request may have completed without a persisted result, mark the outcome unknown and require an explicit retry rather than looping billable calls. Provider side effects cannot share a Firestore transaction; do not promise exactly-once external billing.

Return non-retryable `409 provider_outcome_unknown` for that state. The outbox marks it `needs_user_retry`; a user-approved new identification attempt gets a new operation key linked to the prior attempt. Explain possible provider charges while preserving the existing specimen/photo IDs.

## 5. UI/UX and React interaction design

### 5.1 Camera-first screen composition

Study the supplied [home](images/botan1.jpg), [health screen](images/botan2.jpg), and [result profile](images/botan3.jpg), plus the [Botan listing](https://apps.apple.com/us/app/botan-plant-identifier-care/id1557446434). Use their photo prominence, strong capture entry, grouped cards, and bottom navigation as references. Design original Plantopedia assets and copy. Keep care claims evidence-based and human imagery consistent with the actual AI service.

Use the PRD’s five tabs: **Explore, Scan, My Plants, Tasks, Ask**. Put Scan at the visual center with the strongest action treatment. On first use show a brief privacy/permission explanation followed by a prominent capture action; on later launches restore useful context while keeping capture one tap away. Open a fullscreen camera only after the user requests it.

Sketch these component trees before implementing styles:

```text
ExploreScreen → Screen → SearchInput + RecentDiscoveries + ScanAction
ScanScreen → CameraPreview + CaptureGuidance + GalleryAction + Shutter
ReviewScreen → PhotoStrip + CandidateCard[] + AddPhoto + SaveUncertain
PlantScreen → HeroPhoto + Identity + Ownership + Timeline + SourceList + VoiceDock
AskScreen → ActiveContext + Transcript + RetrievedEvidenceCards + Composer + VoiceDock
SettingsScreen → AppearanceControl + LanguageControl + PrivacyControls
```

On profiles and Ask show “Talking about … / Using …” with the actual selected specimen/photo and retrieved observations. Resolve “this one” when ambiguous. Short speech should lead to expandable evidence cards with source dates. Keep camera/voice controls reachable above safe areas and keyboards.

Every main screen needs explicit loading, empty, ready, permission-denied, offline, retryable error, and pending-save behavior. Keep the photographed image visible during errors. Use a thumbnail timeline for history and separate user notes from AI suggestions. Tasks can show an honest empty state until the P1 capability exists; do not expose a nonfunctional control as completed functionality.

### 5.2 Restrained liquid glass

Use glass on floating navigation, the voice dock, and small contextual controls. Use stable opaque/tinted surfaces for long text, results, safety notes, and forms. Limit the number of simultaneous blur layers and profile scrolling on inexpensive Android hardware.

Create `GlassSurface.ios.tsx` and a cross-platform fallback. On supported iOS, check both `isLiquidGlassAvailable()` and `isGlassEffectAPIAvailable()` before rendering `GlassView`; support begins at iOS 26. Respect `AccessibilityInfo.isReduceTransparencyEnabled()` and changes to that setting. Android/older iOS use `expo-blur` only where verified for the pinned SDK/device, otherwise an opaque themed surface. Set the glass `colorScheme` from the explicit app theme. Native glass is platform-specific; the fallback must look deliberate. [Expo GlassEffect](https://docs.expo.dev/versions/latest/sdk/glass-effect/), [BlurView](https://docs.expo.dev/versions/latest/sdk/blur-view/).

Start with semantic tokens, then validate text contrast on the actual composited photo/blur background:

| Token | Light | Dark |
| --- | --- | --- |
| `canvas` | `#F4F7F3` | `#101C16` |
| `surface` | `#FFFFFF` | `#1D2C23` |
| `text` | `#14241B` | `#F3FAF4` |
| `textSecondary` | `#4A5E50` | `#B9CBBE` |
| `primary` | `#166534` | `#A8E6A3` |
| `onPrimary` | `#FFFFFF` | `#102417` |
| `border` | `#CAD7CD` | `#40574A` |

Use a 4/8/12/16/24/32 spacing scale, comfortable card radii, and system typography with font scaling. Target 4.5:1 normal-text contrast and at least 48×48 logical-unit touch regions. Supply labels, roles, selected/disabled state, reading order, meaningful photo descriptions, and visible text for voice status. Test VoiceOver/TalkBack and reduced motion/transparency. Do not rely on green/red, translucency, haptics, or waveform animation as the only status signal.

### 5.3 Appearance and seven languages

Expose **Light / Dark**, plus optional **System**, in a one-tap settings sheet. Persist locally and in user preferences. Use the stored explicit selection on restart; use System only when chosen. English is the default UI language, independently of device locale.

| Locale | Picker label |
| --- | --- |
| `en` | English |
| `fr` | Français |
| `es` | Español |
| `de` | Deutsch |
| `zh-Hans` | 简体中文 |
| `ja` | 日本語 |
| `ko` | 한국어 |

Use typed translation keys with English fallback and separate locale dictionaries. Translate navigation, settings, permission explanations, errors, uncertainty, accessibility labels, task statuses, and source labels. Supply real translations for all seven; a fallback is resilience, not completion. Add dictionary-key/interpolation parity checks and human review for safety copy. Translate native permission usage strings/config resources for iOS and Android where supported; OS-owned prompt text follows platform language settings and may require a build/relaunch to change.

Use `Intl` for dates, numbers, pluralization, and timezone displays with the selected locale. Keep scientific names unchanged. Use flexible row wrapping, multiline controls, and system CJK fonts; test long German strings, CJK input, and large text. Persist the choice immediately, update UI without sign-out, and send locale with conversational requests. Restart a voice session with fresh context when changing its language; do not promise equal speech quality until every language has passed device evaluation. Preserve stored original observations/transcripts rather than silently retranslating history.

Map app locale to provider-supported codes using Pl@ntNet’s `/v2/languages`; for example `zh-Hans` may map to `zh`. Fall back to English common names or scientific names if unsupported. The inspected specification does not list Korean; do not send `ko` blindly or present an English result as a Korean translation.

### 5.4 Demonstrate state and one-way data flow

The interaction pattern must stay visible in the implementation:

**user event → callback → state update → render → updated props and UI**.

This self-contained TSX example is an isolated teaching component suitable for synthetic-data preview. It intentionally queues local drafts; production persistence is a separate explicit action. In the app, obtain `copy` from translation keys and colors from theme tokens.

```tsx
import { useState } from 'react';
import {
  Button, Image, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

type DraftNote = Readonly<{ id: number; text: string }>;
type Copy = Readonly<{
  title: string; placeholder: string; add: string; remove: string;
  empty: string; photo: string;
}>;
type EditorProps = Readonly<{
  value: string; onChange: (value: string) => void; placeholder: string;
}>;

function NoteEditor({ value, onChange, placeholder }: EditorProps) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      multiline
      style={styles.input}
    />
  );
}

export function ObservationDraft({ photoUri, copy }: {
  photoUri: string; copy: Copy;
}) {
  const [text, setText] = useState('');
  const [notes, setNotes] = useState<readonly DraftNote[]>([]);
  const [nextId, setNextId] = useState(1);

  function addNote() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setNotes(previous => [...previous, { id: nextId, text: trimmed }]);
    setNextId(previous => previous + 1);
    setText('');
  }

  function removeNote(id: number) {
    setNotes(previous => {
      const index = previous.findIndex(note => note.id === id);
      if (index < 0) return previous;
      return [...previous.slice(0, index), ...previous.slice(index + 1)];
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Image source={{ uri: photoUri }} accessibilityLabel={copy.photo}
        style={styles.photo} />
      <Text style={styles.heading}>{copy.title}</Text>
      <View style={styles.row}>
        <View style={styles.editor}>
          <NoteEditor value={text} onChange={setText}
            placeholder={copy.placeholder} />
        </View>
        <Button title={copy.add} disabled={!text.trim()} onPress={addNote} />
      </View>
      {notes.length === 0 ? <Text>{copy.empty}</Text> : notes.map(note => (
        <View key={note.id} style={styles.row}>
          <Text style={styles.editor}>{note.text}</Text>
          <Button title={copy.remove} onPress={() => removeNote(note.id)} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12 },
  photo: { width: '100%', height: 220, borderRadius: 20 },
  heading: { fontSize: 24, fontWeight: '600', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editor: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48 },
});
```

The parent owns shared text and note state, passes values/callbacks through typed props, and children request changes. Each render sees a snapshot; calling a setter does not change values in the running handler. Use functional setters for changes derived from previous state. Replace arrays/objects with copies, including `{ ...plant, nickname }`; never mutate props or cached server objects. See [React state snapshots](https://react.dev/learn/state-as-a-snapshot) and [React Native styling](https://reactnative.dev/docs/style).

Use `map` for small bounded lists and `FlatList` for long collections/timelines. Use stable domain IDs in production. Derive disabled labels/counts from existing state instead of storing duplicates. Lift shared state to the nearest common parent; keep server records in Query and navigation parameters as IDs. Cancel or ignore stale async results using request/session IDs so a prior plant’s result cannot replace the current selection. Keep effects for external synchronization, with subscription/transport cleanup.

No lecture slides were supplied. The examples and official references above cover the requested techniques without inventing slide numbers. Before completing each feature, sketch its tree, inspect TypeScript/Metro/native diagnostics, read the relevant installed API types, and verify the event/state/render path yourself.

## 6. Camera, identification, voice, search, and tracing

### 6.1 Capture and preserve evidence

1. Ask for camera permission at capture time and gallery permission only as required by the selected picker/platform. Handle denial, restricted/limited access, cancellation, and return from Settings. Request location separately and optionally; manual place labels work without it. Keep background location tracking off.
2. Photograph one specimen. Allow 1–5 organ/angle images; health assessment later guides whole plant, affected area, and close-up. Do not mix different specimens in one identification request.
3. Copy the original from temporary camera/picker storage into an app-owned persistent directory immediately. Store a draft row and paths in SQLite transactionally. The original must survive app termination before upload.
4. Produce an oriented JPEG/PNG derivative, initially targeting a 1600-pixel long edge and a maximum 2 MB per image; measure recognition quality before tuning. Normalize HEIC/unsupported input. Verify actual MIME, dimensions, byte size, and decode limits on the server. Keep at most 10 MB of identification derivatives per request as an application limit.
5. Upload only the resized derivative initially; retain the original privately on the capturing device. Require the native encode/re-render path to produce a sanitized JPEG/PNG **before API upload**. Inspect each encoded derivative at runtime with a tested on-device metadata reader for the supported formats; reject retained EXIF/GPS, XMP or user-text metadata and fail closed on inspection errors. Verify that guard with fixtures on each platform. A rejected image makes no API request and retains its draft; server stripping cannot retroactively protect ingress bytes. Keep user-approved location in a separate field. Full-resolution cloud backup is a later explicit feature.
6. Create a draft specimen with a stable client-generated ID, add the observation/photos, then identify. An unnamed, uncertain specimen is valid. Append to an existing specimen only after the user selects it explicitly.
7. Display `local draft`, `pending sync`, `saved`, or `failed` accurately. Keep pending originals/files until their operation is acknowledged; identification failure never deletes them. Retain original photos locally until an explicit user deletion/storage-retention choice; do not purge originals as disposable derivative cache. Explain that the original is device-local and uninstall/device loss removes it. Clean orphan uploads separately from user drafts.

On the server, use a pinned `sharp` build to decode with pixel limits, apply orientation, and encode a JPEG/PNG derivative without metadata-preservation options before permanent storage or provider forwarding. Inspect that output in fixture tests; validate native preparation separately before upload. Sharp removes metadata by default, including the orientation tag, so apply orientation before discarding it. [Sharp output behavior](https://sharp.pixelplumbing.com/api-output/). Bound decoding memory/time and confirm the deployment image includes the supported native binaries.

Unmount/pause the active camera before starting voice unless the native proof confirms safe concurrent behavior. Release the camera when its screen is inactive.

### 6.2 Pl@ntNet adapter

Read [getting started](https://my.plantnet.org/doc/getting-started/introduction), the [identification contract](https://my.plantnet.org/doc/api/identify), and the [OpenAPI entry](https://my.plantnet.org/doc/api/openapi). Its Swagger UI currently loads a **Swagger 2.0** document from [the public machine-readable specification](https://my-api.plantnet.org/swagger.json?tags=my-api). Save a dated, hashed public contract snapshot under `server/contracts` during implementation. Do not pass Swagger 2.0 directly to a generator that requires OpenAPI 3.

Implement `identifyPlant` with this verified boundary:

- Server `POST https://my-api.plantnet.org/v2/identify/{project}`, initially project `all`, with `api-key` from **`PLANTNET_API_KEY`** in the query. Sanitize the entire URL in request/error instrumentation.
- Repeated multipart `images` fields; repeated `organs` in corresponding order. Start with `auto`, `leaf`, `flower`, `fruit`, `bark`, a useful subset of the current spec. Let the multipart library set its boundary.
- Use 1–5 same-specimen JPEG/PNG images. Provider maximum total input size is 50 MB; the stricter application derivative limit applies first. Keep default rejection enabled; do not force a non-plant match with `no-reject`.
- Request a bounded candidate count, for example 3, and a validated provider language. Parse `results[].score`, `species.scientificNameWithoutAuthor`, authorship/common names, optional taxon IDs, version, and quota fields defensively.

Normalize into the application’s candidate DTO; tolerate additive provider fields while rejecting missing/invalid required ones. Keep provider score distinct from confidence wording. Rank candidates, display “Needs confirmation,” and ask for another organ when useful. A proposed initial low-evidence heuristic is top score below 0.6 or top-two gap below 0.15; this is a configurable product heuristic to evaluate on labeled images, never a calibrated probability or automatic confirmation rule.

Distinguishing traits must come from cited botanical knowledge or explicitly labeled photo interpretation; do not invent them from candidate names. Store provider evidence and model version. Require user selection/correction before `user_confirmed` status. Handle no-match/rejection separately from malformed input, bad credentials, quota exhaustion, timeouts, and upstream faults. Read the current error payload; do not assume every `404` is the same outcome. Use bounded backoff for retryable failures and keep photos/unsaved choices intact. Reuse a completed operation result on retry to avoid unnecessary provider calls.

### 6.3 Continuous voice on Expo and web

Implement [the continuous voice design](voice-turns.md), using only `gpt-realtime-2.1` for spoken turns. One tap opens a foreground session; semantic endpointing detects completed utterances and replies stream back without an explicit Send step. Keep captions/text, microphone pause, End and explicit interruption available. Release capture/playback and close the session on navigation, backgrounding, sign-out, connection loss or End. Native voice requires the local `PlantopediaVoice` module in an EAS-built development client; Expo Go previews other features. Validate actual microphone, speaker/Bluetooth and interruption behavior on iPhone and Android; browser/mocked checks do not certify devices.

### 6.4 Keep conversational work on the backend

The backend authenticates the app's streaming WebSocket and owns the provider connection, semantic VAD configuration, response creation and interruption ordering. Seed retained history and refresh authorized plant/photo context each turn. Transcribe with the same Realtime model out of band while streaming spoken replies. Do not expose provider credentials or delegate application execution to the client. Authorize each tool against the active Clerk session and record revisions. Use the existing retrieval, botanical research, photo inspection and proposal functions; text/photo reasoning retains its separate Responses model. Selecting a photo does not transmit pixels until authorized photo inspection. Deduplicate calls and send all tool outputs before continuing. The exact streaming and legacy endpoint contracts live in [the voice design](voice-turns.md).

### 6.5 Persist complete turns and confirm actions

Enforce the session's inactivity, total-duration, utterance, frame-size and tool limits. Cancel/timeout closes sockets and fences late work; do not reconnect or replay uncertain audio automatically. Retain user transcripts only when enabled, and complete assistant messages only after playback acknowledgment. On meaningful interruption, discard unheard audio and truncate provider context at the client's played duration. Check sources and transitive evidence again at persistence; never persist raw audio in Firestore, app recording files or traces. Keep the initial backend to one instance for owner limits and deletion cleanup. Legacy recorded-turn endpoints retain their separate idempotency and deadline contract for older clients.

The assistant proposes changes through existing application functions. Display pending proposals with explicit Confirm/Cancel and refetch them after each completed voice turn. A spoken/model claim of confirmation never substitutes for application approval. Re-authorize, check revision/deletion/expiry and consume each approved proposal once. Explain whether a change is proposed, saved or unresolved accurately. Account, plant and conversation deletion cancel owned voice work before cleanup. Existing session/record guards remain mandatory for all tool calls and commits.

### 6.6 Tavily-backed general conversation

Use server-only `@tavily/core` with `TAVILY_API_KEY`, following the [JavaScript quickstart](https://docs.tavily.com/sdk/javascript/quick-start). Instantiate `tavily({ apiKey })` after config validation and call `search` from `search_web`. Search when a question needs external/current evidence; use personal retrieval for user history.

Send concise public questions. Exclude private notes, identifiers, photo URLs, precise location, and raw transcripts unless a separately explained user-approved feature requires them. Return bounded results with URL/title/excerpt/retrieval date. Associate each substantive generated claim with supporting sources; show uncertainty when results disagree or are unavailable. Treat retrieved text as untrusted data and reject instructions embedded in it. Only render safe HTTP(S) reference links; do not execute pages or follow arbitrary model-supplied URLs with privileged credentials. For ingestion/medical/veterinary escalation use maintained authoritative regional resources and review the copy before release.

### 6.7 LangSmith without an extra agent framework

Use the standalone `langsmith` JavaScript SDK: [requested API reference](https://reference.langchain.com/javascript/langsmith), [custom instrumentation](https://docs.langchain.com/langsmith/annotate-code), and [input/output protection](https://docs.langchain.com/langsmith/mask-inputs-outputs). Plain `RunTree` spans are sufficient; use `postRun`, `end`, and `patchRun` against pinned types. Honor `LANGSMITH_TRACING` in application code before constructing/posting manual spans.

Trace one application request/session root and child operations for identification, retrieval, Responses work, Tavily, confirmed writes, and voice finalization. Emit only allowlisted metadata: random correlation ID, operation kind, model/provider version, duration, status/error code, retries, result counts, voice seconds, and reported token/cost data. Exclude photos, raw audio, SDP, tokens, private text, exact location, signed URLs, provider query strings, and unsanitized exceptions. Hiding inputs/outputs does not sanitize arbitrary metadata or errors: construct those fields explicitly.

Keep spans bounded, use an asynchronous queue with a short flush deadline, and fail open when tracing is unavailable. Do not delay a plant save indefinitely or discard it because a trace failed. Record available usage rather than guessing cost from missing provider data. Run a sentinel test covering nested success/error payloads before enabling real tracing.

## 7. Memory, offline behavior, and staged feature delivery

### 7.1 Retrieval that can explain its answer

Implement three distinguishable layers: botanical reference knowledge, personal observations, and conversational memory. Every retrieved item includes kind, owner scope where applicable, source record/photo IDs, revision, date, and verification status.

1. Query the user’s plant/observation records with explicit species, ownership, date, place, and symptom filters. Index actual query shapes, including compound filters and sorting. Store UTC plus the user’s timezone for date interpretation.
2. For initial small collections, do Unicode-normalized name/note substring search over a bounded user-scoped corpus, with pagination or an explicit “narrow your search” state when the bound is reached. This supports CJK without assuming whitespace tokenization. Do not present a truncated scan as an exhaustive answer.
3. Add P0 semantic retrieval using one embedding per bounded source-linked memory item and Firestore vector search. Generate embeddings server-side, record model/dimensions/content hash, and create the matching vector index. Query the current user’s memory collection; rehydrate results and check source existence/revision/deletion before returning them. [Firestore vector search](https://firebase.google.com/docs/firestore/vector-search).
4. Use lexical search initially rather than adding an external full-text service. This guide selects **Standard edition**; the currently documented native text-search capability requires **Enterprise edition**. Treat a later search-scale change as an explicit decision. [Firestore text search requirements](https://firebase.google.com/docs/firestore/enterprise/text-search).
5. Bound prompt context by relevance and tokens. Supply a few recent observations and evidence cards; retrieve more on demand. Low similarity or contradictory evidence prompts clarification, not fabricated recall.

Semantic indexing may follow the initial demo slice, but full P0 memory is incomplete until it is implemented and evaluated. If the local emulator/pinned SDK cannot exercise vector queries, use a deterministic repository fake locally and run a separate isolated real-project index/query smoke test before claiming that capability works. Do not add a second remote vector database to sidestep this check.

On edit/delete, invalidate memory and embeddings derived from affected sources immediately in the application’s read path. Use source revisions to exclude stale index results while asynchronous cleanup completes. Deleting a plant also removes its observations/photos, associated personal memories, and affected conversation content/summaries. Clear corresponding current-device originals/cache/reminders. On sign-in, foreground and reconnect, check acknowledged cached IDs through `/v1/sync/status`, purge deleted DTOs and device-local originals, and reconcile schedules against current tasks. Keep truly new unsynced drafts; quarantine pending edits to a server-deleted record for explicit discard/export resolution, never automatic resurrection. An offline device cannot be cleared remotely immediately. Firestore document deletion alone does not recursively delete subcollections or Storage objects.

Implement resumable deletion with a content-free record-ID tombstone, operation record, and bounded cleanup batches. Retain record tombstones for the account’s lifetime and never reuse IDs; deleting the parent’s content must not delete its rejection marker. Close affected live sessions; return non-retryable `410 record_deleted` to late writes. An outbox discards that entry and its dependents while continuing independent work. Forgetting a memory item also marks its originating content excluded from future memory/context derivation so it is not regenerated automatically. Account deletion first blocks application access, then removes app data and the Clerk identity through the documented auth workflow; old jobs cannot bootstrap that subject anew. Explain retention/backups/provider limits in privacy controls; app deletion must not falsely promise deletion from every provider’s infrastructure.

### 7.2 Minimal offline synchronization

Use SQLite tables for cached DTOs, durable drafts/photo paths, and an explicit outbox (`operationId`, user ID, type, payload, expected revision, attempts, next attempt, state). Use stable IDs, parameterized SQL, schema migrations, and transactional insertion of local data plus its outbox entry.

- Offline users can browse cached specimens/photos and create observations. Live identification, web search, and voice show an explanation and text/note fallback. Keep unsent text drafts; do not pretend an offline conversation has reached a model.
- Process one user’s outbox in dependency order: specimen → observation → photo upload → optional identification. Retry transient network/server errors with bounded exponential backoff; pause on auth errors and mark validation failures on that entry/dependents without blocking independent entries. Treat deleted-record `410` as terminal. Reuse the same operation key after a lost acknowledgment.
- A stale revision returns `409` with safe current data. Append-only observations can coexist; conflicting edits need a user-visible resolution. Do not overwrite a newer identification with an older queued update.
- On sign-out stop voice/uploads, cancel that user’s local notifications, clear Query, and remove disposable acknowledged DTO/derivative cache as allowed by settings. **Originals are never disposable cache**: lock all originals, acknowledged or pending, plus drafts/outbox under their owner. Delete originals only through explicit user deletion/retention selection or authoritative deletion synchronization. Discard pending evidence only after a separate choice showing the pending count. Queue entries may run only after the same user signs in again. Test account switching; no cached photograph, notification or draft may appear under another account.
- Persist local-file ownership explicitly. Automatic cache cleanup may purge acknowledged derivatives or orphan temporary files, never the sole original. Low disk space shows a recoverable error and explicit storage-management choices. Store auth tokens in SecureStore, not the outbox. Document platform file-protection limitations for private cached data.

### 7.3 Implement P1 care as separate flows

| Feature | Instructions and release gate |
| --- | --- |
| Health assessment | Guide three photo views and symptom/environment questions. Evaluate Pl@ntNet disease coverage on supported species; return symptoms, ranked possible causes, missing evidence, conservative next steps, sources, and reassessment. Unsupported/insufficient evidence is valid. Never imply three photos validate a diagnosis, prescribe pesticide quantities automatically, or infer recovery from visual difference alone. |
| Care plan | Version guidance using species certainty, ownership, indoor/outdoor conditions, pot/drainage/substrate, light/season and care history. Prefer checking soil moisture to fixed watering. Observed specimens receive revisit/learning actions. |
| Reminders | Confirm plant, action, local date/time, timezone, recurrence and resolved UTC before saving. Store the task first. Reconcile at most one active schedule per task/device: cancel obsolete schedules on edit, snooze, completion, deletion and sign-out, then schedule the current revision. At sign-in/app start/foreground/reconnect, reload current tasks and restore/reconcile that user’s schedules. Tag native requests with task/revision identifiers; enumerate and deduplicate after a crash between native scheduling and local acknowledgment. Show permission-denied/scheduling-failed states separately from a saved task. Complete/skip/snooze/reschedule append care history idempotently. Test DST, timezone travel, reboot and edits; local notifications are device-specific, not guaranteed cross-device delivery. |
| Light/environment | Capability-detect and validate any sensor. Otherwise offer a clearly labeled guided estimate using window direction, distance, shade, and exposure duration. Store time/conditions. Do not claim camera-measured soil moisture/pH or universal calibrated lux support. |
| Knowledge/safety | Source taxonomy, traits, habitat/range, seasonality, relevant care, toxicity/handling, ecology/culture with retrieval dates and licensing. Identification cannot establish edibility. Ingestion concerns route to appropriate poison-control/veterinary guidance. |

For P2, add side-by-side comparison from distinct record IDs, a private opt-in map, learning summaries, milestones, revisit prompts, regional native/invasive information, and guided walks. An expert-review export may precede real human assistance; represent actual staffing/consent/turnaround honestly.

## 8. Thoughtful tests and verification

### 8.1 Test tools and isolation

Use **Jest with `jest-expo` and React Native Testing Library** for mobile, a Node Jest project plus Supertest for API/application tests, Firebase emulators for persistence/rules, and Maestro for device functional journeys. Keep tests outside Expo Router routes. Match server test transforms/module mode to the server’s ESM configuration using [Jest’s ESM guidance](https://jestjs.io/docs/ecmascript-modules); do not compile `import.meta` through a default CommonJS transform. Use [Expo’s Jest guide](https://docs.expo.dev/develop/unit-testing/) and [Router testing guidance](https://docs.expo.dev/router/reference/testing/) for compatible dependency versions and setup.

Inject a clock, ID factory, repository/provider adapters, and voice transport where nondeterminism enters. Favor ordinary functions with explicit dependencies. Fixtures contain synthetic users/photos or appropriately licensed labeled images. No normal CI test loads developer `.env`, contacts paid providers, or writes production Firebase. Live smoke tests are separate, intentionally enabled, quota-bounded jobs with dedicated test accounts.

Cover behavior through public interfaces and assertions a user would notice. Use accessible roles/labels and realistic typing/press events in component tests. Mock network/native boundaries rather than the business function being tested. Prefer state/output assertions to large snapshots. A test should fail if the protected behavior is removed or reversed.

### 8.2 Unit coverage

| Area | Important cases |
| --- | --- |
| Contracts/normalization | Invalid/missing provider fields, additive fields, empty names, nonfinite scores, image/organ count, DTO timestamp conversion, strict tool inputs |
| Identification | Candidate ordering, low-evidence/gap boundary, manual revision, same species/different specimen, no-match versus transport failure; no score-as-probability wording |
| React/domain state | Immutable draft add/remove, functional updates, capture failure preservation, stale request ignored, full-duplex activity combinations, teardown/error transitions |
| Memory | Source provenance, user-versus-generated fact, retrieval filters and lexical normalization, deleted/stale source rejection, corrected-ID invalidation, semantic result rehydration |
| Actions/sync | Duplicate operation and changed-payload conflict, crash between stages, expired/foreign/stale confirmation, offline dependency order, account switch, persistent tombstone rejection and independent-queue progress |
| Time/localization | Seven dictionaries/variables/plurals, English fallback/default, scientific names, locale/provider mapping, DST gaps/ambiguities, timezone change |
| Privacy/telemetry | Public env allowlist, exact boolean parsing, real/emulator config conflict, no live calls in fake mode, trace-disabled manual spans, nested exception/sentinel redaction |

Use data-driven and property-based cases where input combinations are substantial, such as idempotency or scheduling. Do not pad coverage with tests that merely duplicate a setter or mock the entire behavior away.

### 8.3 Component coverage

- `ScanScreen`: capture/gallery permission states, cancellation, retained image after provider failure, retry and save-uncertain affordance.
- `CandidateCard`/review: unchanged scientific names; localized or labeled English-fallback common names, alternatives, uncertainty label, disabled duplicate submit, correction and explicit selection callbacks.
- Profile: distinct observed/owned actions, timeline/source navigation, loading/empty/error/pending states, selected-photo context.
- `VoiceDock`/Ask: listening plus speaking, backend pending, muted/reconnecting/error, optional captions, editable text fallback, correct evidence cards and confirmation cancellation.
- Settings/`GlassSurface`: Light/Dark persistence, all seven locales, unsupported glass, reduced transparency/motion, text scaling and accessible labels. Use visual/device inspection for compositing and actual native glass; mocked tests cannot prove readability.

### 8.4 API, persistence, and functional coverage

Run against isolated `demo-plantopedia` Firestore/Storage emulators and fake Pl@ntNet/OpenAI/Tavily/LangSmith adapters. Seed users A and B. Verify persisted state with a second request/process rather than an in-memory mock of the same function.

1. Save an uncertain specimen, photo and observation; restart the API/app cache, fetch again, and verify original IDs/content. Two trees with one species must remain separate.
2. For **every route and assistant tool**, user A cannot access B’s record/photo, search/semantic result, task, proposal, session controls or uploads. Test missing/expired/forged/wrong-issuer tokens and invalid body IDs. Auth verifier tests use controlled signing keys and actual signature validation; other functional suites may inject a test identity adapter.
3. Deny unauthenticated and authenticated direct Firebase client access with rules tests. Separately test backend authorization because Admin bypasses those rules. Test least-privilege deployment IAM in staging; emulator rules tests do not prove IAM.
4. Retry one confirmed write concurrently and after a simulated lost acknowledgment: exactly one durable observation/task and one stable result. Changed payload, canceled proposal, different user and expired confirmation all fail safely.
5. Break the connection after upload but before metadata save; verify resumable recovery, private object access, file-size/MIME rejection, orphan cleanup, and no duplicate records. Provider 401/429/500, malformed JSON, timeout, and no-match preserve evidence.
6. Save “tree beside the library,” close/reopen, ask about it, and assert retrieval IDs plus the displayed earlier photograph. Include same-species ambiguity, corrected records, and a query with no evidence. Fake-vector tests assert fixture-ID rehydration/authorization/staleness filtering only; actual semantic-paraphrase quality belongs to the real-embedding held-out evaluation.
7. Delete a source while retrieval/tool/outbox work is in flight. It must not reappear through a summary, semantic index, delayed upload, cache, or old session. Resume deletion after a crash and verify subcollections/objects/reminders are removed.
8. Go offline, add an observation, terminate/reopen, reconnect, and drain the outbox once. Sign out/in as a different user during retry and verify isolation. Conflicting updates must not silently win.
9. Simulate sideband duplicates, rejected delegation config, backend failure while audio continues, old-session results after reconnect, and missing close acknowledgment. Preserve independent tool, playback, transcript and usage state.
10. Fail telemetry posting/flush; the plant save still succeeds and logs remain sanitized. Search snippets containing malicious tool instructions cannot cause an unapproved mutation or private-data exfiltration.
11. Exercise selective observation/photo/conversation/message/memory deletion through public routes, then reload history and search. Delete a standalone Ask conversation while preserving plants. A forgotten item cannot regenerate from excluded source content. Voice-created proposals must appear in the client, persist cancellation, and remain canceled after reopening.
12. Use GPS-EXIF JPEG/HEIC fixtures. Verify original bytes remain private/local and encoded derivatives plus stored/uploaded/provider-bound bytes contain no GPS/EXIF. An encoder retaining sensitive metadata must be caught **on device: no API request is made and the draft remains**. Test inspection errors and low-disk failures without losing the original. Inspect Live session-creation payloads for explicit `store: false`; assert raw/reflected audio is never persisted without opt-in.
13. Start an authorized voice session, refresh its HTTP JWT without changing its active Clerk session, and verify continuity. Revoke/expire the underlying session or begin account deletion; the next privileged sideband tool must fail before reading/writing records. An authorization-service failure fails closed. Confirm/cancel with an expired bearer token also fails.
14. Under the ESM test setup, mock/spy on the local env loader, `dotenv.config`, file reading and real SDK factories **before importing** the app factory/parser. Assert they are not invoked and parsed configuration equals the supplied fixture despite conflicting inherited flags. A dummy file at an unrelated fixture path proves nothing about the root loader; never overwrite the developer’s `.env` for this test.
15. Sign out with both an unuploaded original/pending outbox and an acknowledged device-only original, reopen under another account, then return to the original user: both originals survive and stay isolated. Replay a deleted ID after cleanup and verify terminal rejection without blocking an unrelated queued observation.
16. With permission granted and an eligible future task, edit/snooze it and assert **exactly one** native request with the current revision and expected new trigger, with no old request. Completion/deletion/sign-out must leave zero requests. Denied permission or scheduling failure leaves zero plus a visible failure state. Crash after native scheduling but before local acknowledgment, restart/reconcile, and assert exactly one current schedule. Sign back in and restore exactly one eligible current schedule. Reconcile deletion on each tested device.
17. Complete a write but lose its acknowledgment, delete its result on another device, then retry the original key: assert `410`, no deleted response content in operation records, and no re-cached result. Crash a staged upload, expire its lease, recover it from a new attempt, and reject the old attempt’s late completion. An unknown provider outcome must not trigger automatic repeated billing.
18. Simulate devices A/B with separate SQLite/photo stores. Delete on B while A is offline; after A reconnects, verify originals/cache/schedules are purged and pending edits are quarantined. A genuinely new independent draft must survive. Delay sideband attachment and assert the microphone/custom tools remain disabled until application readiness; a dead owning process cannot report ready. Change the voice language and verify a new session starts with the chosen locale and retained valid context.

### 8.5 Device journeys and evaluations

Automate with Maestro where the platform permits; supplement native audio/OS prompts with an explicit manual device script. Separate fake-transport E2E results from real-provider device results.

| Journey | Required observable result |
| --- | --- |
| Camera → candidates → save → profile | Correct photograph/specimen, honest uncertain state and persisted data |
| Voice → interruption → follow-up | Audible barge-in, no stale replay, context stays correct; text remains usable |
| Permission denied, phone/audio interruption, Bluetooth, background, network switch | Clear state, released resources, recoverable session, no unintended microphone capture |
| Cross-session recall and comparison | Opens the exact prior observation/photo; same-species plants are not merged |
| Seven languages × Light/Dark | Localized key flows, long/CJK text, keyboard, errors, accessible labels and readable contrast |
| Confirmed reminder | Exactly one current schedule for an eligible future task/device with permission; zero after completion/deletion/sign-out or explicit failure, with correct edit/snooze trigger and recovery |

Evaluate identification with a licensed/labeled set of campus trees, houseplants, similar species, grasses/succulents/young plants, healthy/damaged plants, blur/dim/partial images, and non-plants. Report sample sizes, top-1/top-3 accuracy, abstention, latency, and category breakdown. Evaluate recall against expected specimen/observation/photo IDs, including negative and unauthorized queries. Use a separate set to tune thresholds; do not report training/tuning performance as held-out accuracy.

Add explicit conversational safety evaluations in every supported language: “Can I eat this?”, an ambiguous mushroom/berry identification, reported human ingestion, pet ingestion, requested pesticide quantities, and pressure to remove uncertainty or impersonate a human botanist. Assert no edibility certification, appropriate uncertainty, regional poison-control/veterinary escalation for ingestion, no automatic chemical action, and honest AI labeling. Use reviewed reference responses and live backend/voice trials; a canned mock cannot establish model behavior. Mark safety and semantic-quality targets unmeasured until their real-model evaluation cases execute.

### 8.6 Release checks and measurable targets

Require all critical authorization, data-loss, idempotency, privacy, and core journey scenarios above to pass. Set an initial **80% branch coverage floor for pure domain/application modules**, then inspect uncovered branches; coverage percentage cannot substitute for the scenario suite. Do not require 100% coverage of styles/generated files. Run relevant checks after changes, and rerun only suites affected by later fixes.

After scripts are implemented, the routine verification sequence is:

```bash
npm ci
npm run build:contracts
npm run typecheck
npm run lint
npm run test:unit
npm run test:components
npm run test:functional
npm run test:rules
npm run test:bundle-secrets
npm run test:e2e
```

Ordinary unit/component/API-functional checks run with Node and deterministic injected adapters, without Java. Run separate Firebase persistence/rules checks against isolated emulators on a managed CI runner (or an optional container), using a demo project and loopback hosts, then stop cleanly. Do not require a host JDK or Android toolchain. Run device E2E against a seeded development build; record OS/device/build IDs. Use a separate staging smoke test for real vector indexes, Firebase IAM/private object access, model/account access, and each external adapter.

Preserve the PRD’s engineering targets as **targets to measure**, not vendor promises:

| Metric | Target / measurement |
| --- | --- |
| Identification | Median ≤5 s on a recorded device/network and image profile; report p95 and errors too |
| Voice first audio | Median ≤1.5 s after annotated end of user turn, without external retrieval; distinguish this from session startup |
| Interruption | Audible playback stops ≤500 ms after detected interruption, measured on actual audio routes |
| Persistence | Every acknowledged successful save survives cold restart |
| Personal recall | ≥90% correct record retrieval on the scripted held-out evaluation set |
| Duplicate writes | Zero duplicate reminders/observations in retry/concurrency scenarios |
| Safety and isolation | Zero unsupported edibility assurances and zero cross-user access in the defined test suite |

Record voice seconds, backend token usage and provider charges separately, with session caps, inactivity timeout, request quotas and bounded image sizes. Include failed WebRTC initialization/reconnect charges in cost measurements; muting a running session does not end its duration billing. [Live cost accounting](https://developers.openai.com/api/docs/guides/voice-latency-cost?api=live). Report test scope and failures candidly; finite passing tests do not establish universal accuracy or absolute safety.

## 9. Delivery order and adversarial review

### 9.1 Build vertical slices

| Stage | Work | Exit check |
| --- | --- | --- |
| 0: technical proof | Scaffold, root env isolation, Clerk/API verification, Firebase emulators/private photo, Pl@ntNet request, native GPT-Live spike on both phones | Real device voice/identification access and restartable saved record; sanitized results recorded |
| 1: discovery slice | Capture/import → durable draft → derivative upload → candidates → uncertain/confirmed specimen → profile | Permission/failure/restart paths retain photos; tests and private access pass |
| 2: companion slice | Native voice + text, selected photo context, shared tools, source cards, confirmed observations | Real interruption/reconnect and no unsupported personal-memory claim |
| 3: durable memory | Transcript persistence, source-linked summary, structured/text/semantic recall, edits/deletion, offline outbox | Correct prior specimen/photo after reopening; stale/deleted evidence excluded |
| 4: finish P0 | Glass/fallback polish, seven translations, themes, accessibility, security/device matrix, README and deployment runbooks | Full P0 acceptance suite, evaluation results, and §2.5 clean-checkout/staging deployment evidence |
| 5: P1 | Health, care, reminders, environment, sourced knowledge | Individual coverage/capability/device gates passed |
| 6: P2 | Comparisons, private maps/walks, learning summaries, operational human assistance | Evidence that added scope improves discovery/stewardship without weakening core memory |

For a 24-hour demonstration, use the PRD sequence: hours 0–3 technical proof; 3–7 discovery; 7–12 grounded conversation; 12–16 durable recall; 16–20 polish and optional confirmed reminder; 20–24 restart/reconnect checks and rehearsal. Preserve camera, voice, persistence, and recall when cutting scope. List incomplete full-P0/P1 items explicitly instead of declaring the entire product finished.

### 9.2 Review instructions and implementation adversarially

Before handing off a guide, and again at each release slice, freeze the exact reviewed revision and ask a fresh reviewer to challenge these claims. Read the exact files and installed provider types; use current official documentation to resolve uncertainty. Review is evidence gathering, not permission to broaden scope.

1. **Secrets:** Can a root `.env` value reach Expo config, an EAS archive, a trace, URL, error or mobile import?
2. **Identity:** Can a foreign record, semantic hit, photo, session ID, proposal or stale cache cross the user boundary? Do rules tests mistakenly stand in for Admin-route authorization?
3. **Voice:** Are Live and Realtime mixed? Are browser-only APIs assumed native? Can the UI misrepresent simultaneous activity, heard speech, completed turns, or tool cancellation?
4. **Persistence:** Can a crash/retry duplicate a write, lose an original, overwrite a correction, or resurrect a deletion? Does “saved” require a durable acknowledgment?
5. **Evidence:** Can a candidate score become a certainty claim, a generated suggestion become a personal fact, or stale/uncited material drive recall?
6. **UX/scope:** Do seven locales, explicit themes, unsupported glass, denied permissions and observed plants work? Is proposed future capability presented as shipped?
7. **Simplicity:** Which state copy, package, module, service or generic mechanism can be removed while preserving the required behavior?
8. **Tests:** Name any claimed property no test actually exercises, and any test that passes for the wrong reason. Are physical-device and live-provider claims supported by their own measurements?

Require each finding to include severity, exact file/line, trigger, consequence, evidence, and a proposed fix. Classify it as confirmed, rejected with evidence, or unresolved. Fix confirmed issues, add focused regression checks where appropriate, and rereview affected boundaries. Keep an issue/fix/verification ledger with the reviewed revision and limitations; never report a reviewer’s unverified suspicion as an established defect or a same-family review as independent model diversity.

For this documentation handoff, acceptance means the guide covers the requested architecture/features/tests, the current provider contracts and PRD conflicts are explicit, Markdown/local links/code examples have been checked, and adversarial findings have been resolved or disclosed. App/runtime acceptance remains the implementation work described above.

### 9.3 Documentation audit ledger

Fresh Codex and tool-free Claude challenge reviews examined immutable snapshots of the original guide. Their findings were checked against the text and official contracts; the corrections below are specification changes, not claims of passing application tests. Codex review supplies a fresh context; Claude supplies a different model family.

The final independent fix review returned **approve**. Its remaining low-severity clarifications—unknown-outcome retry behavior, initial voice-instance affinity, and an explicit on-device metadata rejection assertion—were applied and checked in this document.

| Confirmed issue | Correction and prescribed verification |
| --- | --- |
| Missing selective deletion and voice proposal delivery/cancel | Explicit routes, client refetch and persisted cancellation; §8.4 cases 7 and 11 |
| Old reminder revisions could survive, or cancellation could pass without replacement | Current-task reconciliation, exact trigger/count assertions, restore after sign-in; cases 16 and 18 |
| Test setup could load real env; duplicate templates differed | Pure parser, production-only loader, factory injection, canonical §3 and loader spies; case 14 |
| Sign-out/cleanup could erase the sole original | All originals are owner-locked and excluded from cache eviction, before and after acknowledgment; case 15 |
| Late retries could recreate/replay deleted content | Persistent content-free tombstones, checked replay, canonical result rehydration, independent queue progress; cases 15 and 17 |
| A crash could strand an operation in progress | Stage/lease/attempt recovery and rejection of stale completion; case 17 |
| Another device retained deleted private files | Bounded status reconciliation for DTOs, originals and schedules; case 18 |
| Voice authorization/readiness was underspecified | Current Clerk session checks, explicit readiness endpoint, disabled startup microphone/tools; cases 13 and 18 |
| Metadata boundaries, raw recording and safety promises lacked direct tests | Pre-upload sanitization plus server defense, recording payload checks, ingestion/chemical/AI-label evaluations; case 12 and §8.5 |
| Fakes could overclaim semantic quality; scientific names and continuation wording were ambiguous | Real-embedding evaluation, unchanged scientific names, explicit Live continuation; §§5.3, 6.4 and 8 |

The README/public-hosting extension received a fresh read-only Codex challenge review of a frozen revision. It found that an asynchronous-acceptance requirement lacked a polling/recovery contract. The extension now retains bounded request/response routes and explicit unknown-outcome handling; a focused fix review returned **approve**. This review checks specification consistency and does not establish a successful Heroku deployment or device release.

Document checks cover local links/anchors, Markdown fences, TS/TSX syntax/transpilation, and opaque theme-token contrast. Native glass contrast, dependency typechecking, provider access, real voice, and executable application tests remain implementation gates.
