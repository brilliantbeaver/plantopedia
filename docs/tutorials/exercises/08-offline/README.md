# 08 · Keep local progress and reuse retry identity

Separate a successful local save from a successful remote sync. Native SQLite preserves a draft after an app restart. A retry must keep the original operation ID when the server might already have accepted it.

## Predict before you edit

Write down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.

## Build

1. Create src/features/tutorial-offline and copy the starter files there. Add the route wrapper shown in solution/workshop-route.txt as src/app/workshop.tsx.
2. Implement a SQLite table keyed by owner and id with bound parameters. Add a .web.ts preview adapter that clearly states its durability.
3. Save a draft, restart the native app, and check that the same ID remains. Switch the fixture owner and verify that the old list clears.
4. Complete the syncDraft logic model. Make a server commit succeed but its acknowledgement fail; retry with the same key.

The worked solution includes `draft-contract.ts`, `draft-store.ts`, `draft-store.web.ts` and `OfflineLab.tsx`. Copy these into `src/features/tutorial-offline/`; the route wrapper imports the screen. The SQLite database is separate from Plantopedia’s application database and contains only the workshop fixtures. This exercise does not implement a production outbox, automatic background delivery, or secure authentication. The JavaScript outbox model demonstrates foreground retries with a cooperating idempotent server.

## Check the result

- Native draft records survive a restart.
- The web adapter is explicitly memory-only.
- Changing owners does not show the previous owner’s rows.
- The lost-acknowledgement test creates three remote logical writes, despite four attempts.
- Identification is not silently bundled into saving.

From `docs/tutorials/exercises`, run the worked model with:

```sh
node --test --test-name-pattern="08 " logic/checks.test.mjs
```

Then edit `logic/starter.mjs` and run:

```sh
LAB_MODE=starter node --test --test-name-pattern="08 " logic/checks.test.mjs
```

The starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.

## Explain the result

Why is a new random operation ID on every retry dangerous after a lost acknowledgement?

Compare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.
