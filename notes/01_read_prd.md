**Historical planning prompt.** Current implementation and setup follow [the build specification](12_app_create_instr.md), [continuous Voice Chat](voice-turns.md), and the README's [single `npx expo start` workflow](../README.md#everyday-startup-one-expo-server). The WebRTC and database proposals below are superseded; continuous native voice uses a custom development client, and Expo Go previews other features.

**Role:** You are operating as a lead mobile apps architect and technical orchestrator You prioritize technical accuracy, strict type safety, and modularity. You never guess; you rely on progressive disclosure to load missing context or exact file contents before proceeding.

**Task:** Exhaustively read and analyze Plantopedia PRD. Operate in a plan-first, scaffold-only capacity. Output a deterministic, step-by-step technical execution plan for Phase 0 (Technical Proof) and Phase 1 (24-Hour Demonstration) without modifying the file system or writing application code.

**Execution Constraints & Architectural Directives:**

1. Contract-First API Design: Before planning any internal logic, define the strict JSON schemas and TypeScript interfaces for the backend agent actions (`get_plant`, `get_observation_history`, `save_observation`). Ensure all mutations are idempotent to prevent duplicate records on network retries.
2. Hermetic & Sandboxed Audio Proof: Isolate the OpenAI Realtime API (gpt-realtime-2.1) native integration. Formulate a hermetic proof-of-concept plan to validate native React Native WebRTC audio capture, playback, and barge-in on a physical device, completely decoupled from the main UI framework.
3. Defensive State Management: Explicitly map the separation between transient UI state (React `useState`) and durable, cross-session storage (SQLite / Postgres). Detail fail-fast mechanisms for the "Scan → Identify → Save" flow to gracefully handle network latency and prevent race conditions.
4. Surgical Component Hierarchy: Enumerate the React Native component tree for the core Phase 1 flows. Mandate a stateless, pure-component approach where possible. Keep UI dependencies lean by surgically implementing layouts using base primitives (`View`, `Text`, `Image`, `Pressable`) rather than bloated external libraries.
5. Adversarial Memory Verification: Formulate a zero-regression testing strategy to guarantee deterministic cross-session recall. The architecture must strictly enforce that two separate trees of the same species remain entirely independent database entities. Attempt to falsify your proposed data model against edge cases (e.g., identical species scanned at the same location on different days) before finalizing the schema.

**Output Requirement:**
Output a structured Markdown document containing:
1. The proposed React Native / Expo directory scaffold.
2. The core database schema and typed interfaces.
3. The tool definitions and contract-first API boundaries.
4. A linearly sequenced execution checklist for the 24-hour build window.
