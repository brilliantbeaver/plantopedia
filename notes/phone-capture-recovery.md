# iPhone camera capture and API recovery

Investigation: 2026-10-18. Camera capture and image processing are included in Expo Go; this repair does not require the custom Voice Chat development build.

## Confirmed findings

The local environment configured `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001` and `SERVER_HOST=127.0.0.1`. The phone could download JavaScript from the Mac's Metro LAN address, but its API requests targeted the phone's own loopback. Allowing a CORS origin does not change that destination. The Mac API's health and Firebase readiness checks passed. A separate live Pl@ntNet request with a committed test image returned three candidates in 1,069 ms, confirming that the configured identification key and provider request worked at investigation time. No private phone photo was used in that probe.

The native original-retention path also called `File.copy()` without awaiting it. In the installed Expo SDK, copying is asynchronous: the native module registers an `AsyncFunction`, its TypeScript signature returns `Promise<void>`, and its changelog documents the change. The image decoder could receive the destination before copying finished, and rejected copies escaped capture error handling. Web uses a different storage implementation, so browser tests did not exercise this race.

Prepared derivatives were saved in the image encoder's cache while drafts persisted in SQLite. OS cache eviction could therefore leave a draft pointing at missing upload bytes. The shutter also lacked the documented camera-ready guard, and an absent camera ref could skip the optional promise chain's cleanup.

## Capture and retry changes

- Await native original retention before saving a draft or preparing the image; copy failures reach capture's error handler.
- Store verified metadata-free JPEG upload bytes beside the retained original. Migrate readable older cache-backed derivatives without changing their bytes.
- If an older derivative has expired, first check whether its photo was already saved when an acknowledgement was lost. Otherwise recreate it from the retained original. Photo IDs and idempotency keys remain stable; the server still rejects conflicting bytes rather than overwriting uncertain evidence.
- Wait for camera readiness, guard concurrent shutter/save taps, restore controls after capture errors, and return to gallery capture after a camera mount failure.
- Preserve the in-memory draft if reading the draft database fails during error recovery.
- Explain a failed phone-loopback request separately from image-processing and server failures. A working iOS simulator loopback connection is allowed; a LAN Metro address alone is not treated as proof that the runtime is a physical phone.

If the original itself has been removed, no code can reconstruct it. The app retains the draft and reports preparation failure. It never deletes the sole original automatically or bypasses server idempotency to replace uncertain evidence. Identification remains a deliberate action after saving.

## One-command HTTPS phone testing

The optional managed phone mode creates a temporary Cloudflare HTTPS address forwarding to the local API. Signed-in requests, including uploaded photos and bearer tokens, travel through Cloudflare; private API routes still require Clerk authentication. `/health` and `/ready` remain public diagnostics. This is an external route to the local service, not just a camera permission or CORS change.

After choosing to enable that external route, install `cloudflared` if needed (`brew install cloudflared` on macOS) and set:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
PLANTOPEDIA_AUTO_START_API=true
PLANTOPEDIA_PHONE_API=true
SERVER_HOST=127.0.0.1
```

Then run the normal command:

```sh
npx expo start
```

Startup obtains the HTTPS address, adds that exact origin for native WebSockets, starts the existing managed API, and verifies the tunnel reaches Plantopedia while an unauthenticated private request is rejected. Only then does it replace the public API URL for this Expo process. `.env` keeps the local address, so no URL copying or second terminal is needed on the next launch. The tunnel inherits no application secrets. Stopping Expo closes the tunnel, including when a child ignores graceful shutdown. A changed tunnel URL also changes Metro's cache version so an old inlined API address is not reused.

If an API is already running separately, stop that Plantopedia API before enabling phone mode. Its loaded configuration cannot contain the new temporary origin. Startup detects this mismatch and gives a restart instruction instead of publishing an endpoint that would reject native WebSocket connections.

Reload Expo Go after each restart, reopen the saved draft, and retry. The hostname changes each launch; Quick Tunnels have no uptime guarantee and are for development. They do not support SSE; Plantopedia's voice transport uses WebSockets. Release builds should use a stable hosted HTTPS API. Hosted endpoints, exports, CI and production never start this helper. With an existing hosted API, set its HTTPS URL normally and leave `PLANTOPEDIA_PHONE_API=false`.

Do not disable TLS checks, expose Firebase credentials, change Firestore rules, add wildcard CORS, or bind the local API to every interface to solve this loopback problem.

## Verification scope

Regression coverage includes delayed/rejected native copies, metadata removal, persistent derivatives after simulated cache eviction, recovery of already saved photos, camera readiness/failure recovery, actionable phone connection errors, and unchanged simulator requests. Startup tests cover opt-in/build guards, exact origin propagation, authentication checks, secret isolation, failed startup cleanup, and a real subprocess that must be killed after its parent disconnects.

Validation: TypeScript and ESLint passed; the complete suite passed 382 tests. Two additional review regressions (stale API origin and caller cancellation) passed with their affected suites. iOS, Android and web JavaScript exports, source maps and public Expo configuration passed the private-secret sentinel check. These are local checks, not an independent human review.

These checks simulate native filesystem and camera boundaries; they do not establish physical-iPhone capture/playback acceptance. The live provider probe verifies identification availability but does not prove a phone can reach the configured API. Enabling the external HTTPS route and testing a real iPhone remain separate explicit verification steps.

References: [Expo SDK 57 camera](https://docs.expo.dev/versions/v57.0.0/sdk/camera/), [Expo FileSystem changelog](https://github.com/expo/expo/blob/main/packages/expo-file-system/CHANGELOG.md), [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), [Apple local-network privacy](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy).
