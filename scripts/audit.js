// Runs axe-core (WCAG 2.0/2.1/2.2 A and AA, plus best practices) on a list of routes at two viewport widths.
//
//   BASE_URL=http://localhost:3000 ROUTES=/,/login,/pricing node scripts/audit.js
//   COOKIES='[{"name":"session","value":"...","domain":"localhost","path":"/"}]' ...   (optional: audit signed-in pages)
//   CHROME_PATH=/path/to/chrome  (optional: defaults to the usual macOS Chrome location)
//
// Writes results/<OUT>.json (default results/run.json). It never changes the site under test.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const base = process.env.BASE_URL || 'http://localhost:3000';
const routes = (process.env.ROUTES || '/').split(',').map((r) => r.trim()).filter(Boolean);
const cookies = process.env.COOKIES ? JSON.parse(process.env.COOKIES) : [];
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = path.join(__dirname, '..', 'results', `${process.env.OUT || 'run'}.json`);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 375, height: 812 }];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

(async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const results = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    if (cookies.length) await ctx.addCookies(cookies);
    for (const route of routes) {
      const page = await ctx.newPage();
      try {
        const res = await page.goto(base + route, { waitUntil: 'load', timeout: 90000 });
        await page.waitForTimeout(2500); // let client-rendered content arrive before measuring
        await page.evaluate(axeSource);
        const r = await page.evaluate(async (tags) => {
          const x = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
          const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((e) => +e.tagName[1]);
          return {
            violations: x.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length })),
            needsReview: x.incomplete.map((i) => i.id),
            h1Count: levels.filter((n) => n === 1).length,
            mainCount: document.querySelectorAll('main').length,
            lang: document.documentElement.lang,
          };
        }, TAGS);
        results.push({ viewport: vp.name, route, status: res.status(), landedOn: new URL(page.url()).pathname, ...r });
      } catch (e) {
        results.push({ viewport: vp.name, route, error: String(e).slice(0, 120) });
      }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(results, null, 1));
  const bad = results.filter((r) => r.violations && r.violations.length);
  console.log(`${results.length} views, ${bad.length} with violations -> ${out}`);
})();
