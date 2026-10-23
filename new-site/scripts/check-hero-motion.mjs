// Hero regression: idle GPU, reversible scrolling and context-loss/poster fallbacks.
// Requires Playwright (GFORCE_BROWSER_MODULE) and a running production preview (GFORCE_REVIEW_URL).
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = await import(
  process.env.GFORCE_BROWSER_MODULE ?? "playwright"
);
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.GFORCE_REVIEW_URL ?? "http://127.0.0.1:4404";
const out =
  process.env.GFORCE_REVIEW_OUTPUT ?? join(tmpdir(), "gforce-hero-motion");
await mkdir(out, { recursive: true });
const b = await chromium.launch({
  channel: "chrome",
  args: ["--use-angle=metal"],
});
const results = [];
try {
  for (const width of [1440, 390]) {
    const c = await b.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
      reducedMotion: "no-preference",
    });
    await c.addInitScript(() => {
      window.glDraws = 0;
      window.longTasks = [];
      const orig = WebGL2RenderingContext.prototype.drawElements;
      WebGL2RenderingContext.prototype.drawElements = function (...a) {
        window.glDraws++;
        return orig.apply(this, a);
      };
      new PerformanceObserver((list) =>
        window.longTasks.push(
          ...list
            .getEntries()
            .map((e) => ({ start: e.startTime, duration: e.duration })),
        ),
      ).observe({ type: "longtask", buffered: true });
    });
    const p = await c.newPage();
    const requests = [],
      errors = [];
    p.on("request", (r) => requests.push(r.url()));
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base, { waitUntil: "networkidle" });
    const idle = {
      draws: await p.evaluate(() => window.glDraws),
      geometryRequests: requests.filter(
        (u) =>
          u.includes("gforce-glass-original") || u.includes("glass-light-v2"),
      ).length,
    };
    assert.equal(idle.draws, 0);
    assert.equal(idle.geometryRequests, 0);
    await p.screenshot({ path: `${out}/motion-${width}-poster.png` });
    const started = Date.now();
    await p.mouse.click(width / 2, 100);
    await p.waitForSelector("canvas.is-ready", { timeout: 30000 });
    const startupMs = Date.now() - started;
    await p.waitForTimeout(250);
    const startDraws = await p.evaluate(() => window.glDraws);
    await p.waitForTimeout(350);
    assert.equal(await p.evaluate(() => window.glDraws), startDraws);
    for (const fraction of [0, 0.5, 1, 0]) {
      await p.evaluate(
        (f) =>
          scrollTo(0, document.querySelector(".hero-art").clientHeight * f),
        fraction,
      );
      await p.waitForTimeout(250);
      await p.screenshot({ path: `${out}/motion-${width}-${fraction}.png` });
    }
    await p.evaluate(() => scrollTo(0, innerHeight * 1.5));
    await p.waitForTimeout(250);
    const parked = await p.evaluate(() => window.glDraws);
    await p.evaluate(() => scrollBy(0, 100));
    await p.waitForTimeout(250);
    assert.equal(await p.evaluate(() => window.glDraws), parked);
    await p.evaluate(() =>
      document
        .querySelector("canvas")
        .getContext("webgl2")
        .getExtension("WEBGL_lose_context")
        .loseContext(),
    );
    await p.waitForFunction(
      () => !document.querySelector("canvas").classList.contains("is-ready"),
    );
    await p.evaluate(() => scrollTo(0, 0));
    await p.waitForTimeout(250);
    assert.equal(
      await p
        .locator(".hero-poster")
        .evaluate((e) => getComputedStyle(e).opacity),
      "1",
    );
    assert.equal(
      await p
        .locator(".hero-poster")
        .evaluate((e) => e.classList.contains("is-live")),
      false,
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      idle,
      startupMs,
      noDrawsAtRest: true,
      noDrawsAfterExit: true,
      reversible: true,
      contextLossPoster: true,
      errors,
      longTasks: await p.evaluate(() => window.longTasks),
    });
    await c.close();
  }
  {
    const context = await b.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "no-preference",
    });
    await context.addInitScript(() =>
      Object.defineProperty(navigator, "hardwareConcurrency", { value: 8 }),
    );
    const page = await context.newPage();
    const geometryRequests = [];
    page.on("request", (request) => {
      if (/gforce-glass-original|glass-light-v2/.test(request.url())) {
        geometryRequests.push(request.url());
      }
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => scrollTo(0, innerHeight * 1.05));
    await page.waitForTimeout(350);
    assert.equal(geometryRequests.length, 0, "A skipped hero initialized WebGL");
    results.push({ fastSwipeSkipsGpu: true });
    await context.close();
  }
  for (const fallback of ["reduce", "saveData", "noWebGL"]) {
    const c = await b.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: fallback === "reduce" ? "reduce" : "no-preference",
      isMobile: true,
      hasTouch: true,
    });
    if (fallback === "saveData")
      await c.addInitScript(() =>
        Object.defineProperty(navigator, "connection", {
          value: { saveData: true, effectiveType: "4g" },
        }),
      );
    if (fallback === "noWebGL")
      await c.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (/webgl/.test(type)) return null;
          return original.call(this, type, ...args);
        };
      });
    const p = await c.newPage();
    await p.goto(base, { waitUntil: "networkidle" });
    await p.mouse.click(200, 100);
    await p.waitForTimeout(600);
    const state = await p.evaluate(() => ({
      ready: document.querySelector("canvas").classList.contains("is-ready"),
      posterVisible:
        getComputedStyle(document.querySelector(".hero-poster")).opacity ===
        "1",
      posterLoaded: document.querySelector(".hero-poster img").naturalWidth > 0,
    }));
    assert(!state.ready && state.posterVisible && state.posterLoaded);
    results.push({ fallback, ...state });
    await c.close();
  }
} finally {
  await writeFile(`${out}/motion.json`, JSON.stringify(results, null, 2));
  await b.close();
}
console.log(JSON.stringify(results, null, 2));
