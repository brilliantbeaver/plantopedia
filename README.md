# Plantopedia

A camera-first, voice-native plant companion for iOS and Android. Photograph a plant, review identification evidence, save that particular specimen, and return to its photograph and observations in conversation.

**Development implementation, not a certified release.** The core screens, authenticated API, provider adapters, SQLite drafts, and automated tests are present. Native voice, cloud deployment, signing, Firebase IAM/vector indexes, and live-provider behavior require their own acceptance runs. See [implementation evidence and remaining work](notes/implementation-status.md) and the [build specification](notes/12_app_create_instr.md).

## Contents

- [Architecture](#architecture)
- [Prerequisites and installation](#prerequisites-and-installation)
- [Configuration](#configuration)
- [Run the backend](#run-the-backend)
- [Run and install the mobile app](#run-and-install-the-mobile-app)
- [Deploy the backend](#deploy-the-backend)
- [Build and distribute releases](#build-and-distribute-releases)
- [Tests and troubleshooting](#tests-and-troubleshooting)

## Architecture

```mermaid
flowchart LR
  Phone[Expo iOS / Android] -->|Sign in| Clerk[Existing Clerk application]
  Phone -->|Bearer token / HTTPS| API[TypeScript Node API]
  Phone <-->|Streaming audio / captions over WebSocket| API
  API <-->|Realtime WebSocket session| Realtime[OpenAI GPT-Realtime-2.1]
  API --> Firebase[Firestore + private Cloud Storage]
  API --> Providers["Pl@ntNet / Responses / Tavily"]
  API -->|Metadata only| Traces[LangSmith]
```

`src/` contains the mobile app, `server/` the API, and `packages/contracts/` shared runtime-validated TypeScript DTOs. Provider keys and Firebase Admin credentials belong exclusively to the server. Direct mobile Firebase access is denied. Two trees of the same species retain different specimen IDs and histories.

The app supports explicit Light/Dark/System appearance and English (default), French, Spanish, German, Simplified Chinese, Japanese, and Korean. The original botanical illustration is project-created; identification results always come from the selected adapter, not that illustration. `ALLOW_LIVE_PROVIDERS=false` returns explicitly labeled synthetic identification/text responses and disables voice.

Voice Chat stays open after one tap: speak naturally, pause to finish a turn, and hear streamed AI replies. Semantic endpointing handles turn boundaries; brief acknowledgements are filtered during replies and meaningful interruptions discard unheard audio. Pause the microphone or end the chat at any time. Both speech transcription and spoken answers use `gpt-realtime-2.1`; plant tools and explicit action confirmation stay on the backend. See [voice architecture, endpoint contract and validation](notes/voice-turns.md). In **Settings → Voice & listening**, choose Marin, Coral or Shimmer (female voices), or Cedar, Ash or Ballad (male voices). Expand Listening setup for headphone/speaker/busy-room presets, patient-to-quick turn-taking and interruption sensitivity; **Button only** keeps the explicit “Let me speak” control. Sound & delivery offers speaking pace, calm/expressive delivery and optional quiet synthesized rain or garden breeze behind agent speech. Wait for **Settings saved**; changes apply to the next Voice Chat.

## Prerequisites and installation

Use Node **22.23.1** and npm **12.0.2**, as pinned in `.nvmrc` and `package.json`. Install Git and use a phone with matching SDK 57 Expo Go or an EAS-built development client. Continuous native Voice Chat requires an EAS development-client rebuild containing the local `PlantopediaVoice` audio module. Expo Go can preview other features, but cannot run this native voice bridge. EAS CLI **24.8.0** is pinned in commands and `eas.json`.

**Local Java, Android Studio, Gradle, adb, and Xcode are not required.** EAS cloud builds compile native binaries. Default tests need only Node. No emulator or Android toolchain runs as part of installation or the default check sequence. Local native builds are an optional separate workflow.

```bash
# From your development directory:
git clone https://github.com/theodoremui/stanford.git
cd stanford/mobile-apps/experiments/plantopedia
npm ci
npm run build:contracts
```

Expected: npm installs the locked workspaces and the contracts compiler writes `packages/contracts/dist`. Read [architecture decisions](notes/architecture-decisions.md) for the resolved Expo/React Native matrix and current compatibility warnings. Do not use `--force` or `--legacy-peer-deps` to hide incompatibility.

`npm ci` also runs `scripts/patch-expo-json-file.mjs` for the Expo CLI's locked `@expo/json-file@11.2.1`. Its [upstream atomic writer](https://github.com/expo/expo/blob/main/packages/%40expo/json-file/src/writeAtomic.ts) gives identical writes the same temporary filename, so simultaneous signing-cache initialization can fail with `ENOENT` during rename. The patch adds a unique suffix per write and preserves atomic replacement and permission handling. It is idempotent and rejects unexpected dependency versions/source so upgrades require reviewing the workaround. If dependencies were installed with `--ignore-scripts`, run `npm run postinstall` before starting Expo. Regression coverage is in `tests/scripts/expo-json-file.test.mjs`.

`npm ci` also applies the guarded `scripts/patch-teeny-request.mjs` workaround to Storage's locked `teeny-request@11.1.0`. Its streaming response bridge adds a second pipeline owner over the node-fetch body, producing `MaxListenersExceededWarning` on individual downloads ([upstream issue](https://github.com/googleapis/google-cloud-node/issues/9185)). The patch keeps backpressure and explicit error/cancellation propagation while removing that redundant pipeline. Listener thresholds, authentication, checksum validation and retry policies remain enabled. Ten offline transport/real-SDK regressions cover parallel bytes, CRC32c corruption, HTTP/truncation failures, cancellation, late errors and install guards. Run `npm run postinstall` and restart the API if dependencies were installed with scripts disabled. Review and remove this version-pinned workaround when a verified upstream fix is available.

Live use needs the existing Clerk application, Firebase project with Firestore Standard and private Storage, and provider accounts with billing/access. EAS native distribution requires an Expo account; physical iOS builds require Apple signing/provisioning. Public store releases require the relevant store accounts and review. A phone is required for actual camera/audio acceptance.

## Configuration

Run all following commands from `mobile-apps/experiments/plantopedia`. Create the local file only when absent:

```bash
node scripts/setup-env.mjs
```

This copies dummy `.env.example` only if no `.env` exists and sets restrictive permissions. It preserves existing credentials. Edit `.env` locally; never paste credentials into chat, commands, screenshots, or logs. [Specification §3](notes/12_app_create_instr.md#3-root-env-secret-handling-and-local-modes) is the canonical variable/default/loading contract; `.env.example` is its dummy executable template. The [setup note](notes/13_local_dev_setup.md) explains the accounts.

### Setup checklist

1. Compare an existing `.env` with `.env.example`: the setup script preserves the file but does **not** merge missing variables. The template's `replace_me` values are placeholders, not working credentials.
2. Configure the public API URL and all three Clerk settings below using the **same Clerk instance**. Ordinary local development still uses real Clerk authentication, even with fake providers.
3. Choose Firebase emulators or a dedicated hosted development project; configure the matching project, bucket, and identity. Fake-provider mode does not replace Firebase with in-memory storage.
4. Keep `ALLOW_LIVE_PROVIDERS=false` and `LANGSMITH_TRACING=false` initially. Supply the relevant keys and check account access/quotas before deliberately enabling either switch.
5. Restart the API after server-setting changes. Restart Expo/Metro after public-setting, plugin or native-dependency changes; distributed mobile bundles need rebuilding to include new public values.

Names and enumerated values are case-sensitive. Boolean settings accept exactly `true` or `false`, not `1`, `0`, `yes`, or `no`. Defaults below apply when a setting is **omitted**; an empty value is not generally equivalent. App validation lives in `server/src/config/env.ts` and `src/config/public-env.ts`.

### Public mobile settings and Clerk authentication

Only `EXPO_PUBLIC_*` values are bundled into the app; never give a private key that prefix. Obtain the matching publishable/secret keys from the existing Clerk application's API keys page; see [Clerk's key reference](https://clerk.com/docs/guides/development/clerk-environment-variables).

| Variable | Meaning and valid values |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | API origin without `/v1`, e.g. `https://api.example.com`. Local HTTP is accepted only for `127.0.0.1` or `localhost` (template: `http://127.0.0.1:3001`). On a physical phone use a reachable HTTPS endpoint, not loopback. |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public app key: `pk_test_...` for a development Clerk instance or `pk_live_...` for production. Required to connect the mobile app. Use this exact Expo variable name; `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is for Next.js and is not read by this app. |
| `CLERK_SECRET_KEY` | Private backend key from the same instance: `sk_test_...` or `sk_live_...`. Required for authenticated API use, including fake-provider mode. |
| `CLERK_ISSUER_URL` | Exact HTTPS session-token issuer, e.g. `https://your-instance.clerk.accounts.dev`, matching the token's `iss` claim. Include `https://` when copying a hostname from Clerk; preserve `/__clerk` when it is present in the verified issuer; omit any trailing slash, query, fragment, or credentials. Use the issuer for the same Clerk instance as your keys. See [Clerk session-token claims](https://clerk.com/docs/guides/sessions/session-tokens). |
| `CLERK_PUBLISHABLE_KEY` / `CLERK_PROXY_URL` | Server proxy settings: matching live publishable key and `https://plantopedia-nine.vercel.app/__clerk`. Express mounts the proxy before body parsing and `/v1` authentication. Leave both empty when a local proxy is unnecessary. |
| `EXPO_PUBLIC_CLERK_PROXY_URL` | Set to `https://plantopedia-nine.vercel.app/__clerk` in EAS production. Independent Expo apps need the absolute URL. Keep the secret key on the server. |

### Server mode and external providers

| Variable | Meaning and valid values |
| --- | --- |
| `NODE_ENV` | `development` (default) for local work, `production` for hosted deployment, or `test` for automated suites. Tests inject configuration instead of loading `.env`; changing this setting does not change the switches below. |
| `SERVER_HOST` | Address on which the API listens: `127.0.0.1` (default, local only) or `0.0.0.0` (all interfaces, used by hosting). This is not the public API URL. |
| `WEB_ALLOWED_ORIGINS` | Comma-separated exact origins, e.g. `https://plantopedia.example.com,https://api.example.com`. Shared by HTTP CORS and voice WebSockets. Include the public API origin for native WebSockets: Android sends that Origin too. Localhost HTTP previews remain allowed; no wildcards, paths or trailing slashes. This setting does not replace Clerk authentication or make an HTTP page secure. |
| `PORT` | Integer `1`–`65535`; default `3001`. Leave the hosting provider's injected port in control in production. |
| `PLANTOPEDIA_AUTO_START_API` | Local Expo tooling only: `true` (default) starts/checks a missing loopback API during `npx expo start`. `false` keeps API lifecycle under manual control. Hosted HTTPS APIs, CI, production, exports and native builds never auto-start it. |
| `ALLOW_LIVE_PROVIDERS` | `false` (default): synthetic identification/demo text, empty web research, and disabled voice. `true`: real PlantNet, OpenAI, and Tavily calls, potentially billable; requires **all three** provider keys. Clerk, Firebase, and tracing are independent of this flag. |
| `PLANTNET_API_KEY` | Private plant-identification key from [Pl@ntNet API key settings](https://my.plantnet.org/doc/getting-started/introduction). Required only in live-provider mode. |
| `PLANTNET_PROJECT` | Flora/catalog to search: `all` (default), or another supported Pl@ntNet project ID. App validation allows letters, digits, underscores, and hyphens; this is not your Firebase project. |
| `TAVILY_API_KEY` | Private botanical web-search key from the [Tavily dashboard](https://docs.tavily.com/documentation/quickstart). Required only in live-provider mode. |
| `OPENAI_API_KEY` | Private API key for voice, text/photo reasoning, and saved-memory embeddings; required only in live-provider mode. Create an application API key using the [official OpenAI documentation](https://developers.openai.com/api/reference/overview#authentication), and keep it server-side. |
| `OPENAI_REALTIME_MODEL` | Voice model; the current app accepts **only** `gpt-realtime-2.1`. Confirm account access; there is no silent model substitution. |
| `OPENAI_BACKEND_MODEL` | Account-accessible OpenAI model ID for text and image reasoning; app default `gpt-6-luna`. The chosen model must support Responses, image input, and tool calls. |
| `OPENAI_EMBEDDING_MODEL` | Embedding model ID for searching saved memories; app default `text-embedding-3-small`. Must support the configured vector size. |
| `OPENAI_EMBEDDING_DIMENSIONS` | Integer `1`–`2048`; default `1536`. Must match model output and the Firestore vector index. The committed index uses `1536`; coordinate index updates and reindex stored memories before changing the model or dimensions. |

Provider keys can be blank/placeholders in fake mode. Live-mode startup rejects missing/obvious placeholder provider keys, but passing validation does not prove that a key, model, or quota works. Model names above are this app's defaults, not a guarantee of account access.

### Firebase storage and server identity

Get the project ID and exact bucket name from Firebase project settings/Storage. For hosted access, prefer an already configured application-default or federated identity. Otherwise, use the matching `client_email` and `private_key` from a least-privilege service account, following [Firebase Admin setup](https://firebase.google.com/docs/admin/setup). Never upload its JSON key file or use production data for development.

| Variable | Meaning and valid values |
| --- | --- |
| `USE_FIREBASE_EMULATORS` | `true` (default): connect to **already running** Firestore/Storage emulators; it does not start them. `false`: use the selected hosted Firebase project, even if providers are fake. |
| `FIREBASE_PROJECT_ID` | Actual project ID, not display name. Emulator mode requires a `demo-` prefix (template: `demo-plantopedia`); hosted mode uses the real development/production ID. |
| `FIRESTORE_DATABASE_ID` | Firestore database ID within that project. Defaults to `(default)`; use `plantopedia-db` for the named database created for this local setup. The project ID and existing credentials stay the same. |
| `FIREBASE_STORAGE_BUCKET` | Exact bucket name without `gs://` or a URL path, e.g. `PROJECT.firebasestorage.app` or an older `PROJECT.appspot.com` bucket. See [Firebase bucket configuration](https://firebase.google.com/docs/storage/admin/start). |
| `FIRESTORE_EMULATOR_HOST` | Required in emulator mode: `127.0.0.1:PORT`, without `http://` (template port `8080`). Remove or leave blank in hosted mode. |
| `FIREBASE_STORAGE_EMULATOR_HOST` | Required in emulator mode: `127.0.0.1:PORT`, without `http://` (template port `9199`). Remove or leave blank in hosted mode. |
| `FIREBASE_CLIENT_EMAIL` | Service-account email, e.g. `NAME@PROJECT.iam.gserviceaccount.com`. Set together with its private key, or leave both blank for emulators/configured application-default identity. |
| `FIREBASE_PRIVATE_KEY` | The service-account JSON's `private_key` PEM value, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. The short `private_key_id` is an identifier and cannot authenticate. In `.env`, keep the key quoted and preserve escaped `\n` line breaks (one literal backslash followed by `n`); the loader/adapter normalizes them. Leave blank for emulators/configured application-default identity. |

Hosted mode rejects nonempty emulator-host settings instead of silently choosing storage. Emulator mode needs no Admin key: leave both service-account fields blank.

For a **non-emulator local setup**, keep the real project ID and bucket, select the database ID, and set:

```dotenv
USE_FIREBASE_EMULATORS=false
FIRESTORE_DATABASE_ID="(default)"
FIRESTORE_EMULATOR_HOST=
FIREBASE_STORAGE_EMULATOR_HOST=
```

For the local `plantopedia-69b2b` project, the provisioned resources are `FIRESTORE_DATABASE_ID=plantopedia-db` (`nam5`) and `FIREBASE_STORAGE_BUCKET=plantopedia-69b2b.firebasestorage.app` (`us-central1`). The existing service-account credentials stay the same. Blaze billing has no separate environment variable. Keep `PLANTNET_PROJECT=all` unless selecting a supported Pl@ntNet flora; `plantopedia` is the Firebase display name, not a supported plant catalog.

Copy `client_email` and the full `private_key` from the matching service-account JSON into `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. If you need a new JSON key, Firebase Console → Project settings → Service accounts → Generate new private key provides one; see [Firebase service-account setup](https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments). The short `private_key_id` cannot be converted into or substituted for the private key. Startup validates the RSA key locally before initializing Firebase and reports host conflicts and credential errors together without exposing their values. Both credential fields may instead be empty when Application Default Credentials are already configured.

Stop and restart the API after changing `.env`. Exported shell values take precedence; if you previously exported emulator hosts, clear them before restarting:

```bash
unset FIRESTORE_EMULATOR_HOST FIREBASE_STORAGE_EMULATOR_HOST
npm run dev:api
```

### Optional LangSmith tracing

Create a tracing-capable key in [LangSmith Settings → API Keys](https://docs.langchain.com/langsmith/create-account-api-key). Select the endpoint for the workspace's region; do not use the dashboard URL. Tracing is a separate external integration and can run even with fake AI providers.

| Variable | Meaning and valid values |
| --- | --- |
| `LANGSMITH_TRACING` | `false` (default) disables app tracing; `true` sends only allowlisted, redacted metadata and requires a configured tracing key. |
| `LANGSMITH_API_KEY` | Private LangSmith key; may be blank/placeholders when tracing is off. |
| `LANGSMITH_PROJECT` | Trace group/project name; default `plantopedia-local`. Separate from Firebase and Pl@ntNet project IDs. |
| `LANGSMITH_ENDPOINT` | Region/deployment API URL; default `https://api.smith.langchain.com` (US), or `https://eu.api.smith.langchain.com` for EU workspaces. Other deployments must use their own documented API endpoint. |
| `LANGSMITH_WORKSPACE_ID` | Workspace ID from Settings → General. Leave blank if the key unambiguously selects a workspace; set it when the key can access multiple workspaces. |
| `LANGSMITH_HIDE_INPUTS`, `LANGSMITH_HIDE_OUTPUTS` | Both must remain `true` (default). Setting either to `false` fails startup to protect private photographs, conversations, and records. |

### Additional values in existing local files

Some existing `.env` files contain values not present in the template. They do not enable extra app features:

| Variable | Current behavior |
| --- | --- |
| `GOOGLE_API_KEY`, `GEMINI_API_KEY` | Not read by Plantopedia; no Gemini provider is wired. Optional/unused, not substitutes for the required provider keys. |
| `FIREBASE_API_KEY` | Not read by Plantopedia; a Firebase client API key is not an Admin service-account credential. |
| `OPENAI_ORG_ID` | Optional SDK-level organization ID (`org-...`). Not validated by the app's config parser, but the OpenAI SDK reads it directly when live clients are created. Leave unset unless needed for your account; it does not replace the API key. |

### Loading and secret safety

The server entrypoint alone loads root `.env` with `override:false`; hosting-injected values win. Tests inject their configuration and adapters and never load that file. Mobile cannot import privileged server SDKs. `.gitignore` and `.easignore` exclude credentials; normal checks export a bundle with dummy secret sentinels. An ignored file that was previously exposed still requires rotation.

```bash
git check-ignore -v .env
git ls-files --error-unmatch .env
```

The second command must fail because the file is untracked. Do not print `.env` or source it in a shell.

## Run the backend

For a Java-free local API, use a dedicated **hosted development Firebase project**, separate from production. Set `USE_FIREBASE_EMULATORS=false`, its exact project/bucket and least-privilege server identity, and remove both emulator-host variables. Configure the existing Clerk application. Keep `ALLOW_LIVE_PROVIDERS=false` for synthetic identification/text while developing.

The template's emulator settings are a safe alternative for an **already running managed/container emulator**, not a requirement to install a JDK. The default Node tests instead inject transactional repositories and fake providers. Unreachable emulators fail without production fallback.

Normal [Expo startup](#everyday-startup-one-expo-server) manages the local API automatically. For backend development with a source watcher, or when forwarding a phone's HTTPS tunnel to the local API, start this standalone watcher first; Expo reuses it:

```bash
npm run dev:api
```

Expected: sanitized startup output showing service, port, provider mode, and storage mode. Check `http://127.0.0.1:3001/health` for liveness and `/ready` for separate `database` and `photoStorage` availability checks. Readiness returns 503 if either dependency is unavailable or its check exceeds five seconds, and a `reasons` object distinguishes `timeout`, `credentials`, `permission_denied`, `not_found`, `rate_limited`, `network`, `upstream` and `unknown` without exposing provider messages. Concurrent/repeated polls share each pending SDK probe until it settles; a response timeout does not cancel SDK retries. The Storage check lists an empty diagnostic prefix without writing a photo; the server identity needs object-list access, also used by cleanup. Private `/v1` routes require a Clerk bearer token. `/health` alone does not prove credentials, Storage, models, or IAM work; readiness also does not prove upload/write permissions or provider access.

Check the compiled production entrypoint separately:

```bash
npm run build:api
npm run start:api
```

Stop the watcher/server with Ctrl-C; shutdown stops new connections, closes voice resources and flushes bounded telemetry. Use dedicated synthetic records/test accounts, and delete them explicitly after staging tests. Enable live providers only deliberately after model access, provider quota and budgets have been checked. Fake mode never silently changes to live mode.

## Run and install the mobile app

### Use the deployed Vercel API with Expo

For this checkout, `.env` points Expo at the production API. Run `npx expo start` from the repository root, then open the app in matching SDK 57 Expo Go. The relevant local settings are:

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://plantopedia-nine.vercel.app
EXPO_PUBLIC_CLERK_PROXY_URL=https://plantopedia-nine.vercel.app/__clerk
PLANTOPEDIA_AUTO_START_API=false
PLANTOPEDIA_PHONE_API=false
```

Keep `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` set to the matching production `pk_live_...` key. Expo uses only these public client settings; Firebase Admin, Clerk secret, and provider keys stay on the API server. `.env` is ignored by Git, so another checkout must configure these values itself; `.env.example` retains the separate local-backend template.

This mode starts Metro only and uses real production accounts, data, and live providers. No local API or Cloudflare API tunnel is needed. The phone still needs access to Metro over the same Wi-Fi network, or use `npx expo start --tunnel` for the Metro connection. After changing public environment settings, stop an older Metro process and run `npx expo start --clear` once to discard cached bundles.

Production Clerk on native uses Google OAuth in a custom development/installed build, or the in-app email/password and email-code forms through the HTTPS proxy. Expo Go supports email authentication; its shared app cannot register the Google OAuth callback scheme. A successful sign-in should be followed by a successful collection refresh to establish authenticated API access. Expo Go supports the standard screens, but continuous Voice Chat requires the custom Plantopedia native build and `npx expo start --dev-client`. Hosted worker and multi-instance voice limitations are recorded in [deployment status](notes/vercel-deployment-status.md); switching the API URL does not resolve them.

### Local browser authentication

Run `npm run web:local` (also `npm run web`) for localhost. It reads the matching Clerk Development keys from the ignored, private `.env.clerk.local` file:

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

This command starts a local API and Expo together, selecting the development issuer and removing the production proxy for both client and server. Production Clerk browser keys cannot run on localhost. Development tokens cannot authenticate to the production API, so the local browser uses `http://127.0.0.1:3001`. Firebase and provider settings still come from `.env`, with optional overrides in `.env.clerk.local`; choose a separate development Firebase project if you want isolated data. Development and production Clerk accounts are separate.

Stop Metro before changing profiles. `npx expo start` continues to use `.env` for native production-API testing. Pressing `w` in that production-key profile displays setup guidance; use `npm run web:local` instead. Metro excludes `.env*` files from its dependency graph and receives only public values from Expo's environment injection. Restart after editing environment files.

See [local and Google authentication](notes/clerk-local-and-google.md) for setup and verification limits.

### Deploy the web app and API to Vercel

With production settings in `.env` and this checkout linked to the existing Vercel project, run `npm run deploy:vercel -- --yes`. The command generates the public web assets before upload and stages the production deployment. Check its returned URL with `vercel curl`, then assign the public domain with `vercel alias set`. See [the deployment instructions](notes/clerk-local-and-google.md#vercel-web-deployment). This publishes the browser app and API; installed mobile apps use a separate EAS build.

### Everyday startup: one Expo server

After [installation](#prerequisites-and-installation) and [configuration](#configuration), run this from `mobile-apps/experiments/plantopedia`:

```bash
npx expo start
```

This project defaults to **Expo Go**, matching a phone with Expo Go installed. `npm start` and `npx expo start --go` select the same runtime. Use `npm run start:dev-client` or `npx expo start --dev-client` only after installing the custom Plantopedia build on your phone. Both runtimes use the same API startup and Ctrl-C cleanup.

Expo normally chooses a custom build whenever `expo-dev-client` is installed. The project's `plantopedia.defaultRuntime` setting and version-checked postinstall patch override only that automatic choice, so plain `npx expo start` works with Expo Go while explicit flags and the `s` shortcut still work. The patch is reapplied by `npm install` / `npm ci`; Expo CLI upgrades require reviewing it and running `tests/scripts/expo-launch-target.test.mjs`.

For a loopback API such as `http://127.0.0.1:3001`, this starts a managed API and checks database/photo-storage readiness before starting Metro, normally on port 8081. If an API is already running, stop it in its original terminal first; automatic startup requires ownership so the same Ctrl-C can stop both servers. A dependency outage prints a warning and allows Expo and the API to keep running; affected features still require Firebase to recover. Keep that terminal open and choose your preview there:

| Preview or action | In the running Expo terminal |
| --- | --- |
| Browser on this Mac | Press `w` to open the web preview at `http://localhost:8081`. |
| Matching SDK 57 Expo Go | With **Using Expo Go** shown in the terminal, scan its QR code with the iPhone Camera and open the suggested link. This is the default target. If Safari shows **Choose an app**, tap **Expo Go**. Text/photos and email sign-in are available; Google OAuth and continuous native Voice Chat need the custom development client. |
| Installed Plantopedia development client | Run `npm run start:dev-client`, or press `s` until the terminal shows **development build**, then scan its QR code. The matching custom build must already be installed. |
| Return to the development client | Press `s` again and scan the updated QR code. |
| Reload or stop | Press `r` to reload connected apps, `?` for more shortcuts, or Ctrl-C once to stop Metro and its managed API. |

Web and native previews can share a Metro process only when they use a compatible Clerk/API profile. This checkout uses production Clerk for native; restart with `npm run web:local` for localhost browser authentication. If port 8081 is occupied by this project's Metro, use its terminal or stop it before restarting. Follow the URL printed by Expo if you deliberately choose another port. See [Expo CLI launch targets and shortcuts](https://docs.expo.dev/more/expo-cli/#develop).

Press **Ctrl-C once in the Expo terminal** to stop both development servers. A separate supervisor gives the API time to close connections and voice resources and flush telemetry, then force-stops it after ten seconds if necessary. This deadline survives Expo's immediate exit, even if the API event loop is blocked. The shell prompt can return while API cleanup finishes; allow up to ten seconds before restarting. Parent crashes and interrupts during startup also trigger cleanup. This stops the servers; an installed phone app, simulator or browser tab remains open.

Readiness allows three bounded checks for temporary Firebase connection delays. An existing API, mismatched port, unrelated listener, missing server configuration or failed API process stops automatic startup with an actionable terminal error. Dependency failures are warnings, with safe reason-specific guidance and the local `/ready` URL; they never cause the helper to kill a live API. Clerk sign-in alone does not establish API availability.

For hosted HTTPS APIs, Expo starts only Metro; keep that API running on its host. Set `PLANTOPEDIA_AUTO_START_API=false` only if you deliberately manage a local API separately. Restart Expo after editing a managed API's server code or server/public settings; for automatic backend source reloads, use the [standalone API watcher](#run-the-backend). The helper never runs during tests, CI, production, exports or EAS builds. Dependency installation and native builds remain separate setup steps.

Browser sign-in mounts Clerk's hash-routed form with account creation enabled so OAuth callbacks can resume at `/login`. iOS and Android use Google OAuth in an installed/custom build, plus in-app Clerk email/password and code forms for sign-in, account creation, verification and password reset. Production Clerk's hosted-auth feature is unavailable on this instance; the native forms use the configured Frontend API proxy directly. See [production authentication](notes/clerk-production-setup.md).

### First native install or native dependency changes

For Google OAuth and continuous Voice Chat on a phone, build and install a development client containing the app’s `plantopedia` callback scheme and the local `PlantopediaVoice` module. Browser and Expo Go previews can start before this step. Choose the command for your phone; these create cloud builds, not additional Metro servers:

```bash
# Android development APK:
npm run build:mobile -- build --profile development --platform android

# Signed iPhone development build (Apple signing/provisioning required):
npm run build:mobile -- build --profile development --platform ios
```

After registering an additional iPhone or iPad, the old app build still excludes that device. Re-sign it with an updated ad hoc provisioning profile:

```bash
npm run ios:resign -- --id <existing-device-build-id> --wait
```

Select the intended registered devices when prompted, then install from the **new** EAS build link. This command pins the project's EAS CLI version and the internal development profile; it does not upload the working tree or require a full native rebuild. See [iOS installation troubleshooting](notes/ios-installation.md).

Install the returned artifact, then use the same [everyday startup](#everyday-startup-one-expo-server) and select the development-client target. A compatible installed client can be reused across JavaScript-only changes.

Native build commands export only the committed Plantopedia subtree into an isolated temporary directory, install the locked dependencies, and call the pinned EAS CLI with `EAS_NO_VCS=1`. They reject uncommitted app changes and `--local`; root `.env` is never copied. Temporary export directories may be removed after the CLI exits. Do not call `eas build` directly from the parent Stanford checkout: EAS otherwise packages unrelated tracked projects. The wrapper uses the selected hosted EAS environment and the two approved public variables when explicitly injected. These commands do not invoke a local Java/Android/iOS compiler. The first EAS setup must link the intended Expo project with `npx eas-cli@24.8.0 init`, configure signing, and set matching public variables in the development EAS environment. Do not copy backend keys into EAS. Rebuild after native dependencies, plugins, permission strings, identifiers or callback configuration change.

`127.0.0.1` on a phone is the phone. Use a trusted **HTTPS API endpoint** or a separate authenticated development tunnel. A Metro tunnel does not tunnel the API. iOS simulator host loopback and Android emulator `10.0.2.2` are optional tooling details, not required workflows. Release builds must use the public HTTPS API and run with the developer Mac and Metro stopped.

### Opening the project on a physical phone

If the iPhone Camera says **“No usable data found”**, first check the **Using ...** line in the Expo terminal. A link such as `exp+plantopedia://expo-development-client/...` requires the custom Plantopedia development build; installing Expo Go does not register that scheme. Press `s` to select **Expo Go** and scan the newly generated QR, or restart with `npm start` / `npx expo start --go`. Expo Go launch links use `exp://`; Expo may encode an HTTP “Choose an app” page in the QR instead, which opens in Safari before handing off to the selected app. Do not scan the previous development-build QR again.

The phone and Mac must be on the same reachable Wi-Fi network for the LAN address printed by Expo. Allow Expo Go local-network access in iPhone Settings. If the scan opens a link but loading times out, check Wi-Fi isolation, VPN/firewall settings and that permission; `npx expo start --go --tunnel` is an alternative for reaching Metro. Network problems happen after decoding the QR and are separate from the unhandled-scheme error. Expo Go must also support this project's SDK 57; an SDK compatibility error after opening needs a matching Expo Go binary or the custom development build, rather than a different QR image.

The Expo “Choose an app” page selects a native runtime. Use the QR code for the target selected in the running Expo terminal (`s` switches targets); use `w` for the browser preview. Switching targets selects an installed runtime; it does not build or install one. An iOS simulator build cannot install on an iPhone. Continuous Voice Chat requires the rebuilt custom client, including the local audio module.

Opening the project and reaching its API are separate steps. The default `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001` works for a browser on this Mac, but points to the iPhone itself when used on the phone. For phone features, configure a reachable HTTPS API or an authenticated HTTPS tunnel to the local API, then restart Expo. A Metro tunnel forwards the app bundle only; it does not forward port 3001. With a separate API tunnel, keep the API running in its own terminal (`npm run dev:api`) and stop that terminal separately, or use a hosted API. Do not substitute the Mac's LAN HTTP address: the app deliberately requires HTTPS for non-loopback API URLs.

For a single managed terminal, the optional `PLANTOPEDIA_PHONE_API=true` mode lets `npx expo start` own both the API and a temporary Cloudflare HTTPS tunnel. Read [phone access and photo recovery](notes/phone-capture-recovery.md) before enabling it: authenticated requests and uploaded photos pass through Cloudflare. The option is disabled by default. Reload Expo Go after each launch because its HTTPS address changes; Ctrl-C closes both managed services.

For Safari/Chrome, open the web preview URL rather than the Expo native launch link. Serve both the web preview and API over trusted HTTPS for camera/microphone use; plain `http://192.168.x.x:8081` is not a secure browser context. Set `EXPO_PUBLIC_API_BASE_URL` to the reachable HTTPS API and `WEB_ALLOWED_ORIGINS` on the API to the exact HTTPS web origin. Restart the API after server configuration changes and restart/reload Metro after changing public variables. If the browser's Clerk sign-in reports an origin/redirect restriction, configure that same web origin in the existing Clerk application.

Native clients do not enforce browser CORS, but React Native Android WebSockets send the API's HTTP(S) origin. Include the HTTPS API origin in `WEB_ALLOWED_ORIGINS` so the server's voice upgrade check accepts it. Native clients also need a reachable API, matching Clerk configuration and a compatible installed binary. Keep the API on loopback when a local reverse proxy/tunnel reaches it on this Mac; bind `SERVER_HOST=0.0.0.0` only when a separate network host needs direct access. Check `/health` and `/ready` from the intended route. Allowing an origin does not expose a loopback-only listener, tunnel the API, enable microphone access on HTTP, or install a native client. See [Expo launch targets](https://docs.expo.dev/more/expo-cli/#launch-target) and [browser media secure-context requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#privacy_and_security).

Camera access is requested when capturing; photo selection uses the OS picker. Microphone access starts at an explicit voice request. Denied permission must leave gallery/text usable. Original photographs stay in an owner-scoped persistent device directory; uninstall/device loss removes them. Signing out locks originals and drafts under their owner instead of evicting them as cache.

## Deploy the backend

The API host is **Vercel**, at `https://plantopedia-nine.vercel.app`. The `plantopedia` project under the `brilliantbeaver` team is connected to the existing GitHub repository. `server/vercel.json` builds the root workspaces and packages `dist/server.js`, whose HTTP-server export preserves voice WebSocket upgrades. Local commands still start `server/src/index.ts` and its standalone worker. Production server variables and the public EAS environment are configured. See [Clerk production setup](notes/clerk-production-setup.md) for proxy/authentication validation and [Vercel deployment gates](notes/vercel-project-setup.md) for the outstanding hosted-worker/voice work. Native apps remain separate Expo/EAS builds.

The earlier Heroku runbook below documents the current persistent-process implementation. One Node process owns foreground Realtime WebSocket sessions (and legacy recorded-turn jobs). Shared coordination requires a separate implementation before scaling out. See the dated [hosting decision](notes/12_app_create_instr.md#411-choose-the-simplest-public-backend-host), [Heroku Node deployment](https://devcenter.heroku.com/articles/deploying-nodejs), and [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration).

The following is a deployment runbook to validate in staging; this repository does **not** claim an executed deployment.

1. Install/login to Heroku CLI, create a dedicated staging app in the chosen region, select a currently supported Cedar stack and Node buildpack, and enable Git authentication:

   ```bash
   heroku login
   heroku create YOUR_APP --region us --stack heroku-24 --buildpack heroku/nodejs
   ```

2. In Heroku's protected settings UI, enter the server settings from the table. Set `NODE_ENV=production`, `SERVER_HOST=0.0.0.0`, `USE_FIREBASE_EMULATORS=false`, the actual Firebase project/bucket and Clerk issuer, and the provider secrets. Remove both emulator host variables. Heroku injects `PORT`; do not override it. Keep trace redaction on. Turn on `ALLOW_LIVE_PROVIDERS` only after access/budget checks. Use a federated identity when supported; otherwise inject and rotate the least-privilege service-account fields. Never upload `.env` or put secret-bearing CLI arguments in shell history.
3. Provision Firestore Standard/private Storage and the service IAM separately. Deploy deny-all client rules/index configuration using a pinned Firebase CLI and the explicit staging project (CLI deployment does not need local Java):

   ```bash
   npx firebase-tools@15.15.0 deploy --config firebase/firebase.json --project YOUR_FIREBASE_PROJECT --only firestore:rules,firestore:indexes,storage
   ```

   Verify this CLI version against the lock/deployment environment before the first deployment. The service's Admin SDK bypasses client rules; verify backend ownership and IAM independently. Cloud Storage requires applicable billing. Budget alerts do not cap spend.
4. Commit the source, then export only this app's committed subtree as the Heroku source root:

   ```bash
   npm run deploy:api -- YOUR_APP
   heroku ps:scale web=1:basic --app YOUR_APP
   ```

   The script rejects uncommitted app changes and pushes the `mobile-apps/experiments/plantopedia` subtree with `package.json`, lockfile, contracts, and server. It never force-pushes shared source. Subsequent deployments use the same command. Heroku runs `heroku-postbuild` → `build:api`; `Procfile` starts the compiled API. Check the currently offered non-sleeping plan and measured memory capacity before selecting Basic. One instance is required for current voice ownership; disable overlap/rolling deployments that defeat that assumption.
5. Check the app's assigned HTTPS URL/certificate, `/health`, `/ready`, valid/invalid-token requests, private upload/read and a deliberate identification/voice test. Configure production Clerk native callbacks. Test slow/lost requests without duplicate writes or repeated unknown billable outcomes. HTTP work has deadlines below the router response limit; continuous voice uses an authenticated WebSocket with heartbeat and bounded lifetime.
6. Use redacted diagnostics and verify a restart during voice and interrupted work:

   ```bash
   heroku logs --tail --app YOUR_APP
   heroku releases --app YOUR_APP
   heroku ps:restart web --app YOUR_APP
   heroku rollback vPREVIOUS --app YOUR_APP
   ```

   Code rollback does not undo Firebase writes, rules or indexes. Dynos restart and have ephemeral disks: Firebase holds durable data; check retained conversation history before recording a new turn. In-flight jobs/audio results are ephemeral; the current app supports one API instance.

Use a paid non-sleeping host for reliable access; hosting, Firebase, EAS/signing and provider usage may cost money. No always-on free backend is promised. Document the deployed source revision, selected stack/plan, Firebase project/region, public URL, tested commands, and measured outcomes before releasing.

## Build and distribute releases

After linking the existing/intended Expo project and configuring app identifiers, Clerk callbacks, signing, store accounts and EAS environments:

```bash
npm run build:mobile -- build --platform android --profile preview
npm run build:mobile -- build --platform ios --profile preview
npm run build:mobile -- build --platform android --profile production
npm run build:mobile -- build --platform ios --profile production
npm run build:mobile -- submit --platform android --profile production --latest
npm run build:mobile -- submit --platform ios --profile production --latest
```

Set the deployed HTTPS API URL and matching publishable key in the EAS environment selected by each profile **before** building. Preview Android produces an installable APK; production produces a store AAB. Development/preview/production iOS profiles target signed devices. The optional `simulator` profile (`npm run build:mobile -- build --platform ios --profile simulator`) compiles in EAS without Apple device signing; its artifact cannot install on a phone. Running that artifact requires an optional Mac simulator, and does not establish physical-device acceptance. Configure TestFlight/internal testing first; upload is not store-review approval. Submission settings still need the actual store app/service-account configuration. EAS builds require no running Mac compiler; installed release apps need neither Metro nor the developer Mac. [EAS setup](https://docs.expo.dev/build/setup/), [store submission](https://docs.expo.dev/deploy/submit-to-app-stores/).

Before certification, install staging release builds on both platforms, turn off the developer Mac/Metro, use cellular, and test sign-in → private photo save/read → identification → voice/text → cold-restart recall. Record actual device/OS/build IDs and unperformed checks. No device results are implied by the commands above.

## Tests and troubleshooting

The default verification is Node-only, with injected fake repositories/providers:

```bash
npm run build:api
npm run typecheck
npm run lint
npm run test:unit
npm run test:functional
npm run test:components
npm run test:bundle-secrets
```

Functional tests exercise public HTTP behavior, persistent repository state across app-factory restart, ownership, concurrent replay, upload/identification, recall, confirmation and deletion. Separate offline JWT tests exercise actual signature, issuer and expiry checks; these suites do not prove real Firestore transactions/IAM, project sign-in, semantic quality, native audio or OS permissions. Bundle checks use synthetic keys and disable dotenv loading. Firebase rules/emulator integration, native E2E and real-provider/device evaluations remain explicit gates in the implementation ledger, with no Java dependency added to the default path.

| Symptom | Check |
| --- | --- |
| `ENOENT` renaming `~/.expo/codesigning/.../development-code-signing-settings-2.json.<suffix>` | Run `npm run postinstall`, stop the existing Expo process, and restart with `npx expo start`. Use `s` to select Expo Go if needed. Concurrent writes in the affected Expo JSON dependency share a temporary filename; the install patch fixes that race. |
| App shows configuration screen / cannot reach API | Both public variables must be valid; physical phones need reachable HTTPS. Restart Metro after public config changes. |
| Sign-in succeeds but the collection is unavailable | Clerk runs independently of the API. Check `/ready` at the configured API origin. Restart an older Metro with `npx expo start` to enable automatic local API startup, then use **Refresh collection**. With a hosted API or automatic startup disabled, start/fix that API separately. Keep local `PORT` aligned with `EXPO_PUBLIC_API_BASE_URL`; changing CORS cannot start a missing server. |
| `Invalid configuration: CLERK_ISSUER_URL` | Supply the exact verified `https://` Clerk issuer, including `/__clerk` for proxy-issued sessions, with no trailing slash. A bare `your-instance.clerk.accounts.dev` hostname is incomplete. An exported shell/hosting value overrides `.env`; restart the API after correcting the active value. |
| Clerk publishable key is present but the app still shows configuration setup | Name it `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; keys copied from a Next.js setup under `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are ignored by Expo. Keep the existing key value and restart Metro. |
| Sign-in callback fails | Same Clerk app/issuer/publishable key, Native API enabled, Expo identifiers/plugin and allowed callback configured; rebuild after native changes. |
| API refuses to start | Error reports invalid variable names and safe format guidance, without their values. Emulator mode requires a `demo-` project and both loopback hosts; a real project with `USE_FIREBASE_EMULATORS=true` is rejected. Hosted development requires `USE_FIREBASE_EMULATORS=false` and empty/removed emulator hosts. |
| Firebase reports an invalid PEM/private key in hosted mode | Copy the service-account JSON's full `private_key`, including BEGIN/END lines and newlines. `private_key_id` is only an identifier. Emulator mode ignores service-account credentials. |
| `/ready` fails | Inspect `checks.database`, `checks.photoStorage` and the corresponding `reasons` entry. For `timeout`/`network`, check connectivity and retry `/ready`; a cold connection can exceed the probe deadline. For `permission_denied`/`credentials`, verify the server identity and IAM. For `not_found`, verify the configured resource exists. Expo continues with a warning while dependencies are unavailable; it does not make uploads succeed until Storage recovers. Enable the Firestore API and create a Standard database matching `FIRESTORE_DATABASE_ID` (`(default)` if unset); provision the exact configured Storage bucket and verify service-account access. A Firebase web app registration/config snippet does not create either resource. Cloud Storage requires the Blaze plan; upgrading billing alone does not create the database or bucket. Keep client rules private/deny-all: the API uses Admin IAM, not client rules. Verify authorized private upload/read separately. |
| Save succeeds but identification fails | Check `PLANTNET_PROJECT`: it selects a supported Pl@ntNet flora, usually `all`, rather than your Firebase project or application name. Restart the API after correcting `.env`. |
| Photo preparation succeeds but saving returns 503 | `database_unavailable` means the server could not access Firestore; `photo_storage_unavailable` means it could not access the photo bucket. These are server dependency failures, not a reason to sign out or discard the photo. Keep the draft tab open, repair the cloud setup, then retry the same draft. Failed immutable photo uploads release their reservation so retry can proceed immediately; unknown paid identification outcomes retain their separate protection. |
| Identification/search/voice unavailable | Check live/fake mode, explicit model/account access and quota. Preserve the image; use text. Never log provider URLs or credentials. |
| `Failed to resolve plugin` for the removed WebRTC package | Stop the existing Expo process and run `npx expo start --clear`, then use `w` for web or `s` to change the native target. A process started before the dependency/config change can retain the old plugin list. Do not reinstall WebRTC. Rebuild old custom clients to include the current native dependencies and local `PlantopediaVoice` module. |
| `MaxListenersExceededWarning` for 11 error/close listeners on `PassThrough` | Run `npm run postinstall` and restart the API. The locked Storage transport duplicates pipeline ownership during photo downloads; the guarded patch removes the duplicate while preserving backpressure, errors, cancellation and CRC32c validation. Raising the global listener limit is unnecessary. |
| `Photo preparation failed: metadata_detected` | Update to the explicit JPEG cleanup path, then retry preparation from the retained original. Encoding alone can add EXIF/ICC/comment segments; only the cleaned, validated derivative is saved and uploaded. Originals remain local. |
| Expo Audio module missing | Use matching SDK 57 Expo Go or rebuild an older custom development client. Allow microphone access; web recording requires localhost or HTTPS. |
| Request times out / uncertain provider result | Inspect sanitized error code; reuse operation keys after lost acknowledgments. Unknown billable outcomes require explicit new attempts, not automatic loops. |
| Voice disappears on dyno restart | Live sessions and legacy jobs are process-local. Check retained history and explicitly restart Voice Chat; no automatic paid retry occurs. Keep one API instance. |
| Cancel or navigation during a voice turn | Capture/playback stop and the app/provider sockets close. Continuous sessions expire after 90 seconds of inactivity or 10 minutes total. Legacy turns retain their 90-second deadline. |
| Permission denied / original storage full | Gallery/text fallback or explicit OS settings/storage management; never purge the sole original automatically. |
| Dependency diagnostics fail | See architecture decisions; do not force incompatible upgrades or claim unmeasured native support. |

Update this README and the [evidence ledger](notes/implementation-status.md) with every verified slice. Follow the guide's full release tests before describing the application as P0/P1 complete.
