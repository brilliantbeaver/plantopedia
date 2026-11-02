# 03 · Link to an individual specimen

Two rosemary plants share a species but need different histories. Use the stable specimen ID in a route rather than a nickname or a species name.

## Predict before you edit

Write down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.

## Build

1. Copy the files inside starter/src/app/workshop/ to src/app/workshop/.
2. Copy starter/src/features/tutorial-navigation-data.ts to src/features/tutorial-navigation-data.ts. Keep fixtures outside the route directory so they do not become unintended routes.
3. Use Link with pathname /workshop/[plantId] and params.plantId. Read and normalize the route parameter in the detail screen.
4. The worked solution has the same directory structure: copy its src contents into the repository src tree. Restart Expo so new typed routes are discovered.

Both starter and solution mirror the real app directory tree. Copy their src contents into the repository src tree. Their fixture module already sits outside the route directory, and their imports already target it.

## Check the result

- The two links open different IDs and locations.
- An unknown ID displays a useful not-found message.
- Changing a nickname in the fixture does not require changing the route ID.

From `docs/tutorials/exercises`, run the worked model with:

```sh
node --test --test-name-pattern="03 " logic/checks.test.mjs
```

Then edit `logic/starter.mjs` and run:

```sh
LAB_MODE=starter node --test --test-name-pattern="03 " logic/checks.test.mjs
```

The starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.

## Explain the result

Which identifier should an observation keep if the reader renames the plant tomorrow?

Compare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.
