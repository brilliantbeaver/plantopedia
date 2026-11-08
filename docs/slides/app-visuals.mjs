/** Original line art and explicitly labeled interface illustrations for the deck.
 * These HTML panels are teaching diagrams, not captures of a running app.
 * English app labels checked against src/ on 2026-11-07.
 */
const paths = Object.freeze({
  compass:
    '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.6 5.4L8 16l2.6-5.4Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  leaf: '<path d="M20 3C8 2 2 8 5 16c7 5 15-1 15-13Z"/><path d="M4 21 16 8M9 15l-1-5M13 11h4"/>',
  flower:
    '<circle cx="12" cy="12" r="3"/><path d="M9 9C3 10 3 2 8 3c2 0 3 2 4 5 1-3 2-5 4-5 5-1 5 7-1 6 6 0 7 6 3 8-3 1-5-1-6-2-1 4-6 7-8 3-2-3 1-7 5-6"/>',
  book: '<path d="M12 6C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15"/><path d="M5 8h3M16 8h3M5 12h3M16 12h3"/>',
  camera:
    '<path d="M8 6 9.5 3h5L16 6h4a2 2 0 0 1 2 2v11H2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12.5" r="4"/>',
  chat: '<path d="M21 11a8 8 0 0 1-8 8H8l-5 3 1-6a8 8 0 1 1 17-5Z"/><path d="M8 9h8M8 13h5"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M7 2v6M17 2v6M3 11h18m-14 5 3 3 7-6"/>',
  arrow: '<path d="M3 12h17m-6-6 6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
  moon: '<path d="M21 14A9 9 0 0 1 10 3a9.2 9.2 0 1 0 11 11Z"/>',
  auto: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 22h8M12 17v5M12 6v8"/><path d="M12 6a4 4 0 0 1 0 8" fill="currentColor"/>',
  study: '<path d="m2 8 10-5 10 5-10 5Zm4 3v6c4 3 8 3 12 0v-6M22 8v9"/>',
  note: '<path d="M14 3H4v18h16V11M12 14l2-5 6-6 3 3-6 6-5 2ZM7 17h7"/>',
  heart: '<path d="M12 21 3.5 12.5C-2 6 7 0 12 6c5-6 14 0 8.5 6.5Z"/>',
  shield: '<path d="M12 2 21 6v6c0 5-5 8-9 10-4-2-9-5-9-10V6Zm-5 10 3 3 7-7"/>',
  seed: '<path d="M12 22V10M12 14C3 14 2 7 3 4c6 0 9 4 9 10Zm0-4c0-6 4-9 9-9 1 5-2 9-9 9Z"/>',
});
export function icon(name, size = 24) {
  if (!Object.hasOwn(paths, name))
    throw new Error(`Unknown slide icon: ${name}`);
  if (!Number.isFinite(size) || size <= 0)
    throw new Error("Icon size must be positive");
  return `<svg class="slide-icon icon-${name}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
const button = (text, name = "arrow", secondary = false) =>
  `<div class="preview-button${secondary ? " is-secondary" : ""}">${icon(name, 20)}<span>${text}</span></div>`;
const row = (title, detail, name, status = "") =>
  `<div class="preview-row"><span class="preview-icon">${icon(name, 24)}</span><div><h4 class="preview-subtitle">${title}</h4>${status ? `<span class="preview-status">${status}</span>` : ""}${detail ? `<p class="preview-muted">${detail}</p>` : ""}</div></div>`;
const avatar = (id, name, tier, cost, action, detail = "") =>
  `<div class="preview-avatar-card"><img class="preview-avatar" src="assets/avatars/${id}.png" width="76" height="76" alt="${name} avatar artwork"><h4 class="preview-subtitle">${name}</h4><p class="preview-muted">${tier} · ${cost} Pollen</p>${detail ? `<p class="preview-shortfall">${detail}</p>` : ""}<div class="preview-avatar-action${action === "Equipped" ? " is-equipped" : ""}">${action === "Equipped" ? icon("check", 16) : ""}${action}</div></div>`;
const panels = {
  journey: {
    title: "Your biodiversity journey",
    icon: "compass",
    example: "Example · guest preview",
    body: `<div class="preview-card"><h4 class="preview-subtitle">Your adventure starts here</h4><p class="preview-muted">Try the learning challenge freely. Sign in to save plants and keep your journey progress.</p></div>${row("Explore a plant", "", "search", "To explore")}${row("Save a plant", "", "heart", "To explore")}${row("Notice what changes", "", "calendar", "To explore")}`,
  },
  lesson: {
    title: "Small visitor. Big connection.",
    icon: "flower",
    example: "Example · practice question",
    body: `<div class="preview-diagram" aria-hidden="true">${icon("flower", 35)}${icon("arrow", 22)}${icon("flower", 35)}</div><p class="preview-question">A bee carries pollen between flowers of the same species. What can happen next?</p>${button("The pollen waters the plant.", "seed", true)}${button("The plant can make seeds.", "seed", true)}${button("The flower becomes a new species.", "seed", true)}`,
  },
  checkin: {
    title: "Sunflower",
    icon: "leaf",
    example: "Example · saved plant, before check-in",
    body: `<p class="preview-scientific">Helianthus annuus</p><div class="preview-card"><h4 class="preview-subtitle">Notice what changed</h4><p class="preview-muted">Look at this saved plant: are there new leaves, flowers, or visitors? Observe from a safe distance. You do not need a garden, and checking does not mean watering.</p>${button("I checked this plant", "check", true)}</div>${button("Already saved", "heart", true)}`,
  },
  note: {
    title: "Sunflower",
    icon: "leaf",
    example: "Example · unsaved observation",
    body: `<div class="preview-card"><h4 class="preview-subtitle">Add observation</h4><div class="preview-input"><p>Two flowers are open. No visitors in five minutes.</p></div>${button("Save observation", "note")}</div>`,
  },
  ask: {
    title: "Ask",
    icon: "chat",
    example: "Example · unsent question",
    body: `<div class="preview-card"><p class="preview-muted">Talking about</p><h4 class="preview-subtitle">Sunflower</h4></div><div class="preview-input"><p>Why might I see different visitors on the same flower tomorrow?</p></div>${button("Send", "arrow")}<p class="preview-muted">Plantopedia is AI. Identification does not establish edibility.</p>`,
  },
  scan: {
    title: "Photograph a plant",
    icon: "camera",
    example: "Example · before taking a photo",
    body: `<p class="preview-muted">A new discovery starts with a photo.</p><div class="preview-tabs"><span class="is-selected">${icon("leaf", 18)}Plant</span><span>${icon("search", 18)}Bug</span></div><div class="preview-photo-placeholder" aria-hidden="true">${icon("camera", 62)}</div><p class="preview-muted">Fill the frame with a leaf, flower, or the whole plant.</p>${button("Photograph a plant", "camera")}${button("Choose a photo", "camera", true)}`,
  },
  progress: {
    title: "Your biodiversity journey",
    icon: "compass",
    example: "Example · two checkpoints complete",
    body: `<div class="preview-card"><h4 class="preview-subtitle">Your field guide path</h4><p class="preview-muted">Go at your own pace. No garden needed. These checkpoints can be explored in any order.</p><p class="preview-label">2/3 checkpoints complete</p><div class="preview-track" aria-hidden="true"><span class="preview-fill preview-two-thirds"></span></div></div>${row("Explore a plant", "", "search", "Complete")}${row("Save a plant", "", "heart", "Complete")}${row("Notice what changes", "1/3 different days", "calendar", "Try next")}${button("Visit my saved plants", "book")}`,
  },
  rewards: {
    title: "Make it yours",
    icon: "flower",
    example: "Example · 30 Pollen available",
    body: `<div class="preview-avatar-grid">${avatar("sprout", "Sprout", "Basic", 0, "Equipped")}${avatar("sunshine", "Sunshine", "Basic", 25, "Buy")}${avatar("meadow", "Meadow", "Rare", 60, "Buy", "Earn 30 more Pollen to unlock")}${avatar("pollen", "Pollen guardian", "Mythical", 120, "Buy", "Earn 90 more Pollen to unlock")}</div>`,
  },
};
/** A focused, non-interactive illustration of current app labels and sample state. */
export function appPreview(kind) {
  const panel = panels[kind];
  if (!Object.hasOwn(panels, kind))
    throw new Error(`Unknown interface illustration: ${kind}`);
  return `<figure class="app-preview preview-${kind}"><div class="preview-phone"><div class="preview-meta">${panel.example}</div><div class="preview-head">${icon(panel.icon, 27)}<h3 class="preview-title">${panel.title}</h3></div><div class="preview-content">${panel.body}</div></div><figcaption class="preview-caption">Interface illustration · current app labels</figcaption></figure>`;
}
const captures = Object.freeze({
  search: {
    file: "search-result.png",
    width: 353,
    height: 588,
    alt: "Actual app search result for Sunflower, with reference photograph, flower and leaf traits, height, bloom timing, and pollinator-friendly label.",
  },
  visitors: {
    file: "plant-visitors.png",
    width: 353,
    height: 633,
    alt: "Actual Sunflower profile showing its scientific name, reference photograph, annual life cycle, and Bee and Butterfly visitor labels.",
  },
  care: {
    file: "care-save.png",
    width: 352,
    height: 441,
    alt: "Actual app How to care section with Water and Sun guidance, followed by Save plant.",
  },
});
/** Dated crops of existing evidence, not recaptured or regenerated screens. */
export function capturedPanel(kind) {
  const capture = captures[kind];
  if (!Object.hasOwn(captures, kind))
    throw new Error(`Unknown app capture: ${kind}`);
  return `<figure class="captured-panel capture-${kind}"><img class="capture-image" src="assets/${capture.file}" width="${capture.width}" height="${capture.height}" alt="${capture.alt}"><figcaption class="preview-caption">App capture · Nov 1, 2026 · cropped</figcaption></figure>`;
}
