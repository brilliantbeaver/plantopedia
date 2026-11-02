# 06 · Validate data without confusing identity and permission

A TypeScript type disappears at runtime. Validate unknown input and explain the separate server check that decides whether the signed-in person can access a record.

## Predict before you edit

Write down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.

## Build

1. Copy starter.tsx to src/app/workshop.tsx.
2. Create a small zod schema for a trimmed nickname of 1–120 characters.
3. Use safeParse and render a full explanation for success or failure.
4. Run the owner and authorization logic checks. Never print a token or place a provider key in EXPO_PUBLIC variables.

## Check the result

- Spaces-only input fails.
- A trimmed valid name succeeds.
- Malformed unknown data is not accepted through a type assertion.
- You can explain that owner-scoped query keys separate caches but do not authorize a server request.

From `docs/tutorials/exercises`, run the worked model with:

```sh
node --test --test-name-pattern="06 " logic/checks.test.mjs
```

Then edit `logic/starter.mjs` and run:

```sh
LAB_MODE=starter node --test --test-name-pattern="06 " logic/checks.test.mjs
```

The starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.

## Explain the result

Who must reject a request if someone changes a record ID to another person’s specimen?

Compare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.
