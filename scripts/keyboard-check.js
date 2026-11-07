// The checks axe cannot make: tab through the first page of controls and note any that show no focus ring,
// whether animations stop under prefers-reduced-motion, and whether the page scrolls sideways at 320px.
//
//   BASE_URL=http://localhost:3000 ROUTES=/,/login node scripts/keyboard-check.js
//
// A control whose focus shows only as a border-colour change is reported as "no ring" here: read those by eye.
const { chromium } = require('playwright-core');
const base = process.env.BASE_URL || 'http://localhost:3000';
const routes = (process.env.ROUTES || '/').split(',').map((r) => r.trim()).filter(Boolean);
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const STOPS = Number(process.env.STOPS || 14);

(async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  for (const route of routes) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(base + route, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    console.log(`\n== ${route}`);
    let total = 0, noRing = 0;
    for (let i = 0; i < STOPS; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(120);
      const r = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const cs = getComputedStyle(e);
        const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
        return { tag: e.tagName.toLowerCase(), name: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), ring: outline || cs.boxShadow !== 'none' };
      });
      if (!r) continue;
      total++; if (!r.ring) noRing++;
      console.log(String(i + 1).padStart(2), r.tag.padEnd(7), JSON.stringify(r.name), r.ring ? 'ring' : 'NO RING');
    }
    console.log(`focus stops without a ring: ${noRing}/${total}`);
    await ctx.close();

    const reduced = await browser.newContext({ reducedMotion: 'reduce' });
    const rp = await reduced.newPage(); await rp.goto(base + route, { waitUntil: 'load' }); await rp.waitForTimeout(2000);
    const normal = await browser.newContext(); const np = await normal.newPage(); await np.goto(base + route, { waitUntil: 'load' }); await np.waitForTimeout(2000);
    const running = (p) => p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
    console.log(`running animations: ${await running(np)} normally, ${await running(rp)} with reduced motion`);
    await reduced.close(); await normal.close();

    const narrow = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const wp = await narrow.newPage(); await wp.goto(base + route, { waitUntil: 'load' }); await wp.waitForTimeout(1500);
    console.log('sideways scroll at 320px:', await wp.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));
    await narrow.close();
  }
  await browser.close();
})();
