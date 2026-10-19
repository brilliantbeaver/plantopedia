# Plantopedia: Mac development, API keys, and environment setup

This guide accompanies [the implementation specification](12_app_create_instr.md) and the [README startup workflow](../README.md#everyday-startup-one-expo-server). The commands below use the repository's existing scripts. See [the evidence ledger](implementation-status.md) for completed checks and outstanding account/device acceptance; following setup instructions alone does not establish those results.

**Local configuration lives in `plantopedia/.env`**, at the application project root. The parent Stanford repository has its own Git root; do not put Plantopedia credentials there. Keep one local source of values, with an explicit public/mobile allowlist and server-only private values. No provider key belongs in React Native source, an Expo config `extra` object, a Snack, or a screenshot.

## 1. Mac prerequisites

1. Install the pinned supported Node/npm versions. Expo EAS builds native iOS and Android binaries in the cloud; local Java, Android Studio, Gradle, `adb`, and Xcode are not prerequisites.
2. Use the pinned EAS CLI, an Expo account, and the signing/distribution accounts needed for your chosen device or store workflow. Install a cloud-built development client on your phone and run Metro locally for development.
3. Local Xcode/Android Studio builds are optional advanced alternatives. If choosing them, follow the selected Expo SDK's native requirements separately.
4. Default unit/component/API-functional tests use Node and injected deterministic adapters. Firebase emulator/rules integration runs separately in managed CI or an optional container, so a host JDK is unnecessary. Local API development may use an already running emulator endpoint or the configured remote development Firebase project; never silently switch projects.
5. Use real iPhone and Android devices for camera, audio routing, interruption, and reconnect acceptance. Cloud compilation and mocks do not prove those behaviors.

Inspect tool versions without displaying credentials:

```bash
node --version
npm --version
eas --version
```

Record the resulting compatibility matrix in `notes/architecture-decisions.md`. Follow [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/) and the [continuous voice design](voice-turns.md). Continuous native Voice Chat requires an EAS development-client rebuild with the local PlantopediaVoice module. Expo Go can preview other features.

## 2. Accounts and keys to obtain

Use separate development/staging/production projects when release work begins. Copy values directly into the ignored `.env` with a local editor or password manager; never paste real values into this Markdown file or an assistant conversation.

| Service | What to obtain and enable | Variables | Exposure |
| --- | --- | --- | --- |
| Pl@ntNet | Create/sign in to a developer account, generate a private API key, verify identification quota and usage terms. Keep the key private; do not enable public client exposure for this architecture. Confirm disease coverage separately for P1. | `PLANTNET_API_KEY`; `PLANTNET_PROJECT=all` | Server only |
| OpenAI | Create a project API key with the required permissions, billing/budget, and actual access to `gpt-realtime-2.1`, a Responses backend, and embeddings. Model documentation does not establish access for your account. | `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_BACKEND_MODEL`, `OPENAI_EMBEDDING_MODEL`, `OPENAI_EMBEDDING_DIMENSIONS` | Server only; model names are configuration, key is secret |
| Tavily | Create/sign in to Tavily and copy the development API key; check search limits. | `TAVILY_API_KEY` | Server only |
| Firebase | Create/use the intended Firebase project; provision **Firestore Standard edition** and a private Cloud Storage bucket. Copy the exact project ID and bucket name. Create a dedicated local development service account with only required data/object permissions if using real Firebase. | `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Server only; private key is secret |
| Clerk | Reuse the application selected in [the auth note](11_clerk_auth.md); enable the Native API and intended sign-in methods. Obtain its matching publishable/secret keys and issuer configuration; configure native bundle/package IDs and callback scheme. | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_ISSUER_URL` | Only publishable key goes to mobile; secret remains server-side |
| LangSmith | Create a development tracing project/workspace, generate a scoped API key, and copy the correct API endpoint for its region. | `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `LANGSMITH_ENDPOINT`, `LANGSMITH_TRACING`; workspace ID if required | Server only |

Official setup references: [Pl@ntNet account/key steps](https://my.plantnet.org/doc/getting-started/introduction), [OpenAI Realtime turns](https://developers.openai.com/api/docs/guides/realtime-conversations), [Tavily JavaScript quickstart](https://docs.tavily.com/sdk/javascript/quick-start), [Firebase Admin setup](https://firebase.google.com/docs/admin/setup), [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart), [LangSmith instrumentation](https://docs.langchain.com/langsmith/annotate-code).

### Firebase credentials and billing

Cloud Storage provisioning/access currently requires a Blaze billing plan. Verify current requirements and set budget alerts before using a real bucket. Budget alerts are notifications, not hard spending caps. Start deterministic local development with emulators and a `demo-` project; that does not require a service-account key. [Firebase Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

This architecture uses Firebase **Admin on the server**, rather than Firebase SDK access from mobile. Therefore a Firebase web API key, `EXPO_PUBLIC_FIREBASE_*`, `GoogleService-Info.plist`, and `google-services.json` are **not required** for the initial application. Firebase client configuration is not an Admin credential and cannot replace one. If a later feature introduces a mobile Firebase SDK, add its explicit configuration and security design at that time. [Expo's Firebase SDK options](https://docs.expo.dev/guides/using-firebase/).

For real local Firebase, obtain a service-account credential through the project's approved Google/Firebase workflow. Copy `client_email` and `private_key` into the server variables below, then remove the temporary downloaded JSON from the project. Use a least-privilege development account; IAM must allow required Firestore and bucket operations, not project Owner. Keep Google login credentials out of the mobile app. For hosted deployment use workload identity/managed service-account credentials and the host's secret store; do not deploy a developer `.env` or private-key file.

## 3. Root `.env` template

Create a committed `.env.example` containing only this template, with explanatory comments. If `.env` already exists, **merge missing names without overwriting working values**. Only copy `.env.example` to `.env` when `.env` does not yet exist. The repository's existing `PLANTNET_API_KEY` name must remain unchanged.

```dotenv
# Mobile public configuration. Every EXPO_PUBLIC_* value is visible in the app.
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=replace_with_development_publishable_key

# Application server. Bind loopback by default; see physical-device networking.
NODE_ENV=development
SERVER_HOST=127.0.0.1
PORT=3001
ALLOW_LIVE_PROVIDERS=false

# Authentication: same Clerk application as the publishable key.
CLERK_SECRET_KEY=replace_with_development_secret_key
CLERK_ISSUER_URL=https://replace-with-your-clerk-issuer

# Identification provider; keep private.
PLANTNET_API_KEY=replace_with_private_key
PLANTNET_PROJECT=all

# Voice frontend, delegated text/vision backend, and semantic recall.
OPENAI_API_KEY=replace_with_project_key
OPENAI_REALTIME_MODEL=gpt-realtime-2.1
OPENAI_BACKEND_MODEL=gpt-6-luna
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536

# General web search.
TAVILY_API_KEY=replace_with_private_key

# Safe default: Firebase emulators only. Admin credentials are unused here.
USE_FIREBASE_EMULATORS=true
FIREBASE_PROJECT_ID=demo-plantopedia
FIREBASE_STORAGE_BUCKET=demo-plantopedia.firebasestorage.app
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Server tracing: enable explicitly after redaction is verified.
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=replace_with_workspace_key
LANGSMITH_PROJECT=plantopedia-local
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
# Optional: only if the workspace/key configuration requires it.
LANGSMITH_WORKSPACE_ID=
```

`ALLOW_LIVE_PROVIDERS=false` is an **application flag to implement**, not an SDK setting: select deterministic provider fakes and reject accidental billable calls in that mode. Set it to `true` only for deliberate local live-provider checks. Missing/private placeholder values may be allowed in fake-provider mode; real-provider mode must fail fast with the missing **variable name**, never its contents. Auth remains real Clerk in ordinary local development; automated suites inject a test identity adapter rather than calling production auth.

For real Firebase, set `USE_FIREBASE_EMULATORS=false`, set the actual project/bucket names, set credentials, and **remove both emulator-host variables**. Require the config validator to reject real mode with either emulator host present and reject emulator mode unless both hosts are loopback and the project ID begins `demo-`. Emulators do not emulate Clerk, Pl@ntNet, OpenAI, or Tavily.

The service-account private key is a quoted single-line value with escaped newlines:

```dotenv
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nREPLACE_WITH_KEY_CONTENT\n-----END PRIVATE KEY-----\n"
```

Parse it with the server `.env` loader; normalize literal `\n` to newline characters if still necessary after parsing. Never log the parsed credential or Firebase initialization object. Use the **actual** bucket name from the Firebase console; do not guess a `.appspot.com` suffix. The synthetic emulator bucket above is only a local test bucket.

Choose the correct LangSmith regional endpoint from workspace settings; the template shows the US endpoint. A LangSmith **API** key is distinct from a LangChain integration key. `LANGSMITH_TRACING=false` is not sufficient to suppress manually posted `RunTree` objects: honor the application tracing switch before constructing/posting them. [LangSmith tracing controls](https://docs.langchain.com/langsmith/annotate-code).

## 4. Load values without bundling secrets

### Mobile

Expo automatically loads the project-root `.env`. In `src/config/public-env.ts`, read the two approved public variables with explicit static property names and validate them. Do not dynamically enumerate `process.env` or spread it into application config. Expo inlines `EXPO_PUBLIC_*` values into the client bundle, so that prefix must never be used for provider or Admin secrets. [Expo environment variable rules](https://docs.expo.dev/guides/environment-variables/).

```ts
const publicConfig = PublicEnvSchema.parse({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
});
```

`PublicEnvSchema` is a schema you implement, including URL/protocol and placeholder checks. Do not import the server env module here. `app.config.ts` may use explicit public values, bundle IDs, and plugin settings; never return private values through `extra`. Restart Metro/reload after public configuration changes and rebuild when native configuration changes.

### Server

In `server/src/config/env.ts`, load **only the intended project-root file** before constructing SDK clients:

```ts
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  override: false,
});
```

That relative path assumes the documented `server/src/config/env.ts` layout and the matching `server/dist/config/env.js` build layout. Resolve it again if files move. Parse an allowlisted server schema; explicitly parse booleans from the strings `true`/`false`, since `Boolean('false')` is true. Convert numeric limits/ports/dimensions with bounds. Validate the Realtime model value and reject silent fallback. Ensure configuration loads before Firebase/OpenAI/LangSmith modules initialize. Deployment-injected values take priority over a local file.

The mobile entrypoint must have no import path to `server`, server-only SDK clients, or private env code. Enforce this in lint, tests, and a bundle inspection with dummy sentinel values.

## 5. Protect files and build uploads

The parent repository currently ignores this project's `.env`; verify that protection after scaffolding. Include equivalent rules in the project `.gitignore` so protection survives extraction into its own repository:

```gitignore
.env
.env.*
!.env.example
!.env.sample
**/*service-account*.json
**/*serviceAccount*.json
*.pem
*.key
firebase-debug.log*
firestore-debug.log*
ui-debug.log*
firebase/.cache/
```

Use restrictive local permissions:

```bash
chmod 600 .env
git check-ignore -v .env
git ls-files --error-unmatch .env
git status --short
```

The `git ls-files` command should **fail**, proving `.env` is not tracked. Ignoring a file does not untrack a previously committed secret. If exposure is found, revoke/rotate the affected key and remove the tracked secret through the repository's remediation process; do not paste it into a report or rewrite shared history casually. Never run `cat .env`, `printenv`, `set -x`, or `source .env` for diagnostics.

When creating `.easignore`, preserve the normal generated-file exclusions and explicitly exclude `.env` and `.env.*`, with the dummy example exception if desired. Also exclude them from server container/build contexts with `.dockerignore`. Supply only approved public mobile variables in EAS build/update environments. Supply server secrets through the server host's secret manager. Inspect the build-upload file list and mobile artifacts to confirm no `.env`, service-account JSON, key sentinel, or private config is present. Test that adding a dummy private env value cannot reach a bundle or `expo config` output.

Never put keys in URLs printed by diagnostic commands. Pl@ntNet uses a secret query parameter, so sanitize URL/error logging before the first live request. Redaction must also cover exception serialization and LangSmith inputs/outputs.

## 6. Set up once, then start development

### First-time setup

1. From `mobile-apps/experiments/plantopedia`, run `npm ci`, then `npm run build:contracts`. Repeat installation when the lockfile changes and rebuild contracts after editing them.
2. Select a dedicated hosted development Firebase project, configure its server identity, set `USE_FIREBASE_EMULATORS=false`, and remove both emulator-host variables. This path requires no local Java. Alternatively, connect to an already running managed/container emulator with the template's demo-project configuration and loopback forwarding. Installing or starting a host emulator is optional; ordinary Node tests use injected repositories.
3. Configure the two public app variables in root `.env` to match the API and Clerk environment. A phone needs a reachable HTTPS API; see [physical-device networking](#physical-device-networking).
4. For continuous native Voice Chat, build a development client in the EAS cloud, then install the artifact for your phone. Browser and matching SDK 57 Expo Go previews can skip this build step for other features. Choose the appropriate platform:

   ```bash
   npm run build:mobile -- build --profile development --platform ios
   npm run build:mobile -- build --profile development --platform android
   ```

   Configure the matching development profile, hosted EAS public variables and signing first; commit app changes before invoking the isolated build wrapper. No local Java/Android toolchain is required. Continuous native Voice Chat needs the local `PlantopediaVoice` module, which Expo Go cannot load. Rebuild after native code, dependencies, plugins or permissions change; JavaScript-only changes reuse the installed client. See [native build details](../README.md#first-native-install-or-native-dependency-changes).

### Everyday startup

From `plantopedia`, start Expo once:

```bash
npx expo start
```

The Metro configuration starts a missing local API when `EXPO_PUBLIC_API_BASE_URL` is HTTP loopback and its port matches `PORT`. It verifies `/health` and probes database/photo-storage readiness before serving the app. An existing Plantopedia API is reused. An unrelated listener, invalid server configuration or failed API process stops startup; unavailable Firebase dependencies produce a warning with safe guidance and the `/ready` URL while Expo and the API continue running. `/ready` remains 503 during outages and reports sanitized failure reasons; timed-out/concurrent probes share pending SDK work. The owned API exits with Expo, including loss of the parent process; an independently started API remains running. Clerk sign-in is independent of API readiness.

Hosted HTTPS API URLs skip automatic startup and need a running hosted service. For backend source watching or a phone tunnel forwarding to this Mac, optionally run `npm run dev:api` separately first. `PLANTOPEDIA_AUTO_START_API=false` also disables automatic management. Tests, CI, production, exports and EAS builds never launch the helper. The server still loads/validates root `.env`, and emulator mode never falls back to real Firebase.

Keep that Metro process running for both web and native previews. Press `w` for the Mac browser. The native target defaults to the development client because `expo-dev-client` is installed; scan the QR code with the compatible client installed. For Expo Go, press `s` until **Expo Go** appears and scan the updated QR code. Press `s` again to switch back. No separate web/native start commands or native rebuilds are needed to change targets. See the [canonical startup and shortcut table](../README.md#everyday-startup-one-expo-server).

Stop an existing Metro with Ctrl-C before starting a replacement. Restart after changing a managed API's server code or server/public configuration; use `npx expo start --clear` only when clearing a stale cache/configuration. Installation and cloud builds are not part of each startup.

Confirm authenticated API access, private image save/read, and cold restart persistence. Enable `ALLOW_LIVE_PROVIDERS=true` only when ready for explicit provider checks; enable metadata-only LangSmith tracing only after its redaction checks pass.

### Physical-device networking

`127.0.0.1` on a physical phone means the phone. The iOS simulator can generally reach the Mac's loopback API. Android's standard emulator maps the host to `10.0.2.2`, but this app's public configuration accepts HTTP only for `localhost`/`127.0.0.1`; use a reachable HTTPS API for Android and physical devices. Set `EXPO_PUBLIC_API_BASE_URL` for the target runtime and restart Metro. Test the chosen route rather than assuming all simulators behave identically.

Use an authenticated **HTTPS development endpoint/tunnel** for physical devices, with a certificate trusted by the phone. Metro's tunnel does not automatically tunnel the separate API server. Phone browsers also need a trusted HTTPS web preview for microphone/camera access; plain LAN HTTP does not provide this. Configure exact browser/API origins in `WEB_ALLOWED_ORIGINS` as described in [phone access](../README.md#opening-the-project-on-a-physical-phone). Keep the API bound to loopback when a proxy/tunnel on this Mac forwards to it; use `SERVER_HOST=0.0.0.0` only if another host must connect directly. Phones call the authenticated application API; only the server connects to Firebase and OpenAI. Continuous voice streams audio through the API WebSocket without recording or downloading WAV files.

## 7. Verification and troubleshooting

| Check | Expected result / corrective action |
| --- | --- |
| Secrets | `.env` ignored/untracked; logs show names/status only; upload archive and bundles contain no private values |
| Auth | Correct Clerk app signs in and survives restart; wrong issuer/expired/foreign token fails; backend uses verified subject |
| Firebase emulators | Demo project, both loopback hosts, isolated synthetic seed users; unavailable emulator fails clearly without real-project fallback |
| Real Firebase | Correct project/bucket/region, Blaze and least-privilege IAM; emulator variables absent; no client SDK rule opening |
| Pl@ntNet | One licensed test image returns normalized candidates or explicit no-match; 401 means key/config, 429 means quota/backoff; never print request URL |
| OpenAI | Model access verified; continuous Realtime listening, streamed playback and interruption checks; server-only key; no model substitution; text stays available on failure |
| Voice | Camera/mic permission prompts localized; iPhone and Android can listen/speak/interrupt/reconnect, stop mic on exit, and retain conversation context |
| Tavily | Deliberate public botanical query returns real source URLs; private notes/location absent from query and trace |
| LangSmith | One metadata-only smoke span in the expected project; sentinel text/secrets absent in success/error spans; tracing failure does not fail a save |
| Memory | Reopen and retrieve the correct earlier specimen/photo; two same-species plants stay separate; deleted evidence cannot reappear |
| Tests | Run the scripts specified in §8 of the build guide; no unmocked provider traffic in normal CI; report real-device checks separately |

If a credential, native module, model, or index check fails, record the exact sanitized error and current pinned versions. Consult the corresponding official source before changing the contract or dependency. Do not manufacture a passing integration with a dummy result labeled as real.
