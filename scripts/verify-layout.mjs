// Verify home-tile rearranging in headless Chrome at 390x844 (touch): drag, ▲▼, persistence, reset, no errors.
// BASE=http://localhost:4173/ node scripts/verify-layout.mjs   (defaults to the live Pages site)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'https://chhall91.github.io/field-calc/';
const SHOT = process.env.SHOT || '';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let fails = 0;
const ok = (name, cond, extra = '') => { if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const order = () => page.$$eval('#editGrid .tile', (els) => els.map((e) => e.dataset.id));
const homeOrder = () => page.$$eval('.grid .tile', (els) => els.map((e) => e.dataset.id));
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const center = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200);
const def = await homeOrder();
ok('home loads with 14 tiles (grouped)', def.length === 14 && (await page.$$('h3.grp')).length === 4, def.join(','));
ok('Rearrange button present', !!(await page.$('#editLayout')));
ok('version shows 0.6.0', await page.goto(BASE + '#/about').then(() => page.waitForTimeout(300)).then(() => page.textContent('body')).then((t) => /Version 0\.6\.0/.test(t)));
await page.goto(BASE + '#/'); await page.waitForTimeout(400);

await page.click('#editLayout'); await page.waitForTimeout(300);
let o = await order();
ok('edit mode shows 14 movable tiles', o.length === 14 && JSON.stringify(o) === JSON.stringify(def));
ok('edit tiles are not links', (await page.$$('#editGrid a')).length === 0);
await page.tap('#editGrid .tile[data-id="torque"] b'); await page.waitForTimeout(300);
ok('tapping a tile in edit mode does not open it', !(await page.evaluate(() => location.hash)).startsWith('#/t/') && !!(await page.$('#editGrid')));
if (SHOT) { await page.screenshot({ path: SHOT }); console.log('screenshot:', SHOT); }

// Touch drag: last tile ("drill") grip → auto-scroll up → drop on the first tile
const last = def[def.length - 1];
await page.locator(`#editGrid .tile[data-id="${last}"]`).scrollIntoViewIfNeeded();
let p = await center(`#editGrid .tile[data-id="${last}"] .grip`);
const y0 = await page.evaluate(() => scrollY);
await touch('touchStart', p.x, p.y);
for (let i = 1; i <= 10; i++) { await touch('touchMove', p.x, p.y - i * ((p.y - 120) / 10)); await page.waitForTimeout(16); }
// hold near the top edge so it auto-scrolls to the top
for (let i = 0; i < 120 && (await page.evaluate(() => scrollY)) > 0; i++) { await touch('touchMove', p.x, 100 + (i % 2)); await page.waitForTimeout(30); }
const yTop = await page.evaluate(() => scrollY);
const f = await center('#editGrid .tile:not(.placeholder)');
await touch('touchMove', f.x - 30, f.y); await page.waitForTimeout(50);
await touch('touchMove', f.x - 40, f.y); await page.waitForTimeout(50);
await touch('touchEnd'); await page.waitForTimeout(300);
o = await order();
ok('touch drag auto-scrolled to top', y0 > 0 && yTop === 0, `scrollY ${y0} → ${yTop}`);
ok(`touch drag moved "${last}" to position 1`, o[0] === last, o.slice(0, 4).join(','));
ok('no ghost left behind', (await page.$$('.tile.ghost')).length === 0);

// Swiping on a tile body (not the grip) scrolls instead of dragging
const before = await order();
p = await center('#editGrid .tile:nth-child(5) b');
await touch('touchStart', p.x, p.y); for (let i = 1; i <= 8; i++) { await touch('touchMove', p.x, p.y - i * 30); await page.waitForTimeout(16); } await touch('touchEnd'); await page.waitForTimeout(300);
ok('swipe on tile body does not reorder', JSON.stringify(await order()) === JSON.stringify(before));

// ▲▼ buttons
await page.evaluate(() => scrollTo(0, 0));
const third = o[2];
await page.click(`#editGrid .tile[data-id="${third}"] button[data-mv="-1"]`); await page.waitForTimeout(200);
o = await order(); ok(`▲ moves "${third}" up to position 2`, o[1] === third, o.slice(0, 4).join(','));
await page.click(`#editGrid .tile[data-id="${third}"] button[data-mv="1"]`); await page.waitForTimeout(200);
o = await order(); ok('▼ moves it back to position 3', o[2] === third);
ok('first tile ▲ disabled', await page.$eval('#editGrid .tile:first-child button[data-mv="-1"]', (b) => b.disabled));

// Mouse drag (desktop): 4th tile onto the 2nd
const m = o[3], tgt = o[1];
p = await center(`#editGrid .tile[data-id="${m}"] b`); const t2 = await center(`#editGrid .tile[data-id="${tgt}"]`);
await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(t2.x, t2.y, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(300);
o = await order(); ok(`mouse drag moved "${m}" to position 2`, o[1] === m, o.slice(0, 4).join(','));
const expected = o;

await page.click('#layoutDone'); await page.waitForTimeout(300);
ok('Done exits edit mode', !(await page.$('#editGrid')) && !!(await page.$('#editLayout')));
ok('home shows new order ("My tools")', JSON.stringify(await homeOrder()) === JSON.stringify(expected) && /My tools/.test(await page.textContent('#view')));
await page.tap(`.grid .tile[data-id="${expected[0]}"]`); await page.waitForTimeout(400);
ok('tiles open again after Done', (await page.evaluate(() => location.hash)).startsWith(`#/t/${expected[0]}`));
await page.goto(BASE); await page.reload(); await page.waitForTimeout(1000);
ok('order persists after reload', JSON.stringify(await homeOrder()) === JSON.stringify(expected), (await homeOrder()).slice(0, 4).join(','));

// Unknown saved ids dropped + new tool merged
await page.evaluate(() => localStorage.setItem('fc.tileOrder', JSON.stringify(['drill', 'bogus-old-tool', 'torque'])));
await page.reload(); await page.waitForTimeout(800);
const mo = await homeOrder();
ok('stale saved order merged (unknown dropped, missing tools added)', mo.length === 14 && mo.includes('socket') && !mo.includes('bogus-old-tool') && mo[0] !== 'bogus-old-tool', mo.join(','));

// Reset
await page.click('#editLayout'); await page.waitForTimeout(200);
await page.click('#resetOrder'); await page.waitForTimeout(300);
ok('reset restores default order', JSON.stringify(await order()) === JSON.stringify(def));
ok('reset clears saved order', (await page.evaluate(() => localStorage.getItem('fc.tileOrder'))) === 'null' || (await page.evaluate(() => localStorage.getItem('fc.tileOrder'))) === null);
await page.click('#layoutDone'); await page.waitForTimeout(300);
ok('grouped home is back after reset', (await page.$$('h3.grp')).length === 4 && JSON.stringify(await homeOrder()) === JSON.stringify(def));
await page.reload(); await page.waitForTimeout(800);
ok('default order persists after reload', JSON.stringify(await homeOrder()) === JSON.stringify(def));

console.log('page errors:', errors.length ? errors : 'none');
if (errors.length) fails++;
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await browser.close();
process.exit(fails ? 1 : 0);
