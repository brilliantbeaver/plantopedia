import { icon, appPreview, capturedPanel } from "./app-visuals.mjs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
const esc = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
let artId = 0;
function svg(body, label, box = "0 0 700 600") {
  const id = `art-${++artId}`;
  return `<svg class="art" viewBox="${box}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${id}"><title id="${id}">${esc(label)}</title>${body}</svg>`;
}
function flower(x, y, s = 1, color = "var(--gold)", petals = 8) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q-18 100 4 235" fill="none" stroke="var(--stem)" stroke-width="9" stroke-linecap="round"/><path d="M-4 118 Q-104 62 -83 116 Q-62 157 -4 145 M0 168 Q99 101 80 161 Q51 192 0 190" fill="var(--leaf)"/>${Array.from({ length: petals }, (_, i) => `<ellipse cx="0" cy="-45" rx="20" ry="43" transform="rotate(${(i * 360) / petals})" fill="${color}"/>`).join("")}<circle r="32" fill="var(--seed)"/><path d="M-14 -10 L-6 -15 M5 -16 L14 -10 M-14 8 L-5 13 M8 8 L16 12" stroke="var(--gold)" stroke-width="4" stroke-linecap="round"/></g>`;
}
function bee(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) rotate(-12) scale(${s})"><ellipse cx="-5" cy="-35" rx="25" ry="39" transform="rotate(-30)" fill="var(--wing)" stroke="var(--stem)" stroke-width="3"/><ellipse cx="31" cy="-25" rx="23" ry="35" transform="rotate(22)" fill="var(--wing)" stroke="var(--stem)" stroke-width="3"/><ellipse cy="7" rx="48" ry="32" fill="var(--gold)"/><path d="M-19 -20 Q-10 8 -19 35 M4 -24 Q15 6 4 37" fill="none" stroke="var(--seed)" stroke-width="12"/><circle cx="46" cy="2" r="24" fill="var(--seed)"/><circle cx="53" cy="-3" r="4" fill="var(--paper)"/><path d="M48 -20 Q42 -40 52 -46 M-19 30 L-28 47 M10 34 L12 50" fill="none" stroke="var(--seed)" stroke-width="4" stroke-linecap="round"/></g>`;
}
function butterfly(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 C-115 -130 -130 -8 -36 24 C-115 105 -18 115 0 29 C18 115 115 105 36 24 C130 -8 115 -130 0 0" fill="var(--lavender)" stroke="var(--plum)" stroke-width="4"/><path d="M-14 2 L-62 -38 M14 2 L62 -38 M-14 27 L-36 55 M14 27 L36 55" stroke="var(--paper)" stroke-width="8" stroke-linecap="round"/><path d="M0 -5 L0 58 M0 -5 Q-24 -38 -24 -21 M0 -5 Q24 -38 24 -21" stroke="var(--seed)" stroke-width="9" fill="none" stroke-linecap="round"/></g>`;
}
function fly(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="-31" cy="-14" rx="29" ry="64" transform="rotate(-30)" fill="var(--wing)" stroke="var(--stem)" stroke-width="3"/><ellipse cx="31" cy="-14" rx="29" ry="64" transform="rotate(30)" fill="var(--wing)" stroke="var(--stem)" stroke-width="3"/><ellipse cy="26" rx="22" ry="45" fill="var(--leaf)"/><ellipse cy="-10" rx="30" ry="27" fill="var(--stem)"/><circle cx="-16" cy="-24" r="12" fill="var(--gold)"/><circle cx="16" cy="-24" r="12" fill="var(--gold)"/><path d="M-18 18 L-54 40 M18 18 L54 40 M-18 36 L-43 67 M18 36 L43 67" stroke="var(--seed)" stroke-width="4"/></g>`;
}
function meadow() {
  return svg(
    `<path d="M70 432 C-20 250 63 42 305 41 C570 -8 736 199 614 437 C514 597 183 608 70 432" fill="var(--wash)"/><path d="M45 530 Q330 480 655 540" fill="none" stroke="var(--line)" stroke-width="3"/>${flower(180, 220, 1.02)}${flower(460, 300, 0.76, "var(--lavender)", 10)}${flower(340, 400, 0.5)}${bee(420, 145, 0.88)}${butterfly(565, 220, 0.5)}<path d="M90 120 C140 50 292 93 306 143 S231 223 292 240" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="5 13"/>`,
    "A bee and butterfly visit a small patch of flowering plants.",
  );
}
function sprout() {
  return svg(
    '<path d="M50 255 Q210 204 360 255" stroke="var(--line)" stroke-width="3" fill="none"/><path d="M205 250 Q190 148 210 80" stroke="var(--stem)" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M202 177 C82 173 75 69 119 90 C179 106 198 135 202 177 M203 136 C211 31 309 20 298 72 C288 113 240 130 203 136" fill="var(--leaf)"/>',
    "A young plant grows two leaves.",
    "0 0 400 300",
  );
}
const slides = [];
slides.push(
  {
    title: "Your neighborhood is alive.",
    role: "cover",
    layout: "cover-organic-cluster",
    content: `<div class="hero-copy"><p class="eyebrow">A Plantopedia adventure</p><h1>Your neighborhood<br>is <em>alive.</em></h1><p class="lead">Choose a plant. Meet its visitors.<br>Discover what changes.</p><div class="hand-label">Small discoveries. A bigger world.</div></div><div class="hero-art">${meadow()}</div>`,
    notes:
      "Invite students to name one plant they pass on the way to school. A window, school grounds, or a permitted community space can be a starting place. This is an invitation to notice, not a competition to collect the most species. Ask: What might be happening around one flower while we walk past?",
    sources: ["app"],
  },
  {
    title: "Many kinds of life. One neighborhood.",
    role: "thesis",
    layout: "editorial-thesis",
    content: `<div><p class="eyebrow">Meet biodiversity</p><h2>Many kinds of life.<br><em>One neighborhood.</em></h2><p class="lead">Biodiversity is the variety of life: plants, animals, and the places they live.</p><p class="prompt">What living things share your block?</p></div><div>${svg(`<path d="M110 300 Q300 0 580 180 Q720 450 390 540 Q30 570 110 300" fill="var(--wash)"/>${flower(250, 235, 0.8)}${butterfly(505, 220, 0.75)}${bee(480, 420, 0.7)}<path d="M330 220 Q385 160 418 185 M330 360 Q370 425 402 420" stroke="var(--line)" stroke-width="3" fill="none" stroke-dasharray="8 9"/>`, "Flowering plants, a butterfly, and a bee share a neighborhood.")}<p class="caption">Look for connections, not just a species count.</p></div>`,
    notes:
      "Biodiversity includes variety within species, between species, and among ecosystems. This introductory slide focuses on the life students can notice nearby. Pollination is one relationship within that wider living system. App points are not a biodiversity index.",
    sources: ["nrcs", "app"],
  },
  {
    title: "A tiny delivery. A new beginning.",
    role: "chronology",
    layout: "process-ribbon",
    content: `<header><p class="eyebrow">How pollination can help</p><h2>A tiny delivery. <em>A new beginning.</em></h2></header><div class="process"><article>${svg(flower(150, 110, 0.52) + bee(242, 68, 0.45), "Pollen can attach to a bee visiting a flower.", "0 0 350 270")}<span class="step-tag">01 · Visit</span><h3>Pollen catches<br>a ride.</h3></article><span class="connector" aria-hidden="true">→</span><article>${svg(flower(150, 110, 0.52) + bee(242, 68, 0.45), "A bee visits another flower of the same species.", "0 0 350 270")}<span class="step-tag">02 · Transfer</span><h3>Same species.<br>Another flower.</h3></article><span class="connector" aria-hidden="true">→</span><article>${sprout()}<span class="step-tag">03 · New life</span><h3>Seeds can form<br>and grow.</h3></article></div><p class="caption">A pollinator carries pollen. The plant makes the seeds.</p>`,
    notes:
      "Trace the arrows. Pollen transfer between flowers of the same species can help a plant produce seeds after fertilization. The bee transports pollen, not seeds. This is one common route: some plants self-pollinate, and others use wind or water. Not every visit produces a seed or seedling. Ask students to explain the difference between pollen and a seed.",
    sources: ["nrcs", "forest"],
  },
  {
    title: "Who’s at the flower?",
    role: "synthesis",
    layout: "card-constellation",
    content: `<header><p class="eyebrow">Meet the visitors</p><h2>Who’s at <em>the flower?</em></h2><p class="lead">Different flowers can welcome different pollinators.</p></header><div class="visitor-grid"><article class="visitor">${svg(bee(180, 115, 1.3), "Stylized bee with wings and striped abdomen.", "0 0 360 250")}<h3>Bees</h3><p>Watch where they land.</p></article><article class="visitor">${svg(butterfly(180, 105, 1), "Stylized butterfly with broad wings.", "0 0 360 250")}<h3>Butterflies & moths</h3><p>Notice the flower shape.</p></article><article class="visitor">${svg(fly(180, 105, 1), "Stylized fly with a pair of wings.", "0 0 360 250")}<h3>Flies & more</h3><p>There is more to discover.</p></article></div><p class="caption">A visitor is a clue. A quick look does not prove pollination happened.</p>`,
    notes:
      "Animal pollinators include bees, butterflies, moths, flies, beetles, some birds, and bats. The drawings are illustrative groups, not identification keys or evidence that each group visits every plant. Do not promise the app identifies every visitor: Bug mode supports insects and other terrestrial invertebrates, not birds or bats.",
    sources: ["nrcs", "forest"],
  },
  {
    title: "A field guide path you can follow.",
    role: "chronology",
    layout: "story-rail",
    content: `<div class="rail"><p class="eyebrow">Inside Plantopedia</p><h2>A field guide path<br>you can <em>follow.</em></h2><p class="lead">Open <strong>See my journey</strong><br>on Explore.</p><div class="hand-label">A clear next step, every visit.</div></div><ol class="journey-list"><li><span class="number">1</span><div><h3>Explore a plant</h3><p>Open a plant through Search.</p></div></li><li><span class="number">2</span><div><h3>Save a plant</h3><p>Build your own field guide.</p></div></li><li><span class="number">3</span><div><h3>Notice what changes</h3><p>Check it on three different days.</p></div></li></ol><p class="caption full">Independent checkpoints. Explore them in any order.</p>`,
    notes:
      "Discovery credit comes from opening a supported catalog profile through Search; a direct species link does not earn that credit. Save plant adds to the current collection; ownership is not required and saving earns no Pollen. The observation checkpoint completes after three distinct check-in days. Deleting all saved plants reopens the Save checkpoint without removing other completed checkpoints.",
    sources: ["app"],
  },
  {
    title: "Your curiosity is enough to start.",
    role: "comparison",
    layout: "comparison-bands",
    content: `<header><p class="eyebrow">Everyone can join</p><h2>Your curiosity is <em>enough to start.</em></h2></header><div class="bands"><article><span class="band-label">Explore freely</span><div><h3>Search plants. Try the pollination challenge.</h3><p>Guest practice does not save a score or earn Pollen.</p></div></article><article><span class="band-label">Keep your story</span><div><h3>Sign in to save plants and track your journey.</h3><p>My Garden is a field guide. You do not need to own a garden.</p></div></article></div><p class="pull-line">No garden required. No camera required.</p>`,
    notes:
      "Try the practice question before signing in. Wrong answers give an explanation and another try; the answer does not become a saved mastery score. Students can explore names indoors and observe permitted plants at school or in shared spaces. Account activity needs normal app services. Some identified plants lack check-in controls; Journey can suggest a supported catalog plant such as sunflower.",
    sources: ["app"],
  },
  {
    title: "Three visits. A changing story.",
    role: "metric",
    layout: "metric-commentary",
    content: `<div class="big-number"><span aria-hidden="true">3</span><p>different days</p><div class="seed-row" aria-hidden="true">✦ · ✦ · ✦</div></div><div><p class="eyebrow">The observation challenge</p><h2>Three visits.<br><em>A changing story.</em></h2><ul class="simple-list"><li>First visit: leaves, flowers, visitors?</li><li>Another day: what changed?</li><li>A third day: what might explain it?</li></ul><p class="prompt">Check the plant, then tap<br><strong>I checked this plant.</strong></p><p class="caption">Take breaks. The days do not need to be consecutive.</p></div>`,
    notes:
      "Open a saved plant and find Notice what changed. After actually checking, choose I checked this plant. Several plants on one day still count as one day toward the checkpoint. Checking does not mean watering. Use a notebook or the app note feature for details; the check-in itself records that the plant was checked. Weather, season, and time of day are questions, not proof of a cause. A missed day is not a failure.",
    sources: ["app"],
  },
  {
    title: "Pollen gives your journey a little color.",
    role: "thesis",
    layout: "evidence-quote",
    content: `<div><p class="eyebrow">Your game rewards</p><h2>Pollen gives your journey<br><em>a little color.</em></h2><p class="lead">Earn game Pollen.<br>Choose an avatar style.<br>Keep exploring.</p><p class="caption">Game points do not measure<br>real-world biodiversity.</p></div><div class="reward-panel"><div class="avatar-art">${sprout()}</div><div class="reward-math"><span>5</span><b>+</b><span>20</span><b>=</b><span class="total">25</span></div><p>First species + today’s bee-plant quest</p><div class="reward-chip">25 Pollen can unlock Sunshine</div><p class="caption">Buying an avatar does not lower your level.</p></div>`,
    notes:
      "A first qualifying sunflower discovery through Search can earn 5 Pollen for a new species plus 20 for the daily bee-plant quest. A care check-in can add 5 once per plant per day. Saving and practice earn no currency. Sprout is free; Sunshine costs 25, Meadow 60, Pollen guardian 120. Pollen is cosmetic game currency, not real pollen or money. Reward Pollen adds XP until one level is gained that day. At 100 XP the level rises and XP resets, without carrying overflow. Further rewards that day add Pollen only. See Pollen & avatars from Journey for full rules.",
    sources: ["app"],
  },
  {
    title: "Think local. Think variety. Think seasons.",
    role: "synthesis",
    layout: "ledger-columns",
    content: `<header><p class="eyebrow">From one flower to a neighborhood</p><h2>Think <em>local.</em> Think variety.<br>Think seasons.</h2></header><div class="season-grid"><article><span class="season">Local</span>${svg(flower(160, 105, 0.5), "A flowering plant rooted in its local place.", "0 0 320 245")}<h3>Native to your region</h3><p>Ask a local plant guide.</p></article><article><span class="season">Variety</span>${svg(flower(105, 125, 0.38) + flower(225, 105, 0.38, "var(--lavender)", 10), "Two kinds of flowering plants.", "0 0 320 245")}<h3>Different plant species</h3><p>Different resources for visitors.</p></article><article><span class="season">Seasons</span>${svg('<path d="M45 130 Q155 15 275 130" fill="none" stroke="var(--line)" stroke-width="4" stroke-dasharray="6 9"/>' + flower(65, 145, 0.25) + flower(160, 115, 0.34, "var(--lavender)", 10) + flower(255, 145, 0.25), "Flowers represent blooms at different times through a growing season.", "0 0 320 245")}<h3>Flowers at different times</h3><p>Food across the growing season.</p></article></div><p class="caption">Planting is optional. Ask an adult and check local suitability first.</p>`,
    notes:
      "Locally native plant variety and blooms through the growing season can support pollinator communities. Not every native plant fits every location. Consult a local extension service or region-specific guide, considering space, climate, soil, and permission. The app’s regional guidance covers North Carolina only. A pollinator-friendly label does not establish suitability elsewhere. Chinese wisteria earns no planting Pollen because suitability is not verified. Never plant just to obtain points.",
    sources: ["forest", "app"],
  },
  {
    title: "Good explorers leave room for life.",
    role: "thesis",
    layout: "editorial-thesis",
    content: `<div class="respect-art">${svg(`<path d="M70 170 Q40 25 245 55 Q655 -30 615 340 Q650 565 300 550 Q30 520 70 170" fill="var(--wash)"/>${flower(300, 230, 0.95)}${bee(490, 120, 0.75)}<path d="M70 440 Q140 365 210 440 Q140 510 70 440Z" fill="none" stroke="var(--stem)" stroke-width="7"/><circle cx="140" cy="440" r="22" fill="var(--stem)"/><path d="M205 400 Q245 350 275 350" fill="none" stroke="var(--line)" stroke-width="3" stroke-dasharray="6 10"/>`, "An eye observes a flowering plant and bee from a distance.")}</div><div><p class="eyebrow">Observe with care</p><h2>Good explorers<br>leave room<br><em>for life.</em></h2><ul class="simple-list"><li>Watch from a safe distance.</li><li>Leave flowers and visitors in place.</li><li>Visit places where you have permission.</li></ul><p class="prompt">No visitors today?<br>That is an observation, too.</p></div>`,
    notes:
      "Do not approach stinging insects, capture animals, pick flowers, or enter an unsafe or private location for points. Use an adult-approved place and follow school procedures. Students who cannot go outdoors can still try guest practice and discuss an existing observation. Encourage uncertainty instead of inventing identifications. No visitors during one visit does not prove a plant never supports pollinators.",
    sources: ["app"],
  },
  {
    title: "One plant. One question. Your investigation.",
    role: "chronology",
    layout: "offset-timeline",
    content: `<header><p class="eyebrow">Your classroom field mission</p><h2>One plant. One question.<br><em>Your investigation.</em></h2></header><div class="mission-grid"><article><span class="step-tag">Choose</span><h3>Pick a permitted plant.</h3><p>Give your investigation a question.</p></article><article><span class="step-tag">Return</span><h3>Visit on different days.</h3><p>Sketch or write what you notice.</p></article><article><span class="step-tag">Compare</span><h3>Share a change.</h3><p>Explain what you know—and what you still wonder.</p></article></div><p class="pull-line">“Do I notice different visitors when more flowers are open?”</p>`,
    notes:
      "Ask for a plant description, observations on different dates, and a question. Have students explain how pollen can reach another flower of the same species. Compare observations without claiming one factor caused a change. Learning evidence is their explanation and observations, not Pollen points. A notebook is sufficient; photos and planting are optional.",
    sources: ["app"],
  },
  {
    title: "Start small. Notice more.",
    role: "closing",
    layout: "manifesto-wall",
    content: `<div class="closing-top"><div><p class="eyebrow">Your next discovery is nearby</p><h2>Start small.<br><em>Notice more.</em></h2><p class="lead">Open Plantopedia.<br>Choose <strong>See my journey.</strong><br>Explore your first plant.</p></div><div class="closing-art">${meadow()}</div></div><div class="closing-rail"><span>Be curious.</span><span>Be patient.</span><span>Care for your corner of the world.</span></div>`,
    notes:
      "Ask students to name one first step: try the challenge, search for a plant, or observe a permitted flower. The goal is curiosity that leads to understanding and thoughtful local choices. Take breaks; there is no streak to protect. The accompanying journey guide covers exact app steps, reward rules, and troubleshooting. Do not judge students by currency totals.",
    sources: ["app", "nrcs", "forest"],
  },
);
const originalSlides = slides.splice(0);
const trail = (parts) =>
  `<div class="app-trail" aria-label="In-app navigation">${parts.map((part, i) => `${i ? '<span aria-hidden="true">›</span>' : ""}<span>${esc(part)}</span>`).join("")}</div>`;
const moves = (items) =>
  `<ol class="tap-steps">${items.map(([symbol, title, detail], i) => `<li><span class="tap-icon">${icon(symbol, 28)}</span><div><h3><span class="step-index">${i + 1}.</span> ${title}</h3><p>${detail}</p></div></li>`).join("")}</ol>`;
function tour({
  title,
  eyebrow,
  parts,
  heading,
  intro,
  items,
  visual,
  note,
  reverse = false,
  study,
}) {
  return {
    title,
    role: "chronology",
    layout: `app-tour${reverse ? " app-tour-reverse" : ""}`,
    content: `<div class="tour-copy"><p class="eyebrow">${eyebrow}</p><h2>${heading}</h2>${trail(parts)}<p class="tour-intro">${intro}</p>${moves(items)}</div><div class="tour-visual">${visual}</div>`,
    notes: note,
    sources: ["app"],
    study,
  };
}
const cover = originalSlides[0];
cover.content = cover.content
  .replace("A Plantopedia adventure", "Plantopedia · Your app field guide")
  .replace(
    "Choose a plant. Meet its visitors.<br>Discover what changes.",
    "What could you discover<br>beside one flower?",
  );
cover.study = {
  path: "Welcome → Continue exploring → Explore",
  steps: [
    "Open Plantopedia and choose Continue exploring if the welcome screen appears.",
    "Use Light or Dark for the deck colors. Study shows this guide as one scrollable lesson.",
  ],
  question: "What can I learn without a garden or a camera?",
  answer:
    "You can search plants and try the pollination practice question. Sign in when you want to save plants and record check-ins.",
};
slides.push(cover);
slides.push({
  title: "A flower-watch mystery",
  role: "thesis",
  layout: "mystery-bridge",
  content: `<header><p class="eyebrow">Our story · imagine a flower at school</p><h2>A visitor today.<br><em>A quiet flower tomorrow.</em></h2></header><div class="mystery-scenes"><figure>${svg(flower(150, 110, 0.52) + bee(242, 68, 0.45), "Imagined first visit: a bee at a flower.", "0 0 350 270")}<figcaption>${icon("calendar", 25)} Visit one · a bee arrives</figcaption></figure><div class="mystery-question">${icon("search", 46)}<strong>What changed?</strong><span>Flowers? Weather? Time of day?</span></div><figure>${svg(flower(150, 110, 0.52), "Imagined second visit: the same flower without a visible visitor.", "0 0 350 270")}<figcaption>${icon("calendar", 25)} Another visit · no visitors seen</figcaption></figure></div><p class="story-purpose"><strong>Biodiversity is the variety of living things around us.</strong><br>Use Plantopedia to keep one plant’s clues. Your class can compare stories and ask what local pollinators need.</p>`,
  notes:
    "This is an imagined situation, not a recorded study. Ask students whether a quiet visit means bees never visit; it does not. Establish a reason for repeated observations and notes. The following slides show how Plantopedia helps identify a reference plant, predict visitors, understand pollen, and record changes. The later field mission is their chance to investigate their own example. Do not infer causes from one comparison.",
  sources: ["app", "nrcs"],
  study: {
    path: "Your question → app field guide → repeated observations",
    steps: [
      "Imagine two visits to the same flower: a bee arrives on one, no visitors appear on the other.",
      "Name two possible differences worth noting, such as open flowers or time of day.",
      "Choose a question that observations could help you explore.",
    ],
    question: "Is the quiet visit a failed mission?",
    answer:
      "No. No visitors during a visit is useful information. Repeated notes help you compare; they do not prove a cause on their own.",
  },
});

slides.push(
  tour({
    title: "Find your place in the journey",
    eyebrow: "01 · Open your map",
    parts: ["Explore", "See my journey"],
    heading: "Know where<br><em>to begin.</em>",
    intro: "Your Journey names the next useful action.",
    items: [
      [
        "compass",
        "Find the invitation",
        "On Explore, choose <strong>See my journey</strong>.",
      ],
      [
        "book",
        "Read the three checkpoints",
        "Explore a plant. Save a plant. Notice what changes.",
      ],
      [
        "leaf",
        "Start with curiosity",
        "Try the pollination challenge before signing in.",
      ],
    ],
    visual: appPreview("journey"),
    note: "Current app routes /explore and /journey. Guests see a preview without stored completion. Signed-in journey state comes from credited discoveries, current saved plants, and distinct care days. Independent checkpoints can be visited in any order. Interface drawing is based on current source, not a captured session.",
    study: {
      path: "Continue exploring → Explore → See my journey",
      steps: [
        "Locate Explore a plant, Save a plant, and Notice what changes.",
        "Read Try next when signed in. Missing progress is not a zero score; use Refresh journey if needed.",
      ],
      question: "Does a guest practice answer complete a saved checkpoint?",
      answer:
        "No. Practice answers are not saved mastery and do not earn Pollen. Sign in for account progress.",
    },
  }),
);
slides.push(
  tour({
    title: "Search for a plant you want to know",
    eyebrow: "02 · Meet the plant in your story",
    parts: ["Explore", "Search plants", "Sunflower"],
    heading: "Search a name.<br><em>Open a story.</em>",
    intro: "Try “sunflower” and open the built-in Sunflower card.",
    items: [
      [
        "search",
        "Type a plant name",
        "Use <strong>Search plants</strong>; a camera is optional.",
      ],
      [
        "flower",
        "Compare its clues",
        "Look at the flower, leaves, height, and season.",
      ],
      [
        "arrow",
        "Open the built-in card",
        "External website results are a different path.",
      ],
    ],
    visual: capturedPanel("search"),
    note: "Cropped verified Expo web screenshot from Nov 1, 2026. Obsolete search-scope header removed; species card content matches the current built-in sunflower reference. Current search may also show external sources. Opening external URLs does not record app discovery. Reopen the built-in card from Search after signing in if the earlier visit was as a guest.",
    study: {
      path: "Explore → Search plants → enter sunflower → built-in Sunflower",
      steps: [
        "Find the common name Sunflower and scientific name Helianthus annuus.",
        "Read two traits. Compare them with a plant you can safely observe; the reference photo is not your own observation.",
        "For saved discovery credit, open the built-in result while signed in. Guest exploration does not receive credit retroactively.",
      ],
      question:
        "Does opening an external website result complete the discovery checkpoint?",
      answer:
        "No. The supported discovery path is opening the built-in plant result from Search while signed in.",
    },
  }),
);
slides.push(
  tour({
    title: "Read the plant’s flower visitors",
    eyebrow: "03 · Make a connection",
    parts: ["Sunflower", "Pollinator visitors"],
    heading: "Who might visit<br><em>this flower?</em>",
    intro: "Read the visitor list, then turn it into a question.",
    items: [
      [
        "flower",
        "Find Pollinator visitors",
        "Sunflower lists <strong>Bee</strong> and <strong>Butterfly</strong>.",
      ],
      [
        "chat",
        "Make a prediction",
        "“Which visitor might I notice near this plant?”",
      ],
      [
        "shield",
        "Keep evidence separate",
        "A listed visitor is not a sighting you recorded.",
      ],
    ],
    visual: capturedPanel("visitors"),
    reverse: true,
    note: "Actual cropped Nov 1 Expo web profile screenshot. The shown pollinator status, annual label, and visitors are still current catalog content. Newer full-screen layout may add sign-in prompts and actions not pictured. Flower visitors listed by a reference are possibilities, not confirmation of pollination or actual local presence.",
    study: {
      path: "Search plants → Sunflower → Pollinator visitors",
      steps: [
        "Name one listed visitor and one feature of the flower.",
        "Observe from a safe distance, if you have permission. Record what you actually see—even no visitors.",
      ],
      question:
        "If a bee lands on a flower, have I proved pollination happened?",
      answer:
        "No. A visit may move pollen, but a brief look does not prove successful pollination or seed production.",
    },
  }),
);
slides.push(
  tour({
    title: "Try the pollination question",
    eyebrow: "04 · Learn by trying",
    parts: ["See my journey", "Small visitor. Big connection."],
    heading: "Try an answer.<br><em>Follow the why.</em>",
    intro: "The practice question gives an explanation after every answer.",
    items: [
      [
        "study",
        "Read the question",
        "Think about pollen moving between the same species.",
      ],
      ["check", "Choose and learn", "A wrong answer gives you another chance."],
      [
        "arrow",
        "Continue exploring",
        "Choose <strong>Explore a bee-visited plant</strong>.",
      ],
    ],
    visual: appPreview("lesson"),
    note: "Exact current PollinationLesson question and options in the illustration. It is a sample interface, not an interactive app session. The app lesson awards no Pollen and does not store mastery. In Journey, Continue routes through sunflower search. The scientific outcome is possible seed production, not guaranteed seed growth.",
    study: {
      path: "See my journey → Small visitor. Big connection.",
      steps: [
        "Choose an answer in the app and read the explanation.",
        "Explain the connection using the words pollen, flower, and seed.",
        "Use Explore a bee-visited plant to return to the field guide.",
      ],
      question: "Why is “the flower becomes a new species” not the answer?",
      answer:
        "Pollination can help a plant produce seeds. It does not instantly change a flower into another species.",
    },
  }),
);
const pollenSlide = originalSlides[2];
pollenSlide.study = {
  path: "Journey practice → explain the connection",
  steps: [
    "Trace pollen from one flower to another flower of the same species.",
    "Separate pollen transport, seed production, and the later growth of a seed.",
  ],
  question: "Does every flower visit produce a new plant?",
  answer:
    "No. Pollen must reach the right flower structures; fertilization and suitable growing conditions matter. Some plants use wind, water, or self-pollination.",
};
slides.push(pollenSlide);
slides.push(
  tour({
    title: "Save a plant to your field guide",
    eyebrow: "05 · Keep a plant to revisit",
    parts: ["Plant profile", "Sign in if needed", "Save plant"],
    heading: "Your garden<br><em>can be a field guide.</em>",
    intro: "You can save a plant you observe without owning or planting it.",
    items: [
      [
        "book",
        "Read How to care",
        "Find one care detail; check <strong>Sources → NC State Extension</strong>.",
      ],
      [
        "heart",
        "Sign in, reopen, and save",
        "Reopen the built-in result from Search. Choose <strong>Save plant</strong>.",
      ],
      [
        "leaf",
        "Return through My Garden",
        "Open the saved plant you plan to observe.",
      ],
    ],
    visual: capturedPanel("care"),
    note: "Cropped Nov 1 production Expo web screenshot shows unchanged How to care information and Save plant action. Older captures predate current account gating; current saving requires sign-in. The crop does not demonstrate a current guest save. Save is separate from planting, check-ins, and ordinary observations; it awards no Pollen by itself.",
    study: {
      path: "Plant profile → Sign in → Save plant → My Garden",
      steps: [
        "Save a supported species you can revisit. It does not have to be sunflower or a plant you own.",
        "Wait for Already saved, then find it in My Garden.",
        "Open Sources and follow NC State Extension to inspect the basis for the information.",
      ],
      question: "Does saving a plant mean I planted it?",
      answer:
        "No. My Garden also holds plants you observe. Use I planted this only for a real planting, after checking local suitability.",
    },
  }),
);
slides.push(
  tour({
    title: "Make a real observation check-in",
    eyebrow: "06 · Return for another clue",
    parts: ["My Garden", "Saved plant", "Notice what changed"],
    heading: "Notice first.<br><em>Then check in.</em>",
    intro: "Look at the same plant you saved. What is different?",
    items: [
      [
        "leaf",
        "Look for a change",
        "New leaves? Open flowers? A visitor—or none?",
      ],
      [
        "check",
        "Tap I checked this plant",
        "Wait for <strong>Check-in saved</strong>.",
      ],
      [
        "calendar",
        "Return on different days",
        "Three days count; they need not be consecutive.",
      ],
    ],
    visual: appPreview("checkin"),
    reverse: true,
    note: "Current check-in action is in a dedicated Notice what changed card, not inside How to care. It requires a supported saved plant. If none of a user’s saved plants support check-ins, the final Journey step offers Choose a plant for check-ins. Check-ins across several plants on one date still count as one care day. No points require watering.",
    study: {
      path: "My Garden → saved plant → Notice what changed → I checked this plant",
      steps: [
        "Observe the saved plant or matching species you are studying, from a permitted safe place.",
        "Record the check-in only after checking; wait for Check-in saved.",
        "If the control is missing, use Choose a plant for check-ins on the final Journey checkpoint to find a supported plant.",
      ],
      question: "Would three taps today complete three days?",
      answer:
        "No. The checkpoint counts three distinct dates. Taking days off does not reset it, and checking does not mean watering.",
    },
  }),
);
slides.push(
  tour({
    title: "Keep the details with your plant",
    eyebrow: "07 · Keep your flower-watch clues",
    parts: ["My Garden", "Saved plant", "Add observation"],
    heading: "Save the detail<br><em>you might forget.</em>",
    intro: "A short note helps you compare visits.",
    items: [
      [
        "note",
        "Describe what you saw",
        "“Two flowers open. No visitors in five minutes.”",
      ],
      [
        "calendar",
        "Add helpful context",
        "Mention time, weather, or what changed.",
      ],
      [
        "check",
        "Choose Save observation",
        "A note and a check-in do different jobs.",
      ],
    ],
    visual: appPreview("note"),
    note: "The saved plant detail exposes Add observation and Save observation. Example text is a drafted observation, not an actual student record. Ordinary notes do not award careDays; the separate I checked this plant button does. Avoid describing events or identifying animals you did not observe.",
    study: {
      path: "Saved plant → Add observation → write a note → Save observation",
      steps: [
        "Write one thing you saw and one thing you are unsure about.",
        "Use Save observation for the written record. Make the separate check-in if you checked the plant.",
        "On a later visit, compare your note with what you see now.",
      ],
      question:
        "What is stronger evidence: “this plant has lots of bees” or a timed note?",
      answer:
        "A specific note such as “one bee-like visitor during five minutes at noon” is easier to compare and leaves room for uncertainty.",
    },
  }),
);
slides.push(
  tour({
    title: "Ask about the connection you noticed",
    eyebrow: "08 · Turn a clue into a question",
    parts: ["Saved plant", "Ask", "Send"],
    heading: "Ask a question<br><em>worth following.</em>",
    intro: "Use your plant and your observation to start the conversation.",
    items: [
      [
        "chat",
        "Open Ask",
        "Use the saved plant’s <strong>Ask</strong> action for context.",
      ],
      [
        "note",
        "Write your question",
        "“Why might I see different visitors on the same flower tomorrow?”",
      ],
      [
        "arrow",
        "Choose Send",
        "Read the answer; compare important claims with a source.",
      ],
    ],
    visual: appPreview("ask"),
    reverse: true,
    note: "Ask requires sign-in. The saved plant Ask action creates/opens conversation with plant context; the tab allows general questions. Suggestion chips fill the composer but do not submit; Send submits. The illustration contains an unsent example question, no fabricated AI response. AI output may be wrong and identification does not establish edibility.",
    study: {
      path: "My Garden → saved plant → Ask → type → Send",
      steps: [
        "Include a plant name and something you observed.",
        "Ask for an explanation or comparison, not just a yes/no answer.",
        "Check the plant source or a local guide for important claims. Do not use an AI answer to decide a plant is safe to eat.",
      ],
      question: "How can you improve “Are bees good?”",
      answer:
        "Try “How could bees visiting this plant help it produce seeds, and what should I watch for?” It names a relationship you can investigate.",
    },
  }),
);
slides.push(
  tour({
    title: "Use a photo as a clue",
    eyebrow: "Optional · Photo exploration",
    parts: ["Scan", "Plant", "Save plant", "Identify from photos"],
    heading: "A photo offers clues.<br><em>Keep checking.</em>",
    intro:
      "Another plant catches your eye? A photo is an optional way to start a new record.",
    items: [
      [
        "camera",
        "Capture and save",
        "Photograph a plant or <strong>Choose a photo</strong>; use it and save.",
      ],
      [
        "search",
        "Find possible matches",
        "On the saved plant: <strong>Identify from photos → Choose photos → Find matches</strong>.",
      ],
      [
        "shield",
        "Compare before choosing",
        "Use <strong>Compare other matches</strong> or <strong>Decide later</strong>.",
      ],
    ],
    visual: appPreview("scan"),
    note: "Do not imply immediate identification from the camera. Capture and save precede identification selection. No provider result is shown or fabricated. If OpenAI visual fallback appears, preserve its unverified best guess framing; unverified guesses do not earn species-discovery rewards. Identification does not establish edibility. Follow school and adult guidance for images.",
    study: {
      path: "Scan → Plant → Photograph a plant / Choose a photo → Use photo → Save plant → Identify from photos",
      steps: [
        "Frame a plant feature without including people or private details.",
        "After saving, choose relevant photos and use Find matches when available.",
        "Compare visible traits; leave uncertain matches undecided. Search by name remains an alternative.",
      ],
      question: "Does a high match score prove the plant is safe to eat?",
      answer:
        "No. A model’s suggestion is evidence to check, not proof of identity or edibility.",
    },
  }),
);
slides.push(
  tour({
    title: "Read your progress without guessing",
    eyebrow: "09 · Find the next useful step",
    parts: ["Explore", "See my journey"],
    heading: "See what’s recorded.<br><em>Choose what’s next.</em>",
    intro: "The map reflects app activity, not a test score.",
    items: [
      [
        "check",
        "Complete means recorded",
        "A discovery, a current saved plant, or three check-in days.",
      ],
      ["arrow", "Try next gives a route", "Use its action to keep exploring."],
      [
        "calendar",
        "Breaks are allowed",
        "Your observation days do not need to be consecutive.",
      ],
    ],
    visual: appPreview("progress"),
    reverse: true,
    note: "The panel is explicitly Example progress: discovery and saved plant complete, care 1/3, overall 2/3. No real account data is used. Deleting all saved plants reopens only the save checkpoint. Loading failures display unknown data and a refresh action; do not mistake them for lost progress.",
    study: {
      path: "Explore → See my journey → Try next",
      steps: [
        "Read the number of completed checkpoints and the named next step.",
        "Remember that a practice answer or an ordinary note does not complete care days.",
        "If data is unavailable, use Refresh journey when connected.",
      ],
      question:
        "In the example, why are 2/3 checkpoints complete but only 1/3 observation days recorded?",
      answer:
        "Exploring and saving are two completed checkpoints. The third checkpoint needs observations on three distinct dates.",
    },
  }),
);
slides.push(
  tour({
    title: "Choose a style with your Pollen",
    eyebrow: "10 · Make it yours",
    parts: ["See my journey", "Pollen & avatars", "Make it yours"],
    heading: "Earn a little Pollen.<br><em>Choose your style.</em>",
    intro: "Pollen is game currency for avatar styles.",
    items: [
      [
        "flower",
        "Our first signed-in visit",
        "<strong>5 discovery + 20 quest + 5 check-in = 30 Pollen</strong> in our example.",
      ],
      [
        "heart",
        "Pick an avatar",
        "Open <strong>Pollen & avatars</strong>, then choose <strong>Buy</strong> or <strong>Equip</strong>.",
      ],
      [
        "shield",
        "Keep points in perspective",
        "Spending does not lower your level or measure biodiversity.",
      ],
    ],
    visual: appPreview("rewards"),
    note: "Current avatar prices: Sprout0, Sunshine25, Meadow60, Pollen guardian120. Avatar assets are the actual bundled app previews. Buying only succeeds with enough balance; this illustration uses an explicitly labeled example balance. New species +5 once/species, daily bee quest +20 once/day for qualifying built-in search result opened signed in. XP caps at one level/day; at100 resets0, no overflow carry.",
    study: {
      path: "Journey → Pollen & avatars → Quests & avatar → Make it yours",
      steps: [
        "Read your balance, then look at a style’s Pollen price.",
        "Use Buy when you have enough; use Equip for an owned style.",
        "Distinguish Pollen you can spend from XP and level.",
      ],
      question: "If you have 25 Pollen and buy Sunshine, what changes?",
      answer:
        "Your balance becomes 0 and Sunshine is equipped. Your XP and level do not decrease. Game points do not measure ecological impact.",
    },
  }),
);
const localSlide = originalSlides[8];
localSlide.content = localSlide.content.replace(
  "From one flower to a neighborhood",
  "What could help our flower visitors?",
);
localSlide.study = {
  path: "Plant profile → Sources → NC State Extension; planting guidance near I planted this",
  steps: [
    "Find a source for the plant and check a local native-plant guide with an adult.",
    "Look for a variety of locally native species and flowering times.",
    "Read the app’s limited regional guidance before using I planted this. Planting is optional.",
  ],
  question: "Does “Pollinator-friendly” mean this plant belongs everywhere?",
  answer:
    "No. Local suitability matters. The app currently has broad North Carolina guidance, not complete regional advice. Some plants can be invasive elsewhere.",
};
slides.push(localSlide);
const mission = originalSlides[10];
mission.title = "Now tell your own flower-watch story";
mission.layout = "mission-payoff";
mission.content = `<header><p class="eyebrow">Your turn · use the tools we just explored</p><h2>What will your<br><em>plant’s story reveal?</em></h2><p class="mission-intro">We began with a flower that had different visitors on different days. Now choose a plant your class can safely revisit.</p></header><div class="mission-grid"><article>${icon("search", 42)}<span class="step-tag">Start your story</span><h3>Meet & save</h3><p><strong>Search plants → Save plant</strong><br>Ask: “Who might visit?”</p></article><article>${icon("calendar", 42)}<span class="step-tag">Gather the clues</span><h3>Look & record</h3><p><strong>My Garden → I checked this plant</strong><br>Add a note on three different days.</p></article><article>${icon("chat", 42)}<span class="step-tag">Share the discovery</span><h3>Compare & explain</h3><p>Bring two notes and one question. Tell what changed or stayed the same—and what you still wonder.</p></article></div><p class="mission-purpose">Your notes give the class evidence to discuss where flower visitors find food. Curiosity counts more than a Pollen total.</p>`;
mission.notes =
  "Connect back explicitly to the imagined flower-watch mystery on slide2. Now students apply the tools already demonstrated: search, save, observe, check in, write notes, ask, and compare. Choose a supported plant in a permitted place. The class deliverable is two dated notes, one difference or something that stayed the same, and one remaining question. Three different check-in days complete the app observation checkpoint; written notes are separate. Offer shared classroom observations or indoor research if outdoor access is difficult. This is not a competition or proof of environmental improvement.";
mission.study = {
  path: "Search plants → Save plant → My Garden → check in + Save observation → compare",
  steps: [
    "Choose a supported plant in a permitted place. Save it and write a question about its flowers or visitors.",
    "Visit on three different dates when possible. Check in after looking; separately save what you actually saw, with the time or weather.",
    "Bring two notes to class. Describe a difference or something that stayed the same, one possible explanation, and one thing you cannot yet conclude.",
  ],
  question: "How does this mission connect to helping biodiversity?",
  answer:
    "Knowing local plants and their visitors helps you ask better habitat questions. Use a local guide with an adult before proposing diverse native plants or seasonal flowers. Your notes alone do not prove biodiversity increased.",
};
slides.push(mission);
const closing = originalSlides[11];
closing.content = closing.content
  .replace(
    "Your next discovery is nearby",
    "Your flower-watch story starts here",
  )
  .replace(
    "Open Plantopedia.<br>Choose <strong>See my journey.</strong><br>Explore your first plant.",
    "Open Plantopedia.<br><strong>Explore → See my journey</strong><br>Choose your next step—and your first question.",
  );
closing.study = {
  path: "Explore → See my journey → Search plants",
  steps: [
    "Choose one action to try now: open the journey, search a plant, or try the pollination question.",
    "Use the illustrated guide if you want the full step-by-step instructions.",
  ],
  question: "What is one question you want to investigate near your school?",
  answer:
    "Start small: which visitors appear, when flowers open, or what changes after a rainy day. A clear question makes a short observation meaningful.",
};
slides.push(closing);

const narration = [
  "Invite a memory: What plant do you pass every day? Pause for two answers. Today, one ordinary flower becomes a story worth following. Next, introduce a tiny mystery.",
  "Imagine a bee at a school flower on one visit, then no visitors next time. Ask: What could have changed? Welcome several ideas without deciding a cause. We need a way to collect clues, so open the Journey.",
  "The Journey gives our question a path. It is not a race. Point out that students can explore freely before an account; later, signing in will keep their plant story. Our next clue is the plant’s name.",
  "Meet the plant before explaining its visitors. Practice with the built-in Sunflower card; students should choose a supported plant they can actually revisit. The next screen gives possibilities to investigate.",
  "The visitor list says who might arrive. Ask students to predict what they might see, then distinguish that prediction from evidence. Why would a flower visitor matter? The practice question takes us there.",
  "Invite a vote on the pollination question before revealing an explanation. Mistakes offer a useful conversation, not a penalty. We now know pollen may help seeds form; follow that connection visually.",
  "Trace the three steps slowly: a visitor, pollen transfer, possible seeds. This makes our small mystery matter beyond one afternoon. To keep watching, we need a plant saved in our field guide.",
  "Our example began as guest browsing. Sign in, reopen the built-in result from Search, and then save. This records the discovery as well as giving us a place to return. We are ready for another visit.",
  "Return to the same plant and look before tapping. On our imagined second visit, two flowers are open but no visitors appear in five minutes. The check-in records the visit; the next tool keeps the details.",
  "A check-in remembers the visit. A note remembers what happened. Read the quiet-visit note aloud. Ask which extra detail—time or weather—would help compare it with the first visit. Now we have a specific question for Ask.",
  "Use the exact quiet-visit clue: why might visitors differ tomorrow? Ask can suggest explanations, but we must check them against sources and future observations. Keep guesses separate from conclusions.",
  "This is an optional side path. If another unfamiliar plant joins the story, Scan starts a new plant record and later identification can suggest matches. It does not instantly verify identity. Now return to our recorded progress.",
  "Two checkpoints are complete, while only one of three distinct check-in dates is recorded in this example. Ask the class to explain the difference. A patient return matters more than rapid tapping.",
  "Our illustrative 30 Pollen came from a first species, today’s bee quest, and one check-in. Choose a style as a small celebration. Keep this brief: the real story is still about the plant and its visitors.",
  "Zoom out: biodiversity is the variety of living things and their relationships. Different locally native plants and flowering times can support different visitors. Our observations can lead to better questions about habitat, not claims that points changed nature.",
  "Return explicitly to the opening mystery. Now students create their own flower-watch story: a saved plant, repeated observations, two dated notes, one difference or something that stayed the same, and one remaining question. Explain the purpose before assigning the task: give the class evidence to discuss what local flower visitors need.",
  "Ask each student to name a first question or a first action. End with an invitation to notice something ordinary more carefully. The guide remains available in Study mode when they want exact steps.",
];
slides.forEach((slide, index) => {
  slide.narration = narration[index];
  slide.chapter = index < 4 ? 0 : index < 7 ? 1 : index < 14 ? 2 : 3;
});
const sources = {
  app: ["Plantopedia journey guide", "../biodiversity-journey-guide.md"],
  nrcs: [
    "USDA NRCS · Insects and Pollinators",
    "https://www.nrcs.usda.gov/conservation-basics/animals/insects-pollinators",
  ],
  forest: [
    "US Forest Service · Native plants and pollinators (PDF)",
    "https://www.fs.usda.gov/wildflowers/pollinators/documents/AttractingPollinatorsV5.pdf",
  ],
};
function studyBlock(s, i) {
  const study = s.study;
  return `<div class="study-guide" data-study hidden aria-label="Study guide for slide ${i + 1}"><div><p class="study-kicker">${icon("study", 20)} Study guide · practice here is not saved in the app</p><h3>Try it in Plantopedia</h3><p class="study-path">${esc(study.path)}</p><ol>${study.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol></div><details><summary>${esc(study.question)}</summary><p>${esc(study.answer)}</p></details></div>`;
}
function chapterRail(current) {
  return `<div class="story-rail-footer" aria-label="Story chapter">${[
    ["search", "Meet"],
    ["flower", "Connect"],
    ["calendar", "Return"],
    ["leaf", "Care"],
  ]
    .map(
      ([name, label], i) =>
        `<span class="${i === current ? "is-current" : ""}">${icon(name, 17)}${label}</span>`,
    )
    .join("")}</div>`;
}
function section(s, i) {
  const n = i + 1;
  return `<section class="slide" id="slide-${n}" data-slide data-layout="${s.layout}" data-title="${esc(s.title)}" aria-labelledby="title-${n}"><div class="main-frame ${s.layout}">${s.content.replace(n === 1 ? "<h1>" : "<h2>", n === 1 ? `<h1 id="title-${n}">` : `<h2 id="title-${n}">`)}</div>${chapterRail(s.chapter)}${studyBlock(s, i)}</section>`;
}
const sections = slides.map(section);
const head = (title) =>
  `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(title)}</title><link rel="stylesheet" href="slides.css"></head>`;
const notes = slides
  .map(
    (s, i) =>
      `<article data-notes-for="${i + 1}"><h2>${i + 1}. ${esc(s.title)}</h2><h3 class="notes-label">Speaking prompts & transition</h3><p>${esc(s.narration)}</p><h3 class="notes-label">Presenter reference</h3><p>${esc(s.notes)}</p><p class="source">Sources: ${s.sources.map((k) => `<a href="${sources[k][1]}">${sources[k][0]}</a>`).join(" · ")}</p></article>`,
  )
  .join("\n");
const dots =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';
const controls = `<footer class="toolbar" aria-label="Slide controls"><a class="wordmark" href="#slide-1" aria-label="First slide" title="First slide">${icon("leaf", 20)}</a><nav class="navigation" aria-label="Slide navigation"><button type="button" id="previous" aria-label="Previous slide" title="Previous slide (←)">←</button><output id="counter" aria-live="polite" aria-atomic="true">1 / ${slides.length}</output><button type="button" id="next" aria-label="Next slide" title="Next slide (→)">→</button></nav><div class="display-controls" role="group" aria-label="Display options"><button type="button" data-theme-choice="light" aria-pressed="false" title="Light colors" aria-label="Light colors">${icon("sun", 19)}</button><button type="button" data-theme-choice="dark" aria-pressed="false" title="Dark colors" aria-label="Dark colors">${icon("moon", 19)}</button><button type="button" id="study-toggle" aria-pressed="false" title="Study mode (S): steps and reflection" aria-label="Study mode">${icon("book", 19)}</button></div><details class="dock-more"><summary aria-label="More controls" title="More controls">${dots}</summary><div class="dock-menu"><button type="button" data-theme-choice="system" aria-pressed="true" title="Use device colors">${icon("auto", 18)}<span>Device theme</span></button><button type="button" id="notes-toggle" aria-expanded="false" aria-controls="presenter-notes">${icon("note", 18)}<span>Presenter notes</span></button><button type="button" id="print">${icon("book", 18)}<span>Print slides</span></button><a href="../biodiversity-journey-guide.html">${icon("compass", 18)}<span>Full app guide</span></a></div></details></footer>`;
await writeFile(
  `${root}index.html`,
  `${head("Plantopedia · Your neighborhood is alive")}<body class="deck"><a class="skip-link" href="#slides">Skip to slides</a><main id="slides" class="stage" tabindex="-1" aria-label="Neighborhood nature adventure">${sections.join("\n")}</main><aside id="presenter-notes" class="presenter-notes" aria-label="Presenter notes" hidden>${notes}</aside>${controls}<footer class="deck-help">← → Slides · S Study · N Notes · <a href="presenter-notes.md">Presenter guide</a> · <a href="README.md">Help & sources</a></footer><noscript><p class="no-script">JavaScript is off: all slides are shown in order. Your system color theme is used. Print from your browser menu.</p></noscript><script src="deck.js" defer></script></body></html>\n`,
);
for (let i = 0; i < slides.length; i++)
  await writeFile(
    `${root}slide_${String(i + 1).padStart(2, "0")}.html`,
    `${head(`Plantopedia · ${i + 1}. ${slides[i].title}`)}<body class="standalone"><main class="stage">${sections[i]}</main></body></html>\n`,
  );
await writeFile(
  `${root}presenter-notes.md`,
  `# Your neighborhood is alive\n\nA ${slides.length}-slide Plantopedia app walkthrough for middle-school learners. Allow 20–30 minutes, with pauses for questions. Follow with optional observations over three different days.\n\n${slides.map((s, i) => `## ${i + 1}. ${s.title}\n\n**Speaking prompts & transition**\n\n${s.narration}\n\n**Presenter reference**\n\n${s.notes}\n\nSources: ${s.sources.map((k) => `[${sources[k][0]}](${sources[k][1]})`).join("; ")}.\n`).join("\n")}\n## Facilitation\n\n- Welcome uncertainty and observations of no visitors.\n- Planting, photos, and a private garden are optional.\n- Ask for an explanation, an observation comparison, and a local source to consult—not a score target.\n- Use the app guide for precise account and reward behavior.\n\nScience sources checked November 7, 2026. Screenshots are dated crops of existing Expo web evidence, not fresh native captures. Interface illustrations show current labels and explicitly marked example states. See assets/README.md for provenance. Original SVG drawings are not species identification references.\n`,
);
await writeFile(
  `${root}manifest.json`,
  JSON.stringify(
    slides.map((s, i) => ({
      number: i + 1,
      title: s.title,
      role: s.role,
      layout: s.layout,
      file: `slide_${String(i + 1).padStart(2, "0")}.html`,
    })),
    null,
    2,
  ) + "\n",
);
console.log(
  `Built ${slides.length} slides, interactive index, notes, and manifest.`,
);
