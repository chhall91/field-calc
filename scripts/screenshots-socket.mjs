import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:5174';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shots = [
  ['20-socket-inch-standard', '#/t/socket?mode=bolt&sys=inch&hx=std&size=7%2F16', '#res'],
  ['21-socket-inch-heavy-1-1-2', '#/t/socket?mode=bolt&sys=inch&hx=heavy&size=1-1%2F2', '#res'],
  ['22-socket-inch-heavy-3in', '#/t/socket?mode=bolt&sys=inch&hx=heavy&size=3', '#res'],
  ['23-socket-metric-standard-M12', '#/t/socket?mode=bolt&sys=metric&hx=std&size=M12', '#res'],
  ['24-socket-metric-heavy-M20', '#/t/socket?mode=bolt&sys=metric&hx=heavy&size=M20', '#res'],
  ['25-socket-reverse-2-3-8in', '#/t/socket?mode=rev&q=2-3%2F8&u=in', null],
  ['26-socket-reverse-36mm', '#/t/socket?mode=rev&q=36&u=mm', null],
];
for (const [name, hash, scrollTo] of shots) {
  await page.goto(BASE + '/' + hash);
  await page.waitForTimeout(1800);
  if (false && scrollTo) await page.evaluate((sel) => { const el = document.querySelector(sel); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70); }, scrollTo);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `screenshots/${name}.png` });
  console.log('shot', name);
}
await page.goto(BASE + '/#/'); await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/01-home.png' });
await page.goto(BASE + '/#/t/socket?mode=bolt&sys=inch&hx=heavy&size=1-1%2F2'); await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/27-socket-inch-heavy-fullpage.png', fullPage: true });
await page.goto(BASE + '/#/about'); await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/13-about.png', fullPage: true });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
