**Historical implementation prompt.** Current implementation and setup follow [the build specification](12_app_create_instr.md), [continuous Voice Chat](voice-turns.md), and the README's [single `npx expo start` workflow](../README.md#everyday-startup-one-expo-server). The WebRTC and database proposals below are superseded; continuous native voice uses a custom development client, and Expo Go previews other features.

**Role**: Act as the lead React Native architect and implementation agent. Build a working Plantopedia technical proof and 24-hour demonstration from the PRD at:

`/Users/theodoremui/Downloads/classes/cs147L/lecture-code/Plantopedia_PRD.md`

**Task**: The defining demonstration is: photograph a plant, review uncertain identification candidates, save a **particular specimen**, discuss it by voice or text, add an observation, close and reopen the app, then retrieve that exact specimen, observation, and photograph by asking about it naturally.

Execute the work. Create and modify application files as needed. Treat the PRD as the product source of truth and this prompt as the execution scope: **Phase 0 technical proof and Phase 1 demonstration only**. The repository also contains CS 147L lecture examples. Read them for React Native component, state, props, and interaction patterns; do not mistake them for an existing Plantopedia application.

## First-principles working method

1. **Inspect before deciding.** Read the entire PRD, applicable repository instructions, project manifests, and exact files you plan to reuse or change. Identify what exists, what is missing, and which PRD statements are proposed capabilities rather than verified facts.
2. **Verify unstable integrations.** Check current official documentation for the exact requested OpenAI model (`gpt-realtime-2.1`), Realtime WebRTC flow, Expo development builds, the chosen WebRTC package and config plugin, image APIs, SQLite, and the plant identification provider. Confirm credentials, account access, quotas, and physical-device availability through actual checks. Do not substitute another voice model silently.
3. **Follow the critical path.** Freeze contracts and specimen identity first; prove native audio separately; then build capture, identification, persistence, voice integration, and recall. Defer features that do not strengthen that path.
4. **Make uncertainty visible.** Distinguish a tested result from a design assumption. When a required credential, device, or external service is unavailable, report the precise blocker early and continue independent work. Do not claim a physical-device result from a simulator, browser example, or mock.
5. **Keep the user informed.** Give concise progress updates at meaningful gates, including findings, decisions, and blockers. Continue autonomously on authorized local work.

## Required architecture and implementation order

### Gate 1 — Contract-first design

Before implementing backend behavior, define versioned, strict JSON Schemas and matching TypeScript types for:

- `get_plant`
- `get_observation_history`
- `save_observation`
- `search_my_plants`, which is necessary to answer questions when the plant ID is unknown

Define success and typed error responses. Reject unknown properties and validate all network and model-produced JSON at runtime. The authenticated owner ID comes from the verified session, never from tool arguments.

For `save_observation`, the model may propose the plant ID and observation text. A trusted orchestrator supplies the stable idempotency key and checks that the user explicitly requested the write. Reuse that key across network retries and app restarts. In one database transaction, record the command and observation. An exact retry must return the original result; the same key with different content must fail without writing.

Freeze the corresponding contracts for scan identification, image upload, saving a new plant, finalized conversation events, and the Realtime session broker before implementing their handlers. Generate or check TypeScript types from the canonical schemas so runtime and compile-time contracts cannot drift.

### Gate 2 — Falsify the specimen data model

Design Postgres records for users, plants, identification revisions, observations, photos, conversations, finalized messages, source-linked summaries, idempotency commands, and audit events. Add tasks only if the optional reminder flow is implemented.

A `plant` row represents one physical specimen. Its UUID is independent of species, date, location, and image hash. Two trees of the same species at the same location on different days must remain separate when the user saves them separately. A second photograph joins an existing specimen only when the action supplies that specimen’s ID. Identification corrections append revisions; they do not overwrite the past or merge plants.

Before finalizing migrations, attempt to break the model with these cases:

- Two separately saved trees have the same species and location.
- One tree has multiple observations and photos.
- A save is retried concurrently and after app restart.
- A key is replayed with changed content.
- A plant is deleted before a queued write replays.
- A model supplies another user’s plant ID.
- A search phrase matches multiple specimens.

Implement owner-scoped queries, database authorization policies, private photo storage, and ownership-safe foreign keys. Search results must carry plant, observation, and photo IDs. An ambiguous result must trigger clarification rather than silently selecting a record.

### Gate 3 — Isolated native audio proof

Create a small proof app that is independent of the main Plantopedia routes, UI state, plant database, and identification provider. Use a physical iOS or Android device, an Expo development build compatible with the chosen native WebRTC package, a minimal server-side session broker, and the exact `gpt-realtime-2.1` model.

Prove and instrument all of the following:

1. Microphone permission and capture.
2. WebRTC connection and returned audio playback.
3. Data-channel events and visible connection state.
4. User interruption while the agent is speaking.
5. Connection loss and recovery.
6. Cleanup of tracks, peer connection, and session.
7. Server-only storage of the standard OpenAI API key.

Measure first-audio and interruption timings with monotonic timestamps. Treat the PRD’s latency figures as targets until measured. Keep mocked transport tests reproducible and separate from the live device trial, which necessarily depends on the external service.

Only after this gate passes should the main app import the proven audio transport. If it fails, continue the text and persistence path while investigating; identify voice as unverified in the final report.

### Gate 4 — Build the Phase 1 app

Use a small, typed Expo/React Native project with routes for Explore, Scan, My Plants, a plant profile, and Ask. Show Tasks only if a functioning reminder flow exists.

Keep presentation components stateless where practical. Use base React Native primitives such as `View`, `Text`, `Image`, `Pressable`, and `StyleSheet`; add `TextInput`, `FlatList`, and a loading indicator where the interaction needs them. Screens or feature controllers own queries and transitions. Children receive typed data and callbacks. Every visible action must have a real handler, accessible name, and meaningful pending, disabled, empty, and error state.

Separate state by lifetime:

- **React `useState`:** text drafts, local selection, search input, capture stage, pending controls, and visible voice status.
- **SQLite:** cached plant views, scan drafts, local original-photo references, unsent text, and an outbox with stable intent IDs.
- **Postgres:** authoritative saved plants, observations, identification revisions, messages, summaries, and tasks.

Use the selected `plant_id` throughout profile and Ask flows. Never infer specimen identity from a species name or stale UI object.

Implement Scan → Identify → Save as an explicit state machine. Preserve the original image, generate a resized derivative for upload, and keep the draft available on provider failure. Associate each asynchronous response with its scan attempt and generation; ignore stale results. Disable duplicate taps for usability, while relying on database idempotency for correctness. Navigate to the profile only after the backend confirms the saved plant ID. Display candidate uncertainty and do not present provider scores as independently validated identification probabilities.

Use a specialist plant API for identification. Keep its request and response format behind an adapter. Ground the assistant in the active plant and retrieved personal records. Persist finalized conversation events and user-approved actions; do not use the Realtime session’s in-memory state as cross-session storage. The assistant may say “saved” only after a successful write.

### Gate 5 — Adversarial verification

Build tests around observable invariants rather than mirroring implementation details. At minimum, verify:

- Contract validation rejects malformed IDs, unexpected properties, invalid dates, and oversized notes.
- Concurrent and repeated writes create one result per logical intent.
- The same key with changed content fails.
- Two same-species specimens remain independent through identification corrections and search.
- Cross-user reads and writes reveal no records or photo references.
- Stale scan results cannot replace newer selections.
- App termination between upload and save preserves a recoverable draft.
- Closing and reopening restores the exact saved plant, observation, and photo IDs.
- Ambiguous recall requests return candidates and ask for clarification.
- Deleted records do not reappear through summaries, search indexes, or queued writes.
- The assistant does not offer unsupported edibility assurances.

Use fixed clocks, IDs, and fixtures for deterministic recall tests. Require exact matches on the core demonstration cases. Report the PRD’s broader recall and latency targets separately from these invariant tests.

## Execution sequence and scope control

Work in this order:

1. Repository and dependency inspection; contract and acceptance matrix.
2. Schema and data-model falsification; migrations and authorization tests.
3. Isolated physical-device audio proof.
4. Capture/import, private upload, identification candidates, and idempotent save.
5. Plant profile, collection search, and observed/owned distinction.
6. Authorized agent tools and source-backed text conversation.
7. Proven voice transport integrated with the active plant.
8. Durable conversation memory and cross-session recall.
9. Error, offline, retry, and reconnect states.
10. Adversarial tests and full demonstration rehearsal.

Preserve the essential path if time is tight: **identification → distinct saved specimen → real voice if proven → persistent observation and conversation → exact recall after restart**. Defer map, health assessment, calibrated light measurement, expert assistance, social features, and optional reminders before weakening that path.

## Completion standard

Finish with a working demonstration and a concise report containing:

- The files and architecture created.
- Contract and database decisions, including how specimen separation and idempotency are enforced.
- What was tested automatically and on a physical device, with actual measurements where available.
- A trace of the close-and-reopen recall demonstration showing the exact plant, observation, and photo IDs.
- Any unmet PRD requirement, external blocker, or unverified platform claim.

Do not report a target, mock, or proposed integration as an observed capability.
