// Two simulated users over the live URL: A sends a job, B's Saved Jobs populates with no tap.
import { chromium } from 'playwright-core';
const U = process.env.URL || 'http://localhost:4173';
const S = (n) => `screenshots/${n}.png`;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const mk = async () => { const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await c.newPage(); p.on('pageerror', (e) => console.log('PAGEERROR', e.message)); return [c, p]; };
const [ca, A] = await mk(); const [cb, B] = await mk(); const [cc, C] = await mk();
const settle = (p, ms = 2300) => p.waitForTimeout(ms); // let toasts fade

async function register(p, name) {
  await p.goto(U + '/#/team'); await p.fill('#nm', name); await p.click('#reg');
  await p.waitForSelector('.friend-code'); await p.waitForFunction(() => !document.querySelector('.friend-code').textContent.includes('…'));
  return (await p.textContent('.friend-code')).trim();
}
const codeA = await register(A, 'Colton H.');
const codeB = await register(B, 'Dana R.');
console.log('friend codes', codeA, codeB);
// A adds B as contact, creates a crew; B joins crew
await A.fill('#fc', codeB); await A.click('#addc'); await A.waitForSelector('[data-rmc]');
await A.fill('#crn', 'Outage Crew B'); await A.click('#mkc'); await A.waitForSelector('.crew');
const crewCode = (await A.textContent('.crew .hint')).replace('code', '').trim();
await B.goto(U + '/#/team'); await B.fill('#crc', crewCode); await B.click('#joc'); await B.waitForSelector('.crew');
await settle(A); await A.goto(U + '/#/team'); await settle(A, 600); await A.screenshot({ path: S('40-team-contacts-crew') });

// A builds a job from tool results via "Save to job"
await A.goto(U + '/#/t/socket?mode=bolt&sys=inch&hx=heavy&size=1-1%2F2'); await settle(A, 500);
await A.click('#tojob'); await A.fill('#nj', 'Flange bolt-up — 1-1/2" heavy hex'); await A.screenshot({ path: S('41-save-to-job-sheet') }); await A.click('#mk');
for (const h of ['#/t/bolt?sys=sae&g=8&th=coarse&c=lube&sel=1-1%2F2', '#/t/adapter?t=600&tu=ftlb&L=36&E=3&lu=in&a=0']) {
  await A.goto(U + '/' + h); await settle(A, 500); await A.click('#tojob'); await A.click('.sheet [data-id]');
}
await A.goto(U + '/#/jobs'); await settle(A, 400); await A.click('.entries.jobs a');
await A.fill('#notes', 'Heavy hex nuts, lubricated threads. Star pattern, 3 passes (30/70/100%).'); await A.press('#notes', 'Tab');
await settle(A); await A.screenshot({ path: S('42-job-detail') });
const jobUrl = A.url();

// B sits on the Saved Jobs list (empty) — no further interaction from here on
await B.goto(U + '/#/jobs'); await settle(B, 800); await B.screenshot({ path: S('43-userB-before') });

// A sends to B (contact)
await A.goto(jobUrl.replace(/#.*/, '') + '#/jobs/' + jobUrl.split('#/jobs/')[1] + '/send'); await settle(A, 400);
await A.check(`[data-label="Dana R."]`); await A.screenshot({ path: S('44-send-screen') });
const t0 = Date.now();
await A.click('#send');
await B.waitForSelector('.from-badge', { timeout: 45000 });
console.log(`B received automatically after ${((Date.now() - t0) / 1000).toFixed(1)} s (no interaction on B)`);
await B.waitForTimeout(300); await B.screenshot({ path: S('45-userB-received-auto') });
await settle(B); await B.screenshot({ path: S('46-userB-list-badge') });
console.log('B list:', (await B.textContent('.entries.jobs')).replace(/\s+/g, ' ').trim());
console.log('B tab badge:', await B.textContent('#jobsBadge'));

// A edits and resends to the whole crew → B's copy updates, previous version kept
await A.goto(jobUrl); await settle(A, 300);
await A.fill('#notes', 'UPDATED: heavy hex nuts, lubricated. Final pass 100% then check pass.'); await A.press('#notes', 'Tab'); await settle(A, 500);
await A.goto(jobUrl + '/send'); await A.check('[data-crew]'); await A.click('#send');
await B.waitForFunction(() => document.body.textContent.includes('v') && [...document.querySelectorAll('.entries.jobs small')].some((s) => /Outage Crew B/.test(s.closest('li').textContent)), null, { timeout: 45000 });
console.log('B updated automatically via crew send');
await B.click('.entries.jobs a'); await settle(B, 600);
await B.evaluate(() => document.querySelector('details')?.setAttribute('open', ''));
await B.screenshot({ path: S('47-userB-job-detail-updated'), fullPage: true });
console.log('B history versions:', await B.$$eval('details li', (l) => l.length));

// Offline queue on A
await ca.setOffline(true);
await A.goto(jobUrl + '/send').catch(() => {}); await settle(A, 400);
await A.check('[data-label="Dana R."]'); await A.click('#send'); await A.waitForTimeout(600);
await A.goto(U + '/#/jobs').catch(() => {}); await A.waitForTimeout(500);
console.log('A offline bar:', (await A.textContent('.sync-bar')).replace(/\s+/g, ' ').trim());
await A.screenshot({ path: S('48-userA-offline-queued') });
await ca.setOffline(false);
await A.evaluate(() => window.dispatchEvent(new Event('online'))); await A.waitForTimeout(2500);
console.log('A after reconnect:', (await A.textContent('.sync-bar')).replace(/\s+/g, ' ').trim());

// Link/QR fallback: share screen on A, import preview on fresh user C
await A.goto(jobUrl + '/share'); await settle(A, 400); await A.screenshot({ path: S('49-share-link-qr') });
const link = await A.inputValue('#url');
await C.goto(link); await settle(C, 800); await C.screenshot({ path: S('50-import-preview') });
await A.goto(U + '/#/jobs'); await settle(A, 400); await A.screenshot({ path: S('51-saved-jobs-list-userA') });
await browser.close();
