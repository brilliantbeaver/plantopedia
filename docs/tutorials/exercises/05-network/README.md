# 05 · Show the full life of a collection request

Use the existing session API and TanStack Query rather than building another account system. An empty successful collection, a pending request, and a failed request need different explanations.

## Predict before you edit

Write down the visible result you expect and one way it could fail. Keep this explanation so you can compare it with the result.

## Build

1. Copy starter.tsx to src/app/workshop.tsx.
2. Use useQuery with queryKey [owner, "plants"] and queryFn api.plants.
3. Render pending, error, empty-success and populated states. Keep old data visible when a refresh fails.
4. Add a refresh action and explain why it is disabled while fetching.

## Check the result

- The key contains the current owner.
- A guest collection is labeled as a device collection.
- An initial failure does not look like an empty successful garden.
- A failed refresh can show both an error and older records.

From `docs/tutorials/exercises`, run the worked model with:

```sh
node --test --test-name-pattern="05 " logic/checks.test.mjs
```

Then edit `logic/starter.mjs` and run:

```sh
LAB_MODE=starter node --test --test-name-pattern="05 " logic/checks.test.mjs
```

The starter is intentionally incomplete. A failure is useful feedback about the behavior you still need to implement. The TSX screen and the Node model test different layers; run the screen in Expo as described in the workspace README.

## Explain the result

Why does a resolved fetch promise still require checking response.ok before trusting the JSON?

Compare your implementation with the worked solution only after recording your answer. Explain which changes alter data, which request work, and which simply change what the screen shows.
