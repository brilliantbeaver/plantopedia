/* global __dirname */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { mountDeck } = require("./deck.js");
function element(dataset = {}) {
  return {
    dataset,
    hidden: false,
    disabled: false,
    attributes: {},
    listeners: {},
    style: {
      setProperty(k, v) {
        this[k] = v;
      },
    },
    classList: {
      values: [],
      add(v) {
        if (!this.values.includes(v)) this.values.push(v);
      },
      toggle(v, force) {
        const enabled = force === undefined ? !this.values.includes(v) : force;
        this.values = this.values.filter((value) => value !== v);
        if (enabled) this.values.push(v);
        return enabled;
      },
    },
    focusCalls: [],
    focus(options) {
      this.focusCalls.push(options);
    },
    scrollCalls: [],
    scrollIntoView(options) {
      this.scrollCalls.push(options);
    },
    setAttribute(k, v) {
      this.attributes[k] = v;
    },
    addEventListener(k, fn) {
      (this.listeners[k] ??= []).push(fn);
    },
    fire(k, event = {}) {
      for (const fn of this.listeners[k] ?? []) fn(event);
    },
  };
}
function fixture(options = {}) {
  const slides = Array.from({ length: 12 }, (_, i) =>
    element({ title: `Title ${i + 1}` }),
  );
  const notes = Array.from({ length: 12 }, (_, i) =>
    element({ notesFor: String(i + 1) }),
  );
  const studyBlocks = Array.from({ length: 12 }, () => element());
  const buttons = ["light", "dark", "system"].map((themeChoice) =>
    element({ themeChoice }),
  );
  const ids = Object.fromEntries(
    [
      "previous",
      "next",
      "counter",
      "notes-toggle",
      "study-toggle",
      "presenter-notes",
      "print",
    ].map((id) => [id, element()]),
  );
  ids["presenter-notes"].hidden = true;
  const moreSummary = element();
  const more = Object.assign(element(), {
    open: false,
    querySelector: (selector) => (selector === "summary" ? moreSummary : null),
    contains: (target) =>
      target === more || target === moreSummary || target.inMore === true,
  });
  const doc = Object.assign(element(), {
    documentElement: element(),
    body: element(),
    getElementById: (id) => ids[id],
    querySelector: (selector) =>
      selector === ".dock-more" && !options.moreAbsent ? more : null,
    querySelectorAll: (selector) =>
      ({
        "[data-slide]": slides,
        "[data-notes-for]": notes,
        "[data-theme-choice]": buttons,
        "[data-study]": studyBlocks,
      })[selector] ?? [],
  });
  const media = Object.assign(element(), { matches: options.dark ?? false });
  const saved = new Map(
    options.theme ? [["plantopedia-slides-theme", options.theme]] : [],
  );
  if (options.study !== undefined)
    saved.set("plantopedia-slides-study", options.study);
  const win = Object.assign(element(), {
    innerWidth: 1600,
    innerHeight: 964,
    location: { hash: options.hash ?? "" },
    printed: 0,
    matchMedia: () => media,
    print() {
      this.printed++;
    },
  });
  win.history = {
    replaceState(_a, _b, hash) {
      if (options.historyBlocked) throw Error("blocked");
      win.location.hash = hash;
    },
  };
  Object.defineProperty(win, "localStorage", {
    get() {
      if (options.storageBlocked) throw Error("denied");
      return {
        getItem: (k) => {
          if (options.readBlocked) throw Error("denied read");
          return saved.get(k);
        },
        setItem(k, v) {
          if (options.writeBlocked) throw Error("quota");
          saved.set(k, v);
        },
      };
    },
  });
  const app = mountDeck(doc, win);
  function key(value, target = { tagName: "BODY" }, extra = {}) {
    const e = {
      key: value,
      target,
      prevented: false,
      preventDefault() {
        this.prevented = true;
      },
      ...extra,
    };
    doc.fire("keydown", e);
    return e;
  }
  return {
    app,
    doc,
    win,
    slides,
    notes,
    studyBlocks,
    buttons,
    ids,
    more,
    moreSummary,
    media,
    saved,
    key,
  };
}
test("initial slide, boundary controls, and click navigation are consistent", () => {
  const f = fixture();
  assert.equal(f.slides.filter((s) => !s.hidden).length, 1);
  assert.equal(f.ids.previous.disabled, true);
  assert.equal(f.ids.next.disabled, false);
  f.ids.next.fire("click");
  assert.equal(f.app.index, 1);
  assert.equal(f.win.location.hash, "#slide-2");
  assert.equal(f.ids.counter.textContent, "2 / 12");
  assert.match(f.ids.counter.attributes["aria-label"], /Title 2/);
  f.app.show(400);
  assert.equal(f.app.index, 11);
  assert.equal(f.ids.next.disabled, true);
  f.app.show(-3);
  assert.equal(f.app.index, 0);
});
test("deep links and hash changes open the requested slide and notes", () => {
  const f = fixture({ hash: "#slide-7" });
  assert.equal(f.app.index, 6);
  assert.equal(f.notes[6].hidden, false);
  f.win.location.hash = "#slide-3";
  f.win.fire("hashchange");
  assert.equal(f.app.index, 2);
  assert.equal(f.notes[6].hidden, true);
  assert.equal(f.notes[2].hidden, false);
  assert.match(f.doc.title, /3\. Title 3/);
});
test("malformed and out of range deep links remain in bounds", () => {
  assert.equal(fixture({ hash: "#wat" }).app.index, 0);
  assert.equal(fixture({ hash: "#slide-999" }).app.index, 11);
  assert.equal(fixture({ hash: "#slide-0" }).app.index, 0);
  assert.equal(fixture({ historyBlocked: true }).win.location.hash, "#slide-1");
});
test("keyboard shortcuts work without hijacking editing or native space activation", () => {
  const f = fixture();
  f.key("ArrowRight");
  assert.equal(f.app.index, 1);
  f.key("PageDown");
  assert.equal(f.app.index, 2);
  f.key("Home");
  assert.equal(f.app.index, 0);
  f.key("End");
  assert.equal(f.app.index, 11);
  f.key("ArrowRight");
  assert.equal(f.app.index, 11);
  f.key("PageUp");
  assert.equal(f.app.index, 10);
  f.key("ArrowLeft", { tagName: "INPUT" });
  assert.equal(f.app.index, 10);
  f.key("Home", { isContentEditable: true });
  assert.equal(f.app.index, 10);
  f.key("Home", {}, { ctrlKey: true });
  assert.equal(f.app.index, 10);
  assert.equal(
    f.key(" ", { tagName: "BUTTON", closest: () => true }).prevented,
    false,
  );
  f.key(" ");
  assert.equal(f.app.index, 11);
});
test("notes toggle works by button and shortcut; print invokes browser print", () => {
  const f = fixture();
  f.ids["notes-toggle"].fire("click");
  assert.equal(f.ids["presenter-notes"].hidden, false);
  assert.equal(f.ids["notes-toggle"].attributes["aria-expanded"], "true");
  f.key("n");
  assert.equal(f.ids["presenter-notes"].hidden, true);
  f.ids.print.fire("click");
  assert.equal(f.win.printed, 1);
});
test("explicit theme persists; System follows live device changes", () => {
  const f = fixture({ dark: true });
  assert.equal(f.doc.documentElement.attributes["data-theme"], "dark");
  assert.equal(f.buttons[2].attributes["aria-pressed"], "true");
  f.buttons[0].fire("click");
  assert.equal(f.doc.documentElement.attributes["data-theme"], "light");
  assert.equal(f.saved.get("plantopedia-slides-theme"), "light");
  f.media.fire("change");
  assert.equal(f.doc.documentElement.attributes["data-theme"], "light");
  f.buttons[2].fire("click");
  f.media.matches = false;
  f.media.fire("change");
  assert.equal(f.doc.documentElement.attributes["data-theme"], "light");
  f.media.matches = true;
  f.media.fire("change");
  assert.equal(f.doc.documentElement.attributes["data-theme"], "dark");
});
test("saved themes, invalid preferences, and denied storage do not break controls", () => {
  assert.equal(fixture({ theme: "dark" }).app.theme, "dark");
  assert.equal(fixture({ theme: "garbage" }).app.theme, "system");
  for (const options of [{ storageBlocked: true }, { writeBlocked: true }]) {
    const f = fixture(options);
    f.buttons[1].fire("click");
    assert.equal(f.doc.documentElement.attributes["data-theme"], "dark");
    f.ids.next.fire("click");
    assert.equal(f.app.index, 1);
  }
});
test("desktop scaling responds to window resize", () => {
  const f = fixture();
  assert.equal(f.doc.documentElement.style["--scale"], "1");
  f.win.innerWidth = 1200;
  f.win.fire("resize");
  assert.equal(f.doc.documentElement.style["--scale"], "0.75");
});
test("generated deck has 17 accessible slides, local assets, and a study block for each", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, "manifest.json"), "utf8"),
  );
  assert.equal(manifest.length, 17);
  assert.ok(new Set(manifest.map((s) => s.layout)).size >= 5);
  for (const slide of manifest) {
    const html = fs.readFileSync(path.join(__dirname, slide.file), "utf8");
    assert.equal((html.match(/data-slide\b/g) || []).length, 1);
    assert.match(html, new RegExp(`id="title-${slide.number}"`));
    assert.match(html, /class="main-frame /);
    assert.doesNotMatch(html, /<script/);
    assert.doesNotMatch(html, /(?:src|href)="https?:/);
    assert.equal(
      (html.match(/<svg\b/g) || []).length,
      (html.match(/<\/svg>/g) || []).length,
    );
    for (const [svg] of html.matchAll(/<svg\b[^>]*>/g)) {
      if (/aria-hidden="true"/.test(svg)) continue;
      assert.match(svg, /role="img"/);
      const label = /aria-labelledby="([^"]+)"/.exec(svg)?.[1];
      assert.ok(label, "Informative vectors need an accessible name");
      for (const id of label.split(/\s+/))
        assert.ok(html.includes(`id="${id}"`), `Missing SVG label ${id}`);
    }
    assert.equal((html.match(/data-study\b/g) || []).length, 1);
    assert.match(html, /data-study hidden/);
    for (const [img] of html.matchAll(/<img\b[^>]*>/g)) {
      assert.match(img, /alt="[^"]+"/);
      const src = /src="([^"]+)"/.exec(img)?.[1];
      assert.ok(
        src && fs.existsSync(path.resolve(__dirname, src)),
        `Missing screenshot: ${src}`,
      );
    }
  }
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.equal((html.match(/data-slide\b/g) || []).length, manifest.length);
  assert.equal((html.match(/data-study\b/g) || []).length, manifest.length);
  assert.match(html, /id="study-toggle"[^>]*aria-pressed="false"/);
  assert.match(html, /<script src="deck.js" defer><\/script>/);
  assert.doesNotMatch(html, /type="module"|<iframe/);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^https?:|^#/.test(reference)) continue;
    assert.ok(
      fs.existsSync(path.resolve(__dirname, reference.split("#")[0])),
      `Missing local dependency: ${reference}`,
    );
  }
  assert.doesNotMatch(html, /<(?:script|img)[^>]+src="https?:/);
});
test("print exposes hidden slides and fixes 16:9 page geometry; mobile reflows", () => {
  const css = fs
    .readFileSync(path.join(__dirname, "slides.css"), "utf8")
    .replace(/\s+/g, "");
  assert.match(css, /@page\{size:1600px900px;margin:0;?\}/);
  assert.match(css, /\.slide\[hidden\][^{]*\{display:block!important/);
  assert.match(css, /:root,:root\[data-theme\],:root:not\(\[data-theme\]\)/);
  assert.match(css, /@media\(max-width:999px\)/);
  assert.match(css, /height:auto;min-height:0;transform:none/);
  assert.match(
    css,
    /@mediaprint\{[^}]*\[data-study\][^{]*\{display:none!important/,
  );
});

test("skip-link and non-slide fragments preserve the current slide", () => {
  const f = fixture({ hash: "#slide-7" });
  f.win.location.hash = "#slides";
  f.win.fire("hashchange");
  assert.equal(f.app.index, 6);
});

test("Study persists independently of theme and exposes all slides with reading blocks", () => {
  const f = fixture({ theme: "dark", study: "true", hash: "#slide-7" });
  assert.equal(f.app.study, true);
  assert.equal(f.app.theme, "dark");
  assert.equal(f.doc.body.classList.values.includes("is-study"), true);
  assert.equal(f.ids["study-toggle"].attributes["aria-pressed"], "true");
  assert.equal(f.slides.filter((s) => !s.hidden).length, 12);
  assert.ok(f.studyBlocks.every((block) => !block.hidden));
  assert.equal(f.ids.previous.disabled, true);
  assert.equal(f.ids.next.disabled, true);
  assert.equal(f.slides[6].scrollCalls.length, 1);
  f.buttons[0].fire("click");
  assert.equal(f.app.theme, "light");
  assert.equal(f.app.study, true);
  assert.equal(f.saved.get("plantopedia-slides-study"), "true");
  f.ids["study-toggle"].fire("click");
  assert.equal(f.saved.get("plantopedia-slides-study"), "false");
  assert.equal(f.saved.get("plantopedia-slides-theme"), "light");
});

test("returning from Study restores the selected slide, its boundary controls, and notes", () => {
  const f = fixture({ hash: "#slide-7" });
  assert.ok(f.studyBlocks.every((block) => block.hidden));
  f.ids["notes-toggle"].fire("click");
  f.ids["study-toggle"].fire("click");
  f.ids.next.fire("click");
  assert.equal(f.app.index, 6);
  f.ids["study-toggle"].fire("click");
  assert.equal(f.app.index, 6);
  assert.equal(f.slides.filter((s) => !s.hidden).length, 1);
  assert.equal(f.slides[6].hidden, false);
  assert.equal(f.ids.previous.disabled, false);
  assert.equal(f.ids.next.disabled, false);
  assert.equal(f.notes[6].hidden, false);
  assert.equal(f.ids["presenter-notes"].hidden, false);
  assert.ok(f.studyBlocks.every((block) => block.hidden));
  f.app.show(11);
  f.app.setStudy(true);
  f.app.setStudy(false);
  assert.equal(f.ids.next.disabled, true);
  assert.equal(f.ids.previous.disabled, false);
});

test("Study preserves native scrolling keys and only toggles with a deliberate non-editing shortcut", () => {
  const f = fixture({ hash: "#slide-7" });
  assert.equal(f.key("s").prevented, true);
  assert.equal(f.app.study, true);
  for (const key of [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    " ",
  ]) {
    assert.equal(f.key(key).prevented, false, key);
    assert.equal(f.app.index, 6);
  }
  for (const target of [
    { tagName: "INPUT" },
    { tagName: "TEXTAREA" },
    { tagName: "SELECT" },
    { isContentEditable: true },
  ]) {
    assert.equal(f.key("s", target).prevented, false);
    assert.equal(f.app.study, true);
  }
  f.key("s", {}, { repeat: true });
  assert.equal(f.app.study, true);
  f.key("s", {}, { ctrlKey: true });
  assert.equal(f.app.study, true);
  f.key("n");
  assert.equal(f.ids["presenter-notes"].hidden, false);
  f.key("S", {}, { shiftKey: true });
  assert.equal(f.app.study, false);
  f.key("ArrowRight");
  assert.equal(f.app.index, 7);
});

test("Study remains usable with denied storage access, reads, writes, or invalid saved values", () => {
  assert.equal(fixture({ study: "garbage" }).app.study, false);
  for (const options of [
    { storageBlocked: true },
    { readBlocked: true },
    { writeBlocked: true },
  ]) {
    const f = fixture(options);
    f.ids["study-toggle"].fire("click");
    f.buttons[1].fire("click");
    assert.equal(f.app.study, true);
    assert.equal(f.app.theme, "dark");
    f.ids.print.fire("click");
    assert.equal(f.win.printed, 1);
    f.ids["study-toggle"].fire("click");
    assert.equal(f.app.study, false);
    assert.equal(f.slides.filter((s) => !s.hidden).length, 1);
  }
});

test("Study deep links scroll to a target without hiding other slides and become its return point", () => {
  const f = fixture({ study: "true", hash: "#slide-7" });
  f.win.location.hash = "#slide-3";
  f.win.fire("hashchange");
  assert.equal(f.app.index, 2);
  assert.equal(f.slides.filter((s) => !s.hidden).length, 12);
  assert.equal(f.slides[2].scrollCalls.length, 1);
  f.win.location.hash = "#slides";
  f.win.fire("hashchange");
  assert.equal(f.app.index, 2);
  f.app.setStudy(false);
  assert.equal(f.slides[2].hidden, false);
  assert.equal(f.slides.filter((s) => !s.hidden).length, 1);
});

test("desktop presentation fits both viewport dimensions above the compact dock", () => {
  const f = fixture();
  f.win.innerHeight = 764;
  f.win.fire("resize");
  assert.equal(Number(f.doc.documentElement.style["--scale"]), 700 / 900);
  f.doc.documentElement.clientWidth = 1200;
  f.win.innerHeight = 964;
  f.win.fire("resize");
  assert.equal(Number(f.doc.documentElement.style["--scale"]), 0.75);
  f.win.innerHeight = 514;
  f.win.fire("resize");
  assert.equal(Number(f.doc.documentElement.style["--scale"]), 0.5);
  f.win.innerHeight = 80;
  f.win.fire("resize");
  assert.equal(Number(f.doc.documentElement.style["--scale"]), 0.1);
  f.doc.documentElement.clientWidth = 999;
  f.win.fire("resize");
  assert.equal(Number(f.doc.documentElement.style["--scale"]), 1);
});

test("native summary controls keep Space activation in presentation and Study", () => {
  const f = fixture({ hash: "#slide-7" });
  assert.equal(f.key(" ", { tagName: "SUMMARY" }).prevented, false);
  assert.equal(f.app.index, 6);
  const nestedSummary = {
    tagName: "SPAN",
    closest: (selector) => (selector.includes("summary") ? {} : null),
  };
  assert.equal(f.key(" ", nestedSummary).prevented, false);
  assert.equal(f.app.index, 6);
  f.app.setStudy(true);
  assert.equal(f.key(" ", { tagName: "SUMMARY" }).prevented, false);
  assert.equal(f.key("Enter", { tagName: "SUMMARY" }).prevented, false);
  assert.equal(f.app.index, 6);
});

test("More disclosure closes on Escape with focus restored and outside clicks without stealing focus", () => {
  const f = fixture({ hash: "#slide-7" });
  f.more.open = true;
  f.doc.fire("click", { target: f.moreSummary });
  assert.equal(f.more.open, true);
  f.doc.fire("click", { target: { inMore: true } });
  assert.equal(f.more.open, true);
  assert.equal(f.key("Escape", { inMore: true }).prevented, true);
  assert.equal(f.more.open, false);
  assert.deepEqual(f.moreSummary.focusCalls, [{ preventScroll: true }]);
  assert.equal(f.app.index, 6);
  assert.equal(f.key("Escape").prevented, false);
  f.more.open = true;
  f.doc.fire("click", { target: {} });
  assert.equal(f.more.open, false);
  assert.equal(f.moreSummary.focusCalls.length, 1);
  const without = fixture({ moreAbsent: true });
  assert.equal(without.key("Escape").prevented, false);
  assert.doesNotThrow(() => without.doc.fire("click", { target: {} }));
});

test("printing Study temporarily uses presentation typography without changing saved mode or the reading position", () => {
  const f = fixture({ study: "true", theme: "dark", hash: "#slide-7" });
  const saved = Array.from(f.saved);
  const scrollCounts = f.slides.map((slide) => slide.scrollCalls.length);
  const visibility = f.slides.map((slide) => slide.hidden);
  f.win.fire("beforeprint");
  assert.equal(f.doc.body.classList.values.includes("is-study"), false);
  assert.equal(f.app.study, true);
  assert.equal(f.ids["study-toggle"].attributes["aria-pressed"], "true");
  assert.equal(f.app.index, 6);
  assert.equal(f.win.location.hash, "#slide-7");
  assert.equal(f.app.theme, "dark");
  assert.deepEqual(f.saved, new Map(saved));
  assert.deepEqual(
    f.slides.map((slide) => slide.hidden),
    visibility,
  );
  f.win.fire("beforeprint");
  f.win.fire("afterprint");
  assert.equal(f.doc.body.classList.values.includes("is-study"), true);
  assert.equal(f.app.study, true);
  assert.equal(f.app.index, 6);
  assert.deepEqual(f.saved, new Map(saved));
  assert.deepEqual(
    f.slides.map((slide) => slide.scrollCalls.length),
    scrollCounts,
  );
  assert.ok(f.studyBlocks.every((block) => !block.hidden));
  f.win.fire("afterprint");
  assert.equal(f.doc.body.classList.values.includes("is-study"), true);
});

test("printing a presentation leaves Study disabled after print or cancellation", () => {
  const f = fixture({ hash: "#slide-3" });
  f.win.fire("beforeprint");
  f.win.fire("afterprint");
  assert.equal(f.app.study, false);
  assert.equal(f.doc.body.classList.values.includes("is-study"), false);
  assert.equal(f.slides.filter((slide) => !slide.hidden).length, 1);
  assert.equal(f.slides[2].hidden, false);
  assert.equal(f.saved.has("plantopedia-slides-study"), false);
});
