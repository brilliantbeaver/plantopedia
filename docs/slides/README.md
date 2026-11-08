# Your neighborhood is alive

Open **[index.html](index.html)** in a browser. This 17-slide Plantopedia story helps middle-school students investigate local plants, flower visitors, and biodiversity through the app. It works directly from disk with no server, network, account, external fonts, or packages. Using the app's saved features requires sign-in.

## Present or study

All controls sit in a compact bottom dock. The slides keep the whole top of the window.

- **Arrows** move between slides; the small counter shows your place. Keyboard: arrows, Page Up / Page Down, or Space; Home / End jump to the first / last slide.
- **Sun / moon** select Light or Dark colors. **More (⋯) → Device theme** follows your system. The choice is remembered when storage is available.
- **Book** toggles Study mode, or press **S**. Scroll through the full story with app routes, step-by-step instructions, and expandable reflection questions. Study works with either color theme; leaving it returns to your selected slide. These exercises do not save anything in the app.
- **More (⋯)** also contains Presenter notes, Print slides, and the full illustrated app guide. Press **N** to toggle notes. [All presenter notes](presenter-notes.md) are available separately.
- **Print slides** prints all 17 slides in the light palette, without the dock, notes, or Study exercises. Use landscape pages and enable background graphics if your browser requires it. The source page size is 1600 × 900 px.
- Link to a slide using `index.html#slide-7`. Navigation updates that fragment without filling browser history.
- Desktop slides fit both the window width and the available height above the dock. Small screens reflow into a readable vertical layout. Controls have accessible names, tooltips, focus indicators, and native keyboard behavior; no animations run.
- Without JavaScript, the slides remain readable in order and browser printing works. Interactive dock controls need JavaScript.

## A connected story

A bee visits an imagined school flower. On another visit, no visitors appear. What changed? Students meet the plant, learn how pollination connects flowers to seeds, and use Plantopedia to gather clues. Their saved plant, check-ins, notes, and questions become a small investigation. The classroom field mission is the next chapter of that same story.

The four chapter markers—**Meet, Connect, Return, Care**—provide a quiet sense of progress. Students learn the three app checkpoints: explore a plant, save a plant, and observe on three distinct days. The story distinguishes guest exploration from saved progress, check-ins from written notes, and cosmetic Pollen from ecological impact. Photos, planting, and a private garden are optional. A quiet visit or an unchanged plant still offers a useful observation.

The botanical design uses warm paper, forest tones, serif headlines, original vector drawings, and illustrated app screens. Presenter notes include transitions, questions, and pauses for a 20–30 minute classroom discussion.

## App visuals

Three **dated, cropped Expo web screenshots** show stable search, flower-visitor, and Save plant content. They were captured November 1, 2026; they are not fresh screenshots of the revised app. Current Journey, learning, check-in, note, Ask, Scan, progress, and rewards screens appear as clearly labeled **interface illustrations**, checked against source. Sample progress and Pollen are labeled examples. The avatar images are actual bundled app artwork.

See [asset provenance](assets/README.md) for sources, crop coordinates, and hashes. Illustrations are not species-identification references, and illustrative buttons do not perform app actions.

## Files and editing

- `index.html`: complete interactive deck, with embedded slide markup for file access.
- `slide_01.html` … `slide_17.html`: standalone slides without JavaScript.
- `build.mjs`: editable narrative, vector scenes, Study guides, notes, and generator.
- `app-visuals.mjs` and `assets/`: source-matched app illustrations, icons, screenshot crops, and avatars.
- `slides.css`: themes, compositions, responsive layouts, bottom dock, and printing.
- `deck.js`: navigation, theme and Study preferences, notes, and keyboard behavior.
- `presenter-notes.md` and `manifest.json`: speaking guidance, sources, and slide inventory.
- `deck.test.cjs`: focused behavior and structure checks.

After editing the generator or visuals:

```sh
node docs/slides/build.mjs
node --test docs/slides/deck.test.cjs
```

For a static dark rendering, set `data-theme="dark"` on the root `<html>` element; use `data-theme="light"` for light. The interactive deck handles these automatically.

## Sources and verification

App behavior: [the journey guide](../biodiversity-journey-guide.md), checked against implemented routes, labels, and reward rules. Science: [USDA NRCS, Insects and Pollinators](https://www.nrcs.usda.gov/conservation-basics/animals/insects-pollinators) and [US Forest Service, Attracting Pollinators Using Native Plants](https://www.fs.usda.gov/wildflowers/pollinators/documents/AttractingPollinatorsV5.pdf), consulted November 7, 2026. Relevant sources also appear beside the presenter notes.

The app's regional planting guidance currently covers North Carolina only. Students should consult a local guide with an adult before planting. Observations and app points do not prove biodiversity increased.

Validation uses focused Node behavior tests, HTML/asset checks, and rendered document review of every slide in Light and Dark. Live browser capture was unavailable in this session; document rendering and DOM tests do not replace native browser or assistive-technology acceptance testing.
