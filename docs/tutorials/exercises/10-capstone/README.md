# 10 · Build a complete learning garden

Combine the patterns in a small fixture-backed garden. The worked solution is deliberately local and visibly labeled. It gives you a safe place to test UI transitions without needing a new service account.

## Predict before you edit

Write down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.

## Build

1. Copy starter.tsx to src/app/workshop.tsx and build a list with a detail view for the selected ID.
2. Use a stable QueryClient, an owner-scoped key, complete input validation, and immutable fixture updates.
3. Add nickname filtering, an add action and a deliberate refresh failure control.
4. Check large text, keyboard navigation and an unknown/empty collection. Then write a capstone plan mapping fixture operations to the existing apiClient, CaptureScreen and outbox.
5. Complete releaseBlockers and distinguish automated evidence from device acceptance.

The complete capstone solution uses its own QueryClient, an in-memory fixture API, validated nicknames, list/detail selection, accessible buttons and intentional failure injection. It never calls a cloud provider. Its async operations return immediately, so the pending state may be too brief to observe; the HTML network lab is the place to explore adjustable latency. To build the full application, trace the course’s source references and replace these explicit fixture operations with the existing authenticated services. A fixture pass is not production acceptance.

## Check the result

- Two specimens can share a species or nickname and still remain separate records.
- A successful add updates the collection without changing older snapshots.
- An intentional failed refresh keeps prior data and can recover.
- Fixture mode and memory lifetime are obvious.
- The release checklist identifies missing camera, offline, account-switch and voice evidence.

From `docs/tutorials/exercises`, run the worked model with:

```sh
node --test --test-name-pattern="10 " logic/checks.test.mjs
```

Then edit `logic/starter.mjs` and run:

```sh
LAB_MODE=starter node --test --test-name-pattern="10 " logic/checks.test.mjs
```

The starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.

## Explain the result

Which claims would still need a real device and configured backend even if every fixture check passed?

Compare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.
