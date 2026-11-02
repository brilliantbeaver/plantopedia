# Plantopedia: the builder’s field guide

Open **[index.html](index.html)** for the interactive course. It works directly from disk: keep `assets` beside it. For a local web address, run this command from the repository root and open <http://localhost:8765/docs/tutorials/>:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

The course has ten progressive lessons with original SVG illustrations, live browser experiments, 30 explained quiz questions, editable implementation sketches, guided exercises, self-checks, notes, and locally saved completion. The solid-surface toggle supports readers who prefer less transparency. Reduced motion and increased contrast preferences are respected. Every chapter remains open; completion is a personal record, not certification.

The **[complete reader](course-reader.html)** contains all lesson text, diagrams, code, questions, hints, and solutions without JavaScript. It is also suitable for printing. The interactive guide has a lesson search and direct links such as `index.html#lesson-08`.

## Choose the right execution environment

| Material | What runs | What it can help you verify |
| --- | --- | --- |
| Interactive HTML | Ordinary JavaScript and browser DOM | State transitions, request states, identities, retry decisions, and conceptual layout. |
| Jupyter notebooks | Python 3, with optional ipywidgets | Editable logic models, embedded SVG diagrams, predictions, quiz feedback, and worked reasoning. |
| Exercise TSX files | React Native through Expo | Real components and supported device features in the configured app. |
| Node workbook | Dependency-free JavaScript | Specimen identity, immutable changes, validation, retries, cleanup, and other bounded logic. |

**Neither the browser nor Python executes React Native.** The notebooks display TSX examples as Markdown and run separate Python analogies. Camera, microphone, permission, native glass, and release behavior need their own device acceptance. Fixture data in a teaching exercise is explicitly labeled and does not imply a live integration.

Course reading, browser experiments, and notebook models need no account, API key, or running server. Downloaded HTML uses no CDN, remote fonts, telemetry, or external packages. Installation, live API exercises, and official documentation links need network access. Repository source links work when the materials remain at `docs/tutorials` inside this checkout.

## Follow the learning path

| Lesson | What you learn | Typical time | Notebook |
| --- | --- | --- | --- |
| 01 | React, React Native, Expo, the server, and the correct preview host. | 40 min | [Foundations](notebooks/01-foundations.ipynb) |
| 02 | Components, props, callbacks, accessible cards, lists, and Flexbox. | 45 min | [Components](notebooks/02-components.ipynb) |
| 03 | Expo Router, route groups, stable specimen IDs, and dynamic paths. | 45 min | [Navigation](notebooks/03-navigation.ipynb) |
| 04 | Render snapshots, immutable updates, derived values, reducers, and context. | 55 min | [State](notebooks/04-state.ipynb) |
| 05 | Asynchronous requests, errors, response validation, Query keys, and invalidation. | 60 min | [Network](notebooks/05-network.ipynb) |
| 06 | Authentication, authorization, runtime contracts, privacy, and account changes. | 50 min | [Boundaries](notebooks/06-auth-contracts.ipynb) |
| 07 | Permissions, readiness, capture, retained originals, and upload derivatives. | 55 min | [Camera](notebooks/07-camera.ipynb) |
| 08 | SQLite drafts, checkpoints, retries, lost acknowledgments, and owner boundaries. | 60 min | [Offline](notebooks/08-offline.ipynb) |
| 09 | Platform adapters, readable glass, translation, font scaling, and voice cleanup. | 60 min | [Cross-platform](notebooks/09-cross-platform.ipynb) |
| 10 | Behavior tests, failure sequences, debugging, capstone work, and release evidence. | 60 min | [Quality](notebooks/10-quality.ipynb) |

Times are estimates that include practice. Take longer when you need to. The lesson header is the source of truth for the current estimate. Basic JavaScript functions, objects, and arrays are the starting prerequisites. The first lesson explains setup; later lessons explain asynchronous code before building on it.

A useful study cycle is to read the outcome, predict the diagram or lab result, operate one control, explain the observation, and build the matching exercise in Expo. Try the quiz before opening its explanation. Finish by writing a connected explanation in your own words. Revisit it after the next lesson.

## Run the notebooks

Use a Python 3.9 or newer environment. The notebooks are self-contained: illustrations are embedded, fixtures are included, and no app imports are required. Each notebook uses the standard library plus IPython, which comes with a typical Jupyter installation. Widgets are optional; without them, edit a model function’s default arguments and rerun its cell.

Create a dedicated environment rather than changing a system Python installation. For example, from `docs/tutorials`:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install jupyterlab ipywidgets
jupyter lab notebooks
```

Choose the **Python 3** kernel. Run cells in order. Markdown code fences are examples to read, not Python cells. Prediction cells start with `None` and report “Not attempted”; replace it and rerun for feedback. You can run all cells without blocking input prompts or requiring live services. Save your notebook to retain edits. If a downloaded notebook is moved away from the checkout, its source links will need the original repository location, but the lesson and diagrams remain available.

Jupyter may hide rich output in an untrusted downloaded notebook. Inspect the source and run the cells locally to generate the diagrams and widgets. [Jupyter’s format documentation](https://nbformat.readthedocs.io/en/latest/format_description.html) and [the ipywidgets interact guide](https://ipywidgets.readthedocs.io/en/stable/examples/Using%20Interact.html) describe those mechanisms.

## Use the Expo exercises

The **[exercise workbook](exercises/README.md)** gives exact placement and commands. It contains ten sets of editable starters, worked solutions, a fixture-backed integrated capstone, and 16 pure-logic checks. Download [all exercises](downloads/plantopedia-exercises.zip), [all notebooks](downloads/plantopedia-notebooks.zip), or [the complete course](downloads/plantopedia-course-kit.zip). Every lesson also has its own ZIP with its exercise, notebook, and shared logic checks.

The course follows this repository’s pinned Expo 57, React Native 0.86.3, React 19.2.3, and TanStack Query 5.104.3 setup. Use Node 22.23.1 and npm 12.0.2 for app work as documented in the root README. Do not replace these pins with a floating latest template to follow a lesson. The default guest experience and a configured authenticated cloud session have different capabilities. The API lessons reuse existing integration boundaries. They do not provision another provider.

The native `local` draft adapter uses SQLite and files; `local.web.ts` is an in-memory preview. Guest garden feature storage uses a separate abstraction. Read each exercise’s scope rather than assuming every web record has the same durability. The custom native voice bridge needs a rebuilt development client; Expo Go cannot add it through a JavaScript reload.

For the existing Vercel deployment path, installing the currently missing CLI is strongly recommended: `npm i -g vercel`. It enables `vercel env pull`, `vercel deploy`, and `vercel logs`; follow the project’s documented deployment and environment rules. No CLI installation or deployment is needed to study this course.

## Keep and export your learning work

The HTML guide saves quiz selections, notes, sketches, checklists, and self-reported completion in browser local storage when available. File-origin storage behavior depends on the browser. If storage is disabled or full, the current page still works and the guide reports that it cannot save. Use **Export my learning notes** to download a JSON copy. This export is a portable record; it is not an import format or executable code. No learning work is sent to a server.

## Rebuild or verify the materials

All generated deliverables and source files stay under `docs/tutorials`. Lesson text lives in `content/*.json`; visuals come from `tools/generate_visuals.py`; notebook models live in `tools/notebook_labs.py`. The build uses Python’s standard library:

```sh
python3 docs/tutorials/tools/generate_visuals.py
python3 docs/tutorials/tools/build_course.py
node --test docs/tutorials/exercises/logic/checks.test.mjs
node --test docs/tutorials/tools/models.test.cjs
node docs/tutorials/tools/check-foundation-snippets.cjs
node docs/tutorials/tools/check-advanced-snippets.cjs
node docs/tutorials/tools/check-exercise-camera.cjs
./node_modules/.bin/tsc --noEmit -p docs/tutorials/exercises/tsconfig.json
```

`build_course.py` produces `assets/lessons.js`, the static reader, ten notebooks, per-lesson ZIPs, bundle ZIPs, and a SHA-256 download manifest. It checks the lesson sequence, quiz answer ranges, and repository source anchors. The complete course ZIP includes the other download bundles but cannot include another copy of itself. Open its extracted `index.html`; use the source course to download that same full ZIP again.

[Review and verification](review/verification.md) records actual checks and their limits. [Independent content/model review](review/content-and-models-review.md) and [exercise review](review/exercises-review.md) preserve findings and repairs. New teaching code is isolated from the production app, and the user’s existing work is left in place.

For notebook execution checks, install `nbformat`, `nbclient`, `ipykernel`, and `ipywidgets` in the dedicated Python environment, then run:

```sh
python docs/tutorials/tools/verify_notebooks.py --save
python3 docs/tutorials/tools/build_course.py --archives-only
```

The first command runs all ten notebooks in fresh kernels both with widgets and in the fallback mode. `--save` retains the widget-mode outputs. The second packages those executed notebooks without regenerating them. Optional browser integration checks are in `tools/browser_check.cjs`; they require Playwright and a local Chrome installation. Set `COURSE_URL` to the URL you are serving and `PLAYWRIGHT_MODULE` if Playwright is installed outside this checkout. The review record states the environments actually used.

## Read the hosted course

The public course is at <https://plantopedia-nine.vercel.app/tutorials/>. The address without the final slash redirects there so relative links work. This static learning site requires no app login.

The guide was authored against the inspected development checkout. Some companion features are not yet merged into main, including the guest session API used in lessons 05 and 06, the lazy database API in lesson 08, and the species route. The browser and notebook models work independently; dependent TSX exercises need the matching companion app features. Hosted source pages show files available in the deployed repository revision and clearly label unavailable paths. [Publication and compatibility notes](publishing.md) explain this boundary and the deployment checks.
