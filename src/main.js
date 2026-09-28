import './style.css';
import { store } from './storage.js';
import { TOOLS, toolById, GROUPS, groupOf } from './tools/index.js';
import { esc, DISCLAIMER } from './ui.js';
import { BOLT_SOURCES } from './data/bolts.js';
import { SOCKET_SOURCES } from './data/sockets.js';
import { FLANGE_SOURCES } from './data/flanges.js';
import { RIGGING_SOURCES, RIG_DISCLAIMER } from './data/rigging.js';
import { jobsList, jobDetail, jobShare, importPaste, importPreview, saveToJobSheet, teamScreen, sendScreen, wireSyncBar } from './jobs-ui.js';
import { sync } from './sync-instance.js';
import { HAS_SYNC } from './lib/env.js';

const APP_VERSION = '0.5.0';
const app = document.getElementById('app');
app.innerHTML = `
  <header class="bar">
    <button class="icon-btn" id="back" aria-label="Back" hidden>‹</button>
    <h1 id="title">Field Calc</h1>
    <button class="icon-btn job-btn" id="tojob" aria-label="Save to job" hidden>📋<small>＋</small></button>
    <button class="icon-btn" id="fav" aria-label="Save to favorites" hidden>☆</button>
    <button class="icon-btn" id="theme" aria-label="Toggle theme">◐</button>
  </header>
  <main id="view" tabindex="-1"></main>
  <aside class="ad-slot" id="ad" aria-label="Advertisement placeholder"><span>AD PLACEHOLDER · 320×50</span><a href="#/pro">Remove ads</a></aside>
  <nav class="tabbar">
    <a href="#/" data-nav="home"><span>⌂</span>Home</a>
    <a href="#/jobs" data-nav="jobs"><span>📋<i class="tab-badge" id="jobsBadge" hidden></i></span>Jobs</a>
    <a href="#/saved" data-nav="saved"><span>★</span>Saved</a>
    <a href="#/pro" data-nav="pro"><span>◆</span>Pro</a>
    <a href="#/about" data-nav="about"><span>ⓘ</span>About</a>
  </nav>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

const view = document.getElementById('view');
const $ = (id) => document.getElementById(id);

// ---------- theme ----------
const applyTheme = (t) => {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name=theme-color]').setAttribute('content', t === 'light' ? '#ffffff' : '#111418');
};
applyTheme(store.get('fc.theme', 'dark'));
$('theme').addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  store.set('fc.theme', t); applyTheme(t); toast(t === 'light' ? 'Sunlight (high-contrast light) theme' : 'Dark theme');
});

// ---------- pro / ads ----------
const applyPro = () => { $('ad').hidden = !!store.get('fc.proDemo', false); document.body.classList.toggle('no-ad', !!store.get('fc.proDemo', false)); };
applyPro();

let toastTimer;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800); }

// ---------- routing ----------
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  const state = Object.fromEntries(new URLSearchParams(query));
  return { parts: path.split('/').filter(Boolean), state };
}

let current = null;   // {tool, state, summary}
let recentTimer = null;

function makeCtx(tool) {
  return {
    update(state, summary) {
      const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v !== '' && v != null)).toString();
      history.replaceState(null, '', `#/t/${tool.id}${q ? '?' + q : ''}`);
      current = summary ? { tool: tool.id, state, summary } : null;
      refreshFav();
      clearTimeout(recentTimer);
      if (summary) recentTimer = setTimeout(() => store.addRecent(current), 1500);
    },
  };
}

function refreshFav() {
  const b = $('fav');
  const on = current && store.isFav(current);
  b.textContent = on ? '★' : '☆';
  b.classList.toggle('on', !!on);
  b.disabled = !current;
  $('tojob').disabled = !current;
}
$('fav').addEventListener('click', () => {
  if (!current) return;
  const added = store.toggleFav(current);
  refreshFav(); toast(added ? 'Saved to favorites' : 'Removed from favorites');
});

$('tojob').addEventListener('click', () => { if (current) saveToJobSheet(current, { toast }); });

function setChrome({ title, back, fav, nav }) {
  $('title').textContent = title;
  $('back').hidden = !back;
  $('fav').hidden = !fav;
  $('tojob').hidden = !fav;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === nav));
}
$('back').addEventListener('click', () => { if (history.length > 1 && document.referrer !== undefined && sessionStorage.getItem('fc.inapp')) history.back(); else location.hash = '#/'; });

const timeAgo = (ts) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return new Date(ts).toLocaleDateString();
};
const entryLink = (e) => `#/t/${e.tool}?${new URLSearchParams(Object.entries(e.state || {}).filter(([, v]) => v !== '' && v != null))}`;
const entryHtml = (e, extra = '') => {
  const t = toolById(e.tool);
  return `<li><a class="entry" href="${esc(entryLink(e))}"><span class="e-ico">${t ? t.icon : '•'}</span><span class="e-txt"><small>${esc(t ? t.title : e.tool)} · ${timeAgo(e.ts)}</small>${esc(e.summary)}</span></a>${extra}</li>`;
};

function home() {
  setChrome({ title: 'Field Calc', nav: 'home' });
  const favs = store.favs().slice(0, 5), recents = store.recents().slice(0, 5);
  view.innerHTML = `
    ${GROUPS.map(([g, label]) => { const ts = TOOLS.filter((t) => groupOf(t) === g); return ts.length ? `<h3 class="grp">${label}</h3><div class="grid">${ts.map((t) => `<a class="tile${t.featured ? ' featured' : ''}" href="#/t/${t.id}">${t.featured || t.isNew ? '<span class="badge">NEW</span>' : ''}<span class="t-ico">${t.icon}</span><b>${t.title}</b><small>${t.desc}</small></a>`).join('')}</div>` : ''; }).join('')}
    ${favs.length ? `<section class="card flush"><h3 class="pad">★ Favorites</h3><ul class="entries">${favs.map((e) => entryHtml(e)).join('')}</ul></section>` : ''}
    <section class="card flush"><h3 class="pad">Recent</h3>${recents.length ? `<ul class="entries">${recents.map((e) => entryHtml(e)).join('')}</ul>` : '<p class="hint pad">Your recent calculations will show up here. Works offline.</p>'}</section>
    <p class="fine">${DISCLAIMER}</p>`;
}

function saved() {
  setChrome({ title: 'Saved', nav: 'saved', back: true });
  const favs = store.favs(), recents = store.recents();
  view.innerHTML = `
    <section class="card flush"><h3 class="pad">★ Favorites</h3>${favs.length ? `<ul class="entries">${favs.map((e, i) => entryHtml(e, `<button class="icon-btn sm" data-del="${i}" aria-label="Remove">✕</button>`)).join('')}</ul>` : '<p class="hint pad">Tap ☆ on any result to save it here.</p>'}</section>
    <section class="card flush"><h3 class="pad">Recent <button class="link" id="clr">Clear</button></h3>${recents.length ? `<ul class="entries">${recents.map((e) => entryHtml(e)).join('')}</ul>` : '<p class="hint pad">Nothing yet.</p>'}</section>
    <p class="fine">Stored only on this device (localStorage).</p>`;
  view.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { store.removeFav(+b.dataset.del); saved(); }));
  $('clr')?.addEventListener('click', () => { store.clearRecents(); saved(); });
}

function pro() {
  setChrome({ title: 'Field Calc Pro', nav: 'pro', back: true });
  const demo = store.get('fc.proDemo', false);
  view.innerHTML = `
    <section class="card pro-hero"><div class="t-ico">◆</div><h2>Go Pro</h2><p>One-time purchase. No subscription. Supports development.</p></section>
    <section class="card"><ul class="checks">
      <li>No ads</li><li><b>Saved Jobs</b> with notes &amp; sharing by link / QR <span class="pro-badge">free in beta</span></li><li>Unlimited favorites</li><li>Custom K-factor &amp; clamp-load % in bolt torque</li>
      <li>Torque-angle and bolt stretch tools</li><li>Export / share saved calcs (PDF, CSV)</li><li>O-ring references (planned)</li>
    </ul></section>
    <section class="card">
      <button class="btn primary" disabled>Unlock Pro — $4.99 <small>(coming soon)</small></button>
      <p class="hint">Mock screen — no payments are processed in this version.</p>
      <label class="switch"><input type="checkbox" id="demo" ${demo ? 'checked' : ''}> <span>Preview ad-free mode (demo)</span></label>
    </section>`;
  $('demo').addEventListener('change', (e) => { store.set('fc.proDemo', e.target.checked); applyPro(); });
}

function about() {
  setChrome({ title: 'About', nav: 'about', back: true });
  view.innerHTML = `
    <div class="warnbox"><b>⚠ Disclaimer</b><br>${DISCLAIMER} Torque is an indirect indicator of bolt tension; actual preload varies with
      lubrication, plating, surface finish, washers and tool accuracy. The developer accepts no liability for use of these values.<br><br><b>Rigging:</b> ${RIG_DISCLAIMER}</div>
    <section class="card info">
      <h3>Data sources</h3>
      <h4>Bolt torque</h4><ul>${BOLT_SOURCES.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <h4>Wrench / socket sizes (Bolt → Socket, verified against ≥2 published tables)</h4><ul>${SOCKET_SOURCES.map((s) => `<li>${esc(s)}</li>`).join('')}
        <li>Socket head cap screw keys: ASME B18.3 (Boltport, AmesWeb); ISO 4762 (RC Fastener sheet, Whole-Spec, RoyMech).</li></ul>
      <h4>Threads, tap drills &amp; wrench sizes</h4><ul>
        <li>ASME B1.1 Unified Inch Screw Threads (UNC/UNF pitches, stress area).</li>
        <li>Machinery’s Handbook (Industrial Press) — tap drill tables (~75% thread).</li>
        <li>ASME B18.2.1 / B18.2.2 — hex bolt, cap screw, heavy hex and nut widths across flats; ASME B18.3 socket head keys.</li>
        <li>ISO 261 / 262 metric pitches; ISO 4014/4017/4032 and DIN 931/933/934 wrench sizes; ISO 4762 socket head keys.</li></ul>
      <h4>Drill sizes</h4><ul><li>ASME B94.11M number & letter drill decimal equivalents.</li></ul>
      <h4>Unit conversions</h4><ul><li>NIST SP 811 (Guide for the Use of the SI) — exact definitions: 1 in = 25.4 mm, 1 lb = 0.45359237 kg,
        g<sub>n</sub> = 9.80665 m/s², US gal = 231 in³; inHg at 32 °F = 3386.389 Pa.</li></ul>
      <h4>Flanges — ASME B16.5 (each value checked against ≥2 public reproductions; exceptions flagged in the tool)</h4><ul>${FLANGE_SOURCES.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h4>Rigging (manufacturer catalogs &amp; standards; ≥2 sources unless flagged)</h4><ul>${RIGGING_SOURCES.map((x) => `<li>${esc(x)}</li>`).join('')}
        <li>Sling angle, load share and weight formulas: standard statics as presented in DOE-STD-1090 and manufacturer rigging handbooks.</li></ul>
      <h4>Flagged / not fully confirmed</h4><ul>
        <li>Class 400 RTJ stud lengths — single public source (flangeboltchart.com).</li>
        <li>Group 2.2 P-T ratings at 650°F and 700°F — omitted (sources disagree); the next higher row is used.</li>
        <li>Cross-pattern bolt numbering — single public source; site procedure / ASME PCC-1 governs.</li>
        <li>Crosby G-2130 3", 3-1/2", 4" shackle WLL — Crosby catalog only.</li>
        <li>Cast iron density (450 lb/ft³) — grades vary up to ≈487.</li>
        <li>Chain choker reduction — manufacturers differ (≈75–80%); not tabulated.</li></ul>
      <h4>Adapter formula</h4><ul><li>T<sub>w</sub> = T<sub>a</sub> × L / (L + E), as published by torque-wrench manufacturers; angled adapters use L + E·cos θ.</li></ul>
    </section>
    <section class="card info"><h3>Privacy</h3><p>No account, no tracking in this version. Recents, favorites and Saved Jobs stay on your device. Sharing a job packs it into the link itself — nothing is uploaded, but anyone with the link can read it, so keep shared jobs generic (no equipment IDs, procedure numbers or locations).</p>
      <h3>Install</h3><p>iPhone: Share → Add to Home Screen. Android/Chrome: menu → Install app. Works with no signal after first load.</p>
      <p class="hint">Version ${APP_VERSION}</p></section>`;
}

const ui = { setChrome, toast };
function render() {
  const { parts, state } = parseHash();
  current = null; clearTimeout(recentTimer);
  window.scrollTo(0, 0);
  if (parts[0] === 't' && toolById(parts[1])) {
    const tool = toolById(parts[1]);
    setChrome({ title: tool.title, back: true, fav: true });
    view.innerHTML = '<div class="tool"></div>';
    refreshFav();
    tool.render(view.firstChild, state, makeCtx(tool));
  } else if (parts[0] === 'jobs' && parts[1] && parts[2] === 'share') jobShare(view, parts[1], ui);
  else if (parts[0] === 'jobs' && parts[1] && parts[2] === 'send') sendScreen(view, parts[1], ui);
  else if (parts[0] === 'team') teamScreen(view, ui);
  else if (parts[0] === 'jobs' && parts[1]) jobDetail(view, parts[1], ui);
  else if (parts[0] === 'jobs') { jobsList(view, ui); wireSyncBar(view, render); }
  else if (parts[0] === 'import' && parts[1]) importPreview(view, parts.slice(1).join('/'), ui);
  else if (parts[0] === 'import') importPaste(view, ui);
  else if (parts[0] === 'saved') saved();
  else if (parts[0] === 'pro') pro();
  else if (parts[0] === 'about') about();
  else home();
}
// ---------- push sync ----------
function updateBadge() {
  const n = sync.unreadCount(), b = $('jobsBadge');
  b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n);
  document.title = n ? `(${n}) Field Calc` : 'Field Calc — Mechanic\'s Toolbox';
}
window.addEventListener('fc-badge', updateBadge);
sync.on((e) => {
  if (e.type === 'received') {
    const names = [...new Set(e.received.map((r) => r.from?.name).filter(Boolean))];
    toast(e.received.length === 1 ? `${e.received[0].status === 'updated' ? 'Updated' : 'New'} job from ${names[0]}: ${e.received[0].job.name}` : `${e.received.length} jobs from ${names.join(', ')}`);
    if ('setAppBadge' in navigator) navigator.setAppBadge(sync.unreadCount()).catch(() => {});
  }
  if (e.type === 'received' || e.type === 'synced' || e.type === 'outbox') {
    updateBadge();
    if (/^#\/jobs\/?$/.test(location.hash)) render(); // live-refresh the list
  }
});
updateBadge();
if (HAS_SYNC) sync.start({ intervalMs: 30000 });

window.addEventListener('hashchange', () => { sessionStorage.setItem('fc.inapp', '1'); render(); });
render();

// ---------- service worker (production only; dev server uses HMR) ----------
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {}));
}
