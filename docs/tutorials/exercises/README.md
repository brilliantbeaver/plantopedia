# Plantopedia exercise workshop

These ten exercises accompany the interactive course. They use the versions already installed in the Plantopedia repository: Expo SDK 57, React Native 0.86.3, React 19.2.3 and TanStack Query 5.104.3. Use the repository's pinned Node 22.23.1 and npm 12.0.2. Run `npm ci` and `npm run build:contracts` at the repository root first. Do not install another Expo version into this workspace.

There are two different ways to practice. The `.tsx` files are real React Native teaching screens. Run them through Expo in this repository. The `.mjs` files are dependency-free JavaScript models; run those with Node. A Node test cannot prove that a camera, microphone, native glass view, or operating system permission works. The course's browser and notebook models have the same boundary.

## Start with the executable logic workbook

From `docs/tutorials/exercises`, run:

```sh
node --test logic/checks.test.mjs
```

The default selects `logic/solution.mjs`. All tests should pass. To work on the deliberately unfinished version:

```sh
LAB_MODE=starter node --test logic/checks.test.mjs
```

The starter checks deliberately fail until you replace each `TODO` in `logic/starter.mjs`. Edit that file, rerun the same command, and compare with the solution only after a serious attempt. Each test name begins with the lesson number. For example, run only state checks with:

```sh
LAB_MODE=starter node --test --test-name-pattern="04 " logic/checks.test.mjs
```

The tests check behavior, including stale state, non-success HTTP responses, malformed data, missing owners, denied permissions, duplicate retry delivery, and cleanup after a failure. They are teaching examples, not copies of Plantopedia's production tests. The dependency-free `readPlantPage` model checks only an intentionally small display shape of `items` with string IDs and nicknames. It is not the full shared PlantPage schema. The TSX API exercise uses the real service and its full runtime contract.

## Run a React Native exercise

Use a temporary learning branch or make a local backup before creating practice routes. These exercise files do not modify the application by themselves. For lessons 01, 02, 04, 05, 06 and 07, copy the chosen `starter.tsx` to `src/app/workshop.tsx`. Start Expo with `npm start` and open `/workshop` through the Expo Router development navigation or a link from a practice screen. On web, use the repository's `npm run web` command and visit `/workshop`. Read the lesson README for the specific route and expected result. When done, delete your temporary route. Before lesson 03, remove `src/app/workshop.tsx` so it does not compete with the folder route `src/app/workshop/index.tsx`. After lesson 03, remove the temporary `src/app/workshop/` folder before returning to a single-file workshop route. Compare your work with `solution.tsx` rather than overwriting app screens.

Lesson 03 supplies two routes and a tiny fixture module. Lessons 08 and 09 supply platform files and a route wrapper. Their READMEs give exact placement. Lesson 10 supplies a complete fixture-backed capstone that can be copied to `src/app/workshop.tsx`. Do not copy source files from different lessons into the same route at once. A new route becomes part of the app only after copying it into `src/app`; files under this directory are not app routes.

The API exercise uses Plantopedia's existing `SessionProvider` or `GuestSessionProvider` through `useSessionApi`. A cloud session needs the existing backend and Clerk configuration described in the root README. Guest mode has different capabilities and is labeled in the screen. No exercise asks you to provision a new service or paste a token. Public Expo environment variables are bundled into the app and cannot hold provider secrets.

Expo Go previews most exercises when its SDK matches this repository. The real native voice bridge requires the app's development build. The camera exercise needs a supported device or browser permission context; test native permission behavior on a real phone. The offline SQLite solution is durable on native, while its web adapter explicitly keeps data only in memory. The platform exercise uses an opaque fallback where glass is unsupported or reduced transparency is requested.

## Exercise map

| Lesson | Build and check | React Native files | Node check name |
| --- | --- | --- | --- |
| 01 | Choose a runtime and render a first screen. | `01-runtime/{starter,solution}.tsx` | `01 ` |
| 02 | Pass plant data and make a usable card. | `02-components/{starter,solution}.tsx` | `02 ` |
| 03 | Keep specimen identity through navigation. | `03-navigation/{starter,solution}/` | `03 ` |
| 04 | Rename without changing an old state snapshot. | `04-state/{starter,solution}.tsx` | `04 ` |
| 05 | Handle loading, errors, cached data and refresh. | `05-network/{starter,solution}.tsx` | `05 ` |
| 06 | Validate a boundary without exposing credentials. | `06-boundaries/{starter,solution}.tsx` | `06 ` |
| 07 | Separate permission, readiness and capture. | `07-camera/{starter,solution}.tsx` | `07 ` |
| 08 | Save a durable draft and understand retry identity. | `08-offline/{starter,solution}/` | `08 ` |
| 09 | Pick an accessible surface and release resources. | `09-platform/{starter,solution}/` | `09 ` |
| 10 | Combine the ideas and assess release evidence. | `10-capstone/{starter,solution}.tsx` | `10 ` |

Each lesson includes a prediction, implementation task, acceptance criteria, and a transfer question. Write your explanation before revealing a solution. A passing test is one piece of evidence; check the stated user behavior on a device too.

## Verify the provided worked files

From the repository root, run the isolated example type check:

```sh
./node_modules/.bin/tsc --noEmit -p docs/tutorials/exercises/tsconfig.json
```

This checks the worked TSX examples and their helpers against the installed packages. It excludes deliberately unfinished starters. It does not run Expo, contact the API, grant permission, or prove a release is ready.
