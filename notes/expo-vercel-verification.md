# Expo with production Vercel and Clerk — 2026-10-19

The ignored local `.env` now uses `https://plantopedia-nine.vercel.app` for `EXPO_PUBLIC_API_BASE_URL`. `PLANTOPEDIA_AUTO_START_API=false` and `PLANTOPEDIA_PHONE_API=false` disable local API/tunnel management. Existing production Clerk public-key and proxy settings were preserved. Runtime source code and the local-backend `.env.example` template did not need changes.

Run `npx expo start` from the repository root. After switching an older running Metro session to these settings, stop it and use `npx expo start --clear` once. This uses production accounts and data.

## Evidence

| Check | Result |
| --- | --- |
| Literal `npx expo start` | Started Metro on port 8081 using Expo Go |
| Local API listener | No listener on port 3001 |
| Served iOS and Android manifests/bundles | HTTP 200 for both platforms |
| Bundle configuration | Expo's development environment prelude contains the expected API URL, proxy URL and live publishable key; `public-env.ts` reads those values through Expo's virtual environment module |
| Private credential scan | No configured Clerk secret, OpenAI, PlantNet, Tavily, Firebase private key, LangSmith or Vercel token value found in either native bundle |
| Configuration parity | Local public Clerk key and proxy match Vercel production; the API origin matches the proxy origin and the server's allowed native origin |
| API readiness | `/health` and `/ready` returned 200, with Firestore and photo Storage ready |
| Production Clerk backend | Existing `sk_live_...` key successfully fetched public signing keys through the Clerk SDK |
| Production Clerk native frontend | Proxied native environment and client-bootstrap requests returned 200; Native API is enabled, with password/email-code sign-in and email-code verification/reset |
| Automated startup tests | 31 passed |
| Authentication component tests | 7 passed; these mock Clerk and do not establish live sign-in success |

Development bundles use Expo's HMR environment prelude and virtual environment module, rather than direct string literals inside `public-env.ts`. Verification checked both the prelude values and the client module's reads. Only `EXPO_PUBLIC_*` names were present in that prelude. Generated check results and review reports are under ignored `artifacts/expo-vercel/`.

## End-to-end verdict

**The hosted connection and Clerk bootstrap are verified; the entire app is not yet verified end to end.** Subsequent Google testing found an empty production OAuth `client_id`; the supplied custom credentials have now been saved in Clerk and Google accepts the authorization request. See the [current Google setup and evidence](clerk-local-and-google.md). No real signed-in phone session was available for this run. A native sign-in followed by an authenticated collection refresh is still required, followed by photo upload/identification, save/read and chat acceptance. Health, client bootstrap, and mocked authentication tests do not prove these flows.

Continuous native voice requires the custom Plantopedia build; Expo Go lacks its native audio module. The deployed API also still lacks a hosted deletion/embedding worker, and voice ownership/results/rate limits remain instance-local. These are inherited limitations, detailed in [deployment status](vercel-deployment-status.md).

## Adversarial review

Review targets were isolated committed source copies with sanitized public configuration evidence, excluding `.env` and credentials. The skill's shared freeze helpers were unavailable in this installation, so separate Git clones were committed and checked for the expected HEAD and clean status before review. Codex ran in a read-only sandbox; a separate Claude Opus review received the source/diff with tools disabled. Review findings require host verification before being treated as defects.

Both frozen targets retained the expected HEAD and clean status after review. GPT-6.1-Sol ran with high reasoning effort; Claude Opus provided a separate model-family review. Neither established an introduced runtime defect in the endpoint switch.

- **Confirmed inherited production defects:** Codex returned `needs-attention` for the absent memory/deletion-retry worker and process-local voice jobs. The host verified the memory queue, standalone-only scheduled consumer and voice map/reservation logic. Deletion first attempts synchronous cleanup; the missing worker specifically prevents automatic recovery after interrupted/failed cleanup, rather than preventing every deletion.
- **Corrected test description:** the phone-tunnel test said a URL “reaches the bundle,” but only asserted mutation of an environment object. Its name now states that actual scope. The host independently checked the iOS/Android bundles served by bare Expo startup, closing the configuration/secrecy evidence gaps the Codex reviewer correctly marked `NOT REACHED` from its earlier frozen snapshot.
- **Authentication evidence remains incomplete:** both reviews distinguished mocked SDK tests from live native authentication and valid-token API acceptance. No full end-to-end success is claimed.
- **Cross-family review:** Claude returned `approve` for the scoped change, with an inherited negative-auth-test coverage concern. The host verified that the cited error text is the actual localized fallback and the SDK mock resolves successfully; this is a coverage limitation, not a demonstrated authentication defect. Its documentation nit described the requested manual collection check, not a claim that the check had already passed.

The test-name correction and this evidence summary were made after the frozen reviews. No runtime implementation changed as a result. The endpoint configuration is usable; the overall application remains `needs-attention` for the inherited limitations and pending real-user acceptance above.
