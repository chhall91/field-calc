// Mobile screenshots (390x844) with headless Chrome + an offline check against the preview build.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:5174';
const PREVIEW = process.env.PREVIEW || 'http://localhost:4173';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const shots = [
  ['02-torque-units', '#/t/torque?v=100&u=ftlb'],
  ['03-adapter-crowsfoot', '#/t/adapter?t=100&tu=ftlb&L=12&E=2&lu=in&a=0'],
  ['04-bolt-torque-sae-gr8', '#/t/bolt?sys=sae&g=8&th=coarse&c=dry&sel=1%2F2'],
  ['05-bolt-torque-metric-10.9', '#/t/bolt?sys=metric&m=10.9&th=coarse&c=lube&sel=M12'],
  ['06-threads-wrenches', '#/t/thread?sys=inch&size=7%2F16'],
  ['07-unit-converter-length', '#/t/units?c=length&f=mm&v=10'],
  ['08-unit-converter-pressure', '#/t/units?c=pressure&f=psi&v=150'],
  ['09-drill-lookup', '#/t/drill?tab=lookup&q=%237'],
];
await page.goto(BASE + '/');
await page.evaluate(() => localStorage.clear());
for (const [name, hash] of shots) {
  await page.goto(BASE + '/' + hash);
  await page.waitForTimeout(1800); // lets the recent-calc debounce fire
  await page.screenshot({ path: `screenshots/${name}.png` });
  console.log('shot', name);
}
// favorite the adapter calc, then home
await page.goto(BASE + '/#/t/adapter?t=100&tu=ftlb&L=12&E=2&lu=in&a=0');
await page.click('#fav');
await page.goto(BASE + '/#/');
await page.waitForTimeout(2200);
await page.screenshot({ path: 'screenshots/01-home.png' });
// sunlight theme
await page.click('#theme');
await page.goto(BASE + '/#/t/bolt?sys=sae&g=5&th=coarse&c=dry&sel=1%2F2');
await page.waitForTimeout(2200);
await page.screenshot({ path: 'screenshots/10-bolt-light-theme.png' });
await page.goto(BASE + '/#/');
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/11-home-light-theme.png' });
await page.click('#theme');
await page.goto(BASE + '/#/pro'); await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/12-pro-mock.png' });
await page.goto(BASE + '/#/about'); await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/13-about.png' });

// full-page captures
for (const [name, hash] of [['15-adapter-fullpage', '#/t/adapter?t=100&tu=ftlb&L=12&E=2&lu=in&a=0'], ['16-bolt-fullpage', '#/t/bolt?sys=sae&g=8&th=coarse&c=dry&sel=1%2F2']]) {
  await page.goto(BASE + '/' + hash); await page.waitForTimeout(2200);
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}
// Offline test on the production preview build
const p2 = await ctx.newPage();
p2.on('pageerror', (e) => errors.push('preview: ' + e.message));
await p2.goto(PREVIEW + '/');
await p2.evaluate(() => navigator.serviceWorker.ready.then(() => new Promise((r) => setTimeout(r, 800))));
await ctx.setOffline(true);
await p2.goto(PREVIEW + '/#/t/adapter?t=50&tu=ftlb&L=15&E=3');
await p2.waitForTimeout(500);
const txt = await p2.textContent('#out');
console.log('OFFLINE adapter result:', txt.replace(/\s+/g, ' ').trim().slice(0, 120));
await p2.screenshot({ path: 'screenshots/14-offline-preview-build.png' });
await ctx.setOffline(false);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
