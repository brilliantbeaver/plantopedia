# 04 · Preserve the previous state snapshot

Rename one individual without changing the old array or another individual. Think about the next render rather than editing a displayed object in place.

## Predict before you edit

Write down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.

## Build

1. Copy starter.tsx to src/app/workshop.tsx.
2. Add a controlled TextInput for the new nickname.
3. Use setPlants(previous => previous.map(...)) and return a new object for the matching ID.
4. Reject spaces-only nicknames without losing the typed input.

## Check the result

- Only the east specimen changes.
- The ID stays the same after a rename.
- The logic tests can freeze the old array and its objects without causing a mutation error.

From `docs/tutorials/exercises`, run the worked model with:

```sh
node --test --test-name-pattern="04 " logic/checks.test.mjs
```

Then edit `logic/starter.mjs` and run:

```sh
LAB_MODE=starter node --test --test-name-pattern="04 " logic/checks.test.mjs
```

The starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.

## Explain the result

Why is the nickname used for display, while the ID is used for matching and list keys?

Compare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.
