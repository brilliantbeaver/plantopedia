# Image identification and provider failover

Updated 2026-11-01 (America/Los_Angeles). The requested fallback model is exactly **`gpt-6.1-sol`**, independent of the Ask and Realtime voice models. This is image interpretation, not a guarantee of biological accuracy.

## Request path

```mermaid
flowchart TD
  A[Explicit cleaned-image submission] --> B[Validation, consent and operation receipt]
  B --> C{Mode}
  C -->|Plant| D[Pl@ntNet]
  C -->|Bug| E[Kindwise insect.id]
  D -->|Valid result including no match| F[Original provider result]
  E -->|Valid result including uncertainty| F
  D -->|Upstream failure| G[One OpenAI Responses image request: gpt-6.1-sol]
  E -->|Upstream failure| G
  G -->|Validated structured response| H[Unverified visual suggestion with provenance]
  G -->|Error, refusal or invalid output| I[Unavailable; preserve photo and uncertain operation]
```

Pl@ntNet remains the plant primary. The separately provisioned `KINDWISE_PLANTID_API_KEY` is stored server-side but is **not called by the current pipeline**. `KINDWISE_INSECTID_API_KEY` is the insect.id product key; `KINDWISE_INSECT_API_KEY` remains a compatibility alias. Do not interchange these keys. There is no three-provider cascade or silent OpenAI model substitution.

Implementation: `server/src/providers/identification-fallback.ts`, `openai-identification.ts`, `plantnet.ts`, and `kindwise.ts`, wired in `server/src/server.ts`. Private and public plant operations share the wrapped plant adapter; public bug operations use the wrapped animal adapter.

## Triggers and deadlines

Exactly one fallback follows an upstream adapter error:

- HTTP 402 (credits/payment) or 429 (quota/rate limit), normalized to `credit_or_quota`;
- network/deadline failure, including an uncertain primary acknowledgment;
- provider authentication, service, or other non-success error;
- malformed JSON or a provider-contract violation.

A valid low-confidence/no-match response does **not** trigger extra billing. Local image validation, user authentication/authorization, consent/configuration gates, application budget exhaustion, invalid operation IDs, storage failures and unexpected programming exceptions do not trigger fallback. The wrapper allowlists upstream error codes. Credit failures need no client-side balance polling.

Each primary has an 18-second deadline. OpenAI has a 20-second deadline and SDK `maxRetries: 0`. Private identification HTTP responses have a 45-second budget; identification clients allow 50 seconds. Other private API deadlines are unchanged. Two upstream attempts can consume roughly 38 seconds plus validation/storage/network time. There is no parallel race, retry loop, reconnect submission, or fallback to demo data. Process termination can still interrupt work.

## Structured results and uncertainty

OpenAI receives cleaned image bytes, the mode, and a fixed conservative prompt. Plant common names use the submitted locale; animal fallback names currently use English. App labels remain localized. No personal notes, location, collection history, or identity are included. Text inside images is explicitly untrusted.

The request uses Responses image input, strict JSON Schema, `store: false`, low reasoning effort, and at most 1,000 output tokens. Zod validates the response again. Refusal, incomplete output, extra fields, malformed output and request failures produce a sanitized unavailable response. Scientific names must pass a conservative binomial syntax check; syntax is **not** taxonomic verification. Non-subject photos cannot create a species candidate.

Plant suggestions carry `provider: "openai_vision"`, `providerVersion: "gpt-6.1-sol"`, and candidate `assessment: "visual_guess"`. Their numeric score is an internal zero **unscored** sentinel. UI displays “Best guess” and “OpenAI visual fallback · unverified best guess”, without a percentage or score meter. Evidence still needs more information. A deliberate user selection/correction remains possible and preserves history; it does not establish verified taxonomy.

Animal suggestions carry `provider: "openai_vision:gpt-6.1-sol"`, no resolved species ID, and **Not sure** ecological status. They contain no invented plant relationships, local abundance, fun facts, or citations. A plausible sting flag produces “May sting — admire from a distance”; its absence is no safety guarantee. Fallback suggestions earn no photo/animal species-discovery reward. Curated catalog content remains separate from image interpretation.

Both result types retain `fallback: { from, reason }`: the failed provider and normalized reason, never a vendor response body, key, image or account information. Contract additions are additive; old Pl@ntNet records remain readable. Guest plant records preserve the real answering provider.

Native clients need an updated Expo/EAS binary containing these contracts and labels. Older binaries that restrict `Identification.provider` to `plantnet` cannot parse the new OpenAI provider value, including when reading a cloud record created by the new web app. Coordinate native distribution before relying on mixed-version cloud usage. This Vercel deployment updates the web app/API, not installed native binaries; the dated acceptance report does not certify old-client compatibility.

## Idempotency, billing and recovery

Fallback belongs to the **same durable operation**, not a new client key. Successful replies and provenance are persisted and replayed. Changing an operation's image bytes is rejected. A primary timeout may still incur a charge; a successful fallback can therefore cost **both** the primary attempt and OpenAI image/text tokens.

The public global daily limit counts operations, not vendor calls: ten operations can make up to twenty upstream attempts. Resetting a device ID does not reset the Firestore budget. Configure hard account spending/usage caps too; notification-only alerts are insufficient. Signed-in requests retain existing authentication and rate limits, rather than sharing the guest budget.

The short-lived public IP limiter uses `identification-rate-key.ts`: inside the Vercel runtime it accepts a single valid platform-overwritten `X-Forwarded-For` address; on other hosts it uses the direct socket peer. Arbitrary `Forwarded`/`X-Real-IP` values cannot select a bucket. IPv6 addresses use the existing limiter library's /56 grouping. Express-wide proxy trust remains disabled. This per-instance memory limiter supplements the durable global spend budget; IPs are not stored in identification receipts or used to infer garden locality. See [Vercel request-header guarantees](https://vercel.com/docs/headers/request-headers).

When both providers fail, the local image remains available and OpenAI errors become `identification_fallback_unavailable` with `retryable: false`. The operation is uncertain; replay returns the existing unknown-outcome response without rebilling. Never generate a new operation key automatically. A deliberate fresh attempt may incur another charge. Deletion is separate from retrying identification.

## Privacy, credentials and enablement

`OPENAI_API_KEY`, the Kindwise product keys and `PLANTNET_API_KEY` stay on the server. No client key or new dependency is required. `ALLOW_LIVE_PROVIDERS=false` retains explicitly labeled fake/test mode and never calls fallback.

Public relays require all of `ALLOW_LIVE_PROVIDERS=true`, `ALLOW_PUBLIC_IDENTIFICATION=true`, `IDENTIFICATION_RETENTION_APPROVED=true`, a positive `PUBLIC_IDENTIFICATION_DAILY_LIMIT`, and an insect key. Credentials alone are not retention approval. **Production guest uploads remain disabled pending suitable provider-processing/retention terms.** Signed-in plant identification retains its existing authenticated live path.

Upload copy in all seven languages explains possible forwarding to OpenAI and provider processing/retention terms. Signed-in users also see it before submission. Save-locally/identify-later remains available. Adapters do not log images, credentials, model output, or upstream error bodies. Public relay receipts store digests and normalized results, not image bytes; seven-day reply expiry is not automatic Firestore TTL deletion.

`store: false` disables Responses application-state storage, **not** all abuse-monitoring retention or processing. OpenAI API data controls distinguish training defaults, monitoring and approved retention controls. Check actual account settings and image/file exceptions. Kindwise's linked API terms permit retention and improvement use, conflicting with the original no-training requirement until resolved. Configuring a key did not silently waive that requirement.

## Verification and troubleshooting

`server/tests/identification-fallback.test.ts` covers no fallback for successful/no-match results, 402/429/auth/service errors, timeout, malformed upstream output, exact model/privacy settings, unscored suggestions, non-subjects, malformed/incomplete/refused OpenAI output, and no SDK retries. `server/tests/public-identification.test.ts` verifies durable replay without rebilling either provider and the existing image/budget/auth boundaries. `tests/components/pollinator-flow.test.tsx` checks visible fallback uncertainty and sting caution without a fake percentage. Existing evidence/capture/reward/scope tests remain required.

On 2026-11-01, account model lookup returned HTTP 200 for `gpt-6.1-sol`. A controlled live check passed: the licensed bundled sunflower photo, after an **injected** primary quota error, returned `Helianthus annuus` as an unverified visual guess in 2.437 seconds. This verified the real image/structured-output path without spending a primary identification credit. It did not exhaust vendor credits, test broad accuracy, or establish native camera behavior. Automated suites use safe fixtures, never billable providers. Dated deployment evidence is in `deployment-verification.md`.

For unavailable results, check server-only configuration, `ALLOW_LIVE_PROVIDERS`, public gates, model access, provider/account status, quotas and hard spending limits. Do not print keys, raw errors, photos or customer identifiers in logs. Fix configuration before a deliberate fresh submission. No key should appear in a URL, terminal argument, repository, tutorial, screenshot or support message.

## Official references

- [OpenAI image inputs](https://developers.openai.com/api/docs/guides/images-vision), [structured output](https://developers.openai.com/api/docs/guides/structured-outputs), and [API data controls](https://developers.openai.com/api/docs/guides/your-data).
- [Pl@ntNet OpenAPI](https://my.plantnet.org/doc/openapi).
- [Kindwise insect.id API](https://documenter.getpostman.com/view/3802128/2s93sZ5YeU), [usage/admin guide](https://www.kindwise.com/faqs-admin-panel), and [terms with linked API terms](https://www.kindwise.com/terms-and-conditions).

Recheck current docs, provider terms and account capabilities before enabling uploads or changing the model.
