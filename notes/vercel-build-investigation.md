# Vercel clean-build failure and dependency audit

Investigated 2026-10-19 Pacific / 2026-10-20 UTC.

## Why deployment failed

The fatal error came from `verify-vercel-web.mjs`, not the npm audit summary. Installation completed, then the build ran `verify-vercel-web && build:api`. The verifier expected an existing `server/public/index.html` and a matching Expo bundle. Git intentionally excludes `server/public`, so a Git deployment could never satisfy that prerequisite.

The previous CLI wrapper generated assets locally before uploading. That workaround made a CLI release possible but left Git deployments broken and coupled releases to a developer's environment. Moving the export into the old Express build command alone was insufficient: a clean `vercel build` succeeded while its final static output contained **zero files**. The Express preset had discovered static files before the build generated them.

The account name in the deployment log does not establish an account or permissions defect. The build reached an application-owned assertion and exited with status 1. No evidence linked the failure to `jiamingmui` permissions or Node.js 22.

## Implemented solution

1. Use one cloud build for Git and CLI: locked installation, contracts, Expo export, configuration/asset verification, API compilation, and explicit packaging.
2. Emit [Vercel Build Output API v3](https://vercel.com/docs/build-output-api/primitives): generated web files in `static`, a traced Node.js HTTP-server function, and explicit SPA/API/cache routing. This removes reliance on the Express preset's discovery timing. Native runtime dependencies are built and packaged on Linux.
3. Keep private configuration and local build outputs out of uploads. Only allowlisted public configuration enters Expo. Validate traced paths and preserve workspace links without copying the entire monorepo dependency tree.
4. Keep generated `.vercel` directories out of Git, ESLint, Jest and Metro discovery. Otherwise the packaged workspace manifests collide with source manifests after a local build.
5. Add Linux CI that installs from the lockfile, runs typecheck/lint/tests, audits API production dependencies, builds complete output from a fresh checkout, and checks all three app bundles for private configuration and excluded vulnerable tooling.

`npm run deploy:vercel -- --yes` stages a production candidate without moving the public domain. Vercel production environment variables are the source of truth. Local `.env` and prebuilt web assets are unnecessary. After acceptance checks, use `vercel promote <deployment-url>`.

## What the audit actually reported

The original **65 findings (15 moderate, 50 high)** were affected-package and parent-package entries arising from **five underlying advisories**. They were not 65 distinct vulnerabilities, and were not the command that stopped deployment.

| Underlying package | Dependency path | Change / remaining status |
| --- | --- | --- |
| `decode-uri-component` | Expo → `query-string` | Override to published fix `0.5.0`; version-checked postinstall patch adapts query-string 7's CommonJS import to the decoder's ESM default. Unicode, malformed input, a long malicious input, and web/native exports are checked. |
| `uuid` | Expo native tooling → `xcode` | Override only Xcode's dependency to `11.1.1`, which retains CommonJS support. Verify Xcode's 24-character uppercase identifiers and rejection of undersized UUID output buffers. |
| `sprintf-js` | Jest/Babel/Istanbul → `js-yaml` 3 → `argparse` 1 | Use `js-yaml` `4.3.2`, removing the vulnerable dependency path. Verify Istanbul still reads its YAML configuration. |
| `braces` | `micromatch` and build/test tooling | Latest available `3.0.3` remains affected. [Advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. |
| `node-forge` | Expo CLI / code-signing certificates | Latest available `1.4.0` remains affected. [Advisory GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) lists no patched version. |

After a clean install, the full audit reports **50 high, zero moderate** findings, all cascading from the two remaining advisories. `npm audit --workspace @plantopedia/server --omit=dev` reports **zero vulnerabilities**. The output adapter rejects either unpatched package if it enters the traced API. The all-platform source-map check confirms neither package enters the iOS, Android or browser JavaScript bundles.

These controls isolate the deployed application; they do not patch the build tools. Full-repository `npm audit` intentionally still fails and reports the outstanding issues. Do not suppress the findings, invent a patched version, or run `npm audit fix --force` indiscriminately. Recheck the upstream releases and remove the guard/overrides only after compatible fixes and the regression checks pass. Build and development tooling should not process untrusted glob patterns or untrusted code-signing material while these advisories remain open.

Fixed-advisory references: [URI decoding](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [UUID buffer bounds](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).

## Environment configuration boundary

Vercel production has its existing service configuration. The project's Preview environment had **no variables** when inspected. A successful production build does not provision preview services. PR previews need an explicitly chosen Clerk environment, API/Firebase configuration, and any enabled provider credentials. Production secrets have not been copied into preview scopes. CI uses nonfunctional public fixtures solely to test compilation; it does not deploy a mock application.

The build now supports an explicitly configured Preview `pk_test_` key without a proxy, using that deployment's `VERCEL_URL` as its API origin (or an explicit HTTPS `EXPO_PUBLIC_API_BASE_URL`). Production still requires a live key and an exact HTTPS `/__clerk` proxy. Missing environment settings fail with instructions naming the relevant Vercel environment; there is no silent production fallback. The server also needs the matching Clerk secret/issuer and real hosted Firebase settings; environment presence alone is not an acceptance test.

The CLI upgrade command was executed. npm's configured release-age policy selected `64.5.0`; explicitly requesting `64.7.0` was rejected because that release is newer than the permitted cutoff. The policy was preserved. This is separate from the application build failure.

## Verification

- Clean `npm ci --include=dev`, TypeScript and ESLint pass.
- 85 unit tests, 64 script tests, 177 API tests and 131 component tests pass (457 total).
- iOS, Android and web exports, source maps and public Expo config pass the private-sentinel and excluded-tooling checks.
- Local Vercel build now includes generated static assets and a self-contained API function; the previous build had no static files.
- Source-only cloud builds complete using a fresh Linux install and trace 2,457 API files. An initial candidate exposed an HTTP status-routing defect despite correct health JSON; it was rejected before promotion, the fallback route was corrected, and `check-vercel-deployment.mjs` now verifies status codes, bodies, cache headers and exact asset bytes. Live acceptance and final Git deployment results are recorded in [deployment status](vercel-deployment-status.md).

Sanitized build, audit and test evidence is retained locally in ignored `artifacts/build-review/`.
