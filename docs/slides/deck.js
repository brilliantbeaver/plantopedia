/* Classic script: opens directly from disk, without a server or network. */
(function () {
  "use strict";
  function mountDeck(doc, win) {
    const slides = Array.from(doc.querySelectorAll("[data-slide]"));
    if (!slides.length) return;
    const previous = doc.getElementById("previous");
    const next = doc.getElementById("next");
    const counter = doc.getElementById("counter");
    const notesButton = doc.getElementById("notes-toggle");
    const notes = doc.getElementById("presenter-notes");
    const studyButton = doc.getElementById("study-toggle");
    const more = doc.querySelector(".dock-more");
    const moreSummary = more ? more.querySelector("summary") : null;
    const studyBlocks = Array.from(doc.querySelectorAll("[data-study]"));
    const notePages = Array.from(doc.querySelectorAll("[data-notes-for]"));
    const themeButtons = Array.from(
      doc.querySelectorAll("[data-theme-choice]"),
    );
    const storageKey = "plantopedia-slides-theme";
    const studyStorageKey = "plantopedia-slides-study";
    const allowedThemes = ["light", "dark", "system"];
    let index = 0;
    let theme = "system";
    let notesOpen = false;
    let study = false;
    let printing = false;
    let storage;
    try {
      storage = win.localStorage;
    } catch (_) {
      /* Private/file contexts can deny storage. Controls still work. */
    }
    function readPreference(key) {
      try {
        return storage && storage.getItem(key);
      } catch (_) {
        return null;
      }
    }
    function savePreference(key, value) {
      try {
        storage && storage.setItem(key, value);
      } catch (_) {
        /* Optional preferences must never prevent reading. */
      }
    }
    theme = readPreference(storageKey) || "system";
    study = readPreference(studyStorageKey) === "true";
    if (!allowedThemes.includes(theme)) theme = "system";
    const system =
      typeof win.matchMedia === "function"
        ? win.matchMedia("(prefers-color-scheme: dark)")
        : null;
    function applyTheme(value, persist) {
      if (!allowedThemes.includes(value)) return;
      theme = value;
      const effective =
        theme === "system"
          ? system && system.matches
            ? "dark"
            : "light"
          : theme;
      doc.documentElement.setAttribute("data-theme", effective);
      doc.documentElement.setAttribute("data-theme-mode", theme);
      themeButtons.forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.themeChoice === theme),
        ),
      );
      if (persist) savePreference(storageKey, theme);
    }
    function resize() {
      const width = doc.documentElement.clientWidth || win.innerWidth;
      // Reserve the compact bottom dock on desktop. Small screens use the
      // stylesheet's natural reading layout instead of shrinking typography.
      const scale =
        width < 1000
          ? 1
          : Math.min(
              1,
              width / 1600,
              Math.max(0.1, (win.innerHeight - 64) / 900),
            );
      doc.documentElement.style.setProperty("--scale", String(scale));
    }
    function fromHash() {
      const found = /^#slide-(\d+)$/.exec(win.location.hash);
      return found
        ? Math.max(0, Math.min(slides.length - 1, Number(found[1]) - 1))
        : 0;
    }
    function show(requested, updateHash = true) {
      index = Math.max(0, Math.min(slides.length - 1, requested));
      slides.forEach((slide, i) => {
        slide.hidden = !study && i !== index;
      });
      notePages.forEach((page) => {
        page.hidden = Number(page.dataset.notesFor) !== index + 1;
      });
      previous.disabled = study || index === 0;
      next.disabled = study || index === slides.length - 1;
      counter.textContent = `${index + 1} / ${slides.length}`;
      counter.setAttribute(
        "aria-label",
        `Slide ${index + 1} of ${slides.length}: ${slides[index].dataset.title}`,
      );
      doc.title = `Plantopedia · ${index + 1}. ${slides[index].dataset.title}`;
      if (updateHash) {
        const hash = `#slide-${index + 1}`;
        if (win.location.hash !== hash) {
          try {
            win.history.replaceState(null, "", hash);
          } catch (_) {
            win.location.hash = hash;
          }
        }
      }
    }
    function scrollToCurrent() {
      // Native file:// pages need no router or network for in-document links.
      const slide = slides[index];
      if (typeof slide.scrollIntoView === "function")
        slide.scrollIntoView({ block: "start", behavior: "auto" });
    }
    function setStudy(value, persist = true, scroll = true) {
      study = value === true;
      doc.body.classList.toggle("is-study", study && !printing);
      if (studyButton) studyButton.setAttribute("aria-pressed", String(study));
      studyBlocks.forEach((block) => {
        block.hidden = !study;
      });
      // Keep the last selected slide while ordinary reading/scrolling happens.
      // An explicit slide hash can select a new return point in either mode.
      show(index, false);
      if (persist) savePreference(studyStorageKey, String(study));
      if (scroll) scrollToCurrent();
    }
    function closeMore(restoreFocus = false) {
      if (!more || !more.open) return;
      more.open = false;
      if (restoreFocus && moreSummary)
        moreSummary.focus({ preventScroll: true });
    }
    function toggleNotes() {
      notesOpen = !notesOpen;
      notes.hidden = !notesOpen;
      notesButton.setAttribute("aria-expanded", String(notesOpen));
    }
    previous.addEventListener("click", () => {
      if (!study) show(index - 1);
    });
    next.addEventListener("click", () => {
      if (!study) show(index + 1);
    });
    if (studyButton)
      studyButton.addEventListener("click", () => setStudy(!study));
    notesButton.addEventListener("click", toggleNotes);
    doc.getElementById("print").addEventListener("click", () => win.print());
    themeButtons.forEach((button) =>
      button.addEventListener("click", () =>
        applyTheme(button.dataset.themeChoice, true),
      ),
    );
    win.addEventListener("hashchange", () => {
      // In-page links such as Skip to slides must not reset the current slide.
      if (/^#slide-\d+$/.test(win.location.hash)) {
        show(fromHash(), false);
        if (study) scrollToCurrent();
      }
    });
    win.addEventListener("resize", resize);
    win.addEventListener("beforeprint", () => {
      if (printing) return;
      printing = true;
      // Use presentation typography for print without changing the reading
      // preference, slide visibility, current selection, or scroll position.
      doc.body.classList.toggle("is-study", false);
    });
    win.addEventListener("afterprint", () => {
      if (!printing) return;
      printing = false;
      doc.body.classList.toggle("is-study", study);
    });
    doc.addEventListener("click", (event) => {
      if (more && more.open && event.target && !more.contains(event.target))
        closeMore();
    });
    if (system && typeof system.addEventListener === "function")
      system.addEventListener("change", () => {
        if (theme === "system") applyTheme("system", false);
      });
    else if (system && typeof system.addListener === "function")
      system.addListener(() => {
        if (theme === "system") applyTheme("system", false);
      });
    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && more && more.open) {
        event.preventDefault();
        closeMore(true);
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      if (event.key.toLowerCase() === "s") {
        if (!event.repeat) {
          event.preventDefault();
          setStudy(!study);
        }
        return;
      }
      if (event.key.toLowerCase() === "n") {
        if (!event.repeat) {
          event.preventDefault();
          toggleNotes();
        }
        return;
      }
      // Reading mode leaves navigation keys to normal page scrolling and
      // browser controls. Shift+Space also retains its native behavior.
      if (study || event.shiftKey) return;
      const interactive =
        target &&
        (target.tagName === "SUMMARY" ||
          (typeof target.closest === "function" &&
            target.closest('button,a,summary,[role="button"]')));
      if (event.key === " " && interactive) return;
      const nextKeys = ["ArrowRight", "PageDown", " "];
      const previousKeys = ["ArrowLeft", "PageUp"];
      if (nextKeys.includes(event.key)) {
        event.preventDefault();
        show(index + 1);
      } else if (previousKeys.includes(event.key)) {
        event.preventDefault();
        show(index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        show(0);
      } else if (event.key === "End") {
        event.preventDefault();
        show(slides.length - 1);
      }
    });
    applyTheme(theme, false);
    resize();
    index = fromHash();
    setStudy(study, false, false);
    show(index);
    doc.body.classList.add("is-ready");
    if (study) scrollToCurrent();
    return {
      show,
      applyTheme,
      toggleNotes,
      setStudy,
      get study() {
        return study;
      },
      get index() {
        return index;
      },
      get theme() {
        return theme;
      },
    };
  }
  if (typeof module !== "undefined" && module.exports)
    module.exports = { mountDeck };
  if (typeof document !== "undefined" && typeof window !== "undefined")
    mountDeck(document, window);
})();
