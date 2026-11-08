# Plantopedia feature evidence — 2026-11-01

These are actual screenshots of the local Expo web application in Chrome, using only a synthetic guest garden. No mock webpage, real user collection, uploaded personal photo, live identification, or production service was used. Screenshots are cropped from the observed Chrome device viewport, not regenerated artwork. The final reward-recovery and Bug-copy changes were checked in automated suites after these captures.

| Artifact                                     | Observed platform/state                                                                                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Home](plantopedia-home.png)                 | Chrome iPhone 16 emulation, 393 × 852 CSS points, light. Search/Scan, quest, Pollen, Settings and four-tab glass navigation.                                                                              |
| [Search](plantopedia-search.png)             | Same viewport. `sunflwer` returns the sourced sunflower reference photo and four traits.                                                                                                                  |
| [Profile](plantopedia-profile.png)           | Same viewport. Pollinator value, annual explanation and visible bee/butterfly visitors.                                                                                                                   |
| [Care](plantopedia-care.png)                 | Same viewport. Care expanded with sourced water/sun guidance, meter and check-in.                                                                                                                         |
| [Deletion](plantopedia-delete.png)           | Same viewport. Last guest garden item hidden; persistent accessible Undo/Delete opportunity clears the floating navigation. Actual Undo restored the item.                                                |
| [Quests & avatar](plantopedia-progress.png)  | Same viewport. 80 Pollen, 80 XP, completed daily quest and first planting milestone. Avatar grid starts below.                                                                                            |
| [Dark profile](plantopedia-profile-dark.png) | Same viewport, actual dark preference. Readable opaque content with existing glass navigation.                                                                                                            |
| [Contrast measurements](contrast.json)       | WCAG sRGB calculations for actual theme ink/background pairs and conservative web alpha composites. Minimum modeled normal-text ratio 5.67:1. These are not measurements of native rendered liquid glass. |

The walkthrough also used 390 × 844 and desktop 1201 × 844 viewports. A real web reload preserved the guest saved specimen, planting/care action state and 80-Pollen balance. A Rare avatar purchase changed balance from 80 to 20 and equipped the item while XP remained 80. That purchase was observed but has no separate screenshot.

| Task / start                       | Actual observed path                               | Count / scope                                              |
| ---------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| Explore → sunflower catalog result | Search plants → type `sunflwer` → Sunflower result | Two taps plus typing; no photo/sign-in.                    |
| Open profile → care                | Scroll if needed → How to care                     | One tap; scrolling counted separately.                     |
| My Garden → delete → undo          | Visible overflow → Delete → Undo                   | Two taps to delete, one to undo; last-item state observed. |
| Explore → rewards                  | Pollen/level chip                                  | One tap.                                                   |
| Profile → planting / care          | I planted this; Care → I checked this plant        | One planting tap; two care taps from closed disclosure.    |
| Avatar shop → purchase             | Scroll grid → Buy                                  | One purchase tap; balance/equip persisted.                 |

The first quest was visible in the first Home viewport immediately during the walkthrough; this was not a stopwatch measurement. Scan → Bug and one-tap Retake have component/source evidence, not a completed native-camera walkthrough. No live classifier result screenshot is claimed.

Still required: native camera/gallery permissions and Retake, actual swipe gestures, VoiceOver/TalkBack focus and announcements, OS process kill, 320-point width, tablet/large text/long translations, reduced motion/transparency/high contrast, keyboard with undo and voice, supported iOS native glass over photographs, unsupported-platform opaque fallback, and offline/uncertain native screenshots. The solid content surfaces shown here are not proof that an OS Reduce Transparency setting was exercised. No screenshot stands in for those checks.

A transient Expo Router web `aria-hidden`/focused-ancestor warning was observed during route transitions. The destination accessibility tree was reachable afterward; actual screen-reader focus/announcement behavior remains an open device/manual gate. See [implementation review](../implementation-review.md) for acceptance status and unresolved findings.
