# Discovery — 2026-11-01

This document records the pre-change baseline. Evidence is source inspection unless explicitly described as executed; current changes and executed results are in [implementation review](implementation-review.md). No production data was changed. The unrelated notes edits present at the start are preserved.

## Architecture

Expo 57 / React Native 0.86 / React 19 / TypeScript, Expo Router, TanStack Query; manifests and lockfile are authoritative. [Root layout](../src/app/_layout.tsx) originally gated the entire router on Clerk and valid public config. [Session service](../src/services/session.tsx) keys API, voice, cache reconciliation and teardown by Clerk user. Seven typed dictionaries and light/dark/system preferences live under `src/theme/preferences.tsx` and `src/i18n/locales/`.

Express application services use injected ports ([ports](../server/src/application/ports.ts)) and shared Zod contracts ([contracts](../packages/contracts/src/index.ts)). Firebase Admin accesses Firestore and private Storage. Bearer verification applies to all private `/v1` routes. Photos are never public. OpenAI/Tavily support research/chat, not a verified insect classifier.

## Current route map

```text
Clerk welcome → tabs
  / Explore → /scan, /ask, /plants/:plantId
  /plants → saved-collection POST /v1/search → /plants/:plantId
  /scan → camera/gallery → draft → save → /plants/:plantId
  /settings → preferences, tasks, sign out, account deletion
  /ask → conversation, voice, action proposals
/tasks → /settings; /login; /sso-callback
```

[CaptureScreen](../src/features/capture/CaptureScreen.tsx) retains originals, prepares a cleaned derivative and writes recoverable owner-scoped drafts. [outbox](../src/services/outbox.ts) freezes submitted payloads and idempotently creates plant/observation/photo. Save does not automatically identify. [IdentificationPanel](../src/features/identification/IdentificationPanel.tsx) explicitly identifies and records selection/correction, preserving evidence and low-confidence states. Pl@ntNet returns up to three candidates with names/score/taxon ID. It supplies no traits or reference images in the current mapping.

[saved profile](../src/app/plants/[plantId].tsx) already has private photo viewing, identification, Ask, notes, timeline and confirmed deletion. Settings deletes the account, not individual plants. Server plant DELETE tombstones then irreversibly cascades through photos, tasks, memory, proposals and affected conversations; undo must precede dispatch.

## Storage and design

Native [native local storage](../src/services/local.ts) uses owner-scoped SQLite drafts/cache plus files under documents/originals. At baseline its initializer unconditionally wrote user_version=1; extensions must fix that without wiping existing data. [browser local storage](../src/services/local.web.ts) is an in-memory preview. Preferences/collection history have platform adapters. `Plant.lifecycle` is draft/saved, not botanical lifespan.

[UI primitives](../src/components/ui.tsx), `PageHeader`, `PlantCard`, `CandidateCard`, `PrivatePhoto`, `AppIcon`/Ionicons and `GlassSurface` are reusable. Native glass has both availability checks and Reduce Transparency; web has CSS/contrast/transparency checks. Ordinary Android surfaces are opaque. Navigation sizing and scroll clearance share `navigation-layout.ts`. Preserve these. The project-created `assets/images/botanical.png` is a generic illustration, not a species reference photograph.

## Baseline

- Direct TypeScript CLI (`node node_modules/typescript/bin/tsc --noEmit`): passed before edits.
- Direct Jest Expo baseline: 25 suites / 131 tests passed. Existing asynchronous act warnings are present.
- Direct server/unit baseline: 33 suites / 262 tests passed before edits.
- Environment Node is 24.18, while repo requests Node 22. Installed `.bin` executables are copied files with broken relative resolution; direct package entrypoints work. Do not modify source or upgrade dependencies to mask that environment issue.
- Baseline had no new native hardware/screenshot evidence. Subsequent actual web screenshots are in [evidence](evidence/README.md); historical notes are not current device evidence.
- Marketplace skill read-only `find 'insect identification'` was attempted. No new integration is provisioned by this work. Provider access/retention is a live acceptance gate.

## Sources

Use a small factual bundled catalog with individual field sources and licensed local reference photos. NC State Extension pages verified for sunflower, purple coneflower, common milkweed, Chinese wisteria and ginkgo. Facts are paraphrased; photos require a separately documented permissive license. Do not infer regional abundance. Runtime photo identification remains online and explicit. See plan for source decisions and outstanding live-provider dependency.

## Representative tests inspected

[Capture](../tests/components/capture.test.tsx) covers immutable submitted retries and camera readiness; [identification](../tests/components/identification.test.tsx) covers selection, ambiguity and evidence; [profile](../tests/components/plant-profile.test.tsx) covers note retry/Ask/deletion; [session](../src/services/session.tsx) owns cleanup/reconciliation. [Device-cache tests](../server/tests/device-cache.test.ts) inject actual SQLite/file adapters; these are not native runtime automation. Jest Expo/React Native Testing Library and Jest/SWC/Supertest remain the test stacks. Commands and final outcomes are in the review.

## Differences from the original feature assumptions

Photo identification is an explicit post-save action; initial capture does not auto-identify. Individual deletion already existed under profile More; Settings has account deletion. A full saved profile and evidence workflow already exist, while a public species catalog does not. No-account use requires a real new compatibility layer around the existing auth-bound runtime. Pl@ntNet mapping supplies names/scores but no sourced comparison traits/care. Neither research nor free-form photo reasoning is an insect classifier. `Plant.lifecycle` means draft/saved. Browser drafts are not durable photographs. These differences drove the adapters and additive contracts rather than a replacement application.

The user subsequently selected **Kindwise insect.id** and will configure access. Official contract/retention evidence and exact disabled-by-default setup are in [sources and provider setup](sources-and-provider-setup.md). No secret-bearing environment values were read. Existing README, architecture/status/UI/capture-recovery notes were treated as historical context; installed source/lockfile were authoritative.
