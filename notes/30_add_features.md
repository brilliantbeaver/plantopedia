First deeply understand the design and implementation of this React Native application "Plantopedia".

Consistent with the current design and architecture of the Plantopedia app, systematically and thoughtfully update the following "prompt to add features" for this React Native app. The UI must be consistently created using your best UI/UX design skills while maintaining highly intuitive and interactive design elements. We strongly prefer using liquid glass design scheme, while maintaining highly vivid and visually appealing UI/UX elements. Update the following prompt carefully and systematically for Codex to add these new features below. Your output must be in the folder: "notes/31_codex_add_features.md".

## Prompt to add features

````markdown
# ROLE
You are a senior React Native engineer and product designer. You are adding five features
to the existing **Plantopedia** app (working name; a rename is pending). The app is
built by a youth team. Its mission is to **increase local pollinator populations
(bees, butterflies, etc.) and biodiversity** in our neighborhood by helping people
with no biology background choose, understand and care for pollinator-friendly plants.

Today the app identifies plants from a photo (a photo is required first) and keeps a
main page of saved plants. To delete a plant, users currently go to Settings and
scroll down.

# GUIDING PRINCIPLES (apply to every decision)
1. **Occam's razor.** Use the fewest screens, taps, components and dependencies that
   meet the requirement. If two designs work, ship the simpler one. Don't add
   features, settings or abstractions that aren't listed here.
2. **Mission first.** Every feature should lead users back to pollinators. When a
   choice is unclear, pick the option that gets someone to plant or care for a
   pollinator-friendly plant.
3. **Progressive disclosure.** Show the essential thing first (name, photo, "🐝
   Pollinator-friendly"). Put details behind one clear tap (expandable sections,
   bottom sheets, "Learn more"). Never show a wall of text.
4. **Visual cues over words.** Use icons, color, badges, chips and small animations
   to tell users what they're looking at and what they can do. Text supports the
   visuals.
5. **Delight with restraint.** Make it beautiful and playful (the users include
   kids and families), but keep animations short (≤300 ms for UI and ≤1.2 s for
   celebrations), skippable and respectful of "reduce motion."
6. **Accessible by default.** WCAG AA contrast, touch targets ≥44×44 pt, labels on
   every icon, screen-reader support, and no meaning conveyed by color alone.

# PHASE 0: DISCOVER (do this before writing any code)
- Inspect the repo: framework, language, navigation, state management, storage,
  plant-ID integration, styling system, existing components, tests and build scripts.
- Write `docs/discovery.md` covering: the current architecture, the current screens
  and navigation map, how plant ID works today, where data is stored, and any
  existing design tokens or icon library.
- Reuse what exists. Add a new dependency only if it clearly simplifies the work,
  and justify each one in the plan.

# PHASE 1: PLAN
Write `docs/implementation-plan.md` with:
- A navigation map (before and after) in ASCII or Mermaid
- A wireframe per screen in ASCII, with notes on states: empty, loading, error,
  success and offline
- Data model changes
- Component inventory (new and reused)
- External data sources and APIs for plant, insect and pollinator data, with
  fallbacks
- Build order with milestones (see the order below)
- Test plan
- A risk list

# PHASE 2: ADVERSARIAL PLAN REVIEW (required before implementing)
Review the plan from each persona below. Write `docs/plan-review.md` with the
findings, severity (blocker / major / minor), and the plan changes you made in
response. Iterate until no blockers remain.
- **The Simplifier:** "What can we remove? Is there a screen, setting or library
  we don't need? Can two features share one component?"
- **The 10-year-old first-time user:** "Can I find search, scan a bug, and earn
  points without help in under 30 seconds? Do the icons make sense without labels?"
- **The grandparent with no biology knowledge:** "Is any jargon unexplained? Is
  text large enough? Can I find out what to plant?"
- **The Mission Skeptic:** "Does this feature actually lead to more pollinator
  plants, or is it just engagement for its own sake? Can the game be farmed
  without doing anything real?"
- **The Accessibility Auditor:** contrast, screen reader, motion, touch targets
- **The Privacy & Safety Reviewer:** users include children. Collect no personal
  data, require no account, store data on the device by default, use no
  location more precise than the neighborhood/region (and only with consent), and
  add a safety cue for stinging insects.
- **The Failure Hunter:** no network, API down, low-confidence ID, unknown
  species, empty states, duplicate saves, deleting the last item, app killed in
  the middle of an action
Only move on once every blocker is resolved.

# PHASE 3: IMPLEMENT
Build in this order. Each step should leave the app working and must pass its
acceptance criteria before you start the next.

Order: **F5 Delete → F4 Plant Profile → F2 Text Search → F3 Pollinator ID →
F1 Gamification**

Rationale: F5 is a quick usability fix. F4 is the shared core that F2 and F3 link
into. Gamification comes last because it rewards actions taken in the other
features.

---

## F1. Gamification: points, avatar rewards, quests
*(Idea: Julian. "One level a day" limit: Talon.)*

**Goal:** Make planting and caring for pollinator plants fun and habit-forming,
like Duolingo, without encouraging excessive screen time.

**Requirements**
- **Points ("Pollen" 🌼 or similar themed currency)** earned for meaningful actions:
  | Action | Points |
  |---|---|
  | Identify or search a new plant (first time per species) | 5 |
  | Identify a pollinator insect (first time per species) | 10 |
  | Mark a plant "I planted this" | 25 (×2 if pollinator-friendly) |
  | Complete a care check-in (e.g. watered) | 5 (max 1 per plant per day) |
  | Complete a daily quest | 20 |
  - Award no points for repeat scans of the same species and no points for
    deleting. Make the point values a single config table.
- **Avatar rewards:** an avatar (e.g. a bee, butterfly or sprout character) with
  customizations unlocked by spending points. Rarity tiers:
  - **Basic:** solid colors
  - **Rare:** gradients
  - **Mythical:** animated effects (sparkle, flutter)
  - Show each tier with a distinct badge color/icon plus a text label.
- **Quests:** one daily quest plus a short list of milestone quests, all tied to
  real actions. Examples: "Find a plant bees love," "Spot a butterfly," "Plant one
  pollinator-friendly plant this week," "Check on your plants 3 days in a row."
  Keep the quest list as a simple data file.
- **Levels:** XP bar with levels. **Users can complete at most one level per day**
  (Talon's screen-time idea). Once the daily cap is hit, show a friendly "Come back
  tomorrow — go check on your garden! 🌱" state. Extra actions still count toward
  the collection but don't advance the level.
- **Anti-farming:** require deduplication per species. Self-reported "I planted
  this" is limited to a reasonable daily count, with an optional photo for bonus
  points.
- **UI:**
  - A compact points/level chip in the header (tap → Profile/Garden screen).
  - Celebrate with a short confetti or pollen-burst animation plus haptic feedback
    when points are earned. Respect reduce-motion.
  - Avatar shop as a grid with locked items greyed out and a lock icon plus cost.

**Acceptance criteria**
- Points persist across app restarts. Points are never awarded twice for the same
  species. The level cap resets at local midnight.
- Every quest maps to an action that exists in the app.
- A new user sees their first quest within 10 seconds of opening the app.

---

## F2. Text-based plant search with generic photo and traits
*(Search idea: Talon. Traits and generic photo: Ashlyn/Alex.)*

**Goal:** Let people who suspect what a plant is ("maybe it's wisteria") type the
name and compare it with what's in front of them, with no photo needed.

**Requirements**
- A search entry point on the home screen, with the same visual weight as "Scan."
- Search by common or scientific name. Debounced type-ahead suggestions, tolerant
  of typos.
- **Result card (first layer):** a generic reference photo, common name, scientific
  name in smaller type, and a 🐝 "Pollinator-friendly" badge where applicable.
- **Identifying traits:** 3–5 scannable trait chips with icons (e.g. 🍃 leaf shape,
  🌸 flower color, 📏 height, 🗓 bloom season, 🌿 growth habit). These are for
  **comparison**, so place them right under the photo.
- Tap the card → open the Plant Profile (F4).
- After a photo ID returns several candidates, show each candidate with the same
  photo and trait card, so users can tell the options apart by look rather than
  just by name.
- States: recent searches when empty, skeleton loaders, "No match — try a
  different spelling or scan it 📷," and an offline message.

**Acceptance criteria**
- A user can go from the home screen to a result for "sunflower" in ≤3 taps plus
  typing.
- Results always show a photo (or a placeholder illustration) and at least 3 traits.

---

## F3. Pollinator photo ID
*(Idea: Ollie.)*

**Goal:** Let users snap a bug or animal and learn whether it's a pollinator, what
it pollinates and how common it is.

**Requirements**
- Entry: the Scan action has a clear two-option toggle: **🌿 Plant | 🐝 Bug**.
  Keep it to one camera flow, not two separate screens.
- Result layer 1: species name, photo, and a large, unambiguous verdict badge:
  **"✅ Pollinator"**, **"➖ Not a pollinator"** or **"❓ Not sure"** (for low
  confidence). Show confidence plainly (e.g. "Pretty sure," "Best guess").
- Result layer 2 (expand): **what it pollinates** (tappable plant chips → F4
  profiles), how common it is locally, and a fun fact.
- **Safety cue:** for stinging insects (bees, wasps, etc.), show a gentle
  "⚠️ Can sting — admire from a distance" banner.
- Can be saved to a "Pollinators spotted" collection (feeds F1 quests).
- Low-confidence or non-insect photos: offer a retake and tips. Never invent an
  answer.

**Acceptance criteria**
- The verdict is understandable without reading any other text.
- Every "what it pollinates" item links to a plant profile or search.

---

## F4. Plant profile: pollinators and care info
*(Auto-show pollinators: Ansha. Care button: Ashlyn. Perennial vs. seasonal: Anya.)*

**Goal:** One beautiful profile screen that every path (scan, search, pollinator
link) leads to. It answers "does this help pollinators?" and "how do I care for
it?"

**Requirements, in progressive layers**
1. **Hero (always visible):** photo, name, the 🐝 pollinator-friendly badge, and a
   **lifecycle badge**: 🔁 **Perennial** (comes back every year) vs. 🌱
   **Annual/Seasonal** (one season). Explain the term in plain language on tap.
2. **Pollinators (shown by default):** a row of pollinator icons with labels
   (bee, butterfly, hummingbird, moth, beetle…) showing who visits this plant.
   Show "No known pollinator value" honestly when that's the case.
3. **Care (behind a "How to care 🌿" button or expandable section):**
   - 💧 Water: frequency plus a simple meter (low/medium/high)
   - ☀️ Sun: hours per day, with a full/partial/shade icon
   - 🌾 Fertilizer: schedule
   - Optional: soil, bloom season, mature size
4. **Actions:** "I planted this 🌱" (feeds F1), Save ♡, Share.
- Use the same layout for every plant, so users learn it once.
- Missing data fields are hidden (not shown as "N/A"). If pollinator data is
  missing, say so.

**Acceptance criteria**
- Pollinators are visible without tapping anything. Care info opens in 1 tap.
- The lifecycle badge appears on every profile where data exists.

---

## F5. Delete photo and swipe-to-delete
*(Idea: Julian.)*

**Goal:** Remove friction. Today a bad photo forces users to exit and re-enter the
app, and deleting a saved plant is buried in Settings.

**Requirements**
- **Photo preview:** clear 🗑 Retake/Delete and ✓ Use Photo buttons right after
  capture. Deleting returns straight to the live camera.
- **Saved plants list:** swipe left to reveal a red delete action, plus a
  long-press menu or edit mode for accessibility (swipe isn't discoverable for
  everyone, or usable with a screen reader).
- **Safety net:** delete instantly with an **"Undo" snackbar (~5 s)** instead of a
  blocking confirm dialog. That's fewer taps and still safe.
- Deleting doesn't remove points already earned. Re-adding the same species
  doesn't re-award first-time points.

**Acceptance criteria**
- Retaking a photo takes 1 tap. Deleting a saved plant takes 1 gesture or 2 taps,
  and can be undone.

---

# DESIGN SYSTEM & NAVIGATION
- **Navigation:** at most 3–4 bottom tabs, e.g. **🏠 Home (search + scan) · 🌿 My
  Garden (saved plants + pollinators spotted) · 🏆 Quests/Profile (points, avatar,
  level)**. Scan is the primary floating action. Any feature should be reachable
  in ≤2 taps from Home.
- **Icons:** one consistent, high-quality icon set (rounded, friendly, single stroke
  weight), plus a small set of custom pollinator illustrations (bee, butterfly,
  hummingbird, moth, beetle). Every icon has a text label or accessibility label.
- **Color:** nature palette (leaf green primary, sunflower yellow for rewards,
  sky/lavender accents), with a defined semantic set: success, warning
  (stinging), info, and rarity tiers. Pass AA contrast. Support dark mode if the
  app already does.
- **Visual cues:** badges for status (pollinator-friendly, perennial, rarity), chips
  for traits, meters for water and sun, progress bars for XP and quests, and
  animations for celebrations.
- **Typography:** large, readable sizes. Body text ≥16 pt. Support dynamic type.
- **Motion:** subtle transitions between list and profile, a satisfying reward
  animation, and everything respects reduce-motion.
- **Empty states:** illustrated and encouraging, with one clear next action
  (e.g. "Your garden is empty — scan your first plant 📷").
- Put tokens (colors, spacing, radii, type) in one place and reuse them.

# DATA & ARCHITECTURE NOTES
- Define minimal, typed models: `Plant`, `Pollinator`, `SavedItem`,
  `UserProgress` (points, xp, level, lastLevelUpDate, unlockedItems,
  equippedAvatar), and `Quest`.
- Store data locally by default. Require no account.
- Hide external API calls behind one small service per domain (plants,
  insects) with caching, timeouts and graceful fallback. Don't hard-code secrets.
- Choose plant, pollinator and insect data sources during Phase 1 and document
  their licensing and attribution.

# PHASE 4: ADVERSARIAL IMPLEMENTATION REVIEW (after each feature and at the end)
For each feature, write a section in `docs/implementation-review.md`:
1. **Spec check:** go through every requirement and acceptance criterion and mark
   it ✅ / ❌ with evidence (test name, screenshot or file reference).
2. **Red-team it:** actively try to break it. Airplane mode, rapid double taps,
   rotate mid-action, kill the app during a save, enter 100 saved plants, type
   gibberish, upload a non-plant/non-bug photo, change the clock to get around the
   daily cap, farm points by repeated scans.
3. **Simplicity audit:** list anything added beyond the spec and either remove it
   or justify it.
4. **UX walkthrough:** record the tap count for the main tasks (search, scan a bug,
   see care info, delete, earn points) and compare against the targets above.
5. **Accessibility pass:** screen reader labels, contrast, touch targets, reduce
   motion, dynamic type.
6. **Mission check:** does this feature visibly lead to pollinator-friendly action?
Fix all blockers and majors before marking the feature done.

# TESTING
- Unit tests: point rules, deduplication, the daily level cap (including midnight
  and timezone edge cases), quest completion, delete/undo.
- Integration/UI tests: search → profile, scan bug → verdict → linked plant, photo
  retake, swipe-delete + undo, level-up celebration.
- Mock external APIs in tests.

# DELIVERABLES
1. `docs/discovery.md`, `docs/implementation-plan.md`, `docs/plan-review.md`,
   `docs/implementation-review.md`
2. Working code for F1–F5 in the order given, with small, well-described commits
3. Tests passing, with a short `CHANGELOG` / summary
4. Screenshots or a short screen recording of each feature's main flow
5. A list of open questions and follow-ups (e.g. final app name, data source gaps)

# DEFINITION OF DONE
- All acceptance criteria are met and verified in the review doc
- No unresolved blocker or major findings
- Main tasks fit within the tap-count targets
- The app works offline, with clear messaging where a network is required
- Nothing beyond this spec was added without justification
````
