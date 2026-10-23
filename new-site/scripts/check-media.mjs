// Production preview must be running. Playwright is a QA tool, not a site dependency:
// GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs node scripts/check-media.mjs
// Optional: GFORCE_TEST_URL, GFORCE_BROWSER_ENGINE=webkit, GFORCE_QA_OUTPUT,
// GFORCE_QA_CASES=stalled (comma-separated names for a focused rerun).
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const engines = await import(process.env.GFORCE_BROWSER_MODULE || 'playwright');
const engine = process.env.GFORCE_BROWSER_ENGINE || 'chromium';
const browser = await engines[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'chrome', args: ['--use-angle=metal'] } : {}) });
const base = process.env.GFORCE_TEST_URL || 'http://127.0.0.1:4404';
const output = process.env.GFORCE_QA_OUTPUT || join(tmpdir(), `gforce-media-qa-${engine}`);
await mkdir(output, { recursive: true });
const results = [];
const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = (page) => page.evaluate(() => ({
  playing: [...document.querySelectorAll('video')].filter((video) => !video.paused).length,
  attached: [...document.querySelectorAll('video')].filter((video) => video.currentSrc).length,
  films: [...document.querySelectorAll('video')].map((video) => {
    const quality = video.getVideoPlaybackQuality?.();
    return { src: video.currentSrc, paused: video.paused, time: video.currentTime, ready: video.readyState, shown: video.classList.contains('is-playing'), ambient: !!video.closest('[data-video-ambient]'), width: video.videoWidth, error: video.error?.message, frames: quality?.totalVideoFrames, dropped: quality?.droppedVideoFrames };
  }),
  requests: performance.getEntriesByType('resource').filter((entry) => /\.(mp4|webm)/.test(entry.name)).map((entry) => ({ name: entry.name, bytes: entry.transferSize, duration: entry.duration })),
}));

try {
  for (const config of [
    { name: 'mobile', mobile: true },
    { name: 'desktop', mobile: false },
    { name: 'reduced', mobile: true, reduced: true },
    { name: 'savedata', mobile: true, saveData: true },
    { name: 'blocked', mobile: true, blocked: true },
    { name: 'error', mobile: true, error: true },
    { name: 'stalled', mobile: true, stalled: true },
  ].filter((config) => !process.env.GFORCE_QA_CASES || process.env.GFORCE_QA_CASES.split(',').includes(config.name))) {
    const context = await browser.newContext({ viewport: config.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: config.mobile, hasTouch: config.mobile, reducedMotion: config.reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (config.saveData) await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' } }));
    if (config.blocked) await page.addInitScript(() => {
      let allowed = false;
      addEventListener('click', () => { allowed = true; }, { capture: true });
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { return allowed ? play.call(this) : Promise.reject(new DOMException('Autoplay blocked for QA', 'NotAllowedError')); };
    });
    let block = config.error;
    if (config.error) await page.route('**/media/video/**', (route) => block ? route.abort('failed') : route.continue());
    let releaseMedia;
    let mediaAttempts = 0;
    if (config.stalled) {
      const heldResponse = new Promise((resolve) => { releaseMedia = resolve; });
      await page.route('**/media/video/**', async (route) => {
        mediaAttempts++;
        await heldResponse;
        try { await route.continue(); } catch { /* The timed-out media request was cancelled. */ }
      });
    }
    await page.goto(base, { waitUntil: 'networkidle' });
    assert((await snapshot(page)).requests.length === 0, `${config.name}: media fetched before visibility`);
    const row = page.locator('#services .svc-row').first();
    const video = row.locator('video');
    const button = row.locator('[data-video-toggle]');
    const attemptStartedAt = Date.now();
    let timeoutRecovery;
    await video.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    if (!config.mobile) await row.locator('.svc-cell').hover();
    await page.waitForTimeout(1800);
    const initial = await snapshot(page);
    const staticInitially = config.reduced || config.saveData || config.blocked || config.error || config.stalled;
    assert(!config.mobile || initial.playing <= 1, `${config.name}: multiple mobile decoders`);
    if (staticInitially && !config.stalled) assert(initial.playing === 0, `${config.name}: must retain a still image`);
    if (config.reduced || config.saveData) assert(initial.requests.length === 0, `${config.name}: downloaded before opt-in`);
    if (config.error) {
      assert(await video.evaluate((element) => !element.classList.contains('is-playing')), 'Broken media did not retain its poster');
      block = false;
    }
    if (config.stalled) {
      await page.waitForFunction(() => document.querySelector('#services [data-video-toggle]')?.getAttribute('aria-label')?.startsWith('Retry '), null, { timeout: 11_000 });
      const stalledState = await video.evaluate((element) => ({ paused: element.paused, shown: element.classList.contains('is-playing'), source: element.getAttribute('src'), attached: element.dataset.attached, current: element.currentSrc, ready: element.readyState }));
      assert(stalledState.paused && !stalledState.shown && !stalledState.source && !stalledState.attached, `Stalled request did not stop and restore its poster: ${JSON.stringify(stalledState)}`);
      const attemptsAfterTimeout = mediaAttempts;
      await page.waitForTimeout(500);
      assert(mediaAttempts === attemptsAfterTimeout, 'Stalled request retried without visitor intent');
      timeoutRecovery = { elapsedMs: Date.now() - attemptStartedAt, mediaAttempts, state: stalledState };
      releaseMedia();
    }
    if (staticInitially) await button.click();
    await page.waitForFunction(() => { const video = document.querySelector('#services video'); return video && !video.paused && video.currentTime > 0.1; }, null, { timeout: 10_000 });
    const firstTime = await video.evaluate((element) => element.currentTime);
    await page.waitForTimeout(900);
    const advancement = await video.evaluate((element) => element.currentTime) - firstTime;
    assert(advancement > 0.4, `${config.name}: video did not advance`);
    await button.click();
    assert(await video.evaluate((element) => element.paused), `${config.name}: pause failed`);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(250);
    await video.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(350);
    assert(await video.evaluate((element) => element.paused), `${config.name}: scrolling overrode visitor pause`);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(200);
    assert(await video.evaluate((element) => element.paused), `${config.name}: visibility restoration overrode visitor pause`);
    await button.click();
    await page.waitForTimeout(500);
    assert(await video.evaluate((element) => !element.paused), `${config.name}: explicit resume failed`);

    const samples = [];
    if (config.name === 'mobile') {
      for (let index = 2; index <= 5; index++) {
        const clip = page.locator(`#services .svc-row:nth-child(${index}) video`);
        await clip.evaluate((element) => element.scrollIntoView({ block: 'center' }));
        await page.waitForFunction((element) => !element.paused && element.currentTime > 0.1, await clip.elementHandle(), { timeout: 8000 });
        const sample = await snapshot(page);
        assert(sample.playing <= 1, `Mobile row ${index}: multiple decoders`);
        assert(await clip.evaluate((element) => !element.paused && element.currentTime > 0.1), `Mobile row ${index}: focused film did not play`);
        samples.push({ at: `row-${index}`, ...sample });
      }
      const dawn = page.locator('[data-dawn-stage] .panel-video video');
      await dawn.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      await page.waitForFunction((element) => !element.paused && element.currentTime > 0.1, await dawn.elementHandle(), { timeout: 8000 });
      const sample = await snapshot(page);
      assert(sample.playing === 1 && await dawn.evaluate((element) => !element.paused), 'Dawn foreground must own the mobile decoder');
      assert(sample.films.filter((film) => film.ambient).every((film) => !film.src), 'Ambient mobile film downloaded');
      samples.push({ at: 'dawn', ...sample });
      await page.screenshot({ path: join(output, 'mobile.png') });
    }
    if (config.name === 'desktop') {
      for (let index = 2; index <= 5; index++) {
        const row = page.locator(`#services .svc-row:nth-child(${index})`);
        await row.locator('.svc-cell').hover();
        await page.waitForFunction((element) => !element.paused && element.currentTime > 0.1, await row.locator('video').elementHandle(), { timeout: 8000 });
        const sample = await snapshot(page);
        assert(sample.playing === 1 && await row.locator('video').evaluate((element) => !element.paused), `Desktop row ${index}: inactive preview played`);
        samples.push({ at: `hover-${index}`, ...sample });
      }
      await page.screenshot({ path: join(output, 'desktop.png') });
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    assert((await snapshot(page)).playing === 0, `${config.name}: film active off screen`);
    assert(errors.length === 0, `${config.name}: browser error: ${errors.join('; ')}`);
    results.push({ config, errors, initial, advancement, timeoutRecovery, samples });
    await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(`${engine}/${config.name}: passed (${advancement.toFixed(2)} seconds of video in 0.9 seconds)`);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Evidence: ${output}`);
