# Independent visual design critique

Reviewed 2026-11-01 using actual rendered `review/overview-desktop.png` (1440 × 3184), `review/lesson-mobile.png` (390 × 844), `assets/course.css`, and `assets/course.js`. This report separates visible evidence from source inspection. No production application file was changed.

## Overall impression

The overview immediately communicates an Expo/React Native course. One prominent starting action and an original plant/phone illustration connect the subject to Plantopedia. Green, mint, lavender, and warm yellow create a vivid palette without placing body text over busy artwork. The light glass panels preserve a stable reading surface. The desktop learning path has a coherent two-column structure, explicit lesson numbers, and visible durations.

The mobile lesson screenshot preserves that hierarchy: brand and Lessons action, lesson identity, a readable three-line title, a concrete outcome sentence, then download actions and learning outcomes. The buttons wrap into sensible rows. Visible outcome bullets remain readable at 390 px. Neither supplied screenshot shows a clipped title, overlapping controls, or outer horizontal overflow.

## Findings and disposition

| Finding | Severity | Trigger and effect | Action |
| --- | --- | --- | --- |
| The initial lesson jump navigation omitted the interactive experiment. | Low; fixed by lead. | Returning learners could jump to prose, quizzes, and the exercise but had to scroll past section 2 to find the central experiment. | The lead added an **Interactive experiment** jump and a focusable lab target. Include that jump in final browser verification. |
| Export and solid-surface utilities fall below the initial desktop sidebar view. | Low; accepted tradeoff. | Ten lesson links consume enough vertical space that only the first footer utility is initially visible in the 1000 px desktop viewport. The sidebar scrolls, so these controls remain reachable. | Keep the already prominent main-page downloads. Optional future polish: a **Course tools** disclosure near search. Do not shrink lesson text to make everything fit. |
| Mobile lab and quiz appearance is not established by the header screenshot. | Evidence limit, not a confirmed defect. | That screenshot ends within learning outcomes and cannot reveal below-fold code, lab, or feedback clipping. | Use the separate mobile browser overflow checks and, when available, inspect actual lab/quiz viewports. Do not infer a visual pass merely from media-query source. |

A further **low-severity source-derived concern** needs a narrow-screen diagram check: the SVGs use a 980-unit viewBox, while `.diagram img` permits a 650 px rendered width. A 15-unit label can therefore become approximately 10 px. Inner horizontal scrolling already exists, so preserving a 980 px minimum diagram width would retain the intended label size. An explicit full-size vector link is another option. This concern was sent to the lead; it is not presented as a visually observed clipping defect.

No high- or medium-severity visual defect was found in the rendered views inspected. Small metadata and brand captions are secondary; substantive teaching prose is larger and readable.

## Hierarchy, density, and plain English

The overview explains the three learning modes before the numbered path. The teaching-model boundary sits in a readable lavender panel rather than being hidden in a footer. It distinguishes HTML, Python notebooks, and actual TSX exercises before a learner starts setup.

The lesson renderer makes outcomes and prerequisites prominent and provides section navigation for revisiting long material. The newly added experiment jump corrects the main discoverability gap. Explanation, model, knowledge check, guided exercise, reflection, and takeaways form a sensible progression. That structure is supported by source inspection; it does not prove that every learner will understand it on their first attempt.

Visible copy uses concrete actions: photograph, preserve, prepare, retry, and explain. The mobile subtitle states a complete outcome in one sentence. Botanical stage names add character while lesson numbers retain the unambiguous sequence. Python is presented as optional conceptual practice rather than an Expo runtime.

## Representative contrast

These ratios use the CSS token values and relative luminance. They assess representative solid combinations, not every composited background or whole-page accessibility conformance.

| Foreground / background | Ratio |
| --- | ---: |
| Body `#173c3d` / canvas `#f5faf7` | 11.37:1 |
| Muted `#4b6264` / canvas `#f5faf7` | 6.16:1 |
| White / primary button `#11775e` | 5.49:1 |
| Code `#e5f6ef` / panel `#142e35` | 12.75:1 |
| Warning `#714a14` / pale warning `#fff2d6` | 7.03:1 |
| Sidebar secondary `#566a67` / white | 5.75:1 |
| Focus purple `#7054bc` / white | 5.70:1 |

The screenshots visually agree: key text is dark and crisp, actions have clear boundaries, and decoration does not substitute for labels. CSS implements solid surfaces, reduced transparency/contrast preferences, reduced motion, and forced-color handling. Actual preference and assistive-technology checks remain necessary before a broader accessibility claim.

## Keyboard and overflow boundaries

Source inspection confirms a visible focus treatment, skip link, focusable diagram/code regions, real buttons and labels, and an inert closed mobile panel. Escape closes that panel with focus return. Section jumps focus their destinations. These implementation properties should also be exercised by browser QA; source alone does not establish keyboard or screen-reader usability.

Vector illustrations intentionally scroll within named regions on narrow screens, and their captions explain sideways scrolling. This keeps detailed diagrams legible without forcing the whole page wider. Code examples likewise have internal scrolling and a copy action. Final QA should distinguish these intentional inner regions from accidental outer overflow.

Retain the screenshots and browser verification JSON with this report. Browser models cannot establish native glass availability, React Native font scaling, VoiceOver/TalkBack reading order, actual camera/audio permissions, or device resource release.

Verdict: approve for the rendered views inspected, with the stated below-fold mobile and native acceptance limits.


## Final mobile inspection and fix verification

I visually inspected the additional `review/lab-mobile.png` and `review/quiz-mobile.png`, both at 390 × 844. The capture lab has a readable title, connected instructions, clear enabled/disabled actions, and full-width controls that wrap without overlapping. Its lower controls continue below the viewport through ordinary page scrolling; that is not clipping. The quiz has a clear question, generous selectable answer rows, visible radio controls, and a primary/secondary action pair that fits within the card. No outer horizontal overflow or text/control overlap is visible in these views.

The separate browser QA record reports **33/33 groups passing**, including all 390 px lesson pages, outer-overflow checks, mobile menu/Escape focus behavior, lab interactions, persistence, downloads, and offline file loading. That automated evidence complements the four screenshots inspected here; it does not replace the visual observations or certify native behavior.

The lead fixed the diagram-label concern by setting the image minimum width to **980 px**, matching its viewBox and preserving approximately 15 px diagram labels in the horizontally scrolling region. Each diagram caption now includes a **Download the SVG** link. Source inspection confirms both changes. The direct **Interactive experiment** jump and focusable lab target are also present.

**Final verdict: approve.** No unresolved blocking visual issue remains in the inspected desktop, mobile header, mobile lab, or mobile quiz views. The small sidebar-utility discoverability tradeoff remains acceptable because the sidebar scrolls and main-page downloads are prominent. Remaining limits are native font scaling and glass behavior, VoiceOver/TalkBack reading order, real camera/audio permissions, and physical-device resource release. The screenshot sample is selective, even though automated overflow checks cover all ten lesson pages.
