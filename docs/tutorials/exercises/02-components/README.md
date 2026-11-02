# 02 · Build one reusable plant card

A reusable card should receive data from its parent and report a press through a function. It should remain readable when a name grows long.

## Predict before you edit

Write down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.

## Build

1. Copy starter.tsx to src/app/workshop.tsx.
2. Replace the outer card with Pressable and call onOpen only when a press occurs.
3. Use a row with a fixed decorative badge and a flexible text column. Add a descriptive accessibility label.

## Check the result

- The press action runs once for one press.
- The nickname wraps without covering the arrow.
- The whole card has a generous press target and a meaningful screen reader name.

From `docs/tutorials/exercises`, run the worked model with:

```sh
node --test --test-name-pattern="02 " logic/checks.test.mjs
```

Then edit `logic/starter.mjs` and run:

```sh
LAB_MODE=starter node --test --test-name-pattern="02 " logic/checks.test.mjs
```

The starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.

## Explain the result

Why is onPress={onOpen} different from onPress={onOpen()}?

Compare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.
