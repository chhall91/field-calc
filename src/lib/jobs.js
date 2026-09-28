// Saved Jobs: model, validation, share-link encoding and import/version logic.
// Pure functions (no DOM / storage) so they can be unit tested.
import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';

export const KNOWN_TOOLS = ['socket', 'torque', 'adapter', 'bolt', 'thread', 'units', 'drill', 'flange', 'sling', 'capacity', 'hardware', 'cg', 'weight', 'dd'];
export const LIMITS = { name: 80, notes: 2000, calcs: 40, summary: 300, stateKeys: 16, stateVal: 60, payload: 6000, history: 5 };
const LINK_PREFIX = '1.'; // share-format version

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function newJob(name = 'New job', now = Date.now()) {
  return { id: uid(), name: clip(name, LIMITS.name) || 'New job', notes: '', calcs: [], ver: 1, createdAt: now, updatedAt: now, history: [] };
}

const clip = (s, n) => String(s ?? '').slice(0, n);

/** Record a change: snapshot the previous version into history and bump ver. */
export function editJob(job, changes, now = Date.now()) {
  const snap = snapshot(job);
  const next = { ...job, ...changes, ver: (job.ver || 1) + 1, updatedAt: now };
  next.history = [snap, ...(job.history || [])].slice(0, LIMITS.history);
  return next;
}

export function snapshot(job) {
  return { ver: job.ver, name: job.name, notes: job.notes, calcs: job.calcs, updatedAt: job.updatedAt };
}

export function addCalc(job, calc, now = Date.now()) {
  const c = sanitizeCalc({ ...calc, addedAt: now });
  if (!c) return job;
  if (job.calcs.some((x) => x.tool === c.tool && x.summary === c.summary)) return job; // already there
  return editJob(job, { calcs: [...job.calcs, c].slice(0, LIMITS.calcs) }, now);
}

export function duplicateJob(job, now = Date.now()) {
  return { ...newJob(`${job.name} (copy)`.slice(0, LIMITS.name), now), notes: job.notes, calcs: job.calcs.map((c) => ({ ...c })) };
}

// ---------- validation (imports are untrusted) ----------
export function sanitizeCalc(c) {
  if (!c || typeof c !== 'object' || !KNOWN_TOOLS.includes(c.tool)) return null;
  const state = {};
  if (c.state && typeof c.state === 'object') {
    for (const [k, v] of Object.entries(c.state).slice(0, LIMITS.stateKeys)) {
      if (/^[a-zA-Z]{1,12}$/.test(k) && (typeof v === 'string' || typeof v === 'number')) state[k] = clip(v, LIMITS.stateVal);
    }
  }
  const summary = clip(c.summary, LIMITS.summary);
  if (!summary) return null;
  return { tool: c.tool, state, summary, addedAt: Number.isFinite(c.addedAt) ? c.addedAt : 0 };
}

// ---------- share link encoding ----------
const b64url = {
  enc(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec(str) {
    if (!/^[A-Za-z0-9_-]*$/.test(str)) throw new Error('bad characters');
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    const u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  },
};

/** Compact wire form: {i,n,o,v,u,c:[[tool,state,summary]]}. History is never shared. */
export function encodeJob(job) {
  const wire = { i: job.id, n: job.name, o: job.notes || '', v: job.ver || 1, u: job.updatedAt || 0, c: job.calcs.map((c) => [c.tool, c.state, c.summary]) };
  return LINK_PREFIX + b64url.enc(deflateSync(strToU8(JSON.stringify(wire)), { level: 9 }));
}

export class ShareError extends Error {}

/** Decode a payload, a full share URL, or text containing one. Throws ShareError. */
export function decodeJob(input) {
  const payload = extractPayload(input);
  if (!payload) throw new ShareError('No Field Calc job link found.');
  if (payload.length > LIMITS.payload) throw new ShareError('Link is too long.');
  if (!payload.startsWith(LINK_PREFIX)) throw new ShareError('Unsupported link version — update the app.');
  let wire;
  try {
    const bytes = inflateSync(b64url.dec(payload.slice(LINK_PREFIX.length)));
    if (bytes.length > 200000) throw new Error('too big');
    wire = JSON.parse(strFromU8(bytes));
  } catch {
    throw new ShareError('Link is damaged or incomplete.');
  }
  if (!wire || typeof wire !== 'object' || typeof wire.i !== 'string' || !/^[\w-]{4,64}$/.test(wire.i) || !Array.isArray(wire.c)) {
    throw new ShareError('Link does not contain a valid job.');
  }
  const calcs = wire.c.slice(0, LIMITS.calcs).map((a) => (Array.isArray(a) ? sanitizeCalc({ tool: a[0], state: a[1], summary: a[2] }) : null)).filter(Boolean);
  return {
    id: wire.i,
    name: clip(wire.n, LIMITS.name) || 'Shared job',
    notes: clip(wire.o, LIMITS.notes),
    ver: Number.isInteger(wire.v) && wire.v > 0 ? wire.v : 1,
    updatedAt: Number.isFinite(wire.u) ? wire.u : 0,
    calcs,
    dropped: wire.c.length - calcs.length,
  };
}

/** Validate a job object received over the API (untrusted). Returns a clean job or null. */
export function sanitizeJob(j) {
  if (!j || typeof j !== 'object' || typeof j.id !== 'string' || !/^[\w-]{4,64}$/.test(j.id) || !Array.isArray(j.calcs)) return null;
  const calcs = j.calcs.slice(0, LIMITS.calcs).map(sanitizeCalc).filter(Boolean);
  return {
    id: j.id,
    name: clip(j.name, LIMITS.name) || 'Shared job',
    notes: clip(j.notes, LIMITS.notes),
    ver: Number.isInteger(j.ver) && j.ver > 0 ? j.ver : 1,
    updatedAt: Number.isFinite(j.updatedAt) ? j.updatedAt : 0,
    calcs,
  };
}

/** The shareable part of a job (no history / local flags). */
export function wireJob(job) {
  return { id: job.id, name: job.name, notes: job.notes || '', ver: job.ver || 1, updatedAt: job.updatedAt || 0,
    calcs: job.calcs.map((c) => ({ tool: c.tool, state: c.state, summary: c.summary })) };
}

export function extractPayload(input) {
  const s = String(input ?? '').trim();
  const m = s.match(/#\/import\/([^\s#?&]+)/);
  if (m) return decodeURIComponent(m[1]);
  if (/^\d+\.[A-Za-z0-9_-]+$/.test(s)) return s;
  return null;
}

export function shareUrl(base, job) {
  return `${base.replace(/#.*$/, '')}#/import/${encodeJob(job)}`;
}

// ---------- import / versioning ----------
const contentKey = (j) => JSON.stringify([j.name, j.notes || '', j.calcs.map((c) => [c.tool, c.state, c.summary])]);

/**
 * Compare an incoming shared job with the local list.
 * status: 'new' | 'duplicate' (same id, same content) | 'update' (same id, incoming newer)
 *       | 'older' (same id, local copy is newer or edited) | 'conflict' (same id & ver, different content)
 */
export function classifyImport(jobs, incoming) {
  const local = jobs.find((j) => j.id === incoming.id);
  if (!local) return { status: 'new' };
  if (contentKey(local) === contentKey(incoming)) return { status: 'duplicate', local };
  if (incoming.ver > local.ver) return { status: 'update', local };
  if (incoming.ver < local.ver) return { status: 'older', local };
  return { status: 'conflict', local };
}

/**
 * Apply an import. mode: 'add' (new), 'replace' (update existing, old copy kept in history), 'copy' (new id).
 * Returns the new jobs array and the affected job.
 */
export function applyImport(jobs, incoming, mode, now = Date.now()) {
  const base = { name: incoming.name, notes: incoming.notes, calcs: incoming.calcs.map((c) => ({ ...c, addedAt: c.addedAt || now })) };
  if (mode === 'copy') {
    const j = { ...newJob(incoming.name, now), ...base, importedAt: now, sharedFrom: { id: incoming.id, ver: incoming.ver } };
    return { jobs: [j, ...jobs], job: j };
  }
  const idx = jobs.findIndex((j) => j.id === incoming.id);
  if (mode === 'replace' && idx >= 0) {
    const local = jobs[idx];
    const j = { ...local, ...base, ver: Math.max(incoming.ver, local.ver + 1), updatedAt: now, importedAt: now,
      history: [snapshot(local), ...(local.history || [])].slice(0, LIMITS.history) };
    const next = jobs.slice(); next[idx] = j;
    return { jobs: next, job: j };
  }
  if (idx >= 0) return { jobs, job: jobs[idx] }; // 'add' on an existing id is a no-op
  const j = { id: incoming.id, ...base, ver: incoming.ver, createdAt: now, updatedAt: now, importedAt: now, history: [] };
  return { jobs: [j, ...jobs], job: j };
}

/** Restore a history snapshot (current version goes into history). */
export function restoreVersion(job, histIndex, now = Date.now()) {
  const h = job.history?.[histIndex];
  if (!h) return job;
  const next = editJob(job, { name: h.name, notes: h.notes, calcs: h.calcs }, now);
  next.history = next.history.filter((x, i) => i !== histIndex + 1).slice(0, LIMITS.history);
  return next;
}
