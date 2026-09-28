// Verify the live GitHub Pages deployment in headless Chrome: tools, service worker, offline reload, no-sync UI.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'https://chhall91.github.io/field-calc/';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [], failed = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('requestfailed', (r) => failed.push(r.url()));
const ok = (name, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
const text = (sel) => page.$eval(sel, (e) => e.innerText.replace(/\s+/g, ' ')).catch(() => '');

await page.goto(BASE); await page.waitForTimeout(1500);
ok('home loads', (await page.$$('.tile')).length >= 14, `${(await page.$$('.tile')).length} tiles`);
await page.screenshot({ path: 'screenshots/60-github-pages-home.png' });

await page.goto(BASE + '#/t/socket?mode=bolt&sys=inch&hx=heavy&size=3%2F4'); await page.waitForTimeout(700);
const sock = await text('#res'); ok('Bolt → Socket 3/4 heavy', /1-1\/4/.test(sock), sock.slice(0, 90));
await page.goto(BASE + '#/t/flange?cls=300&nps=6'); await page.waitForTimeout(700);
const fl = await text('#res'); ok('Flange 6" Cl 300', /12 × 3\/4/.test(fl) && /4-3\/4/.test(fl) && /10-5\/8/.test(fl) && /12-1\/2/.test(fl) && /1-1\/4/.test(fl), fl.slice(0, 160));
const pt = await text('#pt'); ok('Flange P-T 100°F Cl300 G1.1 = 740', /740/.test(pt), pt.slice(0, 60));
await page.goto(BASE + '#/t/sling?w=4000&wu=lb&legs=2&m=ang&a=60'); await page.waitForTimeout(700);
const sl = await text('#out'); ok('Sling 4000 lb 2-leg 60° = 2309 lb/leg', /2309/.test(sl), sl.slice(0, 80));
ok('rigging banner present', !!(await page.$('.rig-banner')));

// Jobs: local jobs + link share, no-sync message
await page.goto(BASE + '#/jobs'); await page.waitForTimeout(500);
const jl = await text('#view, main, body'); ok('Jobs shows no-sync notice', /isn’t available on this version yet/.test(jl));
await page.evaluate(() => { localStorage.setItem('fc.jobs', JSON.stringify([{ id: 'test-job-1', name: 'Pump P-1A', notes: '', calcs: [{ tool: 'flange', state: { cls: '300', nps: '6' }, summary: '6" Cl 300', addedAt: Date.now() }], ver: 1, createdAt: Date.now(), updatedAt: Date.now(), history: [] }])); });
await page.goto(BASE + '#/team'); await page.waitForTimeout(400);
ok('Crew screen friendly message', /isn’t available on this version yet/.test(await text('body')));
await page.goto(BASE + '#/jobs/test-job-1/send'); await page.waitForTimeout(400);
ok('Send screen friendly message', /isn’t available on this version yet/.test(await text('body')));
await page.goto(BASE + '#/jobs/test-job-1/share'); await page.waitForTimeout(800);
const links = await page.$$eval('input, textarea, a', (els) => els.map((e) => e.value || e.href || '').filter((v) => /#\/import\//.test(v)));
ok('Share link points to Pages URL', links.some((l) => l.startsWith('https://chhall91.github.io/field-calc/#/import/')), (links[0] || 'none').slice(0, 70) + '…');
if (links[0]) { await page.goto(links[0]); await page.waitForTimeout(600); ok('Share link opens import preview', /Pump P-1A/.test(await text('body'))); }

// Service worker + offline
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { scope: r.scope, script: r.active?.scriptURL }; });
ok('service worker active', sw.scope === BASE, JSON.stringify(sw));
await page.waitForTimeout(1500);
const cached = await page.evaluate(async () => { const ks = await caches.keys(); let n = 0; for (const k of ks) n += (await (await caches.open(k)).keys()).length; return { ks, n }; });
ok('precache populated', cached.n >= 10, JSON.stringify(cached));
await ctx.setOffline(true);
await page.goto(BASE + '#/t/flange?cls=600&nps=8'); await page.waitForTimeout(1200);
const off = await text('#res'); ok('offline reload works (Flange 8" Cl 600)', /12 × 1-1\/8/.test(off), off.slice(0, 60));
await page.reload(); await page.waitForTimeout(1200);
ok('offline hard reload works', (await text('#res')).includes('1-1/8'));
await page.goto(BASE); await page.waitForTimeout(800);
ok('offline home works', (await page.$$('.tile')).length >= 14);
await ctx.setOffline(false);
console.log('page errors:', errors.length ? errors : 'none');
console.log('failed requests:', failed.length ? [...new Set(failed)] : 'none');
await browser.close();
