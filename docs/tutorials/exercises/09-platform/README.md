# 09 · Preserve usability across platforms

Use platform files to keep a consistent interface while each platform chooses an available implementation. Decoration must respect the reader’s transparency and text preferences.

## Predict before you edit

Write down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.

## Build

1. Create src/features/tutorial-platform and copy starter files there. Use the route wrapper from solution/workshop-route.txt.
2. Keep GlassPanel.tsx as a readable opaque fallback; add guarded .ios.tsx and .web.tsx adapters.
3. Add complete English and French messages, then switch language without cutting off longer text.
4. Complete createVoiceCleanup in the Node model so stopping one resource still happens when another cleanup fails.

Copy all worked solution `.ts` and `.tsx` files into `src/features/tutorial-platform/` and create the route wrapper. Always import `./GlassPanel` without a suffix, so Metro chooses `.ios.tsx`, `.web.tsx`, or the base `.tsx`. The example supports a light palette; integrate the production preference theme before claiming dark-mode support. Native voice acceptance requires the real development build and is outside this screen.

## Check the result

- Opaque content appears before preference checks finish.
- Unsupported glass and reduced transparency use a readable fallback.
- Long text wraps after changing language and increasing device text size.
- Repeated cleanup stops the microphone and closes the socket once, even if one operation rejects.

From `docs/tutorials/exercises`, run the worked model with:

```sh
node --test --test-name-pattern="09 " logic/checks.test.mjs
```

Then edit `logic/starter.mjs` and run:

```sh
LAB_MODE=starter node --test --test-name-pattern="09 " logic/checks.test.mjs
```

The starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.

## Explain the result

Why should a failed socket close never prevent stopping microphone capture?

Compare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.
