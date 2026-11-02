# 01 · Choose the correct runtime

Predict which parts of Plantopedia you can explore in Expo Go and which require the app’s development build. Then render a first screen that introduces one real specimen.

## Predict before you edit

Write down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.

## Build

1. Copy starter.tsx to src/app/workshop.tsx.
2. Render a title, a short explanation and a specimen description using View and Text.
3. Show Platform.OS, then compare the same screen on web and a supported phone.

## Check the result

- All visible words are inside Text.
- The screen respects safe areas and remains readable with large text.
- You can explain why the custom native voice bridge does not appear just because its JavaScript was refreshed.

From `docs/tutorials/exercises`, run the worked model with:

```sh
node --test --test-name-pattern="01 " logic/checks.test.mjs
```

Then edit `logic/starter.mjs` and run:

```sh
LAB_MODE=starter node --test --test-name-pattern="01 " logic/checks.test.mjs
```

The starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.

## Explain the result

Why would adding a native module require rebuilding a development client, while changing a paragraph normally does not?

Compare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.
