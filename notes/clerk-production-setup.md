# Clerk production setup

Updated 2026-10-19. Reuses the existing Clerk production instance, Vercel project, GitHub repository and Expo project. No DNS changes are needed or made for `vercel.app`.

## Configuration

| Location                       | Setting                             | Production value                              |
| ------------------------------ | ----------------------------------- | --------------------------------------------- |
| Vercel server                  | `CLERK_SECRET_KEY`                  | Matching live key, stored as sensitive        |
| Vercel server                  | `CLERK_PUBLISHABLE_KEY`             | Matching live publishable key                 |
| Vercel server                  | `CLERK_ISSUER_URL`                  | `https://clerk.plantopedia-nine.vercel.app`   |
| Vercel server and Clerk domain | `CLERK_PROXY_URL` / `proxy_url`     | `https://plantopedia-nine.vercel.app/__clerk` |
| EAS production                 | `EXPO_PUBLIC_API_BASE_URL`          | `https://plantopedia-nine.vercel.app`         |
| EAS production                 | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Matching live publishable key                 |
| EAS production                 | `EXPO_PUBLIC_CLERK_PROXY_URL`       | `https://plantopedia-nine.vercel.app/__clerk` |

The issuer remains the token's original Clerk issuer, even when the Frontend API is proxied. Do not set it to the app origin or proxy path. Backend JWT verification fetches signing keys through Clerk's Backend API using the server secret; it does not require a DNS record for the issuer hostname.

`@clerk/expo` 4.11.0 and `@clerk/backend` 3.23.2 are pinned. The shared SDK includes production Vercel auto-proxy detection, but this app serves Express separately from Expo, so both sides explicitly configure the proxy. This is not Next.js; there is no Next.js middleware matcher. Express routes `/__clerk` and its descendants before JSON parsing and bearer authentication using the installed official `clerkFrontendApiProxy` handler. That handler streams bodies, preserves cookies and rewrites Clerk redirects. The adapter pins the upstream and public origin and takes the client IP from Vercel's ingress-owned header, rejecting requests without a valid trusted IP on Vercel. Local servers use the socket address.

## Uploading server settings safely

The initial upload parsed the ignored local `.env` in memory, validated the server schema with production overrides, checked the target account/project/repository, and passed each allowed value to `vercel env add` over stdin. Credentials were never printed or passed in command arguments. The Vercel token was provided only to the CLI environment. All variables are scoped to **production**; preview does not receive production secrets.

Only schema-defined server settings were uploaded. Production overrides are `NODE_ENV=production`, `USE_FIREBASE_EMULATORS=false` and `WEB_ALLOWED_ORIGINS=https://plantopedia-nine.vercel.app`. Both emulator hosts, local bind/port settings, mobile build credentials, unused Firebase browser configuration and `VERCEL_API_TOKEN` were excluded. Provider/tracing switches retain the user's explicit local settings; trace input/output redaction remains enabled. The Firebase RSA private key retains its PEM/newline representation.

For later changes, authenticate the CLI through `VERCEL_TOKEN` loaded from the ignored file in memory, verify the linked project, and supply each value through a pipe/stdin to `vercel env add NAME production --force --yes`. Use `--sensitive` for secrets and `--no-sensitive` for readable configuration. Do not interpolate secret values into shell commands, upload the entire file or pull production credentials into tracked source. A new deployment is required after environment changes.

Only the three public values above were added to EAS production. Local `.env` gained the matching server publishable key and public proxy URL; its loopback API URL remains for local development. EAS builds use isolated committed source with `.env` excluded. Rebuild an installed native app to pick up changed public configuration.

## Validation

- Server and unit suites cover raw POST bodies, canonical origin, trusted IPs, multiple cookies, redirects, fixed upstream routing, route boundaries, generic errors and actual entrypoint middleware ordering.
- Full type checking, lint, API compilation and script suites pass.
- iOS, Android and web JavaScript exports, source maps and Expo public configuration pass the private-sentinel scan. This is a bundle privacy check, not an installed-device acceptance test.
- PR #2 merged as `6c2ca3a` and deployed to production (`dpl_FiUBEkYYa3kuUaJn4qKDrgiMsP71`). The production alias points at that deployment. Hosted `/health`, `/ready` (database and photo Storage) and `/__clerk/v1/environment` returned 200; missing and invalid bearer tokens returned 401 with `private, no-store`.
- The production Clerk environment confirms Native API enabled, email-code verification/sign-in and reset-password email codes enabled, and password required for signup. A real signup attempt and verification-code send for the user-authorized address returned 200. Delivery, sender-domain verification, successful sign-in, a valid-token API request and password reset remain pending the emailed code. Provider acceptance is not delivery confirmation.
- The deployed revision's initial runtime-log scan returned no entries, and the request-log scan found no 5xx responses. Monitoring/drains were not provisioned by this work.

## Native authentication correction

Live testing revealed that `/v1/client/hosted_auth` returns 403 `feature_not_enabled` for this production instance, including with the installed Expo SDK's native headers. Native API access and regular email/password/code endpoints work. The configured Account Portal URLs also use an `accounts.` subdomain; do not attempt to fix them with DNS records for `vercel.app`.

The native app now uses in-app forms built with the current `useSignIn()` and `useSignUp()` APIs. It supports email/password signup, signup verification, password or email-code signin, and email-code password reset. It finalizes only complete authentication, requires verified reset codes before a new password, clears sensitive fields on mode changes, prevents concurrent submissions and adds a resend cooldown. Validation errors are displayed without logging credentials. Labels are localized in all seven app languages. Expo web continues to open Clerk's web modal. These flows work without the hosted-auth feature or a new native dependency.

Component regressions cover signup/code ordering, completed-session activation, rejection of unfinished authentication, reset ordering, validation errors and browser modal behavior. Installed-device acceptance still requires a native build with the production EAS environment. Additional MFA/session tasks, if enabled later, need corresponding UI; unfinished authentication is never treated as success.

Production on the chosen `vercel.app` host uses Clerk's shared `accounts.dev` email infrastructure for sign-in, sign-up, verification and password reset **codes**. Branded email/template customization, email links and invitations require a separately chosen custom domain. Do not attempt to add DNS records for `vercel.app`.

## References

- [Clerk Frontend API proxy](https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
