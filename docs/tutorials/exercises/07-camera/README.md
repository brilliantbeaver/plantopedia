# 07 · Ask, wait, capture and recover

Permission lets the app ask the hardware for a photograph. Camera readiness means the hardware view has started. Busy and focus conditions prevent duplicate capture and capture from an unfocused route. Native background and resume behavior still needs a device acceptance check.

## Predict before you edit

Write down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.

## Build

1. Copy starter.tsx to src/app/workshop.tsx.
2. Implement loading, grant, denial and canAskAgain=false states.
3. Use onCameraReady, a synchronous focus check, and a ref lock so a queued background press or two rapid presses cannot start captures. Ignore results from an earlier focus session.
4. Unmount the camera when the route loses focus. Show a temporary preview and a recoverable failure message.

## Check the result

- No capture begins before permission and readiness.
- A denied permission produces a clear next step.
- Two rapid presses do not create concurrent captures; a queued press after blur cannot start one.
- The UI describes the preview as temporary and does not claim exif:false proves metadata removal.

From `docs/tutorials/exercises`, run the worked model with:

```sh
node --test --test-name-pattern="07 " logic/checks.test.mjs
```

Then edit `logic/starter.mjs` and run:

```sh
LAB_MODE=starter node --test --test-name-pattern="07 " logic/checks.test.mjs
```

The starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.

## Explain the result

What extra work must production CaptureScreen do before an uploaded photograph is private, durable and ready to share with identification providers?

Compare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.
