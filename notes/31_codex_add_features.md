# Codex implementation prompt: Plantopedia pollinator features

Implement the following in the existing repository. This is an extension of the real Expo application, not a new starter, web mockup, or redesign from scratch. Keep the working name **Plantopedia**; renaming is a separate decision.

## Role and outcome

You are a senior React Native engineer and product designer working with a youth team. Help people with no biology background choose, understand, plant, and care for plants that support local bees, butterflies, and other pollinators. Deliver five connected features with a vivid botanical identity, accessible liquid glass controls, and simple, reliable interactions.

Preserve the contributors' intent:

- **F5 — Photo retake and collection deletion:** Julian.
- **F4 — Plant profiles:** Ansha's visible pollinators, Ashlyn's care button, and Anya's perennial/seasonal explanation.
- **F2 — Name search and comparison:** Talon's search; Ashlyn/Alex's reference photos and traits.
- **F3 — Pollinator identification:** Ollie.
- **F1 — Rewards:** Julian's points, avatars, and quests; Talon's one-level-per-day limit.

Build in this order: **F5 → F4 → F2 → F3 → F1**. Plan the guest/local compatibility prerequisite explicitly; although it reuses existing layers, it is meaningful work because the current app requires authentication. Deliver it in tested increments with these slices. Leave the app usable after each slice, and resolve its blocker/major findings before advancing.

## 1. Repository grounding: verify before changing code

The following describes the inspected repository on **2026-11-01**. Re-read the relevant files and installed versions; source and the lockfile take precedence over older notes. Record differences in discovery rather than assuming this snapshot is permanent.

| Area                   | Existing implementation and entry points                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime                | Expo SDK 57 (`~57.0.29` in the manifest), React Native 0.86.3, React 19.2.3, TypeScript 6, Expo Router. Root `package.json` uses npm workspaces for `server` and `packages/contracts`, Node `>=22.13 <23`, and npm 12.0.2. Read resolved versions in `package-lock.json`.                                                                                                                              |
| Root/session           | `src/app/_layout.tsx` creates the QueryClient, preferences, Clerk auth gate, and owner-keyed `SessionProvider`. Currently signed-out users see `WelcomeScreen`; a missing public configuration also blocks entry. `src/services/session.tsx` owns authenticated API/voice resources and deletion reconciliation.                                                                                       |
| Navigation             | `src/app/(tabs)/_layout.tsx` currently exposes **Explore, Plants, Scan, Settings, Ask** in a floating glass bar. `src/theme/navigation-layout.ts` shares safe-area and font-scale geometry with screen scroll clearance.                                                                                                                                                                               |
| Home and collection    | `(tabs)/index.tsx` shows a botanical hero, Scan, Ask, and recent plants. `(tabs)/plants.tsx` searches **the user's saved collection** through `POST /v1/search` and filters owned/observed plants. This is not a general species catalog.                                                                                                                                                              |
| Capture                | `(tabs)/scan.tsx` re-exports `src/features/capture/CaptureScreen.tsx`. Camera/gallery → retain original locally → metadata-free derivative → editable draft → explicit Save → saved plant profile. `CaptureSteps.tsx`, `prepare.ts`, `metadata.ts`, `resume.ts`, and `services/outbox.ts` protect recovery and immutable submitted payloads. There is no immediate Retake/Use Photo step yet.          |
| Identification         | `src/features/identification/IdentificationPanel.tsx` runs identification **after saving**, compares candidates, records a deliberate selection/correction, and preserves evidence/confidence. `server/src/providers/plantnet.ts` calls Pl@ntNet with a deadline and maps up to three candidates. Existing candidates contain names, score, and nullable taxon ID, not reference photos or trait data. |
| Saved plant profile    | `src/app/plants/[plantId].tsx` already supports private photos, identification, Ask, notes, a timeline, and deletion under More options with a confirmation dialog. Extend this profile; preserve those capabilities.                                                                                                                                                                                  |
| Deletion               | Settings contains **account deletion**. Individual plant deletion already exists in the profile. `server/src/application/plants.ts` tombstones and cascades deletion through photos, tasks, memory, proposals, and affected conversations; it is not a reversible delete endpoint.                                                                                                                     |
| Contracts              | `packages/contracts/src/index.ts` contains Zod schemas and inferred types for `Plant`, `Candidate`, `Identification`, `PlantDetail`, `Observation`, `Task`, preferences, and API inputs. Existing `Plant.lifecycle` means **draft/saved**, not botanical lifespan.                                                                                                                                     |
| Device persistence     | `src/services/local.ts`: SQLite drafts/cache and persistent original files, all owner-scoped. `local-schema.ts` defines recoverable capture stages. `local.web.ts` uses in-memory maps and explicitly provides a preview, not durable browser storage. Preferences and collection-history have separate platform storage adapters.                                                                     |
| Backend                | Existing TypeScript/Express API in `server/src/http/app.ts`, application services and injected ports, Firebase Admin/Firestore/private Storage. `/v1` has bearer verification and owner-scoped access. Preserve its security boundary. Existing research uses Tavily/OpenAI; identification uses Pl@ntNet. None is automatically a structured botanical database or an insect classifier.              |
| UI                     | `src/components/ui.tsx` provides `Screen`, `Card`, `Action`, `IconButton`, `Field`, `Chip`, `Disclosure`, feedback, empty states, and dialogs. Reuse `PageHeader`, `PlantCard`, `CandidateCard`, `PrivatePhoto`, and `AppIcon` where their semantics fit.                                                                                                                                              |
| Theme                  | `src/theme/preferences.tsx` contains light/dark palettes and typed localization. `GlassSurface.ios.tsx` capability-checks native glass and Reduce Transparency; `.web.tsx` checks transparency/contrast preferences and CSS support; the base implementation is an opaque themed surface. Reuse these platform implementations.                                                                        |
| Accessibility/motion   | `src/theme/use-reduced-motion.ts` and `.web.ts` already exist. Icons are Ionicons through `AppIcon`; the icon itself is decorative, so the containing action must supply its meaning.                                                                                                                                                                                                                  |
| Other working features | Ask, text/continuous voice, evidence references, task proposals/reminders, native audio module, account preferences, and seven locales already exist. Preserve their routes, consent, cleanup, and authorization.                                                                                                                                                                                      |
| Verification           | Jest/SWC server/unit suites, Supertest HTTP tests, and Jest Expo/React Native Testing Library component suites. Read the existing capture, recovery, identification, profile, session, auth, isolation, navigation-layout, metadata, and bundle-secret tests. Native end-to-end automation is not established by these suites.                                                                         |

Read `README.md`, `notes/architecture-decisions.md`, `notes/implementation-status.md`, `notes/ui-display-review.md`, and `notes/phone-capture-recovery.md` for context. Notes contain historical hosting/build details; do not treat a dated success as current device evidence. Inspect actual source before following older setup instructions.

Start with `git status --short` and applicable `AGENTS.md` files. Preserve unrelated edits, including existing notes. Do not read secret-bearing `.env` values into logs, rewrite the application, change frameworks, upgrade the Expo major, replace providers wholesale, or alter deployment topology as a side effect.

## 2. Product rules and decisions that resolve the original brief

### Keep it small and mission-driven

1. Choose the fewest screens, taps, dependencies, and models that satisfy this prompt. Share a species comparison card and profile body across entry paths.
2. Lead with photo, name, and pollinator value. Disclose care, evidence, and secondary actions behind one clear tap. Keep paragraphs short and explain biology terms.
3. Pair clear labels with icons, color, badges, meters, and restrained animation. Emoji in this brief express intent; use the existing icon system and intentional illustrated assets in the product.
4. Reward real discovery and care. No leaderboards, accounts for rewards, social feed, ads, real-money purchases, streak penalties, notifications for re-engagement, or endless reward screens.
5. Distinguish **unknown** from **negative**, a **species** from a **saved specimen**, and an **identification suggestion** from a confirmed observation.

### Account-free access without breaking the existing app

The requested no-account/device-first experience is a **new requirement**, not a description of current behavior. Implement a minimal local guest path for these five features while preserving existing signed-in Clerk/Firebase behavior.

- A fresh install can enter Explore and use local garden, search, profiles, capture, sightings, and rewards without a Clerk account. Do not gate these flows on a Clerk publishable key. Offline local features must open even if the API is unavailable.
- Keep Clerk sign-in available for the existing cloud collection, Ask/voice, and account functionality. Clearly explain when an existing cloud feature requires sign-in; do not imply guest Ask/voice works.
- Represent guest versus signed-in scope explicitly. A device-local guest identifier is a storage namespace, never a server bearer token or fabricated Clerk user. Keep query keys, drafts, files, reward ledgers, and pending deletes isolated by scope.
- Reuse the existing local storage primitives with small typed adapters. Avoid a parallel app, a universal repository framework, or automatic guest-to-cloud migration. Signing in does not silently upload or merge guest photos/progress; switching scope must not leak another collection.
- Keep guest records local. Online guest identification sends only the explicitly approved, cleaned image to a narrow server relay and its selected provider, not to the existing owner collection. Public catalog/identification routes must be distinct and allowlisted; never bypass the current `/v1` authentication middleware for private routes.
- Design guest relays with bounded request/image sizes, deadlines, quota/abuse controls, and a total provider-budget limit that cannot be bypassed simply by resetting a local ID. Do not persist guest images or send them to training, analytics, or app traces. Verify the provider's retention terms and describe unavoidable provider/host processing accurately.
- Do not claim zero personal-data processing: existing Clerk sign-in handles identity, and photos may contain people or identifying context. Collect no **additional** names, birthdays, contact information, precise location, or behavioral analytics for these features. Keep the local avatar entirely unrelated to an identity profile.
- Request camera/gallery access only at use. Before the first external image submission, explain in plain language that the image leaves the device for identification; keep an offline/save-locally choice. Preserve consent on subsequent deliberate submissions without repeated blocking dialogs.
- For locality, use an optional manually selected broad region inside the relevant information disclosure, with a skip path. No GPS permission, coordinates from EXIF, IP-derived locality, maps, or assumed region from the developer's timezone. If no region is chosen, say local abundance is unavailable.

Document this compatibility work in the plan and verify guest/auth isolation early. Keep it to what these five features require. If a real external capability cannot be enabled with available access, finish independent work, record the exact dependency, and mark that acceptance item blocked rather than replacing it with a pretend classifier.

### Honest biology and reference content

- `Plant.lifecycle` stays draft/saved. Add a separate species field such as `lifeCycleType` for annual, biennial, perennial, mixed/region-dependent, or unknown. “Seasonal” is not a universal botanical synonym for annual. Explain dormancy and climate dependence where relevant without forcing a false binary.
- Pollinator-friendly, native, locally suitable, and non-invasive are different claims. Show the positive badge only with supporting evidence. Do not recommend a species for planting in a region where known invasive status makes that inappropriate; attach a concise region-specific caution when supported.
- “No known pollinator value” requires evidence; missing data means “Pollinator information isn't available yet.” A visit to a flower is not automatically proof of pollination. Keep adult nectar visits and caterpillar host relationships distinct in the source data and copy.
- Identification confidence does not establish ecological role, safety, or local abundance. Do not translate a provider score into a calibrated probability of correctness. Define provider-specific display thresholds and an uncertainty margin; reuse existing plant thresholds only for the existing plant provider.
- Use practical, source-backed care guidance qualified by season, soil moisture, and climate. A care check-in means “I checked this plant,” not an instruction to water daily. Fertilizer can be unnecessary; do not invent a schedule or encourage overwatering to earn rewards.
- “Always three traits” must not cause fabricated data: complete catalog entries should have 3–5 sourced comparison traits; incomplete external results show the known traits and one honest missing-data message. Unknown slots, names, and confidence scores do not count as botanical traits. Make this explicit exception visible in acceptance evidence.

## 3. Visual direction: evolve Plantopedia's liquid glass language

Keep the existing calm botanical foundation and make discovery more vivid through photography, small pollinator illustrations, warm reward accents, and tactile controls. The app should feel like the same product on every screen.

### Tokens and surfaces

- Preserve the palette's anchor colors: light canvas `#F4F7F3`, surface `#FFFFFF`, text `#14241B`, green `#166534`; dark canvas `#101C16`, surface `#1D2C23`, text `#F3FAF4`, green `#A8E6A3`. Retain the existing water and sun accent character from `IconBadge`.
- Centralize shared color, spacing, radius, typography, elevation, motion, and semantic additions in the existing theme layer. Extract repeated values only where needed. Define light/dark tokens for pollinator success, uncertain/info, sting warning, destructive actions, Pollen, and Basic/Rare/Mythical tiers. Migrate touched components; avoid an unrelated whole-app restyle.
- Use a 4/8-based spacing rhythm consistent with existing 12/16/20/24 gaps, 24–30 point card/glass corners, and 16–18 point controls. Preserve the centered content width and responsive safe-area behavior unless the actual flow needs a documented adjustment.
- Use **glass for the floating navigation, search/toggle controls, compact header rewards, and small action surfaces**. Put detailed care text, trait comparisons, and result content on readable solid or sufficiently opaque surfaces. Avoid stacked glass over glass and text directly over busy photos.
- On supported iOS, keep both native capability checks and Reduce Transparency in `GlassSurface`. On Android/unsupported iOS, retain the high-quality opaque fallback. On web, preserve CSS capability checks and reduced-transparency/high-contrast fallback. Do not imply native liquid glass is available everywhere or add a new blur library to imitate it.
- Avoid opacity animation on native `GlassView` or its ancestors; check the installed SDK's supported glass animation options. Animate an ordinary child/overlay or use a stable surface where appropriate. Never make tap targets disappear as a side effect of glass styling.

### Composition and interaction

- Home: concise botanical header; rewards chip when F1 lands; one search entry and one Scan entry of equal visual prominence; one daily quest preview; recent garden items. Keep the first meaningful action visible on a small phone.
- Search/comparison card: identifiable reference photo, common name, quieter scientific name, evidence-backed pollinator badge, then 3–5 wrapping trait chips immediately below the photo. Mark reference photos as reference images, not the user's photo.
- Plant profile: generous uncropped evidence photo, name/status/lifespan badges, visible labeled pollinator row, one clear Care disclosure, and Save/Planted/Share actions. Move the existing identification/history tools below the core information without removing them.
- Bug result: photo and name, a large **Pollinator / Not a pollinator / Not sure** badge with a distinct symbol and words, a plain confidence label, then safety when applicable. Details and plant links expand below.
- Quests/rewards: one compact summary and a small avatar collection/shop. Use bright nature accents sparingly, readable locked states, explicit costs, and friendly progress without pressure.
- Use Ionicons through `AppIcon` for general UI. Add only the small coherent illustrated set needed for bee, butterfly, hummingbird, moth, beetle, and the chosen avatar. Reuse available licensed assets; record creator/license for new assets. No emoji-only navigation or invented glyph substitutes. Do not mislabel one animal illustration as another.
- Route new copy through `usePreferences().t` and the existing typed dictionaries for English, French, Spanish, German, Simplified Chinese, Japanese, and Korean. Keep user-authored names unchanged, format dates/units with the active locale, and make localized status/trait labels wrap rather than clip. Do not add an unrelated translation framework.
- Body/action text is at least 16 points; secondary metadata may follow the existing smaller type scale if readable and scalable. Use platform fonts, clear hierarchy, and wrapping labels. Do not shrink labels to force a layout.
- UI motion ≤300 ms; one nonblocking reward burst ≤1.2 s. Respect `useReducedMotion`, avoid looping idle effects, and replace Mythical animation with a static expressive state when motion is reduced. Haptics are optional device feedback with a safe unsupported fallback, never the sole success indication.

### Accessibility is part of the design

Meet AA text contrast (4.5:1 normal, 3:1 large) and 3:1 meaningful control/graphic contrast. Measure rendered glass against representative light/dark photo backgrounds; token contrast alone is insufficient. Use opaque backing when contrast is uncertain.

Provide ≥44×44 point targets, font scaling, logical screen-reader order, semantic selected/expanded/disabled states, visible keyboard focus, and labels on icon actions. Use words plus symbols for verdicts and rarity. Announce reward/delete status politely once. Ensure every swipe action has a visible menu/edit alternative and screen-reader action. A modal must move/restore focus, dismiss predictably, and avoid trapping a user behind the keyboard. No meaning depends on color, haptics, or animation alone.

Verify at 320-point width, a normal phone, a larger phone/tablet, and web; test long translations, large text, keyboard, safe-area insets, Reduce Motion, Reduce Transparency, and both themes. Do not force new orientation support: the app currently locks portrait; test resize/remount and any existing tablet/web orientation behavior.

## 4. Navigation: fewer destinations, preserve existing capabilities

Use the current Expo Router and floating glass navigation. Target **four labeled tabs: Explore · My Garden · Scan · Ask**. Scan is the visually emphasized camera destination in the existing bar; avoid a second overlapping floating camera button.

- Explore retains `/`; My Garden retains `/plants`; Scan retains `/scan`; Ask retains `/ask`.
- Move Settings out of the tab bar into an obvious labeled header/menu action. Keep `/settings`, `/tasks`, login/callbacks, and existing profile links working. Do not rename URLs solely to change tab labels.
- The compact Pollen/level chip opens one **Quests & avatar** sheet or stack screen. Keep the shop inside that surface; do not create separate tabs for quests, avatars, rewards, and profile. Existing task reminders remain distinct from game quests.
- My Garden uses a labeled Plants / Pollinators spotted switch within the screen. Preserve the existing saved-collection search and owned/observed filters for plants.
- A dedicated catalog search route is appropriate; it must not replace `/v1/search` or silently combine private notes and public species results.
- Use one shared species profile body with thin route adapters: keep `/plants/[plantId]` for a saved specimen and add a catalog species route keyed by a validated stable ID. Never treat a species ID as an owned plant ID or pass arbitrary objects as route parameters. Pollinator links resolve to that species profile or a prefilled catalog search.
- From Home, each feature's **entry point** is reachable in ≤2 taps. Measure full task paths separately; opening a profile, scrolling, and expanding care are not all one tap. Preserve sensible back behavior and deep-link reloads.
- Update shared navigation clearance with the bar so content, snackbars, the Ask composer, camera shutter, and VoiceDock cannot cover one another. Do not break active voice cleanup when routes change.

The planning document must include actual before/after route maps and annotated wireframes for Home, My Garden and its switch, capture preview/mode, search/results, the shared profile, bug result, Quests/avatar, and affected Settings access. Include all important empty/loading/error/offline/uncertain states.

## 5. Architecture and data rules

### Extend the existing boundaries

Use ordinary TypeScript functions/hooks, React state for transient UI, TanStack Query for remote query state, shared Zod contracts for API/domain validation, and the existing platform storage adapters. Do not add Redux, a second router, a new backend, or a generic event bus.

Keep provider clients and secrets on the server. Use a small catalog/ecology domain service and a separate animal-identification port/adapter alongside the current plant provider. Add only the narrow HTTP endpoints needed; validate responses, bound concurrency, cache safely, cancel stale searches, and enforce timeouts. Authentication failures must never fall back to public access to private photos.

Retain `ALLOW_LIVE_PROVIDERS` semantics, explicit fake/test mode labeling, sanitized errors, and idempotent operation keys. Do not automatically retry a possibly billable identification with a new key after a lost acknowledgment. A deliberate retry must explain an uncertain outcome and preserve the photo.

### Minimal typed extensions

Finalize names in the plan; these are responsibilities, not a mandate for a class hierarchy:

| Model                   | Responsibility                                                                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing `Plant`        | A particular saved plant and its evidence/history. Preserve current fields and semantics; allow a catalog-origin plant without requiring a photo or fabricated identification.                        |
| `SpeciesReference`      | Canonical provider-namespaced species identity, accepted scientific/common names, aliases/synonyms, and source IDs. Reuse in plants, sightings, links, and reward deduplication.                      |
| `PlantSpeciesProfile`   | Reference image with attribution, typed traits, botanical lifespan, sourced pollinator relationships/status, and optional care/ecoregion context. Separate from a personal specimen.                  |
| `Pollinator` / sighting | Taxon reference, local photo reference, observed time, ID provider/evidence/confidence, three-way ecological verdict, and saved state. A bug sighting must not create a fake `Plant`.                 |
| `SavedItem`             | A small discriminated reference/envelope for the garden's plant or sighting. Reuse existing plant IDs and storage rather than duplicating the entire collection.                                      |
| `UserProgress`          | Spendable Pollen balance, lifetime earned amount, level/XP, reward-day state, unlocked/equipped avatar IDs, and durable reward/claim deduplication. It is local progress, not a new identity account. |
| `Quest`                 | Static definition plus small scoped completion state. No server-generated quests or scheduler needed.                                                                                                 |
| Pending deletion        | Scope, item ID/kind, deadline, and pending/committing/retry status sufficient to survive a restart and support undo before destructive work.                                                          |

Store stable taxon identity independently of display names and saved-item IDs. Prefer a resolved accepted-species ID with aliases; normalize names only as a documented fallback. Never award species discovery for unresolved genus/family guesses, gibberish/manual names, or a provider timeout. Plant and animal IDs must be namespaced to avoid collisions.

Migrations must be additive/versioned and validate old persisted records. Read the existing SQLite initializer before adding a version bump; do not unconditionally reset `user_version`, wipe tables, or silently discard existing drafts. Give old draft mode a plant default; never change the meaning of frozen submitted captures. Keep local and HTTP contract migration tests.

Native SQLite/files are the durable acceptance target. For new local progress and guest metadata on web, implement the smallest durable browser adapter if feasible, with quota/storage-denied handling. Clearly state that existing browser photo drafts are currently ephemeral; do not claim reload-proof photos without implementing persistent image storage. Browser preview limitations cannot masquerade as native persistence results.

### Sources, evidence, and licensing

During discovery/planning, verify current official documentation and actual access before selecting new services. Reuse the provisioned plant/research integrations where they meet the job; do not assume they supply every needed field. If the environment provides an integration-discovery/marketplace workflow, run its read-only discovery before choosing a new provider. Provision/configure real integrations through the approved environment rather than hardcoding a new vendor SDK. Do not purchase plans or expose credentials to satisfy a demo.

Produce a source matrix with: capability, selected source and exact docs, schema/sample response, actual access status, coverage, confidence limitations, license, per-image attribution, cache/redistribution rights, retention/privacy, quota/cost, and unavailable/offline behavior. A source being publicly readable does not grant blanket image reuse rights.

- **Plant ID:** retain the existing Pl@ntNet adapter and evidence workflow. Its current mapping does not supply all catalog fields. Inspect its official API and image terms rather than assuming a name-search or image-license contract.
- **Names, photos, traits, and care:** choose the smallest lawful source combination. A modest, bundled, genuinely sourced species catalog is valid production offline content, not fake API success. Include sunflower and enough verified examples to exercise every required state; document its limited coverage. Use approved reference assets or a local illustration when images cannot load or be licensed.
- **Ecology:** use curated authoritative/extension/conservation evidence for relationships and regional suitability. A typed local dataset can be simpler and more trustworthy than generating these facts at runtime. Do not ship unsourced model-generated trait or care fields as verified facts.
- **Bug/animal identification:** use **Kindwise insect.id**, selected by the user on 2026-11-01; the separate product key is configured privately on the server. Verify actual access without printing its value. Verify its official input/response contract, retention/training terms, quotas, and taxonomic coverage before enabling live submissions. Do not request keys in chat or substitute a different vendor without a concrete reason. Do not route insects through Pl@ntNet or assume the existing free-form photo reasoning method is a reliable species classifier. This invertebrate classifier cannot promise bird/bat identification. Missing access remains an explicit live acceptance dependency while independent local work continues.
- **Explicitly requested provider failover:** when Kindwise insect.id or Pl@ntNet reports errors, exhausted credits, quotas, timeouts or invalid responses, make one bounded server-only OpenAI Responses image-interpretation request using exactly **`gpt-6.1-sol`**. Reuse the operation receipt/key and cleaned image; disable SDK retries, validate strict structured output, retain answering-provider/failure provenance, preserve the photo on failure, and never silently substitute a model or return synthetic live success. Valid no-match/low-confidence responses do not spend a fallback call. Local validation, auth, budget and storage failures cannot dispatch fallback.
- **Fallback honesty and documentation:** display OpenAI output as an unverified best guess without a fabricated confidence percentage or resolved taxon ID; keep uncertain ecological roles/safety uncertain and award no species-discovery points from these guesses. Disclose OpenAI as a possible image recipient before submission. Explain possible charges from both providers, deadlines, idempotency, retention and enablement gates fully in `README.md` and `docs/identification-failover.md`; provider keys alone do not waive the privacy requirements. Verify actual model/image access with a controlled licensed image and label injected failures accurately. The separately provisioned plant.id key does not silently replace the existing Pl@ntNet primary.
- **Local commonness:** use appropriately scoped, dated data only if its limitations support the statement. Observation counts alone are not population abundance. Otherwise show “Local commonness isn't available” and a sourced general fact; do not infer rarity from a game tier or scan frequency.
- Cache nonpersonal catalog data by canonical species/locale/region and source version with a finite freshness policy. Keep private photos and guest queries out of shared caches. Bound recent searches and store them locally with a clear action to erase them.

Starting references to recheck, not preselected contracts:

- [Expo SDK 57 GlassEffect](https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/) — installed-version API and platform fallback guidance.
- [Pl@ntNet developer documentation](https://my.plantnet.org/doc/openapi) — current API and linked image/usage terms.
- [Xerces regional pollinator-friendly plant lists](https://www.xerces.org/pollinator-conservation/pollinator-friendly-plant-lists) — examples of region-specific plant and pollinator relationships; verify reuse rights.
- [U.S. Fish & Wildlife Service regional garden guide](https://www.fws.gov/story/top-plants-your-pollinator-garden) — a regional starting reference, not a universal care API.

## 6. Required work process

### Phase 0 — Discover

Before implementation, write `docs/discovery.md` with file-linked evidence for the actual architecture, routes, captures/identification, provider calls, data ownership and persistence, auth boundary, theme/assets, localization, test/build commands, and known limitations. Include the differences between this brief's original assumptions and current code. Inspect representative existing tests; do not infer behavior from filenames alone.

Record a baseline of relevant checks and any pre-existing failures. Review existing screen captures where available, or capture the running app if feasible without changing real user data. Label source inspection versus visually observed behavior. Read the current design before adding surfaces.

### Phase 1 — Plan

Write `docs/implementation-plan.md` containing:

1. Before/after route map and per-screen wireframes with state/interaction notes.
2. A concrete token/component reuse plan and the minimal new components, including any shared comparison card, verdict/status badge, pollinator row, care panel, pending-delete snackbar, and progress summary.
3. Guest/signed-in boundaries and private/public endpoint contracts; how old data/drafts remain readable.
4. Data models, source matrix, migrations, attribution UI, caching and error behavior.
5. Exact undo state machine, species deduplication/reward rules, daily/timezone behavior, and app-kill recovery.
6. F5 → F4 → F2 → F3 → F1 milestones, prerequisites, affected files, tests, measurable acceptance, and risks.
7. Each proposed dependency and why existing capabilities are insufficient. `expo-haptics` or a supported gesture library may be justified; neither is already a direct dependency. Prefer existing Reanimated/React Native capabilities for small animations; avoid a confetti package solely for one burst.

### Phase 2 — Adversarial plan review

Write `docs/plan-review.md`. Review the plan through all of these lenses; a structured self-review is sufficient and does not require multiple agents:

| Reviewer                | Questions to resolve                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Simplifier              | Can a screen, dependency, setting, or abstraction be removed? Are species cards/profile bodies shared?                                         |
| First-time 10-year-old  | Are Search and Bug mode obvious in under 30 seconds? Are action labels understandable? Does the first quest lead outdoors?                     |
| Grandparent             | Is text scalable, jargon explained, care useful, and the next planting action clear?                                                           |
| Mission skeptic         | Do points support discovery/planting/care? Can duplicates, delete/re-add, corrections, or refreshes farm rewards?                              |
| Accessibility auditor   | Are glass contrast, screen-reader flow, no-swipe alternatives, large text, focus, motion, and undo timing usable?                              |
| Privacy/safety reviewer | Are guest/cloud boundaries real? Are upload disclosures truthful? Is location optional and coarse? Are sting warnings cautious?                |
| Failure hunter          | What happens offline, on timeouts/429s, unknown taxa, stale searches, missing facts, last-item deletion, account switching, and process death? |

For each finding record severity **blocker / major / minor**, affected requirement, evidence, fix, and verification. Revisit the plan until no blocker/major design findings remain. Continue implementation after review without an unnecessary approval pause; ask only for information or external access actually needed.

## 7. F5 — Retake photos and delete garden items safely

**Goal:** recover from a bad photo immediately and remove saved items directly from the collection.

### Photo preview

- Add an immediate preview after camera capture/gallery selection, before details or remote submission, with labeled **Retake** and **Use photo** actions. If a separate Delete label is helpful, its consequence must be identical and clear; do not create two confusing destructive buttons.
- **Retake takes one tap back to the live camera** when permission is already granted. Clear only this unsubmitted attempt's transient files/state. For a gallery selection, offer the same camera retake; gallery remains available if camera permission is denied.
- Use photo retains the existing original/cleaned-derivative guarantees and continues into the existing details/save flow. Do not silently run paid ID on capture or selection.
- Maintain the camera-ready guard, denied permission fallback, no double capture/save, and cleanup on route blur/unmount. Preserve an active draft if preparation fails.
- A draft that has already been submitted is an immutable retry snapshot: never “retake” it by reusing its IDs with different bytes. Offer a fresh attempt while preserving uncertain submitted work for reconciliation. Do not purge a sole original after a lost acknowledgment.

### Saved collection deletion

- Swipe left to **reveal** a red labeled Delete action; tapping it removes the row. A full swipe may delete directly only if predictable and accessible. Supply a visible overflow/menu or edit action and a screen-reader delete action; long press alone is insufficient discoverability.
- Use one deletion coordinator for collection and existing profile deletion. Individual-item deletion uses immediate optimistic removal and an **Undo** snackbar, not a blocking confirm dialog. Keep the separate account-deletion confirmation in Settings.
- **Do not call the current destructive server DELETE and then fake undo.** Persist a scoped pending-delete record before hiding the item. Default grace is about five seconds; keep its data/files, suppress it from all affected local/query views, and cancel its pending operation if Undo is chosen.
- Account for assistive technologies/time-to-respond preferences with a documented longer or non-expiring accessible undo opportunity. Position the snackbar above navigation/keyboard, preserve focus, and announce it once. The ordinary tap path must remain fast.
- Only after the grace deadline may authenticated items call the existing cascade delete. Purge originals/cache after acknowledgment or authoritative reconciliation, not before. Guest-local records finalize locally. Persist deadline/state so process death, backgrounding, a second deletion, or navigation cannot lose pending work or resurrect an item.
- On restart/resume, recover pending operations: unexpired ones can still be undone; expired ones finalize or wait for connectivity. Handle 404/410 as already deleted where appropriate. A timeout remains pending/retryable; a permanent failure is visible with a recovery action. Do not report a remote deletion complete based only on hiding a row.
- Cancel conflicting draft writes and guard sync-status reconciliation during the undo window. Scope/account changes stop dispatch from the previous scope. Do not commit an old account's queue under a new account's credentials.
- Multiple deletes need independent undo state or a clearly labeled small batch; replacing one snackbar must never silently remove another undo opportunity.
- Deletion never subtracts already earned rewards. The species reward ledger survives item deletion and re-addition. Explicit clearing of all local progress is a separate privacy operation, not the Delete item action.

**F5 acceptance**

- Camera capture → Retake → live camera is one tap with no restart. Camera-denied/gallery cases stay usable.
- Delete is at most two taps through the visible menu, or a swipe plus delete tap; an optional full-swipe path is one gesture. Both restore correctly through Undo.
- Undo makes **zero destructive server calls** before expiry. Restart/offline/account-switch tests demonstrate the state machine and data retention.
- Existing saved items, draft recovery, private photos, cloud cascades, and account deletion still work.

## 8. F4 — One shared plant profile for pollinators and care

**Goal:** immediately answer “Does this help pollinators?” and reveal “How do I care for it?” in one tap.

1. **Hero:** photo/approved illustration, common/scientific names, evidence-backed pollinator status, and botanical lifespan badge where known. A tappable explanation says “Comes back each year” or “Usually grows for one season,” with biennial/climate-dependent cases expressed honestly. Preserve `contain` for user evidence images and intentional cropping only for reference thumbnails.
2. **Pollinators visible by default:** labeled bee/butterfly/hummingbird/moth/beetle visitors as supported by sources. This section precedes identification tools, chat, and timeline. Show the honest negative or unknown state; do not fill empty relationships with generic icons.
3. **One Care disclosure:** water guidance and a labeled low/medium/high meter; sun guidance with hours/range only when sourced and full/partial/shade icon; fertilizer advice including “usually unnecessary” where appropriate. Optional soil, bloom, and mature size when known. Hide missing individual care fields rather than display N/A. If all care data is absent, show one concise explanation.
4. **Actions:** Save/Already saved, I planted this/Planted, Share. A catalog profile can be browsed and saved **without any photo**. Save is idempotent for that catalog species in the current scope; do not delete or coalesce existing distinct specimens. I planted this creates/uses a saved record once and stores a real planting check-in for F1 to consume later. It must not merely change ownership from observed to owned and pretend that proves planting.
5. Add a small explicit care-check action under Care, such as **I checked this plant**, with an optional appropriate detail such as soil checked/watered when needed. This is the real action required by the later care quests; use the existing `Observation`/`care_event` capability where suitable.
6. Keep existing identification selection/correction, photo evidence, Ask, notes, timeline, and More options available on saved specimens. Catalog pages do not show empty private history sections or pretend a photo identification occurred.
7. Share uses the OS share flow and species-safe public content or plain text. Never share an authenticated API image URL, bearer token, personal note/place, or inaccessible private plant link by default.

F4 may expose action events for later rewards; do not build or award F1 points early. Persist planting/care once so a later game integration can observe the same successful action without a duplicate write.

**F4 acceptance**

- Saved specimens and catalog species use the same visual profile body; old saved plants with no species mapping still open.
- The pollinator section is expanded without a tap and appears before secondary tools. At normal phone size, avoid a huge hero pushing it unnecessarily below the first viewport; large text may scroll naturally.
- Care opens with one tap. Known lifespan appears with a plain-language explanation; unknown does not become annual by default.
- Save from catalog needs no photo/ID run, repeated taps do not duplicate records, and planting/care check-ins survive restart.
- Missing data, sources/attribution, and region-dependent guidance render truthfully in both themes.

## 9. F2 — Search plants by name, compare photos and traits

**Goal:** someone thinking “maybe it's wisteria” can search and compare without taking a photo.

- Place a clearly labeled **Search plants** field/action beside the equally prominent **Scan** entry on Explore. A discoverable input must not look like static decorative text.
- Search a public species catalog by common/scientific name and aliases. Preserve the separate My Garden search of private saved content. Never send personal notes through catalog search.
- Debounce around 300 ms, bound query length/results, and handle request cancellation or response sequence checks so old responses cannot replace new ones. Avoid a large fuzzy-search dependency for a small bundled catalog; support straightforward typo tolerance and test examples such as `sunflwer`.
- Empty query shows a short local recent-search list with Clear, not a network request for every render. Include a direct Scan recovery path for no match.
- Each result has a reference photo or intentional local illustration, common/scientific name, sourced pollinator badge/status, and the shared comparison-trait component directly beneath the image. Use 3–5 known traits such as leaf shape, flower color, mature height, bloom period, and growth habit, with icons plus words. Apply the honest incomplete-data exception in section 2.
- Tap → shared catalog profile. Opening a result is a read, not a collection save or an identification confirmation. Only an explicit Save/Planted action writes a specimen.
- Enrich photo-ID candidates with the same reference/trait presentation while preserving original provider score, evidence photo, selection, manual correction, and ambiguity handling. Do not delay core identification on enrichment; show a bounded loading/unknown state per candidate.
- States: local recent searches, skeleton/loading with a reduced-motion alternative, stale cached content, no match, quota/provider failure, image failure, and offline. The offline catalog remains genuinely usable; label its limited coverage. Do not label connectivity errors “No results.”

**F2 acceptance**

- Home → result for `sunflower` in ≤3 taps plus typing, without a photo, sign-in, or collection write.
- Common name, scientific name, aliases and `sunflwer` return the intended sourced entry. Rapid query changes show the latest results only.
- Every result has a photo/illustration. Complete bundled entries and normal enriched results have ≥3 sourced traits; incomplete external candidates explicitly report the gap instead of inventing traits.
- Catalog result and photo candidate use a shared comparison presentation; private collection search still works independently.
- Search/profile access works offline for the bundled/cached scope, including on a fresh guest install.

## 10. F3 — Identify a pollinator from a photo

**Goal:** identify an observed animal when supported and explain its pollinator role safely.

- Extend the **one existing capture flow** with a labeled **Plant | Bug** segmented control. Plant remains the default. Explain in one short tip that Bug mode looks for pollinating animals and what its chosen provider actually supports. No second camera screen or duplicated preparation pipeline.
- Preserve mode in draft/recovery state. Do not switch the meaning of an in-flight submitted capture. Before submission, keep or discard the current photo predictably when changing mode; never silently reclassify a plant record as a sighting.
- Both modes share preview/Retake/Use photo and permission/metadata/privacy handling. Bug mode does not require a plant nickname, plant save, or fabricated plant/observation ID. Identify follows an explicit submission; saving to Pollinators spotted is a separate deliberate choice.
- First result layer: observed photo, best-supported name, **Pollinator**, **Not a pollinator**, or **Not sure** badge, distinct icon, and confidence wording such as “Likely match” or “Best guess.” The primary verdict must be understandable without expanding details.
- Low-confidence, genus/family-only, unsupported/non-animal, and conflicting-role cases remain Not sure with retake tips. Unsupported birds/bats from an insect-only classifier must not become “Not a pollinator.” Do not infer a negative verdict solely from missing relationship data.
- Show **Can sting — admire from a distance** for known stinging taxa. If a plausible uncertain candidate can sting, use cautious wording such as **May sting — admire from a distance**. Never encourage touching, trapping, disturbing nests, or approaching for a better photo.
- Expand for what it pollinates/visits, appropriately qualified local commonness, and a short sourced fun fact. Distinguish a general relationship from a direct species-specific claim. Every plant chip must open a verified catalog profile or a working prefilled search; use an honest empty state if no relationships are known.
- Save to **Pollinators spotted** with its observation and uncertainty intact. A saved uncertain sighting is allowed but earns no species-discovery reward until resolved through a qualifying identification. Repeat scans may create meaningful sightings but cannot farm first-species points.
- Offline, retain the local photo/draft and give a deliberate Identify later action. Do not submit paid work automatically upon reconnect or manufacture an ID. Provider failure leaves the image and retake path available.

**F3 acceptance**

- Home → Scan → Bug mode is ≤2 taps; capture and explicit submit are counted separately.
- There is one camera/preparation flow, and plant capture/identification still passes its existing tests.
- Verdict, confidence, and safety are readable without opening details; all three verdict states have different symbols and labels.
- Every relationship plant link resolves, including unknown-ID fallback to search. No local commonness claim appears without supporting region/time evidence.
- A real supported classifier has a verified response path. Tests use fakes; a missing key or unavailable service produces an honest unavailable state and remains an explicitly incomplete live acceptance item.
- Sightings, photos, and account scopes remain isolated and recover after restart on native.

## 11. F1 — Pollen, daily quests, levels, and avatar rewards

**Goal:** make real-world discovery and garden care satisfying without encouraging long sessions.

### One rules table and durable action receipts

Use one configuration file for point values, limits, XP thresholds, and avatar costs. **Pollen is spendable; XP/level and lifetime earned Pollen are separate.** Spending never lowers XP or level.

| Successful action                                                        | Pollen                                              | Eligibility / unique claim key                                                                                                                                                                               |
| ------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Discover a plant species by photo ID or opening a resolved search result | 5                                                   | Once per canonical plant species across both routes, aliases, and later delete/re-add. Not for suggestion impressions, query keystrokes, failed ID, or a free-text correction alone.                         |
| Identify a pollinator species                                            | 10                                                  | Once per canonical animal species, with sufficiently supported identity and positive ecological evidence. Not for uncertain/non-pollinator results or merely typing a species name.                          |
| Mark I planted this                                                      | 25, or 50 with supported pollinator-friendly status | Once per resolved species in this release, at most **three rewarded planting claims per local reward day**. Store the self-reported planting action; repeated toggles/new duplicate records do not re-award. |
| Attach an optional planting photo                                        | 5                                                   | Once per eligible rewarded planting claim, including if attached later. Reuse the safe photo flow, keep the image local unless separately submitted, and never award the base planting action again.         |
| Complete a care check-in                                                 | 5                                                   | Once per stable saved plant per local reward day. Do not reward edits/replays of the same check-in or recreating a catalog save to evade the limit.                                                          |
| Complete the daily quest                                                 | 20                                                  | Once per quest/day, based on qualifying persisted actions. The underlying action may earn its own listed points.                                                                                             |

Species deduplication applies to **first-discovery rewards**, not to legitimate care on later days or separate planting/quest reward categories. This corrects the overly broad “points are never awarded twice for the same species” wording. Each category has its own explicit receipt key.

- Award only after the underlying action is successfully durable. In local flows, update action/claim/progress atomically in SQLite when possible. In signed-in remote flows, write/recover a stable acknowledged action receipt before locally crediting; handle an app kill between remote success and local receipt. Do not award from render effects, repeated query fetches, or cache hydration.
- Use one small reward application function, unique durable claims, and serialized/transactional purchases; no generic event platform. Concurrent taps, replays, refreshes, ID corrections, and app restarts must not double-award or overspend. If a species is corrected, do not remove earned points or issue another discovery award for repeatedly relabeling the same evidence/action.
- Progress is local and scope-specific in this release, with no promise of cross-device sync. Do not back-award for all historical records on launch. Record an explicit activation baseline and consume subsequent qualifying actions consistently.
- The optional planting photo earns the configured 5-Pollen bonus once, never multiplied by pollinator status. Attaching it later uses the original planting claim's bonus key; only the new bonus contributes XP on the current eligible day. A photo documents a self-report, not verified planting. Do not add a photo-verification service, background upload, or new camera flow for the bonus.
- Retain only the minimal nonpersonal claims needed for deduplication after item deletion. Do not retain deleted photos or notes to enforce a game rule. Explain that clearing app storage/all progress resets local-only protection.

### XP and the daily cap

- Use the configured earned action amount as XP input; start with a simple **100 XP per level** threshold unless a documented usability finding justifies a different fixed value.
- At most one level can complete per **local calendar reward day**. Clip XP at that day's next-level boundary; discard overflow and stop XP progression after the level-up until the next boundary. Do not bank a hidden queue of levels for tomorrow.
- Pollen still accrues for eligible actions under their own limits, and collections/check-ins keep working after the XP cap. Explain “Today's level is complete. Come back tomorrow — go check on your garden!” without disabling useful plant care or suggesting all rewards are blocked.
- Compute local midnight as a calendar boundary, not by adding 24 hours. Persist the reward day's timezone, boundary, consumed claims, and last level-up. Re-evaluate on resume and on the next action; correctness must not rely on a mounted midnight timer.
- Keep the timezone fixed for an active reward day; apply a device timezone change at the next already scheduled boundary, then use the new zone for following boundaries. Moving the clock backward cannot reopen a consumed reward day. Use a persisted observed-time watermark/consumed-day state and a documented policy for detected clock rollback.
- Test DST's 23/25-hour days and travel changes. Be candid: an account-free, offline app cannot make manual clock advances tamper-proof. Use proportionate local protection and tests, not a surveillance/time-server subsystem or a claim of perfect anti-cheat.

### Quests and avatar shop

- Ship one deterministic daily quest plus a short static milestone list. Definitions live in a small typed data file. Every predicate corresponds to an implemented discovery, qualified pollinator sighting, planting, or care event.
- Prefer a first daily quest achievable without an account/network: for example **Find a plant that helps bees** by opening a sourced bundled species profile. Later daily quests can emphasize checking an existing plant or spotting/planting when prerequisites exist. Do not assign “water daily,” require a rare insect, or make missing network access render every quest impossible.
- A quest preview is visible on Home within **10 seconds of opening the local experience**, without visiting the shop or granting camera permission. Auto-complete/award a quest once; no extra Claim screen is needed.
- Milestones can include first pollinator planting and three distinct days of care. Track progress from durable receipts. Unless explicitly configured and reviewed, milestones unlock a badge/visual only; do not invent extra Pollen values beyond the table.
- Provide one friendly base bee/butterfly/sprout avatar and a small customization catalog. **Basic** uses solid colors, **Rare** gradients, **Mythical** a short on-demand sparkle/flutter. Each tier has a text label and distinct icon/color. No perpetual animated effects or randomness/loot boxes.
- The shop is a grid within Quests & avatar. Show preview, tier, cost, locked/affordable/owned/equipped states, and a clear purchase/equip action. Locked previews can be subdued but labels/costs must remain legible. Purchases persist and cannot create a negative balance.
- A compact header chip shows Pollen and level; tap opens Quests & avatar. Reward feedback is nonblocking, coalesces rapid rewards, and never repeats on rehydration. Use a ≤1.2 s pollen burst plus supported haptic feedback; the same result is understandable with no motion or sound.

**F1 acceptance**

- Restart preserves balance, claims, quests, XP/level, purchased/equipped items, and daily state. Spending affects balance only.
- Photo ID and search of the same species together award only 5 first-discovery Pollen; aliases, delete/re-add, corrections, and repeated scans do not farm discovery rewards.
- Planting and care limits hold across new duplicate save attempts, rapid taps, restart, and retries. Daily quest awards exactly once, including when an action completes both the quest and a level.
- At most one level completes per reward day, overflow is not banked, and useful actions/Pollen continue after the cap. Midnight/resume/DST/timezone/rollback cases match the documented policy.
- First quest is visible within the 10-second target, every quest has a real achievable action, and shop purchases are atomic and persistent.

## 12. Verification and implementation review

After each feature, append a section to `docs/implementation-review.md` with:

1. **Requirement coverage:** each requirement/acceptance ID → pass/fail/blocked, concrete file/test/artifact, and observed result. Use stable IDs such as `F5-UNDO-01`. No unsupported check marks.
2. **Adversarial findings:** severity, reproduction, resolution, and verification. Try airplane mode, provider timeout/429/malformed data, rapid taps, stale query completion, low-confidence/non-subject photos, empty/last-item deletion, 100 garden items, background/kill/restart during each mutation, account switching, clock changes, and duplicate species/rewards.
3. **Simplicity audit:** identify additions beyond the prompt, remove them or justify why they are necessary. Keep compatibility prerequisites visible rather than hiding them as incidental refactors.
4. **UX evidence:** actual tap counts for catalog search, Scan → Bug, care, retake, menu/swipe delete and undo, and earning/spending Pollen. State the starting screen, whether typing/camera permission was excluded, and which device/viewport was observed.
5. **Accessibility/visual evidence:** light/dark and opaque/glass states, contrast measurements, large text, screen-reader labels/focus/announcements, keyboard, touch targets, reduced motion/transparency, and relevant screenshots.
6. **Mission check:** show the specific path from discovery/reward to learning about or caring for a pollinator plant.

Resolve all blockers and majors before calling a slice complete. Record unavailable hardware/provider credentials honestly; component mocks are not proof of native camera behavior, real biological accuracy, or production integration readiness.

### Test scope

Extend the existing harness rather than install a second test stack. Add meaningful tests for:

- Additive contracts/migrations, guest versus authenticated scopes, private-route rejection, bounded guest relays, metadata-free uploads, and old draft/profile compatibility.
- Delete/undo before/after expiry, no early remote call, multiple pending deletes, offline retry, authoritative deletion, process restart, account switch, and cache/draft reconciliation.
- Catalog search → profile → photo-free save, typo/alias resolution, stale-request suppression, traits/attribution/unknowns, offline seeded content, and private search remaining distinct.
- Shared camera preview/retake, mode persistence, non-subject/low-confidence results, sting warnings, sighting save, and bug result → linked plant or prefilled search.
- Reward tables/receipts, all first-species aliases and cross-path deduplication, planting/care limits, correction/re-add behavior, exactly-once quests, atomic shop purchase, XP clipping, midnight/resume/DST/timezone/rollback, and restart recovery.
- Critical UI flows, screen-reader action alternatives, reduced-motion feedback, and layout with large text. Real device/manual review covers gestures/permissions/appearance that mocks cannot prove.

Mock external providers in automated tests; use existing injected ports and safe HTTP fixtures. Do not call live billable providers in the default suite. Do not add tests that merely snapshot styles or restate constants without exercising behavior.

Run focused tests while building, then the applicable repository gates:

```sh
npm run build:api
npm run typecheck
npm run lint
npm run test:unit
npm run test:functional
npm run test:components
npm run test:bundle-secrets
git diff --check
```

If web routing/assets change, run the existing export/asset checks using repository scripts and record the exact command. Do not improvise an Expo migration to make an unrelated check green. Preserve the asset-export fix for Ionicons and use local/controlled fixtures for destructive tests.

No local Java/Xcode/Android toolchain is required by the existing Node validation path. EAS builds, physical-device checks, and live-provider checks are separate evidence gates. Use available devices/builds; report checks that could not run instead of inventing screenshots or passing results. Do not deploy or operate on real user collections as part of verification.

If a later deployment task needs Vercel, the CLI is currently reported missing: installing `npm i -g vercel` is strongly recommended for environment/deploy/log tooling. It is not a prerequisite for these local feature changes; do not install global tools or deploy merely to finish this prompt.

## 13. Deliverables and completion

Deliver:

1. `docs/discovery.md`, `docs/implementation-plan.md`, `docs/plan-review.md`, and `docs/implementation-review.md` with real repository references and acceptance evidence.
2. Working F5 → F4 → F2 → F3 → F1 code, including the explicit guest/local compatibility work, minimal migrations, and preserved cloud/Ask/voice/task capabilities.
3. Appropriate passing tests and a short changelog/summary describing visible behavior, validation, and material limitations. Use small descriptive commits if committing is appropriate under the repository/session instructions; never sweep unrelated edits into them.
4. Screenshots or short recordings of each main flow, including light/dark, an opaque fallback, uncertainty/offline, accessible deletion, and rewards. Save evidence under `docs/evidence/` with a brief index of device/platform/state; use synthetic or consented example photos.
5. Source/license/attribution records and concise follow-ups: final app name, unknown target region, source coverage gaps, provider access/retention, browser photo durability, and any unperformed real-device checks. No unresolved blocker/major can be relabeled a minor follow-up to claim completion.

**Done means:** all acceptance items are verified; no blockers/majors remain; the specified paths fit measured tap targets; local guest features and saved native data work offline; network-dependent identification is explained honestly; privacy and scope isolation hold; glass has readable accessible fallbacks; and nothing unrelated was added without a clear justification.

Start with discovery, then plan and adversarial review. Continue through implementation and verification until the requested outcome is complete or a specific external dependency truly prevents it. Do not stop after writing planning documents, and do not present test doubles as finished live features.
