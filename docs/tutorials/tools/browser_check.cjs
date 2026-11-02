/* global __dirname, Buffer */
/* Run against the tutorial-only static server. Override TUTORIAL_BASE_URL when needed.
 * Browser labs are inspected as teaching models; this does not test native Expo APIs. */
const { chromium } = (() => {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); }
  catch { return require('/Users/pmui/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'); }
})();
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const base = process.env.TUTORIAL_BASE_URL || 'http://127.0.0.1:8765/';
const previousReport = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'review/browser-verification.json'), 'utf8')); } catch { return null; } })();
const report = { checkedAt: new Date().toISOString(), baseUrl: base, browser: process.env.PLAYWRIGHT_CHANNEL ? `${process.env.PLAYWRIGHT_CHANNEL} through Playwright` : 'Dedicated Playwright Chromium headless shell', checks: [], errors: [], assetFailures: [], limits: ['Teaching models only; no native Expo, camera, audio, API, or real account acceptance.', 'Source repository links intentionally reach outside this docs-only server and are not requested.'] };
let browser;
function ok(condition, message) { assert.ok(condition, message); }
async function check(name, fn) {
  const start = Date.now();
  try { const details = await fn(); report.checks.push({ name, passed: true, milliseconds: Date.now() - start, ...(details ? { details } : {}) }); console.log('PASS', name); }
  catch (error) { report.checks.push({ name, passed: false, milliseconds: Date.now() - start, error: error.message }); console.error('FAIL', name, error.message); }
}
function observe(page, label) {
  page.on('pageerror', error => report.errors.push({ page: label, message: error.message }));
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) report.assetFailures.push({ page: label, status: response.status(), url: response.url() }); });
  page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) report.assetFailures.push({ page: label, error: request.failure()?.errorText, url: request.url() }); });
}
async function route(page, id) {
  await page.evaluate(id => { location.hash = `lesson-${id}`; }, id);
  await page.waitForFunction(id => document.querySelector('.lesson-header .eyebrow')?.textContent.includes(`LESSON ${id}`), id);
}
async function text(page, selector = '#lab-output') { return page.locator(selector).first().innerText(); }
async function contains(page, expected, selector = '#lab-output') { ok((await text(page, selector)).includes(expected), `Expected ${selector} to include ${JSON.stringify(expected)}`); }
async function send(page, scenario) {
  await page.selectOption('#network-case', scenario);
  await page.click('#network-send');
  await page.waitForFunction(() => document.querySelector('#network-send').disabled === false);
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  ok(sizes.document <= sizes.width + 1 && sizes.body <= sizes.width + 1, JSON.stringify(sizes));
  return sizes;
}
async function main() {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  browser.on('disconnected', () => console.log('Chrome disconnected at', new Date().toISOString()));
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(6000); observe(page, 'desktop');
  await page.goto(base);
  const lessons = await page.evaluate(() => window.PLANTOPEDIA_LESSONS.map(x => ({ id: x.id, title: x.title, answer: x.quiz[0].answer, options: x.quiz[0].options.length })));
  await check('Overview contains ten lesson cards and ten navigation links', async () => {
    assert.equal(await page.locator('.lesson-card').count(), 10); assert.equal(await page.locator('#lesson-nav .nav-item').count(), 10); await noOverflow(page);
  });
  await check('Lesson search filters and restores navigation', async () => {
    await page.fill('#lesson-search', 'state'); ok(await page.locator('#lesson-nav .nav-item').count() < 10); ok(await page.locator('#lesson-nav .nav-item').count() > 0);
    await page.fill('#lesson-search', 'zzno-match-zz'); assert.equal(await page.locator('#lesson-nav .nav-item').count(), 0); await contains(page, 'No lessons match', '#lesson-nav');
    await page.fill('#lesson-search', ''); assert.equal(await page.locator('#lesson-nav .nav-item').count(), 10);
  });
  for (const lesson of lessons) await check(`Lesson ${lesson.id} renders text, three quizzes, lab, graphics, and sources`, async () => {
    await route(page, lesson.id); assert.equal(await page.locator('.lesson-header h1').innerText(), lesson.title);
    assert.equal(await page.locator('[data-quiz]').count(), 3); assert.equal(await page.locator('#lab-content .lab-controls').count(), 1);
    ok(await page.locator('.source-list a').count() > 0); ok(await page.locator('.repo-list a').count() > 0); ok(await page.locator('.diagram img').count() > 0);
    await page.locator('.diagram img').evaluateAll(images => images.forEach(img => { img.loading = 'eager'; }));
    await page.waitForFunction(() => [...document.querySelectorAll('.diagram img')].every(img => img.complete && img.naturalWidth > 0));
    await noOverflow(page);
  });
  await check('Quiz blank, wrong, changed, correct, reload, and retry behavior', async () => {
    await route(page, '01'); await page.click('[data-retry-question="0"]'); await page.click('[data-check-question="0"]');
    await contains(page, 'Choose an answer', '#quiz-feedback-0');
    const answer = lessons[0].answer, wrong = (answer + 1) % lessons[0].options;
    await page.check(`input[data-answer="0"][value="${wrong}"]`); await page.click('[data-check-question="0"]'); await contains(page, 'Revisit this choice', '#quiz-feedback-0');
    await page.check(`input[data-answer="0"][value="${answer}"]`); ok(await page.locator('#quiz-feedback-0').isHidden(), 'Changing an answer resets reviewed feedback');
    await page.click('[data-check-question="0"]'); await contains(page, 'Correct.', '#quiz-feedback-0'); await page.reload();
    await page.waitForSelector('.lesson-header'); ok(await page.locator(`input[data-answer="0"][value="${answer}"]`).isChecked()); await contains(page, 'Correct.', '#quiz-feedback-0');
    await page.click('[data-retry-question="0"]'); assert.equal(await page.locator('input[data-answer="0"]:checked').count(), 0); ok(await page.locator('#quiz-feedback-0').isHidden());
    await page.reload(); assert.equal(await page.locator('input[data-answer="0"]:checked').count(), 0);
  });
  const payload = '</textarea><img src=x onerror="window.qaXss=1"><script>window.qaXss=1</script> & learning';
  await check('Notes, sketch, checklist, completion, and solid surfaces persist without HTML injection', async () => {
    await route(page, '01'); await page.fill('#learning-notes', payload); await page.fill('#code-sketch', payload); await page.check('[data-acceptance="0"]');
    if ((await page.locator('#completion-toggle').getAttribute('aria-pressed')) !== 'true') await page.click('#completion-toggle');
    await page.click('#display-mode'); ok(await page.locator('body').evaluate(body => body.classList.contains('solid')));
    await route(page, '02'); await route(page, '01'); assert.equal(await page.inputValue('#learning-notes'), payload);
    await page.reload(); assert.equal(await page.inputValue('#learning-notes'), payload); assert.equal(await page.inputValue('#code-sketch'), payload);
    ok(await page.locator('[data-acceptance="0"]').isChecked()); assert.equal(await page.locator('#completion-toggle').getAttribute('aria-pressed'), 'true');
    await contains(page, '1 of 10 completed', '#progress-label'); ok(await page.locator('body').evaluate(body => body.classList.contains('solid')));
    assert.equal(await page.evaluate(() => window.qaXss), undefined); assert.equal(await page.locator('img[src="x"]').count(), 0);
  });
  await check('Section and knowledge-check jumps retain lesson hash and focus heading', async () => {
    const hash = await page.evaluate(() => location.hash); await page.locator('.jump-links a').first().click(); assert.equal(await page.evaluate(() => location.hash), hash);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'lesson-01-section-0');
    await page.locator('.jump-links a').filter({ hasText: 'Knowledge check' }).click(); assert.equal(await page.evaluate(() => location.hash), hash); assert.equal(await page.evaluate(() => document.activeElement.id), 'quiz-title');
  });
  await check('Export contains escaped-text notes and self-reported progress', async () => {
    const downloadPromise = page.waitForEvent('download'); await page.click('#export-notes'); const download = await downloadPromise;
    const stream = await download.createReadStream(); const chunks = []; for await (const chunk of stream) chunks.push(chunk);
    const exported = JSON.parse(Buffer.concat(chunks).toString()); assert.equal(exported.lessons.length, 10); assert.equal(exported.lessons[0].notes, payload); assert.equal(exported.lessons[0].codeSketch, payload); assert.equal(exported.lessons[0].completed, true);
    return { filename: download.suggestedFilename(), format: exported.format };
  });
  await check('Runtime lab covers native, web, and custom module choices', async () => {
    await route(page, '01'); await page.selectOption('#runtime-platform', 'android'); await page.check('#runtime-custom'); await page.click('#trace-runtime'); await contains(page, 'Your development build');
    await page.selectOption('#runtime-platform', 'web'); await contains(page, 'cannot run in a browser'); await page.uncheck('#runtime-custom'); await contains(page, 'React Native Web'); await page.selectOption('#runtime-platform', 'ios');
  });
  await check('Layout lab direction, gap, width, and text-size controls update preview', async () => {
    await route(page, '02'); await page.selectOption('#layout-direction', 'row');
    for (const [id, value] of [['layout-gap','28'],['layout-width','180'],['layout-font','32']]) await page.locator(`#${id}`).fill(value);
    const preview = await page.locator('.plant-preview').evaluate(el => ({ direction: el.style.flexDirection, gap: el.style.gap, width: el.style.width })); assert.deepEqual(preview, { direction: 'row', gap: '28px', width: '180px' }); await contains(page, 'fontSize: 32');
  });
  await check('Navigation lab distinct IDs, history, back, and reset', async () => {
    await route(page, '03'); ok(await page.locator('#route-back').isDisabled()); await page.click('#route-push'); await contains(page, '/plants/fern_kitchen');
    await page.selectOption('#route-specimen', 'fern_patio'); await page.click('#route-push'); await contains(page, '/plants/fern_patio'); await page.click('#route-back'); assert.equal((await page.locator('#lab-output pre').innerText()).trim(), '/plants/fern_kitchen');
    await page.click('#route-reset'); assert.equal((await page.locator('#lab-output pre').innerText()).trim(), '/plants'); ok(await page.locator('#route-back').isDisabled());
  });
  await check('State lab snapshot/updater counts and immutable rename/favorite transitions', async () => {
    await route(page, '04'); await page.click('#state-tap'); assert.equal(await page.locator('.metric').innerText(), '1'); await page.click('#state-reset');
    await page.selectOption('#state-strategy', 'functional'); await page.click('#state-tap'); assert.equal(await page.locator('.metric').innerText(), '2');
    await page.fill('#state-name', payload); await page.click('#state-rename'); await contains(page, 'Previous array unchanged: true'); await contains(page, 'Neighbor reused: true'); assert.equal(await page.evaluate(() => window.qaXss), undefined);
    await page.click('#state-favorite'); await contains(page, '"favorite": true'); await page.fill('#state-name', '   '); await page.click('#state-rename'); await contains(page, 'visible character');
  });
  await check('Network lab cached refresh failure, owner isolation, cancellation, and all response cases', async () => {
    await route(page, '05'); await send(page, 'success'); assert.equal(await page.locator('.network-records li').count(), 1);
    await send(page, 'server'); await contains(page, 'Update failed; showing last known data'); assert.equal(await page.locator('.network-records li').count(), 1);
    await page.selectOption('#network-owner', 'learner_b'); assert.equal(await page.locator('.network-records li').count(), 0); await contains(page, 'learner_b');
    await page.selectOption('#network-case', 'success'); await page.click('#network-send'); await page.click('#network-cancel'); await page.waitForTimeout(850); assert.equal(await page.locator('.network-records li').count(), 0); await contains(page, 'Cancelled');
    await page.click('#network-send'); await page.selectOption('#network-owner', 'learner_a'); await page.waitForTimeout(850); await contains(page, 'learner_a'); assert.equal(await page.locator('.network-records li').count(), 1);
    for (const [scenario, expected] of [['empty','Empty collection'],['unauthorized','HTTP 401'],['malformed','unexpected'],['success','Success']]) { await send(page, scenario); await contains(page, expected); }
    await page.click('#network-clear'); assert.equal(await page.locator('.network-records li').count(), 0);
    await page.selectOption('#network-case', 'success'); await page.click('#network-send'); await route(page, '06'); await page.waitForTimeout(850); await contains(page, 'Trust-boundary decision');
  });
  await check('Security lab credential placement and denied identity paths', async () => {
    await route(page, '06'); await page.click('#secret-public'); await contains(page, 'Correct.'); await page.click('#secret-next'); await page.click('#secret-server'); await contains(page, 'Try that decision again');
    await page.click('#secret-public'); await page.click('#secret-next'); await page.click('#secret-server'); await contains(page, 'Correct.');
    await page.selectOption('#security-identity', 'learner_b'); await contains(page, 'Deny in this model'); await page.selectOption('#security-owner', 'learner_b'); await contains(page, 'Allow in this model'); await page.selectOption('#security-identity', ''); await contains(page, 'Deny in this model');
  });
  await check('Camera lab permission/readiness, retained draft, preparation failure and retry', async () => {
    await route(page, '07'); ok(await page.locator('#camera-capture').isDisabled()); await page.click('#camera-deny'); await page.click('#camera-library'); await contains(page, 'photo: selected');
    await page.click('#camera-retain'); await page.click('#camera-persist'); await page.check('#camera-fail'); await page.click('#camera-prepare'); await contains(page, 'Preparation failed'); await contains(page, 'original: retained'); await contains(page, 'draft: persisted');
    await page.uncheck('#camera-fail'); await page.click('#camera-prepare'); await contains(page, 'derivative: prepared'); await page.click('#camera-reset'); await page.click('#camera-grant'); ok(await page.locator('#camera-capture').isDisabled());
    await page.click('#camera-ready'); await page.click('#camera-capture'); await contains(page, 'photo: selected');
  });
  await check('Outbox lab lost acknowledgement deduplicates; account/deletion gates stop writes', async () => {
    await route(page, '08'); await page.check('#outbox-lost'); await page.click('#outbox-step'); await contains(page, '1 distinct accepted writes'); await page.uncheck('#outbox-lost'); await page.click('#outbox-step'); await contains(page, 'server reused the prior result');
    await page.click('#outbox-step'); await page.click('#outbox-step'); await contains(page, '3 distinct accepted writes'); await contains(page, '4 request attempts'); await page.click('#outbox-step'); await contains(page, 'No extra write');
    await page.click('#outbox-reset'); await page.check('#outbox-account'); await page.click('#outbox-step'); await contains(page, 'does not own this draft'); await contains(page, '0 distinct accepted writes');
    await page.uncheck('#outbox-account'); await page.check('#outbox-deleted'); await page.click('#outbox-step'); await contains(page, 'do not recreate it');
  });
  await check('Voice lab resource generations, stale callbacks, reply interruption, and adaptive glass', async () => {
    await route(page, '09'); await page.check('#glass-support'); await contains(page, 'Native glass'); await page.check('#glass-reduce'); await contains(page, 'Opaque surface');
    await page.uncheck('#glass-reduce'); await page.selectOption('#voice-platform', 'android'); await contains(page, 'Opaque surface'); await page.selectOption('#voice-platform', 'web'); await contains(page, 'Opaque surface');
    await page.selectOption('#voice-language', 'ja'); await contains(page, '発見を保存'); await page.selectOption('#voice-language', 'de'); await contains(page, 'Entdeckung speichern');
    await page.click('#voice-start'); await contains(page, "phase = 'connecting'"); await page.click('#voice-ready'); await contains(page, "phase = 'listening'"); await page.click('#voice-play'); await contains(page, 'playing reply = true');
    await page.click('#voice-interrupt'); await contains(page, 'playing reply = false'); await contains(page, "phase = 'listening'"); await page.click('#voice-end'); await contains(page, 'open sockets = 0');
    await page.click('#voice-start'); await page.click('#voice-late'); await contains(page, 'ignored stale callbacks = 1'); await contains(page, "phase = 'connecting'"); await page.click('#voice-ready'); await contains(page, "phase = 'listening'"); await page.click('#voice-end');
  });
  await check('Quality lab evidence choices cover all five scenarios', async () => {
    await route(page, '10'); const correct = ['logic','component','api','device','device'];
    await page.selectOption('#quality-check', 'device'); await page.click('#quality-answer'); await contains(page, 'does not fully support');
    for (const answer of correct) { await page.selectOption('#quality-check', answer); await page.click('#quality-answer'); await contains(page, 'Correct.'); await page.click('#quality-next'); }
  });
  await check('All downloadable ZIP endpoints return HTTP 200 with nonempty bodies', async () => {
    const files = ['plantopedia-course-kit.zip','plantopedia-exercises.zip','plantopedia-notebooks.zip',...lessons.map(x => `lesson-${x.id}.zip`)];
    for (const file of files) { const response = await context.request.get(base + 'downloads/' + file); assert.equal(response.status(), 200, file); ok((await response.body()).length > 500, file); }
    return { zipFiles: files.length };
  });
  const mobile = await context.newPage(); mobile.setDefaultTimeout(6000); observe(mobile, 'mobile'); await mobile.setViewportSize({ width: 390, height: 844 }); await mobile.goto(base);
  await check('Mobile overview and all ten pages have no outer overflow; menu closes with Escape', async () => {
    const sizes = { welcome: await noOverflow(mobile) };
    for (const lesson of lessons) {
      await route(mobile, lesson.id); sizes[lesson.id] = await noOverflow(mobile);
      await mobile.locator('.diagram img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
      await mobile.waitForFunction(() => [...document.querySelectorAll('.diagram img')].every(image => image.complete && image.naturalWidth > 0));
      const diagram = mobile.locator('.diagram-scroll').first();
      const dimensions = await diagram.evaluate(el => { const image = el.querySelector('img'); el.scrollLeft = el.scrollWidth; return { clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, imageWidth: image.getBoundingClientRect().width, scrolled: el.scrollLeft }; });
      ok(dimensions.imageWidth >= 979, 'SVG labels retain the intended readable canvas width');
      ok(dimensions.scrollWidth > dimensions.clientWidth && dimensions.scrolled > 0, `Lesson ${lesson.id} diagram scrolls within its own region: ${JSON.stringify(dimensions)}`);
      sizes[lesson.id].diagram = dimensions;
      ok(await mobile.locator('.diagram figcaption a[download]').count() > 0, 'Original SVG download link is available');
      await mobile.click('#menu-button'); assert.equal(await mobile.locator('#menu-button').getAttribute('aria-expanded'), 'true'); ok(!(await mobile.locator('#sidebar').evaluate(el => el.inert)));
      await mobile.keyboard.press('Escape'); assert.equal(await mobile.locator('#menu-button').getAttribute('aria-expanded'), 'false'); ok(await mobile.locator('#sidebar').evaluate(el => el.inert)); assert.equal(await mobile.evaluate(() => document.activeElement.id), 'menu-button');
    }
    await route(mobile, '07');
    if (!fs.existsSync(path.join(root, 'review/lesson-mobile.png'))) await mobile.screenshot({ path: path.join(root, 'review/lesson-mobile.png'), fullPage: false });
    await mobile.evaluate(() => { document.getElementById('interactive-lab').scrollIntoView({block:'start'}); window.scrollBy(0,-85); });
    await mobile.screenshot({ path: path.join(root, 'review/lab-mobile.png'), fullPage: false });
    await mobile.evaluate(() => { document.getElementById('quiz-title').scrollIntoView({block:'start'}); window.scrollBy(0,-85); });
    await mobile.screenshot({ path: path.join(root, 'review/quiz-mobile.png'), fullPage: false });
    return sizes;
  });
  await check('Standalone file URL loads all lesson data and interactive labs', async () => {
    const file = await context.newPage(); observe(file, 'file'); await file.goto(pathToFileURL(path.join(root, 'index.html')).href); assert.equal(await file.locator('.lesson-card').count(), 10); await route(file, '04'); await file.click('#state-tap'); assert.equal(await file.locator('.metric').innerText(), '1'); await file.close();
  });
  await check('Corrupt saved JSON recovers to readable fresh course data', async () => {
    const corrupt = await browser.newContext(); await corrupt.addInitScript(() => localStorage.setItem('plantopedia.course.v1', '{invalid'));
    const p = await corrupt.newPage(); observe(p, 'corrupt-storage'); await p.goto(base); assert.equal(await p.locator('.lesson-card').count(), 10); await contains(p, 'could not be read', '#toast'); await route(p, '04'); await p.click('#state-tap'); assert.equal(await p.locator('.metric').innerText(), '1'); await corrupt.close();
  });
  await check('Denied localStorage preserves in-page notes and warns about persistence', async () => {
    const denied = await browser.newContext(); await denied.addInitScript(() => {
      Object.defineProperty(Storage.prototype, 'getItem', { value() { throw new DOMException('denied', 'SecurityError'); } });
      Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new DOMException('denied', 'SecurityError'); } });
    });
    const p = await denied.newPage(); observe(p, 'denied-storage'); await p.goto(base); await contains(p, 'storage is unavailable', '#toast'); await route(p, '01'); await p.fill('#learning-notes', 'Memory only QA note'); await route(p, '02'); await route(p, '01'); assert.equal(await p.inputValue('#learning-notes'), 'Memory only QA note'); await contains(p, 'open page only', '[data-save-status]'); await denied.close();
  });
  await check('Static reader contains ten lessons and solutions with JavaScript disabled', async () => {
    const staticContext = await browser.newContext({ javaScriptEnabled: false }); const p = await staticContext.newPage(); observe(p, 'static-reader'); await p.goto(base + 'course-reader.html');
    assert.equal(await p.locator('article[id^="reader-"]').count(), 10); ok((await p.locator('body').innerText()).includes('Worked solution')); await noOverflow(p); await staticContext.close();
  });
  await check('No runtime exceptions or missing assets were observed', async () => { assert.deepEqual(report.errors, []); assert.deepEqual(report.assetFailures, []); });
  await context.close();
}
main().catch(error => { report.fatal = error.stack; console.error(error); }).finally(async () => {
  if (browser) await browser.close();
  if (previousReport?.browser === 'Chrome headless through Playwright') report.diagnostics = { initialManagedChromeAttempt: { outcome: 'Interrupted by managed Chrome remote-debugging policy, not a page exception', passedGroups: previousReport.checks.filter(x => x.passed).length, requestedGroups: previousReport.checks.length, policyMessage: 'DevTools remote debugging is disallowed by the system admin.', priorErrors: previousReport.errors } };
  else if (previousReport?.diagnostics) report.diagnostics = previousReport.diagnostics;
  report.passed = !report.fatal && report.checks.every(x => x.passed) && report.errors.length === 0 && report.assetFailures.length === 0;
  report.summary = { checks: report.checks.length, passed: report.checks.filter(x => x.passed).length, failed: report.checks.filter(x => !x.passed).length };
  fs.writeFileSync(path.join(root, 'review/browser-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary)); process.exitCode = report.passed ? 0 : 1;
});
