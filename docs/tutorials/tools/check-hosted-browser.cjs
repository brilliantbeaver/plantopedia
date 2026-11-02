/* Optional public-site smoke test. Install Playwright or set PLAYWRIGHT_MODULE. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.TUTORIAL_BASE_URL || 'https://plantopedia-nine.vercel.app/tutorials/';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
      const page = await context.newPage();
      page.on('pageerror', e => failures.push(e.message));
      page.on('console', msg => { if (msg.type() === 'error') failures.push(msg.text()); });
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
      await page.goto(base);
      assert.equal(await page.locator('.lesson-card').count(), 10);
      await page.getByRole('complementary', { name: 'Course compatibility' }).waitFor();
      for (let i = 1; i <= 10; i++) {
        const id = String(i).padStart(2, '0');
        await page.goto(`${base}#lesson-${id}`);
        await page.waitForFunction(id => document.querySelector('.lesson-header .eyebrow')?.textContent.includes(`LESSON ${id}`), id);
        assert.equal(await page.locator('[data-quiz]').count(), 3);
        assert.equal(await page.locator('#lab-content .lab-controls').count(), 1);
        await page.locator('.diagram img').evaluateAll(imgs => imgs.forEach(img => { img.loading = 'eager'; }));
        await page.waitForFunction(() => [...document.querySelectorAll('.diagram img')].every(img => img.complete && img.naturalWidth > 0));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      await page.goto(`${base}#lesson-01`);
      const answer = await page.evaluate(() => window.PLANTOPEDIA_LESSONS[0].quiz[0].answer);
      await page.check(`input[data-answer="0"][value="${answer}"]`);
      await page.click('[data-check-question="0"]');
      assert.match(await page.locator('#quiz-feedback-0').innerText(), /Correct/);
      await page.fill('#learning-notes', 'Hosted persistence check');
      await page.reload();
      assert.equal(await page.inputValue('#learning-notes'), 'Hosted persistence check');
      await page.goto(`${base}#lesson-05`);
      await page.locator('#network-send').click();
      await page.waitForFunction(() => !document.querySelector('#network-send').disabled);
      assert.ok((await page.locator('#lab-output').innerText()).length > 10);
      const sourceHref = await page.locator('.repo-list a').first().getAttribute('href');
      assert.ok(sourceHref.startsWith('source/'));
      const download = page.waitForEvent('download');
      await page.locator('a[download][href$=".ipynb"]').first().click();
      assert.ok((await download).suggestedFilename().endsWith('.ipynb'));
      await page.goto(new URL(sourceHref, base).href);
      assert.equal(await page.locator('.code-block pre code').count(), 1);
      await context.close();
      console.log(`PASS ${width}px: ten lessons, diagrams, quiz feedback, saved notes, labs, overflow, compatibility note, network model, notebook download, and source page.`);
    }
    assert.deepEqual(failures, []);
    console.log('PASS no browser runtime, CSP, console, or asset errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
