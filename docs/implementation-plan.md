# Implementation plan — 2026-11-01

## Scope and route map

Extend current application layers. No new dependencies, backend, router or auth provider. Native persistence is primary. New local metadata uses a transactional SQLite document per scope; browser metadata uses localStorage with explicit errors. Existing browser photo drafts remain page-session-only.

```text
Before: auth gate → Explore | Plants | Scan | Settings | Ask
After: local guest or existing signed-in scope
  Explore | My Garden | Scan | Ask
  Explore → /search → /species/[speciesId]
  My Garden → Plants / Pollinators spotted → existing /plants/[plantId] or /sightings/[sightingId]
  header → /progress (Quests & avatar); header → /settings
  /login → existing Clerk welcome; signed-in cloud routes remain private
```

Guest local API adapter implements the existing plant contract for on-device capture/collection/history. It never manufactures a bearer identity. Existing authenticated adapter remains unchanged. Scope provider selects existing Clerk user or a local-only guest namespace, and gates cloud-only Ask/Settings subfeatures before they mount.

## Wireframes and states

```text
Explore                 My Garden
[leaf Plantopedia][gear] [My Garden] [+]
[Pollen / level]         [Plants | Pollinators spotted]
[Search plants][Scan]    [collection search / filters]
[daily quest]            [photo/name/status] [menu]
[recent plants]          [Undo snackbar, per item]

Scan                    Shared plant profile
[Plant | Bug]           [back] [name]
[camera / gallery]      [photo, contained]
 → [preview]            [pollinator / lifespan]
 [Retake][Use photo]    [labeled pollinator visitors]
 → details or Bug ID    [Care disclosure → check-in]
                        [Save][Planted][Share]
                        [existing identification/history]

Search                  Bug result
[back] [search input]   [observed photo / best name]
[recent][clear]         [symbol + verdict]
[reference photo]      [confidence][sting warning]
[trait chips]          [details → plant links]
 → species profile     [Save sighting][Retake]

Quests & avatar         Settings
[balance][level bar]   [appearance][language]
[daily / milestones]   [sign in for cloud settings]
[avatar item grid]     [existing signed-in controls]
[cost / buy / equip]   [clear recent searches]
```

All screens: loading preserves layout; errors retain data and give Retry; empty states offer one action; unknown biological fields stay unknown. Offline catalog uses bundled content; identification keeps drafts and requires explicit later submission. Large text wraps; keyboard/snackbars clear navigation; default opaque surfaces remain readable. Photo permissions are requested at use.

## Models/components

Extend contracts with sourced species profiles, animal result/sighting, and local scoped document schema. Keep botanical lifespan distinct from Plant.lifecycle. Add optional canonical species reference to Plant, defaulting absent for old data. A saved catalog plant requires no photo. Use existing PlantDetail for guest plants, existing private API for signed-in plants; sightings/progress remain local. Never treat sighting IDs as plants.

Shared components: comparison traits/reference card, species profile content, scope-aware safe photo, garden item menu/swipe, persistent undo host. Existing Card/Action/Disclosure/GlassSurface/AppIcon/PageHeader remain primitives. Theme adds semantic accents; no replacement glass or icon library. Typed translations extend all seven dictionaries.

## Deletion state machine

Persist pending item before hiding → undo cancels while pending → deadline transitions to committing → remote DELETE (authenticated) or local finalize → purge retained files after acknowledgement. Unknown network result remains retryable with original ID; 404/410 is authoritative completion. Permanent errors are visible. Reload resumes journal; account changes stop dispatch; each item has its own undo. Screen-reader undo does not expire until explicitly dismissed. Conflicting sync is suppressed while pending. Deletion does not remove reward receipts.

## Data source matrix

| Capability                | Source / contract                                                                                                                                                                      | Rights, limits and fallback                                                                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plant identification      | Existing Pl@ntNet port, [official docs](https://my.plantnet.org/doc/openapi)                                                                                                           | Existing secret/server-only adapter and timeout. Do not enable public billable relay without explicit budget configuration; unavailable preserves local photo.                                                                           |
| Names/traits/care/ecology | [NC State Extension](https://plants.ces.ncsu.edu/), factual paraphrases per entry; [Xerces](https://www.xerces.org/pollinator-conservation/pollinator-friendly-plant-lists) background | Small bundled catalog, not global coverage; exact source and retrieval date retained. No location assumption. Unknown fields hidden. Photos are separately licensed.                                                                     |
| Reference photos          | Individual permissively licensed images linked by NC State                                                                                                                             | Bundle only CC BY / public-domain assets with creator, license URL, source URL, and resize notation; reject NC/ND images. Local botanical illustration when unavailable.                                                                 |
| Animal classifier         | Kindwise insect.id, [official product/docs](https://www.kindwise.com/insect-id)                                                                                                        | Insect/invertebrate coverage only. Adapter behind explicit config and validated response. Live access, retention/training policy and quota must be approved before enabling; no fake production result. Unsupported animals → uncertain. |
| Local abundance           | None selected                                                                                                                                                                          | Always unavailable; optional broad-region context is not evidence of abundance.                                                                                                                                                          |

Guest relays must have provider-account enforced hard budgets, no image persistence/traces, metadata-free JPEGs, bounded body/deadline/concurrency, and stable retry keys. A local request counter cannot guarantee a multi-instance total budget. Therefore public paid relays remain disabled unless a durable transactional quota plus approved retention is configured. Their absence is explicit incomplete live acceptance, not a synthetic success. Existing authenticated routes remain untouched.

## Milestones, tests and risks

1. F5: add persistence/journal, preview/retake, shared delete coordinator and accessible row action. Unit state-machine/restart/isolation tests and capture/profile component tests.
2. F4: canonical species/catalog and shared profile, local guest entry, photo-free save, planting/care and source details. Migration and guest/auth separation tests.
3. F2: debounced bounded local catalog search, aliases/typos/recent, shared candidate traits. Integration tests for search→profile→save.
4. F3: shared capture mode and sighting persistence, cautious classifier relay interface/result. Inject classifier responses in tests; live access is a separate blocked gate.
5. F1: scoped transactional reward receipts and shop, 100XP/level with clipped overflow, deterministic daily quests. New claims only after activation; once per canonical species/category, 3 planting claims/day, one care claim per stable specimen/day, daily quest once. Fixed timezone per active day, scheduled local midnight, rollback watermark. Unit midnight/DST/travel/replay/purchase tests.

No backfill from query hydration. Remote acknowledged actions must have recoverable receipts before local credit. Optional photo bonus uses original planting claim ID. Progress cannot prove real planting or defeat manual forward clock manipulation.

Risks: auth scope leaks; destructive DELETE before undo; SQLite initializer resetting schema version; recovery races; unsupported species/biology claims; missing provider approval; browser photo durability; device-only gesture/glass evidence; broken local CLI shims; native screenshots unavailable. Resolve code defects before advancing. Keep external live/device gates explicitly blocked while completing independent local work; do not mark overall done until verified.

## Implementation addendum — exact boundaries and recovery

The following records final concrete choices, rather than implying these were all known before source work:

- Contracts: `packages/contracts/src/pollinators.ts` and `catalog.ts`; canonical catalog IDs are source-namespaced `ncsu_*`, unknown plant provider taxa use `plant:gbif:*`, animal taxa use `animal:kindwise:*`. Plant adds optional `speciesId`; old records remain valid. No new universal repository layer.
- `src/services/guest-api.ts` implements only needed existing DTO operations locally. Existing `/v1/search` stays private. No public catalog endpoint needed for five local entries. Only new public routes are `POST /public/identify/plant` and `/public/identify/bug`, accepting strict operationId/image/locale and returning validated candidates/animal result. They never create owned records.
- `src/services/feature-storage.ts` stores scoped JSON in an additive `feature_state` table, SQLite user_version 2 only when lower, not a reset of newer versions. The browser adapter uses localStorage and Web Locks when available; storage-denied/quota errors surface. Browser photos remain ephemeral.
- Components: existing Card/Action/Disclosure/PageHeader/AppIcon/GlassSurface plus `Comparison`, `SpeciesContent`, `RegionChoice`, `BugDraft`/`BugResult`, `GardenSightings`, `DeletionProvider`, `ProgressSummary` and `ProgressScreen`. Shared theme tokens/locales; no new runtime dependencies. General action gains optional native accessibility-action props for sighting deletion.
- Delete journal: pending (deadline or nonexpiring accessibility) → atomically leased committing → acknowledged purge; transport failure → retry; permanent failure → failed with Retry/restore. Journal is scoped. Ordinary Undo never calls remote DELETE; accessible users explicitly finish the pending delete. Multiple rows retain separate controls.
- Reward storage: one transactional garden document with activation timestamp, action intents and unique claims. Plant selection stages exact identification/revision before HTTP and reconciles recorded selection on restart. Corrections share photo evidenceKey; animal intent precedes provider call and a locally saved result completes it without paid resubmission. Planting/care uses frozen idempotent observation input. No historical query-hydration awards.
- Reward day: fixed active zone and next calendar midnight; re-evaluate on resume/action. Monotonic observed-time watermark prevents rollback from reopening consumed day state; the next scheduled boundary adopts changed timezone. 100 XP/level, one level/day, no overflow banking, Pollen continues. Offline manual forward-time manipulation is not tamper-proof.
- Guest relay: decoded 2 MB/20 MP, cleaned JPEG, bounded concurrency/deadline/IP rate; Firestore transaction maintains a shared UTC-day budget and immutable operation receipts. Kindwise/provider-account hard limit remains a production configuration prerequisite. No app image persistence or implicit paid retry. Reply expiry seven days; receipt deletion policy remains an explicit enablement gate.
- Sources: see [final matrix/setup](sources-and-provider-setup.md) for exact docs, sample, access, rights, retention and limitations; [photo credits](../assets/images/species/attribution.json) for individual images. Region choices are NC USA/Other/Skip; no universal native/invasive/local-abundance promise. Dataset is versioned with the app; no remote catalog cache needed.

| Screen          | Important state behavior                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home            | Empty garden welcomes with Search/Scan; initial quest uses bundled data; failed collection refresh preserves prior recent items. Local storage failures are visible.                                             |
| My Garden       | Plants/Pollinators switch; private query loading/error stays distinct from no match; last deletion becomes empty state plus Undo; pending items suppressed in all relevant views.                                |
| Capture/preview | Permission denied → gallery; camera not ready disables shutter; preparation failure retains original; Retake clears only unsubmitted attempt; uncertain submitted work stays frozen; legacy mode defaults Plant. |
| Search          | Empty query → recents/Clear; debounce loading; no match → Scan; bundled limited coverage usable offline; image failure → illustration; no invented quota failure for local content.                              |
| Profile         | Unknown taxon → honest ecology/care gaps; known data has visitors, optional lifespan and one Care expansion; no-photo catalog save uses stable key; signed-in mutation failure retains retry intent.             |
| Bug result      | Unsupported/low-confidence/missing role → Not sure; sting caution visible; offline/API unavailable keeps photo/Identify later; save separate; links resolve or search.                                           |
| Quests/avatar   | Local bootstrap/no account; storage error shown; level cap leaves garden/Pollen useful; insufficient balance disables purchase; owned/equipped explicit; reduced motion static.                                  |
| Settings        | Always reachable header route; guest sees appearance/language plus sign-in explanation; existing account deletion/reminders remain signed-in only.                                                               |

Independent milestones have automated/web evidence in [implementation review](implementation-review.md). Native/manual and live-provider gates stay blocked; no unavailable gate is marked complete by a mock. No dependency was added, so no package-level replacement justification or upgrade is required.
