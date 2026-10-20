# Local Clerk and Google sign-in

Updated 2026-10-19.

## Root causes and corrections

- The native sign-in component implemented email flows only. It now offers Google using `@clerk/expo/experimental`'s Core 3 `useSSO` hook, which finalizes completed sessions itself. Cancellation is quiet; incomplete signup or additional verification stays signed out with guidance. Existing email signup, sign-in and reset remain available.
- Production Clerk browser keys are domain-bound. A browser at localhost cannot use the production `plantopedia-nine.vercel.app` instance/proxy. `npm run web:local` (also `npm run web`) loads `.env.clerk.local` and switches the frontend key, backend secret, issuer, proxy settings and API URL together. Development tokens are not accepted by the production API.
- The production native redirect allowlist was empty. The exact `plantopedia://sso-callback` redirect was registered. The app already declares the `plantopedia` scheme and now has a callback route.
- Expo Go cannot register that custom OAuth scheme. Google is disabled there with an explanation; use an installed Plantopedia development build (`npm run start:dev-client`). Email authentication remains available in Expo Go.
- Expo 57's development env context discovers arbitrary `.env*` files but only transforms conventional dotenv filenames. The custom profile caused a parse error, and its error excerpt exposed the development secret. Metro now excludes all `.env*` files from the dependency graph. Public variables are injected by Expo CLI; restart Metro when changing profiles/keys. Rotate the exposed development secret and update the local file.

## Local setup

Keep `.env.clerk.local` private and Git-ignored. It must contain matching values from Clerk **Development**:

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Run `npm run web:local`; open the printed localhost URL. The script starts a paired API on loopback, defaults to port 3001, and stops it with Expo. It does not edit `.env` or Vercel environment variables. Google must be enabled on the development instance; its shared credentials are separate from production Google credentials.

Firebase/provider configuration is inherited from `.env`, with overrides allowed in `.env.clerk.local`. This is not automatic database isolation. Use a dedicated development Firebase project for isolated test data. Development and production Clerk accounts are separate.

For native testing against Vercel, stop the local web profile and run `npx expo start` (email in Expo Go), or `npm run start:dev-client` (Google in your installed custom app). These use the production configuration in `.env`.

## Production Google OAuth: configured and authorization request verified

The original live Google authorization URL had an empty `client_id`, causing **Missing required parameter: client_id** before authentication. On 2026-10-19, the supplied `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the private `.env` were saved in Clerk's existing **Production → Google OAuth** connection. Clerk changed from **Setup required** to **Enabled**. Sign-up/sign-in and the existing email-subaddress protection remain enabled; scopes remain limited to OpenID, email and profile. Development continues to use Clerk's shared credentials separately.

A fresh production authorization request now contains a nonempty client ID exactly matching `.env`, a state parameter and the expected callback. Google returns HTTP 200 at `/v3/signin/identifier`, without the missing-client-ID or redirect-mismatch error. This verifies authorization initiation; successful code exchange, real-user session activation and authenticated app access still require completion of Google sign-in. The supplied secret's acceptance during token exchange is not established by reaching Google's sign-in page.

The `.env` file remains mode `600` and Git-ignored. The Google secret was absent from 279 checked tracked/export files and from the deployed web JavaScript. It was entered directly into Clerk, not added to Vercel runtime variables or Expo public settings. Sanitized verification evidence is in `artifacts/clerk-auth/google-oauth-configuration.json`.

The deployed project's only registered domain is **https://plantopedia-nine.vercel.app**. `plantopedia.vercel.app` serves a different site and is not registered to this Vercel project. Use the `-nine` hostname for this deployment.

Configure an OAuth **Web application** client in Google Cloud, then save its Client ID and Client Secret in **Clerk → Production → SSO connections → Google → Use custom credentials**. Enable sign-up and sign-in. These credentials belong in Clerk, not in `EXPO_PUBLIC_*` variables or the application source.

| Google OAuth setting | Value |
| --- | --- |
| Authorized JavaScript origin | `https://plantopedia-nine.vercel.app` |
| Authorized redirect URI | `https://plantopedia-nine.vercel.app/__clerk/v1/oauth_callback` |

The redirect above was observed in the live authorization request; confirm it matches the value displayed by Clerk. The app's native `plantopedia://sso-callback` is a separate Clerk-to-app redirect, not Google's authorized redirect URI. For public release, configure the consent screen audience and publish the Google OAuth app; while testing, permit the intended test accounts as required by Google.

Saving credentials in Clerk does not require an application redeployment. Start a fresh Google sign-in afterward, complete consent and the callback, and verify an authenticated `/v1/plants` request. Credentials are now saved; real-account end-to-end acceptance remains pending. Google Cloud consent-screen audience/publication and installed-device callback delivery have not yet been verified.

## Web callback correction after Google login

After adding credentials, real browser testing exposed a second failure: Clerk sent the user to `accounts.plantopedia-nine.vercel.app/sign-in#/sso-callback`, which is not hosted. The old web UI opened only a modal, and the provider had no app-hosted sign-in URL.

The web implementation now mounts Clerk's prebuilt `SignIn` with hash routing and combined sign-up support. Web-only provider settings point sign-in/sign-up at `/login` with `/plants` as the fallback destination. Vercel already serves `/login` through the app's HTML. AuthGate renders the sign-in component before mounting the route Stack while signed out; therefore the `/login` route's redirect cannot run until Clerk activates the session. Native Google authentication retains its registered custom-scheme callback.

Google's authorized redirect URI remains `https://plantopedia-nine.vercel.app/__clerk/v1/oauth_callback`. The `/login#/sso-callback` URL is the subsequent Clerk-to-app browser callback and is handled by the mounted web component, not the native `/sso-callback` route.

Verification: 13 component tests pass, including immediate web SignIn mounting, web provider URL settings and unloaded/signed-out/signed-in/signed-out route gating. Three export-verifier tests cover the referenced entry, stale entry with an unused correct bundle, and another Clerk environment. These mocks and fixture tests do not prove Google callback completion; live browser acceptance remains a separate requirement.

Adversarial review found and corrected the stale modal test and a verifier weakness that allowed unused bundles to satisfy configuration checks. An initial reviewer claim that `/login` redirects before authentication was rejected by tracing the parent AuthGate and the regression test; a follow-up review retracted it. Reports and host triage are in `artifacts/clerk-auth/callback-*-review.md` and `callback-review-triage.md`.

### Live deployment and remaining dashboard setting

The app-hosted callback fix is live at **https://plantopedia-nine.vercel.app/login**, deployment `dpl_4mwyyRD1uT4ozsrtV7wi58qu78wu`. Public web/API checks passed, and the delivered entry bundle matches the reviewed candidate. Evidence: `artifacts/clerk-auth/callback-production-smoke.json`.

The underlying domain configuration identifies `plantopedia-nine.vercel.app` as a provider domain, with Frontend API proxy `https://plantopedia-nine.vercel.app/__clerk` but Account Portal URL `https://accounts.plantopedia-nine.vercel.app`. The proxy serves Clerk's API; it does not create hosting or TLS for the separate `accounts.*` hostname. HTTPS to that hostname closes the connection. Clerk's public environment still advertises that host as the instance-level sign-in/sign-up default. Thus fixing Google credentials alone could never fix this second failure.

In Clerk Production's **Paths / Account Portal** settings, switch sign-in and sign-up to custom pages at `https://plantopedia-nine.vercel.app/login`, and sign-out destinations to that URL. Keep after-sign-in and after-sign-up destinations at `https://plantopedia-nine.vercel.app/plants`. These dashboard changes have not yet been made: the only available browser-control surface was actively presenting the desktop in a live meeting, and the user was asked when it would be available. The supported Backend API exposes no display-config update operation. The deployed application's provider already overrides its own sign-in/sign-up URLs.

Do not reuse an old `accounts.*` callback tab. Begin a fresh sign-in at `/login`. Google's registered redirect remains `/__clerk/v1/oauth_callback`; app-side completion belongs at `/login#/sso-callback`. A real Google sign-in, session activation and authenticated collection request remain unverified. To use a separate Clerk-hosted Account Portal instead, a domain with the required DNS/TLS configuration is needed; the app-hosted solution avoids that dependency.

## Verification

- Development secret accepted by Clerk JWKS API.
- Actual localhost development bundle: development public key present, production public key absent, local API URL present, checked secret values absent.
- Local API started successfully with database and photo-storage readiness.
- Browser reached the Clerk development modal with **Continue with Google**, and clicking it reached Google's account chooser.
- Tests cover successful SSO handoff, cancel/dismiss, unfinished signup, Expo Go restriction, existing email flows and local/production profile separation.

A completed Google account selection, return to the app, valid-token API request and installed iOS/Android callback are separate acceptance checks. Reaching the account chooser is not an end-to-end sign-in result. Production Google must use valid custom OAuth credentials; an enabled provider alone does not prove consent/callback completion.

## Sources

- [Clerk production deployment](https://clerk.com/docs/guides/development/deployment/production)
- [Clerk Google social connection](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google)
- [Expo authentication and custom builds](https://docs.expo.dev/guides/authentication/)

## Vercel web deployment

Run `npm run deploy:vercel -- --yes` from the linked checkout. It uploads source and uses the environment configured in Vercel. The cloud build compiles contracts, clears Metro's cache, exports Expo web, verifies its configuration and referenced assets, compiles the API, and emits Vercel Build Output API v3. Only public Clerk settings enter the Expo subprocess. Private environment files, local dependencies and generated outputs are excluded from uploads.

The output adapter copies the generated web export into `.vercel/output/static` and traces the compiled HTTP server and its runtime dependencies into one Node.js function. This avoids the Express preset's discovery of only preexisting static files. Linux native dependencies are installed and packaged in the cloud. Explicit app-route rewrites leave `/v1`, `/health`, `/ready` and `/__clerk` with Express; the HTTP-server export retains its WebSocket upgrade handler. The web build requires `CLERK_PUBLISHABLE_KEY` and `CLERK_PROXY_URL` in the deployment environment. Browser local drafts/cache remain in memory; durable offline storage is a native feature.

The command stages production without moving the public domain. Verify its returned URL with `vercel curl`, then use `vercel promote`. Git deployments use the same build command and generate their own assets; no developer-created export is needed. See [the build investigation](vercel-build-investigation.md) for regression checks, dependency audit findings, and preview configuration requirements.

Additional live verification: a temporary synthetic Clerk Development session successfully called local `/v1/plants` (200); the same token was rejected by production (401). The temporary user and session were cleaned up. This proves token verification and environment separation, not Google consent. The original production native initiation returned 200 with an empty Google `client_id`, and the browser reproduced Google's rejection. After saving the credentials, the redirect contains the supplied ID and Google serves its sign-in page. Neither initiation status 200 nor the account chooser establishes completed sign-in.

Adversarial source reviews found no actionable auth defect. Codex found a cancellation-test assertion gap: the test now rejects generic authentication errors and checks that neither email resource was finalized. Reviews explicitly did not establish real-device callback delivery or Vercel static routing. Reports are in `artifacts/clerk-auth/` (ignored); deployment verification is recorded separately.

## Signed-in collection failure: issuer and account ownership

On 2026-10-19, a signature-verified real production Google session had `iss=https://plantopedia-nine.vercel.app/__clerk`. The server expected `https://clerk.plantopedia-nine.vercel.app`; authenticated `/v1/plants` and `/v1/conversations` therefore returned 401. The environment schema also rejected proxy issuers. The validator now accepts exact HTTPS origins or exact `/__clerk` proxy issuers, and the production environment and local `.env` now use the verified value. JWT signature, expiry, session claim and exact issuer checks remain intact. The earlier setup assertion that proxies never affect the issuer was incorrect and has been corrected throughout the setup documentation.

Production calls using the existing Google session now return 200 for plants, conversations and preferences. A real Development token still receives 401 from Production. The matching Development account owns 5 plants, 13 conversations, 27 messages and 5 stored photos; the new Production account has zero plants/conversations. These are distinct Clerk user IDs. Data copying is pending the user's explicit choice; no ownership merge or copy has occurred.

Validation: 44 configuration/identity tests and all 177 backend tests pass; typecheck and lint pass. Read-only adversarial review found two inherited README instructions that would recreate the issuer mismatch; both are corrected. Sanitized evidence and the review are in `artifacts/clerk-auth/issuer-*`.

The screenshot's missing icons were a separate packaging defect: `.vercelignore` excluded `node_modules` even inside Expo's exported public assets. The Ionicons font returned 404. Exported dependency assets now use `assets/vendor`, and the build verifies every referenced asset before packaging it.
