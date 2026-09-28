import { HAS_SYNC } from './lib/env.js';
// Saved Jobs screens: list, detail, share (link + QR + share sheet), import preview, paste import, save-to-job sheet.
import qrcode from 'qrcode-generator';
import { jobStore } from './storage.js';
import { newJob, editJob, addCalc, duplicateJob, shareUrl, decodeJob, extractPayload, classifyImport, applyImport, restoreVersion, ShareError } from './lib/jobs.js';
import { toolById } from './tools/index.js';
import { esc } from './ui.js';
import { sync } from './sync-instance.js';

const PRO = '<span class="pro-badge">PRO</span>';
const PRIVACY = 'Keep shared jobs generic. Do not include plant-specific or sensitive information — equipment/component IDs, procedure or work-order numbers, locations, or names. Anyone with the link can read it.';
const ago = (ts) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return new Date(ts).toLocaleDateString();
};
const calcLink = (c) => `#/t/${c.tool}?${new URLSearchParams(Object.entries(c.state || {}).filter(([, v]) => v !== '' && v != null))}`;
const calcItem = (c, i, removable) => {
  const t = toolById(c.tool);
  return `<li><a class="entry" href="${esc(calcLink(c))}"><span class="e-ico">${t ? t.icon : '•'}</span><span class="e-txt"><small>${esc(t ? t.title : c.tool)} · tap to open</small>${esc(c.summary)}</span></a>
    ${removable ? `<button class="icon-btn sm" data-rm="${i}" aria-label="Remove calculation">✕</button>` : ''}</li>`;
};
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function jobsList(view, { setChrome, toast }) {
  setChrome({ title: 'Saved Jobs', nav: 'jobs', back: true });
  const jobs = jobStore.all();
  view.innerHTML = `
    <div class="card pro-note">${PRO} <span>Saved Jobs &amp; sharing is a Pro feature — <b>free during beta</b>.</span></div>
    ${syncBar()}
    <div class="row gap mb">
      <button class="btn primary grow" id="new">＋ New job</button>
      <a class="btn ghost grow" href="#/team">👥 Crew &amp; contacts</a>
    </div>
    ${jobs.length ? `<section class="card flush"><ul class="entries jobs">${jobs.map((j) => `
      <li class="${j.unread ? 'unread' : ''}"><a class="entry" href="#/jobs/${esc(j.id)}"><span class="e-ico">📋</span><span class="e-txt">
        <b>${esc(j.name)}${j.unread ? ' <span class="dot" aria-label="new"></span>' : ''}</b>
        ${j.from ? `<span class="from-badge">From ${esc(j.from.name)}${j.crew ? ` · ${esc(j.crew.name)}` : ''}</span>` : ''}
        <small>${j.calcs.length} calc${j.calcs.length === 1 ? '' : 's'} · v${j.ver} · ${ago(j.updatedAt)}${j.importedAt && !j.from ? ' · imported' : ''}</small></span></a></li>`).join('')}</ul></section>`
      : `<div class="card"><p class="hint">No jobs yet. Create a job, then open any tool and tap <b>📋＋</b> in the top bar to save a result to it. Or import a job someone shared with you.</p></div>`}
    <p class="fine">Jobs are stored on this device and work offline. Jobs sent to you arrive automatically.</p>
    <p class="center"><a class="link" href="#/import">Import from a link / QR instead</a></p>`;
  view.querySelector('#new').addEventListener('click', () => {
    const name = prompt('Job name', 'New job');
    if (name === null) return;
    const j = jobStore.put(newJob(name.trim() || 'New job'));
    toast('Job created'); location.hash = `#/jobs/${j.id}`;
  });
}

export function jobDetail(view, id, { setChrome, toast }) {
  let job = jobStore.get(id);
  if (!job) { setChrome({ title: 'Job', back: true, nav: 'jobs' }); view.innerHTML = '<div class="card"><p class="hint">Job not found.</p><a class="btn ghost" href="#/jobs">Back to jobs</a></div>'; return; }
  setChrome({ title: 'Job', back: true, nav: 'jobs' });
  if (job.unread) { job = jobStore.put({ ...job, unread: false }); window.dispatchEvent(new Event('fc-badge')); }
  const draw = () => {
    view.innerHTML = `
      <div class="card">
        <label class="field"><span class="lbl">Job name</span><input type="text" id="name" maxlength="80" value="${esc(job.name)}"></label>
        <label class="field"><span class="lbl">Notes</span><textarea id="notes" rows="3" maxlength="2000" placeholder="Generic notes only — e.g. “heavy nuts, anti-seize, 3-pass star pattern”">${esc(job.notes)}</textarea></label>
        <p class="hint">${job.from ? `<span class="from-badge">From ${esc(job.from.name)}${job.crew ? ` · ${esc(job.crew.name)}` : ''}</span> ` : ''}v${job.ver} · updated ${ago(job.updatedAt)}</p>
      </div>
      <section class="card flush"><h3 class="pad">Calculations (${job.calcs.length})</h3>
        ${job.calcs.length ? `<ul class="entries">${job.calcs.map((c, i) => calcItem(c, i, true)).join('')}</ul>` : '<p class="hint pad">None yet. Open a tool, get a result, then tap <b>📋＋</b> in the top bar.</p>'}
        <div class="pad-b"><a class="btn ghost" href="#/">＋ Add from a tool</a></div>
      </section>
      <div class="actions">
        <a class="btn primary" href="#/jobs/${esc(job.id)}/send">➤ Send to crew / contacts</a>
        <a class="btn ghost" href="#/jobs/${esc(job.id)}/share">Share by link / QR</a>
        <button class="btn ghost" id="dup">Duplicate</button>
        <button class="btn danger" id="del">Delete</button>
      </div>
      ${job.history?.length ? `<details class="card"><summary>Previous versions (${job.history.length})</summary><ul class="entries">${job.history.map((h, i) => `
        <li><span class="entry"><span class="e-txt"><b>v${h.ver}</b><small>${esc(h.name)} · ${h.calcs.length} calcs · ${ago(h.updatedAt)}</small></span></span><button class="link" data-restore="${i}">Restore</button></li>`).join('')}</ul></details>` : ''}`;
    const save = (changes) => { job = jobStore.put(editJob(job, changes)); };
    view.querySelector('#name').addEventListener('change', (e) => { save({ name: e.target.value.trim().slice(0, 80) || 'Untitled job' }); toast('Saved'); draw(); });
    view.querySelector('#notes').addEventListener('change', (e) => { save({ notes: e.target.value.slice(0, 2000) }); toast('Saved'); draw(); });
    view.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { save({ calcs: job.calcs.filter((_, i) => i !== +b.dataset.rm) }); draw(); }));
    view.querySelectorAll('[data-restore]').forEach((b) => b.addEventListener('click', () => { job = jobStore.put(restoreVersion(job, +b.dataset.restore)); toast('Version restored'); draw(); }));
    view.querySelector('#dup').addEventListener('click', () => { const d = jobStore.put(duplicateJob(job)); toast('Duplicated'); location.hash = `#/jobs/${d.id}`; });
    view.querySelector('#del').addEventListener('click', () => { if (confirm(`Delete “${job.name}”? This cannot be undone.`)) { jobStore.remove(job.id); toast('Job deleted'); location.hash = '#/jobs'; } });
  };
  draw();
}

export function jobShare(view, id, { setChrome, toast }) {
  const job = jobStore.get(id);
  setChrome({ title: 'Share job', back: true, nav: 'jobs' });
  if (!job) { view.innerHTML = '<div class="card"><p class="hint">Job not found.</p></div>'; return; }
  const url = shareUrl(location.origin + location.pathname, job);
  let qrSvg = '';
  try {
    const q = qrcode(0, 'M'); q.addData(url, 'Byte'); q.make();
    qrSvg = q.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
  } catch { qrSvg = '<p class="hint">Too much data for a QR code — use the link instead.</p>'; }
  view.innerHTML = `
    <div class="warnbox"><b>🔒 Privacy:</b> ${PRIVACY}</div>
    <div class="card share-card">
      <div class="big-label">${esc(job.name)} · v${job.ver} · ${job.calcs.length} calcs</div>
      <div class="qr" role="img" aria-label="QR code for the share link">${qrSvg}</div>
      <p class="hint center">Scan with the phone camera to open and import.</p>
    </div>
    <div class="card">
      <label class="field"><span class="lbl">Share link (${url.length} characters)</span><textarea id="url" rows="3" readonly>${esc(url)}</textarea></label>
      <div class="actions two">
        ${navigator.share ? '<button class="btn primary" id="native">Share… (text / email)</button>' : ''}
        <button class="btn ghost" id="copy">Copy link</button>
      </div>
      <p class="hint">The job is packed into the link itself — nothing is uploaded. Links point at this app’s current address; if the app moves to a new address, re-share.</p>
    </div>`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copied'); }
    catch { const t = view.querySelector('#url'); t.select(); document.execCommand('copy'); toast('Link copied'); }
  };
  view.querySelector('#copy').addEventListener('click', copy);
  view.querySelector('#native')?.addEventListener('click', async () => {
    try { await navigator.share({ title: `Field Calc job: ${job.name}`, text: `Field Calc job “${job.name}” — open to add it to your Saved Jobs:`, url }); } catch { /* cancelled */ }
  });
}

export function importPaste(view, { setChrome, toast }) {
  setChrome({ title: 'Import job', back: true, nav: 'jobs' });
  view.innerHTML = `
    <div class="card">
      <p>Paste a Field Calc job link someone sent you (from a text, email or a QR scan).</p>
      <button class="btn primary" id="clip">📋 Paste from clipboard</button>
      <label class="field mt"><span class="lbl">…or paste it here</span><textarea id="txt" rows="4" placeholder="https://…/#/import/1.…"></textarea></label>
      <button class="btn ghost" id="go">Preview job</button>
      <p class="hint" id="err"></p>
    </div>
    <div class="card info small"><p><b>iPhone tip:</b> links you tap usually open in Safari, not in the home-screen app, and the two keep separate data.
      To get a job into the installed app, copy the link and paste it here.</p></div>`;
  const go = (text) => {
    const p = extractPayload(text);
    if (!p) { view.querySelector('#err').textContent = 'That doesn’t look like a Field Calc job link.'; return; }
    location.hash = `#/import/${p}`;
  };
  view.querySelector('#go').addEventListener('click', () => go(view.querySelector('#txt').value));
  view.querySelector('#clip').addEventListener('click', async () => {
    try { const t = await navigator.clipboard.readText(); view.querySelector('#txt').value = t; go(t); }
    catch { view.querySelector('#err').textContent = 'Clipboard not available — long-press the box and choose Paste.'; }
  });
}

export function importPreview(view, payload, { setChrome, toast }) {
  setChrome({ title: 'Shared job', back: true, nav: 'jobs' });
  let inc;
  try { inc = decodeJob(payload); }
  catch (e) {
    view.innerHTML = `<div class="warnbox"><b>Can’t open this link.</b><br>${esc(e instanceof ShareError ? e.message : 'Unknown error.')}</div>
      <a class="btn ghost" href="#/import">Paste a link instead</a>`;
    return;
  }
  const jobs = jobStore.all();
  const { status, local } = classifyImport(jobs, inc);
  const banner = {
    new: 'New job — not in your Saved Jobs yet.',
    duplicate: `Already in your Saved Jobs (v${local?.ver}) — nothing changed.`,
    update: `Updated version: you have v${local?.ver}, this link is v${inc.ver}. Updating keeps your old copy in the job’s history.`,
    older: `Your copy is newer (v${local?.ver}) than this link (v${inc.ver}).`,
    conflict: `You have a different edit of this job at the same version (v${local?.ver}).`,
  }[status];
  const buttons = {
    new: '<button class="btn primary" data-do="add">＋ Add to Saved Jobs</button>',
    duplicate: `<a class="btn primary" href="#/jobs/${esc(inc.id)}">Open my copy</a>`,
    update: '<button class="btn primary" data-do="replace">⟳ Update my copy</button><button class="btn ghost" data-do="copy">Save as separate copy</button>',
    older: `<a class="btn primary" href="#/jobs/${esc(inc.id)}">Keep mine</a><button class="btn ghost" data-do="replace">Replace mine (kept in history)</button><button class="btn ghost" data-do="copy">Save as separate copy</button>`,
    conflict: '<button class="btn primary" data-do="copy">Save as separate copy</button><button class="btn ghost" data-do="replace">Replace mine (kept in history)</button>',
  }[status];
  view.innerHTML = `
    <div class="card result">
      <div class="big-label">Shared with you · v${inc.ver}</div>
      <h2 class="job-title">${esc(inc.name)}</h2>
      ${inc.notes ? `<p class="notes">${esc(inc.notes)}</p>` : ''}
      <div class="status s-${status}">${esc(banner)}</div>
      <div class="actions">${buttons}</div>
    </div>
    <section class="card flush"><h3 class="pad">Calculations (${inc.calcs.length})</h3>
      <ul class="entries">${inc.calcs.map((c, i) => calcItem(c, i, false)).join('')}</ul>
      ${inc.dropped ? `<p class="hint pad">${inc.dropped} item(s) skipped (not supported by this version of the app).</p>` : ''}</section>
    ${!isStandalone() ? `<div class="card info small"><p><b>Using the home-screen app?</b> This page may have opened in your browser instead, which keeps separate data.
      Copy this link, open Field Calc from your home screen, then Jobs → Import link → Paste.</p><button class="btn ghost" id="cp">Copy link for the app</button></div>` : ''}
    <p class="fine">Shared content is from another user — check values against your procedures before use.</p>`;
  view.querySelectorAll('[data-do]').forEach((b) => b.addEventListener('click', () => {
    const r = applyImport(jobStore.all(), inc, b.dataset.do);
    jobStore.save(r.jobs);
    toast(b.dataset.do === 'replace' ? 'Job updated' : 'Added to Saved Jobs');
    location.hash = `#/jobs/${r.job.id}`;
  }));
  view.querySelector('#cp')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('Link copied'); } catch { toast('Copy failed — copy the address bar'); }
  });
}

/** Bottom sheet: save the current tool result to a job. */
export function saveToJobSheet(current, { toast }) {
  const jobs = jobStore.all();
  const sheet = document.createElement('div');
  sheet.className = 'sheet-wrap';
  sheet.innerHTML = `<div class="sheet" role="dialog" aria-label="Save to job">
      <div class="sheet-head"><b>Save to job</b> ${PRO}<button class="icon-btn sm" data-x aria-label="Close">✕</button></div>
      <p class="sheet-sum">${esc(current.summary)}</p>
      <div class="row gap"><input type="text" id="nj" placeholder="New job name" maxlength="80"><button class="btn primary narrow-btn" id="mk">＋ New</button></div>
      ${jobs.length ? `<ul class="entries">${jobs.map((j) => `<li><button class="entry as-btn" data-id="${esc(j.id)}"><span class="e-ico">📋</span><span class="e-txt"><b>${esc(j.name)}</b><small>${j.calcs.length} calcs</small></span></button></li>`).join('')}</ul>` : '<p class="hint">No jobs yet — name one above.</p>'}
    </div>`;
  const close = () => sheet.remove();
  sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('[data-x]')) close(); });
  const add = (job) => {
    const next = addCalc(job, current);
    jobStore.put(next);
    toast(next === job ? `Already in “${job.name}”` : `Saved to “${job.name}”`);
    close();
  };
  sheet.querySelector('#mk').addEventListener('click', () => add(newJob(sheet.querySelector('#nj').value.trim() || 'New job')));
  sheet.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => add(jobStore.get(b.dataset.id))));
  document.body.appendChild(sheet);
}


// ---------------- push sharing ----------------
const NO_SYNC_MSG = 'Sharing with crew isn’t available on this version yet.';
function noSyncScreen(view, setChrome, title, backTo) {
  setChrome({ title, nav: 'jobs', back: true });
  view.innerHTML = `<div class="card info"><h3>👥 Crew sharing</h3><p><b>${NO_SYNC_MSG}</b></p>
    <p>You can still share any job by <b>link or QR code</b>: open the job and tap “Share link / QR”. The other person opens the link and imports it — no account needed.</p>
    <p class="hint">Saved Jobs stay on this phone and work offline.</p>
    <a class="btn primary" href="${backTo}">${backTo === '#/jobs' ? 'Back to Saved Jobs' : 'Back to job'}</a></div>`;
}
function syncBar() {
  if (!HAS_SYNC) return `<div class="card sync-bar small"><span>👥 ${NO_SYNC_MSG} Use <b>Share link / QR</b> on a job.</span></div>`;
  const acct = sync.account();
  if (!acct) return `<div class="card sync-bar"><span>👥 Send jobs straight to your crew’s phones.</span><a class="btn primary narrow-btn" href="#/team">Set up</a></div>`;
  const m = sync.meta(), q = sync.outbox().length;
  const state = (m.error === 'offline' || !navigator.onLine) ? `<span class="st off">● Offline</span>` : m.error ? `<span class="st off">● ${esc(m.error)}</span>` : `<span class="st on">● Synced</span>`;
  return `<div class="card sync-bar small">${state}<span>${m.lastSync ? `last ${ago(m.lastSync)}` : 'not synced yet'}${q ? ` · ${q} send${q > 1 ? 's' : ''} queued` : ''}</span>
    <button class="link" id="syncnow">Sync now</button></div>`;
}
export function wireSyncBar(view, rerender) {
  view.querySelector('#syncnow')?.addEventListener('click', async () => { await sync.syncNow(); rerender(); });
}

export function teamScreen(view, { setChrome, toast }) {
  if (!HAS_SYNC) return noSyncScreen(view, setChrome, 'Crew & contacts', '#/jobs');
  setChrome({ title: 'Crew & contacts', back: true, nav: 'jobs' });
  const acct = sync.account();
  const run = async (fn, ok) => {
    try { await fn(); if (ok) toast(ok); } catch (e) { toast(e.status === 0 ? 'No connection — try again when online' : e.message); }
    teamScreen(view, { setChrome, toast });
  };
  if (!acct) {
    view.innerHTML = `
      <div class="card pro-note">${PRO} <span>Crew sharing is a Pro feature — <b>free during beta</b>.</span></div>
      <div class="card">
        <h2>Set up sharing</h2>
        <p>Pick a display name your crew will recognize. No email or password — this phone gets a private key.</p>
        <label class="field"><span class="lbl">Display name</span><input type="text" id="nm" maxlength="40" placeholder="e.g. Colton H."></label>
        <button class="btn primary" id="reg">Create my sharing profile</button>
        <p class="hint">Prototype: your profile lives on this phone. Clearing browser data or uninstalling removes it.</p>
      </div>`;
    view.querySelector('#reg').addEventListener('click', () => {
      const n = view.querySelector('#nm').value.trim();
      if (!n) return toast('Enter a name');
      run(() => sync.register(n).then(() => sync.syncNow()), 'Profile created');
    });
    return;
  }
  const me = sync.me() || { user: { name: '…', friendCode: '…' }, contacts: [], crews: [] };
  view.innerHTML = `
    <div class="card center">
      <div class="big-label">My friend code</div>
      <div class="friend-code">${esc(me.user.friendCode)}</div>
      <p class="hint">Signed in as <b>${esc(me.user.name)}</b>. Give this code to a coworker so they can add you.</p>
      <button class="btn ghost" id="copycode">Copy code</button>
    </div>
    <section class="card">
      <h3>Contacts (${me.contacts.length})</h3>
      <div class="row gap"><input type="text" id="fc" placeholder="Friend code, e.g. K7P-4QX" autocapitalize="characters" maxlength="9"><button class="btn primary narrow-btn" id="addc">Add</button></div>
      <ul class="entries">${me.contacts.map((c) => `<li><span class="entry"><span class="e-ico">👤</span><span class="e-txt"><b>${esc(c.name)}</b><small>${esc(c.friendCode)}</small></span></span>
        <button class="icon-btn sm" data-rmc="${esc(c.id)}" aria-label="Remove contact">✕</button></li>`).join('')}</ul>
    </section>
    <section class="card">
      <h3>Crews (${me.crews.length})</h3>
      ${me.crews.map((c) => `<div class="crew"><div><b>${esc(c.name)}</b> <span class="hint">code ${esc(c.code)}</span></div>
        <small>${c.members.map((m) => esc(m.name)).join(', ')}</small><button class="link" data-leave="${esc(c.id)}">Leave</button></div>`).join('') || '<p class="hint">Create a crew and share its code, or join one.</p>'}
      <div class="row gap mt"><input type="text" id="crn" placeholder="New crew name" maxlength="40"><button class="btn ghost narrow-btn" id="mkc">Create</button></div>
      <div class="row gap mt"><input type="text" id="crc" placeholder="Crew code" autocapitalize="characters" maxlength="9"><button class="btn ghost narrow-btn" id="joc">Join</button></div>
    </section>
    <p class="fine">Prototype server — don’t send anything sensitive. <button class="link" id="out">Sign out of sharing on this phone</button></p>`;
  const v = (id) => view.querySelector('#' + id).value.trim();
  view.querySelector('#copycode').addEventListener('click', async () => { try { await navigator.clipboard.writeText(me.user.friendCode); toast('Code copied'); } catch { toast(me.user.friendCode); } });
  view.querySelector('#addc').addEventListener('click', () => v('fc') && run(() => sync.addContact(v('fc')), 'Contact added'));
  view.querySelector('#mkc').addEventListener('click', () => v('crn') && run(() => sync.createCrew(v('crn')), 'Crew created'));
  view.querySelector('#joc').addEventListener('click', () => v('crc') && run(() => sync.joinCrew(v('crc')), 'Joined crew'));
  view.querySelectorAll('[data-rmc]').forEach((b) => b.addEventListener('click', () => confirm('Remove this contact?') && run(() => sync.removeContact(b.dataset.rmc), 'Removed')));
  view.querySelectorAll('[data-leave]').forEach((b) => b.addEventListener('click', () => confirm('Leave this crew?') && run(() => sync.leaveCrew(b.dataset.leave), 'Left crew')));
  view.querySelector('#out').addEventListener('click', () => { if (confirm('Sign out? Your saved jobs stay on this phone, but you will need a new friend code.')) { sync.signOut(); teamScreen(view, { setChrome, toast }); } });
  if (!view.dataset.fresh) { view.dataset.fresh = '1'; sync.refreshMe().then(() => { if (location.hash === '#/team') teamScreen(view, { setChrome, toast }); }).catch(() => {}).finally(() => { delete view.dataset.fresh; }); }
}

export function sendScreen(view, id, ui, refreshed = false) {
  const { setChrome, toast } = ui;
  const job = jobStore.get(id);
  if (!HAS_SYNC) return noSyncScreen(view, setChrome, 'Send', job ? `#/jobs/${encodeURIComponent(id)}` : '#/jobs');
  if (!refreshed && sync.account()) {
    const before = JSON.stringify([sync.me()?.contacts, sync.me()?.crews]);
    sync.refreshMe().then(() => {
      if (location.hash === `#/jobs/${id}/send` && JSON.stringify([sync.me()?.contacts, sync.me()?.crews]) !== before) {
        const checked = [...view.querySelectorAll('input:checked')].map((x) => x.dataset.user || x.dataset.crew);
        sendScreen(view, id, ui, true);
        view.querySelectorAll('input[type=checkbox]').forEach((x) => { if (checked.includes(x.dataset.user || x.dataset.crew)) x.checked = true; });
      }
    }).catch(() => {});
  }
  setChrome({ title: 'Send job', back: true, nav: 'jobs' });
  if (!job) { view.innerHTML = '<div class="card"><p class="hint">Job not found.</p></div>'; return; }
  if (!sync.account()) { location.hash = '#/team'; return; }
  const me = sync.me() || { contacts: [], crews: [] };
  view.innerHTML = `
    <div class="warnbox"><b>🔒 Privacy:</b> ${PRIVACY.replace('Anyone with the link can read it.', 'Recipients keep their own copy.')}</div>
    <div class="card"><div class="big-label">Sending</div><h2 class="job-title">${esc(job.name)}</h2><p class="hint">v${job.ver} · ${job.calcs.length} calcs. It appears in their Saved Jobs automatically. Sending again later updates their copy.</p></div>
    <section class="card"><h3>Crews</h3>${me.crews.length ? me.crews.map((c) => `<label class="check"><input type="checkbox" data-crew="${esc(c.id)}" data-label="${esc(c.name)}"> <span><b>${esc(c.name)}</b><small>${c.members.length - 1} other member${c.members.length === 2 ? '' : 's'}</small></span></label>`).join('') : '<p class="hint">No crews yet.</p>'}</section>
    <section class="card"><h3>Contacts</h3>${me.contacts.length ? me.contacts.map((c) => `<label class="check"><input type="checkbox" data-user="${esc(c.id)}" data-label="${esc(c.name)}"> <span><b>${esc(c.name)}</b><small>${esc(c.friendCode)}</small></span></label>`).join('') : '<p class="hint">No contacts yet — <a href="#/team">add by friend code</a>.</p>'}</section>
    <button class="btn primary" id="send">➤ Send</button>
    <p class="hint center">No signal? It will be queued and sent automatically when you’re back online.</p>`;
  view.querySelector('#send').addEventListener('click', async () => {
    const users = [...view.querySelectorAll('[data-user]:checked')].map((x) => x.dataset.user);
    const crews = [...view.querySelectorAll('[data-crew]:checked')].map((x) => x.dataset.crew);
    if (!users.length && !crews.length) return toast('Pick at least one crew or contact');
    const labels = [...view.querySelectorAll('input:checked')].map((x) => x.dataset.label);
    const r = await sync.send(job, { users, crews }, labels);
    if (r.failed) toast(`Not sent: ${r.failed.error}`);
    else toast(r.sent ? `Sent to ${labels.join(', ')}` : 'Queued — will send when back online');
    location.hash = `#/jobs/${job.id}`;
  });
}
