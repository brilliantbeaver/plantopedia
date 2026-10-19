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
- Hosted checks and production email authentication are recorded below after deployment. Email tests use the user-authorized test address; received codes are needed to complete authentication.

Production on the chosen `vercel.app` host uses Clerk's shared `accounts.dev` email infrastructure for sign-in, sign-up, verification and password reset **codes**. Branded email/template customization, email links and invitations require a separately chosen custom domain. Do not attempt to add DNS records for `vercel.app`.

## References

- [Clerk Frontend API proxy](https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
