import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:4173';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shots = [
  ['30-flange-6in-cl300', '#/t/flange?cls=300&nps=6&grp=1.1&temp=400&tu=F'],
  ['31-sling-angle', '#/t/sling?w=4000&wu=lb&legs=4&m=ang&a=45'],
  ['32-sling-capacity-wire', '#/t/capacity?ty=wire&sel=1%2F2'],
  ['33-cg-load-share', '#/t/cg?w=12000&wu=lb&da=4&db=8&h=6'],
  ['34-weight-pipe', '#/t/weight?sh=pipe&mat=steel&su=in&lu=ft&nps=6&sch=40&a=20&wtr=1&q=1'],
  ['35-sling-angle-under-30', '#/t/sling?w=4000&wu=lb&legs=2&m=hl&h=2&l=5'],
  ['36-shackles', '#/t/hardware?ty=shk&sel=3%2F4&ang=40'],
  ['37-dd-ratio', '#/t/dd?bd=2&rd=1%2F2&cap=5.1'],
  ['38-capacity-round', '#/t/capacity?ty=round&sel=Yellow'],
];
for (const [name, hash] of shots) {
  await page.goto(BASE + '/' + hash);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `screenshots/${name}.png` });
  console.log('shot', name);
}
await page.goto(BASE + '/#/t/flange?cls=300&nps=6&grp=1.1&temp=400&tu=F'); await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/39-flange-fullpage.png', fullPage: true });
await page.goto(BASE + '/#/'); await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/40-home-groups.png', fullPage: true });
await page.goto(BASE + '/#/about'); await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/13-about.png', fullPage: true });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
