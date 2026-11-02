/* Local, dependency-free course reader. Lessons are bundled as data, never evaluated as code. */
(function () {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const inline = value => String(value ?? '').split(/(`[^`\n]+`)/g).map(part => part.startsWith('`') && part.endsWith('`') ? `<code>${escape(part.slice(1, -1))}</code>` : escape(part)).join('');
  const paragraphs = values => (Array.isArray(values) ? values : [values]).filter(value => value !== undefined && value !== null).map(value => `<p>${inline(value).replace(/\n/g, '<br>')}</p>`).join('');
  const list = values => (values || []).map(value => `<li>${inline(value)}</li>`).join('');
  const lessons = Array.isArray(window.PLANTOPEDIA_LESSONS) ? window.PLANTOPEDIA_LESSONS.filter(lesson => lesson && /^\d{2}$/.test(lesson.id)).sort((a, b) => a.id.localeCompare(b.id)) : [];
  const validIds = new Set(lessons.map(lesson => lesson.id));
  const main = document.getElementById('main');
  const sidebar = document.getElementById('sidebar');
  const menuButton = document.getElementById('menu-button');
  const search = document.getElementById('lesson-search');
  const storageKey = 'plantopedia.course.v1';
  const freshState = () => ({ version: 1, solid: false, completed: {}, lessons: {} });
  let storageWorks = true;
  let storageNotice = '';
  let storageWarned = false;
  let saveTimer;
  let toastTimer;
  let activeId = null;
  let currentRoute = '';
  let menuOpen = false;
  const mobile = window.matchMedia('(max-width: 900px)');

  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || raw.version !== 1) throw new Error('Unsupported saved course format');
    const clean = freshState();
    clean.solid = raw.solid === true;
    lessons.forEach(lesson => {
      if (raw.completed && raw.completed[lesson.id] === true) clean.completed[lesson.id] = true;
      const saved = raw.lessons && raw.lessons[lesson.id];
      if (!saved || typeof saved !== 'object') return;
      clean.lessons[lesson.id] = {
        notes: typeof saved.notes === 'string' ? saved.notes.slice(0, 20000) : '',
        sketch: typeof saved.sketch === 'string' ? saved.sketch.slice(0, 30000) : '',
        checks: (lesson.exercise.acceptance || []).map((_, index) => Array.isArray(saved.checks) && saved.checks[index] === true),
        answers: lesson.quiz.map((question, index) => Array.isArray(saved.answers) && Number.isInteger(saved.answers[index]) && saved.answers[index] >= 0 && saved.answers[index] < question.options.length ? saved.answers[index] : -1),
        reviewed: lesson.quiz.map((question, index) => Array.isArray(saved.reviewed) && saved.reviewed[index] === true && Array.isArray(saved.answers) && Number.isInteger(saved.answers[index]) && saved.answers[index] >= 0 && saved.answers[index] < question.options.length),
      };
    });
    return clean;
  }

  let state = freshState();
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) state = normalize(JSON.parse(saved));
  } catch (error) {
    // Corrupt data does not stop reading or operating a lab. Permission errors also
    // leave the course usable in memory for the lifetime of this open page.
    if (error instanceof SyntaxError || (error && error.message === 'Unsupported saved course format')) {
      storageNotice = 'Saved course data could not be read. This page started with fresh progress. Export any new notes you want to keep.';
    } else {
      storageWorks = false;
      storageNotice = 'Browser storage is unavailable. Your notes and progress stay in this open page; export your notes before closing it.';
    }
  }

  function savedLesson(lesson) {
    if (!state.lessons[lesson.id]) state.lessons[lesson.id] = {
      notes: '', sketch: '', checks: lesson.exercise.acceptance.map(() => false),
      answers: lesson.quiz.map(() => -1), reviewed: lesson.quiz.map(() => false),
    };
    return state.lessons[lesson.id];
  }

  function toast(message) {
    const host = document.getElementById('toast');
    clearTimeout(toastTimer);
    host.textContent = message;
    host.hidden = false;
    toastTimer = setTimeout(() => { host.hidden = true; }, 6500);
  }

  function saveStatus(message) {
    main.querySelectorAll('[data-save-status]').forEach(host => { host.textContent = message; });
  }

  function persist() {
    clearTimeout(saveTimer);
    if (storageWorks) {
      try { window.localStorage.setItem(storageKey, JSON.stringify(state)); }
      catch {
        storageWorks = false;
        if (!storageWarned) {
          storageWarned = true;
          toast('Your browser could not save this change. It remains in this open page. Export your learning notes before closing.');
        }
      }
    }
    saveStatus(storageWorks ? 'Saved in this browser. You can also export a backup from the sidebar.' : 'Kept in this open page only. Export your learning notes before closing.');
  }

  function queueSave() {
    saveStatus(storageWorks ? 'Saving your latest changes…' : 'Kept in this open page only. Export your learning notes before closing.');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 300);
  }

  function syncSurface() {
    document.body.classList.toggle('solid', state.solid);
    const button = document.getElementById('display-mode');
    button.setAttribute('aria-pressed', String(state.solid));
    button.textContent = state.solid ? 'Use glass surfaces' : 'Use solid surfaces';
  }

  function renderNav(announce) {
    const term = search.value.trim().toLocaleLowerCase();
    const matching = lessons.filter(lesson => [lesson.id, lesson.title, lesson.subtitle, lesson.stage, ...lesson.outcomes].join(' ').toLocaleLowerCase().includes(term));
    document.getElementById('lesson-nav').innerHTML = matching.map(lesson => `<a href="#lesson-${escape(lesson.id)}" class="nav-item${state.completed[lesson.id] ? ' done' : ''}"${activeId === lesson.id ? ' aria-current="page"' : ''}><span class="nav-number" aria-hidden="true">${state.completed[lesson.id] ? '✓' : escape(lesson.id)}</span><span>${escape(lesson.title)}<small>${escape(lesson.stage)} · ${escape(lesson.minutes)} min${state.completed[lesson.id] ? ' · Completed' : ''}</small></span></a>`).join('') || '<p class="small">No lessons match. Try “camera,” “state,” or clear the search.</p>';
    const complete = lessons.filter(lesson => state.completed[lesson.id]).length;
    document.getElementById('progress-label').textContent = `${complete} of ${lessons.length} completed`;
    document.getElementById('progress-percent').textContent = `${lessons.length ? Math.round(complete / lessons.length * 100) : 0}%`;
    const progress = document.getElementById('course-progress');
    progress.max = Math.max(1, lessons.length);
    progress.value = complete;
    if (announce) document.getElementById('search-status').textContent = `${matching.length} ${matching.length === 1 ? 'lesson matches' : 'lessons match'}${term ? ' your search' : ''}.`;
  }

  const diagramInfo = {
    runtime: ['One description, three render targets', 'Follow the arrows from JSX to the platform renderer. iOS and Android render native views; React Native Web renders browser elements.'],
    components: ['A plant card as a component tree', 'Read from parent to child. Data flows down as props, and an event callback reports a user action to its owner.'],
    layout: ['A card’s main axis and remaining space', 'The fixed image and flexible text have different jobs. Compare row and column, then check long names and larger text.'],
    navigation: ['Routes preserve specimen identity', 'The bracketed route segment holds an individual specimen ID. Two plants of the same species still need separate histories.'],
    state: ['An event becomes the next render', 'Each render sees a state snapshot. A setter queues work that React uses to produce a later render.'],
    network: ['A request crosses several boundaries', 'Check identity, transport status and the returned data shape before showing a successful result. A successful empty result is distinct from failure.'],
    security: ['The server owns the trust boundary', 'Public app configuration is visible in a shipped bundle. Provider secrets stay on the server, which verifies identity and record ownership.'],
    camera: ['A photograph becomes recoverable evidence', 'Permission, readiness, retained files, preparation and upload are separate steps. A temporary preview is not a durable save.'],
    outbox: ['Confirmed checkpoints guide recovery', 'Compare the last locally recorded checkpoint with what the server may already have accepted. Retry the same intended operation with its stable identity.'],
    quality: ['Different evidence supports different claims', 'Logic, component, API and device checks cover different boundaries. A simulated camera cannot prove real permission or hardware behavior.'],
    voice: ['A session owns resources with a lifetime', 'Follow connection, capture and playback through cleanup. Old callbacks must not restart resources after the owning session ends.'],
  };

  function diagram(key) {
    if (!Object.prototype.hasOwnProperty.call(diagramInfo, key)) return '';
    const [title, caption] = diagramInfo[key];
    return `<figure class="diagram"><div class="diagram-scroll" tabindex="0" role="region" aria-label="${escape(title)}. Scroll horizontally on a narrow screen."><img src="assets/${escape(key)}.svg" alt="${escape(title)}" loading="lazy"></div><figcaption>${escape(caption)} On a narrow screen, scroll the illustration sideways to read every label. <a href="assets/${escape(key)}.svg" download>Download the SVG</a>.</figcaption></figure>`;
  }

  function codeBlock(code, id) {
    if (!code || typeof code.text !== 'string') return '';
    return `<div class="code-block"><div class="code-heading"><span>${escape(code.filename || 'Teaching example')} · ${escape(code.language || 'text')}</span><button type="button" class="copy-button" data-copy="${escape(id)}" aria-label="Copy ${escape(code.filename || 'code example')}">Copy code</button></div><pre id="${escape(id)}" tabindex="0" aria-label="${escape(code.language || 'Code')} example"><code>${escape(code.text)}</code></pre></div>`;
  }

  function renderWelcome() {
    const firstUnfinished = lessons.find(lesson => !state.completed[lesson.id]) || lessons[0];
    const completed = lessons.filter(lesson => state.completed[lesson.id]).length;
    const minutes = lessons.reduce((total, lesson) => total + Number(lesson.minutes || 0), 0);
    main.innerHTML = `<section class="hero" aria-labelledby="welcome-title"><div><div class="eyebrow"><span>A PRACTICAL, ILLUSTRATED COURSE</span><span class="pill">10 lessons · 3 platforms</span></div><h1 id="welcome-title">Grow a <em>cross-platform</em> app, one idea at a time.</h1><p class="lead">Build your understanding of React Native and Expo through Plantopedia, a plant companion with photographs, a personal garden, and conversation. See how each part works, change it, and explain what happens.</p><div class="button-row"><a class="button primary" href="#lesson-${escape(firstUnfinished ? firstUnfinished.id : '01')}">${completed ? 'Continue your field guide' : 'Start with your first screen'} <span aria-hidden="true">↗</span></a><a class="button" href="#welcome" data-jump="course-map">Explore the learning path</a></div><div class="meta-row"><span>About ${escape(Math.round(minutes / 60 * 10) / 10)} hours, plus practice</span><span class="separator" aria-hidden="true"></span><span>Beginner to confident builder</span></div></div><img src="assets/hero.svg" alt="An illustrated fern grows beside a phone showing a saved Plantopedia specimen." width="500" height="420"></section>
      <div class="feature-grid"><article class="feature glass"><span class="feature-icon" aria-hidden="true">↗</span><h3>See the idea clearly.</h3><p>Original vector diagrams reveal component trees, request paths, camera steps, and recovery checkpoints.</p></article><article class="feature glass"><span class="feature-icon" aria-hidden="true">⌘</span><h3>Change it. Predict it.</h3><p>Operate a teaching model, check your reasoning, and explain the result before comparing a worked solution.</p></article><article class="feature glass"><span class="feature-icon" aria-hidden="true">↓</span><h3>Take your practice along.</h3><p>Keep notebooks, editable React Native exercises, runnable logic checks, and solutions in a downloadable kit.</p></article></div>
      <section class="course-note glass" aria-labelledby="before-title"><h2 id="before-title">Three places to learn, with a clear purpose.</h2><p>The <strong>browser experiments</strong> are JavaScript teaching models with explicit fixture data. They do not run Expo, contact the application API, or access your camera or microphone.</p><p>The <strong>Jupyter notebooks</strong> use Python to explore analogous data and workflow ideas, alongside the React Native examples. The <strong>TSX exercise files</strong> run through Expo in the existing repository. Real permission, storage, and native voice acceptance need their stated device and backend setup.</p><p>Start with JavaScript functions, objects and arrays. The lessons explain each new React idea in plain English. Follow the repository’s pinned setup rather than upgrading its framework versions as part of this course.</p><div class="button-row"><a class="button small" href="README.md">Read setup instructions</a><a class="button small" href="course-reader.html">Read without interactions</a></div></section>
      <section aria-labelledby="course-map"><div class="section-heading"><h2 id="course-map" tabindex="-1">Your learning path</h2><span class="small">Start small. Follow one specimen through the whole app.</span></div><div class="course-grid">${lessons.map(lesson => `<a class="lesson-card glass" href="#lesson-${escape(lesson.id)}"><div class="card-top"><span class="chapter-number">LESSON ${escape(lesson.id)}</span><span class="pill">${escape(lesson.stage)} · ${escape(lesson.minutes)} min</span></div><h3>${escape(lesson.title)}</h3><p>${escape(lesson.subtitle)}</p><div class="meta-row"><span>${state.completed[lesson.id] ? '✓ Self-reported complete' : 'Illustration · experiment · guided exercise'}</span></div><span class="arrow" aria-hidden="true">↗</span></a>`).join('')}</div></section>
      <section class="course-note glass" aria-labelledby="download-title"><h2 id="download-title">Your workshop, ready to download.</h2><p>The whole course kit includes this offline HTML guide, a static reader, ten notebooks, exercise starters, worked solutions, and verification notes. Extract the archive before opening its files so all relative links keep working.</p><div class="button-row"><a class="button primary" href="downloads/plantopedia-course-kit.zip" download>Download the course kit</a><a class="button" href="downloads/plantopedia-exercises.zip" download>Exercise workspace</a><a class="button" href="downloads/plantopedia-notebooks.zip" download>Jupyter notebooks</a></div><p class="small">Completion is your own learning record. It is independent of quiz answers and is not a certificate of production or device acceptance.</p></section>`;
  }

  function quizMarkup(lesson) {
    const saved = savedLesson(lesson);
    return `<section class="quiz-section glass" id="lesson-${lesson.id}-quiz" aria-labelledby="quiz-title"><h2 id="quiz-title" tabindex="-1">Check your understanding</h2><p>Choose an answer, then check the explanation. You can change your mind and retry each question. A correct answer matters most when you can explain why it fits.</p>${lesson.quiz.map((question, index) => `<fieldset class="quiz-question" data-quiz="${index}"><legend>${index + 1}. ${escape(question.question)}</legend><div class="quiz-options">${question.options.map((option, optionIndex) => `<label class="quiz-option"><input type="radio" name="quiz-${lesson.id}-${index}" value="${optionIndex}" data-answer="${index}"${saved.answers[index] === optionIndex ? ' checked' : ''}><span>${inline(option)}</span></label>`).join('')}</div><div class="button-row"><button class="primary" type="button" data-check-question="${index}">Check my reasoning</button><button type="button" data-retry-question="${index}">Try again</button></div><div id="quiz-feedback-${index}" class="quiz-feedback" role="status" hidden></div></fieldset>`).join('')}<p class="quiz-result" id="quiz-result" aria-live="polite"></p></section>`;
  }

  function exerciseMarkup(lesson) {
    const exercise = lesson.exercise;
    const saved = savedLesson(lesson);
    return `<section class="exercise-card glass" id="lesson-${lesson.id}-exercise" aria-labelledby="exercise-title"><div class="eyebrow">MAKE THE IDEA YOUR OWN</div><h2 id="exercise-title" tabindex="-1">${escape(exercise.title)}</h2>${paragraphs(exercise.brief)}<h3>Build it step by step.</h3><ol>${list(exercise.steps)}</ol><h3>Check what you can observe.</h3><p>Tick each statement after you verify the behavior. These are your notes about the exercise, not automated test results.</p><ul class="acceptance-list">${exercise.acceptance.map((criterion, index) => `<li><label><input type="checkbox" data-acceptance="${index}"${saved.checks[index] ? ' checked' : ''}><span>${inline(criterion)}</span></label></li>`).join('')}</ul><details><summary>Show a hint</summary>${paragraphs(exercise.hint)}</details><h3><label for="code-sketch">Your code sketch</label></h3><textarea class="sketch-editor" id="code-sketch" spellcheck="false" maxlength="30000" placeholder="Write a React Native sketch or a few lines of pseudocode. This editor saves text; it does not execute code.">${escape(saved.sketch)}</textarea><p class="small">This is a local writing space. Run TSX in Expo and logic exercises with their documented Node command. Do not paste credentials into your sketch.</p><details><summary>Compare with a worked explanation</summary>${paragraphs(exercise.solution)}</details><div class="button-row"><a class="button small primary" href="downloads/lesson-${escape(lesson.id)}.zip" download>Download lesson ${escape(lesson.id)} files</a><a class="button small" href="downloads/plantopedia-exercises.zip" download>Get the exercise workspace</a></div><span class="small" data-save-status></span></section>`;
  }

  function renderLesson(lesson) {
    const saved = savedLesson(lesson);
    const index = lessons.indexOf(lesson);
    main.innerHTML = `<article><header class="lesson-header"><div class="eyebrow"><a href="#welcome">THE FIELD GUIDE</a><span aria-hidden="true">/</span><span>LESSON ${escape(lesson.id)} · ${escape(lesson.stage)}</span></div><h1>${escape(lesson.title)}</h1><p class="lesson-subtitle">${escape(lesson.subtitle)}</p><div class="meta-row"><span>${escape(lesson.minutes)} min, plus practice</span><span class="separator" aria-hidden="true"></span><span>React Native + Expo · Plantopedia</span></div><div class="button-row"><a class="button small" href="notebooks/${escape(lesson.id)}-${escape(lesson.slug)}.ipynb" download>Open the notebook download</a><a class="button small" href="downloads/lesson-${escape(lesson.id)}.zip" download>Lesson exercise files</a><a class="button small" href="course-reader.html#reader-${escape(lesson.id)}">Static reading copy</a></div></header>
      <div class="lesson-guide glass"><div><h2>By the end, you can explain and do this.</h2><ul>${list(lesson.outcomes)}</ul></div><div class="prereq"><h2>Bring this understanding.</h2>${paragraphs(lesson.prerequisites)}<p class="small">Read, predict, operate the model, then build with the exercise files. Your progress is self-reported.</p></div></div><nav class="jump-links" aria-label="Jump within this lesson">${lesson.sections.map((section, sectionIndex) => `<a href="#lesson-${lesson.id}" data-jump="lesson-${lesson.id}-section-${sectionIndex}">${escape(section.title)}</a>`).join('')}<a href="#lesson-${lesson.id}" data-jump="interactive-lab">Interactive experiment</a><a href="#lesson-${lesson.id}" data-jump="quiz-title">Knowledge check</a><a href="#lesson-${lesson.id}" data-jump="exercise-title">Guided exercise</a></nav>
      <div class="prose">${paragraphs(lesson.intro)}</div>${lesson.sections.map((section, sectionIndex) => `<section class="teaching-section" aria-labelledby="lesson-${lesson.id}-section-${sectionIndex}"><h2 id="lesson-${lesson.id}-section-${sectionIndex}" tabindex="-1">${escape(section.title)}</h2><div class="prose">${paragraphs(section.paragraphs)}</div>${section.diagram ? diagram(section.diagram) : ''}${codeBlock(section.code, `code-${lesson.id}-${sectionIndex}`)}${section.callout ? `<aside class="callout"><strong>${escape(section.callout.title)}</strong>${paragraphs(section.callout.text)}</aside>` : ''}</section>${sectionIndex === 1 ? '<section class="lab" id="interactive-lab" tabindex="-1" aria-label="Interactive teaching experiment"></section>' : ''}`).join('')}
      ${quizMarkup(lesson)}${exerciseMarkup(lesson)}<section class="notes-card glass" aria-labelledby="notes-title"><h2 id="notes-title">Explain it in your own words.</h2><label for="learning-notes">${inline(lesson.reflection)}</label><textarea id="learning-notes" maxlength="20000" placeholder="Write your prediction, observation and explanation. Include a question you want to revisit.">${escape(saved.notes)}</textarea><span class="small" data-save-status role="status"></span><p class="small">Notes stay in this browser when storage is available. Use “Export my learning notes” for a backup. Keep credentials and private plant data out of these teaching notes.</p></section>
      <section class="takeaways" aria-labelledby="takeaways-title"><h2 id="takeaways-title">Ideas to carry forward</h2><ul>${list(lesson.takeaways)}</ul></section><section class="teaching-section" aria-labelledby="source-map-title"><h2 id="source-map-title">Find the idea in the real app.</h2><p class="small">These source links target the original repository layout. In a standalone course download, use the paths as a reading map beside your application checkout.</p><ul class="repo-list">${lesson.repo.map(reference => `<li><a href="${repoHref(reference.path)}">${escape(reference.path)}</a><p>${inline(reference.why)}</p></li>`).join('')}</ul><h3>Read the official documentation.</h3><p class="small">The repository pins its package versions. Current documentation can describe a newer release; use the stated version and the checked-in source when they differ.</p><ul class="source-list">${lesson.sources.map(source => `<li><a href="${officialHref(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)} <span class="sr-only">(opens in a new tab)</span></a></li>`).join('')}</ul></section>
      <section class="completion-panel glass" aria-labelledby="completion-title"><div><h2 id="completion-title">${state.completed[lesson.id] ? 'You marked this lesson complete.' : 'Ready to carry this idea forward?'}</h2><p>Completion records your own judgment. You can return and revise it at any time.</p></div><button type="button" class="primary" id="completion-toggle" aria-pressed="${state.completed[lesson.id] ? 'true' : 'false'}">${state.completed[lesson.id] ? 'Mark as still learning' : 'Mark lesson complete'}</button></section><nav class="lesson-pagination" aria-label="Previous and next lesson">${index > 0 ? `<a class="button" href="#lesson-${lessons[index - 1].id}">← Lesson ${lessons[index - 1].id}</a>` : '<a class="button" href="#welcome">← Course overview</a>'}${index < lessons.length - 1 ? `<a class="button primary" href="#lesson-${lessons[index + 1].id}">Lesson ${lessons[index + 1].id} →</a>` : '<a class="button primary" href="#welcome">Return to your learning path →</a>'}</nav></article>`;
    const lab = document.getElementById('interactive-lab');
    if (lab) {
      if (window.CourseLabs && typeof window.CourseLabs.mount === 'function') {
        try { window.CourseLabs.mount(lab, lesson.lab); }
        catch { lab.innerHTML = '<h2>The experiment could not start.</h2><p>The lesson text and exercise files are still available. Reopen the extracted course folder or use the downloadable exercise workspace.</p>'; }
      } else lab.innerHTML = '<h2>Practice with the exercise files.</h2><p>The teaching model script did not load. The lesson and downloadable exercises remain available.</p>';
    }
    wireLesson(lesson);
    saveStatus(storageWorks ? 'Saved locally when you make changes. Export a backup from the sidebar.' : 'Kept in this open page only. Export your learning notes before closing.');
  }

  function repoHref(path) {
    const value = String(path || '');
    return /^[A-Za-z0-9_./()\[\]-]+$/.test(value) && !value.startsWith('/') && !value.split('/').includes('..') ? escape('../../' + value.split('/').map(encodeURIComponent).join('/')) : '#';
  }

  function officialHref(url) {
    try {
      const parsed = new URL(String(url));
      return parsed.protocol === 'https:' ? escape(parsed.href) : '#';
    } catch { return '#'; }
  }

  function showQuizFeedback(lesson, index, forceEmpty) {
    const saved = savedLesson(lesson);
    const question = lesson.quiz[index];
    const feedback = document.getElementById(`quiz-feedback-${index}`);
    if (!feedback) return;
    const answer = saved.answers[index];
    feedback.classList.remove('correct');
    if (forceEmpty) {
      feedback.hidden = false;
      feedback.textContent = 'Choose an answer before checking your reasoning.';
    } else if (!saved.reviewed[index] || answer < 0) {
      feedback.hidden = true;
      feedback.textContent = '';
    } else {
      feedback.hidden = false;
      const correct = answer === question.answer;
      feedback.classList.toggle('correct', correct);
      feedback.textContent = `${correct ? 'Correct. ' : `Revisit this choice. The best answer is “${question.options[question.answer]}”. `}${question.explanation}`;
    }
    const reviewed = saved.reviewed.filter(Boolean).length;
    const correctCount = saved.reviewed.filter((checked, questionIndex) => checked && saved.answers[questionIndex] === lesson.quiz[questionIndex].answer).length;
    const result = document.getElementById('quiz-result');
    result.textContent = reviewed ? `${correctCount} of ${lesson.quiz.length} answers correct · ${reviewed} reviewed. Retry any question to explain it again.` : 'Your answers are saved locally as you work. Check each explanation when you are ready.';
  }

  function wireLesson(lesson) {
    const saved = savedLesson(lesson);
    main.querySelectorAll('[data-answer]').forEach(input => input.addEventListener('change', () => {
      const index = Number(input.dataset.answer);
      saved.answers[index] = Number(input.value);
      saved.reviewed[index] = false;
      showQuizFeedback(lesson, index, false);
      queueSave();
    }));
    main.querySelectorAll('[data-check-question]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.checkQuestion);
      if (saved.answers[index] < 0) {
        showQuizFeedback(lesson, index, true);
        main.querySelector(`input[data-answer="${index}"]`).focus();
        return;
      }
      saved.reviewed[index] = true;
      showQuizFeedback(lesson, index, false);
      persist();
    }));
    main.querySelectorAll('[data-retry-question]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.retryQuestion);
      saved.answers[index] = -1; saved.reviewed[index] = false;
      main.querySelectorAll(`input[data-answer="${index}"]`).forEach(input => { input.checked = false; });
      showQuizFeedback(lesson, index, false);
      main.querySelector(`input[data-answer="${index}"]`).focus();
      persist();
    }));
    lesson.quiz.forEach((_, index) => showQuizFeedback(lesson, index, false));
    main.querySelectorAll('[data-acceptance]').forEach(input => input.addEventListener('change', () => { saved.checks[Number(input.dataset.acceptance)] = input.checked; persist(); }));
    const notes = document.getElementById('learning-notes');
    const sketch = document.getElementById('code-sketch');
    notes.addEventListener('input', () => { saved.notes = notes.value; queueSave(); });
    sketch.addEventListener('input', () => { saved.sketch = sketch.value; queueSave(); });
    notes.addEventListener('blur', persist);
    sketch.addEventListener('blur', persist);
    document.getElementById('completion-toggle').addEventListener('click', event => {
      state.completed[lesson.id] = !state.completed[lesson.id];
      event.currentTarget.setAttribute('aria-pressed', String(state.completed[lesson.id]));
      event.currentTarget.textContent = state.completed[lesson.id] ? 'Mark as still learning' : 'Mark lesson complete';
      document.getElementById('completion-title').textContent = state.completed[lesson.id] ? 'You marked this lesson complete.' : 'Ready to carry this idea forward?';
      persist(); renderNav(false);
      toast(state.completed[lesson.id] ? `Lesson ${lesson.id} marked complete. This is your self-reported learning progress.` : `Lesson ${lesson.id} is marked as still learning.`);
    });
  }

  function setMenu(open, returnFocus) {
    menuOpen = mobile.matches && open;
    sidebar.classList.toggle('open', menuOpen);
    menuButton.setAttribute('aria-expanded', String(menuOpen));
    sidebar.inert = mobile.matches && !menuOpen;
    if (mobile.matches && !menuOpen) sidebar.setAttribute('aria-hidden', 'true');
    else sidebar.removeAttribute('aria-hidden');
    if (returnFocus) menuButton.focus();
  }

  function route(moveFocus) {
    if (saveTimer) persist();
    if (window.CourseLabs && typeof window.CourseLabs.cleanup === 'function') window.CourseLabs.cleanup();
    const hash = window.location.hash || '#welcome';
    const match = /^#lesson-(\d{2})$/.exec(hash);
    activeId = match && validIds.has(match[1]) ? match[1] : null;
    currentRoute = activeId ? `#lesson-${activeId}` : '#welcome';
    if (activeId) {
      const lesson = lessons.find(candidate => candidate.id === activeId);
      document.title = `${lesson.id} · ${lesson.title} — Plantopedia`;
      renderLesson(lesson);
    } else {
      document.title = 'Plantopedia — Grow a cross-platform app';
      renderWelcome();
      if (hash !== '#welcome' && hash !== '' && hash !== '#main') toast('That lesson link was not found. Choose a lesson from the learning path.');
    }
    renderNav(false);
    setMenu(false, false);
    if (moveFocus) {
      main.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  async function copyExample(button) {
    const host = document.getElementById(button.dataset.copy);
    if (!host) return;
    const text = host.textContent;
    let copied = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text); copied = true;
      }
    } catch { /* file:// and denied permissions use the local selection fallback. */ }
    if (!copied) {
      const area = document.createElement('textarea');
      area.value = text; area.setAttribute('readonly', ''); area.setAttribute('aria-hidden', 'true'); area.tabIndex = -1;
      area.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(area);
      area.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      area.remove();
      button.focus({ preventScroll: true });
    }
    if (copied) {
      button.textContent = 'Copied';
      toast('Code copied. Run React Native examples through Expo; this reader does not execute them.');
      setTimeout(() => { if (button.isConnected) button.textContent = 'Copy code'; }, 2000);
    } else {
      const selection = window.getSelection();
      if (selection) { const range = document.createRange(); range.selectNodeContents(host); selection.removeAllRanges(); selection.addRange(range); }
      host.focus({ preventScroll: true });
      toast('Automatic copying is unavailable. The example is selected; press Command+C or Control+C, or select and copy the text manually.');
    }
  }

  document.addEventListener('click', event => {
    const jump = event.target.closest('[data-jump]');
    if (jump) {
      event.preventDefault();
      const target = document.getElementById(jump.dataset.jump);
      if (target) { target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); target.focus({ preventScroll: true }); }
      return;
    }
    const copy = event.target.closest('[data-copy]');
    if (copy) { void copyExample(copy); return; }
    const link = event.target.closest('a[href^="#"]');
    if (link && link.getAttribute('href') === '#main') {
      event.preventDefault(); main.focus(); return;
    }
    if (link && sidebar.contains(link)) {
      setMenu(false, false);
      if (link.getAttribute('href') === currentRoute) { main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
    }
  });
  document.addEventListener('pointerdown', event => { if (menuOpen && !sidebar.contains(event.target) && !menuButton.contains(event.target)) setMenu(false, false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuOpen) { event.preventDefault(); setMenu(false, true); } });
  document.addEventListener('focusin', event => { if (menuOpen && !sidebar.contains(event.target) && !menuButton.contains(event.target)) setMenu(false, false); });
  menuButton.addEventListener('click', () => { setMenu(!menuOpen, false); if (menuOpen) search.focus(); });
  mobile.addEventListener('change', () => setMenu(false, false));
  search.addEventListener('input', () => renderNav(true));
  document.getElementById('display-mode').addEventListener('click', () => { state.solid = !state.solid; syncSurface(); persist(); });
  document.getElementById('export-notes').addEventListener('click', () => {
    persist();
    const report = {
      format: 'plantopedia-learning-notes', version: 1, exportedAt: new Date().toISOString(),
      completionMeaning: 'Self-reported learning progress; not device acceptance or release certification.',
      lessons: lessons.map(lesson => {
        const saved = savedLesson(lesson);
        return { id: lesson.id, title: lesson.title, completed: state.completed[lesson.id] === true, notes: saved.notes, codeSketch: saved.sketch,
          exerciseChecks: lesson.exercise.acceptance.map((text, index) => ({ text, checked: saved.checks[index] === true })),
          quiz: lesson.quiz.map((question, index) => ({ question: question.question, selectedAnswer: saved.answers[index] >= 0 ? question.options[saved.answers[index]] : null, explanationReviewed: saved.reviewed[index] === true })) };
      }),
    };
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `plantopedia-learning-notes-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast('Your learning notes export is ready. Keep the downloaded JSON file as your backup.');
    } catch { toast('This browser could not create the download. Copy your notes and code sketches into a local text file before closing.'); }
  });
  window.addEventListener('hashchange', () => route(true));
  window.addEventListener('pagehide', () => { if (saveTimer) persist(); });
  syncSurface();
  if (lessons.length) route(false);
  else main.innerHTML = '<h1>The lesson data did not load.</h1><p>Open this page from the extracted course folder so its local scripts remain beside it. You can still use <a href="course-reader.html">the static course reader</a> and the <a href="downloads/plantopedia-course-kit.zip">course kit</a>.</p>';
  setMenu(false, false);
  if (storageNotice) toast(storageNotice);
})();
