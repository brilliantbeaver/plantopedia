# Deployment evidence

Captured 2026-11-01, America/Los_Angeles (UTC records are dated November 2).

- `app-web-verification.json`: seven controlled guest browser flows on the public site, including typo search, care, photo-free durable save, delete/Undo, rewards, offline loaded search, and 320/768-pixel layouts. The first quest was observed in 794 ms in the final public run; this is a single measured run, not a device performance guarantee.
- `home-web.png`, `sunflower-care-web.png`, `rewards-web.png`: actual Chromium web screenshots from those flows. No cloud collection was modified.
- `identification-fallback-live.json`: real OpenAI image/structured-output result using the licensed bundled sunflower image, after an injected primary quota error. No Kindwise or Pl@ntNet identification credit was spent. This is not biological accuracy or real exhausted-provider evidence.
- Tutorial browser evidence is in `../../tutorials/review/browser-verification.json`: all 33 check groups passed against the public `/tutorials/` course. It covers all ten lessons, interactions, storage failure, downloads and the JavaScript-free reader.
- Final deployment IDs, HTTP results, secret handling, runtime-fix verification and unperformed gates are recorded in `../../deployment-verification.md`.

Native capture, camera permissions, real swipe gestures, OS process death, VoiceOver/TalkBack, native glass, full account login/voice and old installed-client compatibility are not established by these browser artifacts. Native binaries need an Expo/EAS update for the new OpenAI provider contract. Public uploads remain gated pending provider-retention approval.
