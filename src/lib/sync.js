// Push-sharing client: account, contacts/crews, offline outbox and inbox sync.
// Dependencies are injected (fetch, store, now) so the logic is unit-testable.
import { sanitizeJob, classifyImport, applyImport, wireJob, uid } from './jobs.js';

export class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

/** Merge one inbox item into the jobs list. Pure. */
export function mergeReceived(jobs, item, now = Date.now()) {
  const incoming = sanitizeJob(item?.job);
  if (!incoming) return { jobs, status: 'invalid' };
  const from = item.from ? { id: String(item.from.id), name: String(item.from.name).slice(0, 40) } : null;
  const crew = item.crew ? { id: String(item.crew.id), name: String(item.crew.name).slice(0, 40) } : null;
  const { status } = classifyImport(jobs, incoming);
  if (status === 'duplicate') return { jobs, status, job: jobs.find((j) => j.id === incoming.id) };
  const mode = status === 'new' ? 'add' : 'replace'; // a resent job always updates; previous copy goes to history
  const r = applyImport(jobs, incoming, mode, now);
  const job = { ...r.job, from, crew, receivedAt: now, unread: true };
  return { jobs: r.jobs.map((j) => (j.id === job.id ? job : j)), status: mode === 'add' ? 'added' : 'updated', job };
}

export function createSync({ fetch: f = globalThis.fetch, store, now = () => Date.now(), base = '' }) {
  const K = { account: 'fc.account', outbox: 'fc.outbox', meta: 'fc.syncMeta', jobs: 'fc.jobs', me: 'fc.me' };
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => fn(e));

  async function api(method, path, body, token = store.get(K.account, null)?.token) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl && setTimeout(() => ctl.abort(), 10000);
    let res;
    try {
      res = await f(base + path, { method, signal: ctl?.signal,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined });
    } catch (e) { throw new ApiError(0, 'offline'); } finally { if (timer) clearTimeout(timer); }
    let data = null; try { data = await res.json(); } catch { /* empty */ }
    if (!res.ok) throw new ApiError(res.status, data?.error || `HTTP ${res.status}`);
    return data;
  }
  const saveMe = (d) => { if (d?.user) store.set(K.me, { user: d.user, contacts: d.contacts, crews: d.crews, at: now() }); emit({ type: 'me' }); return d; };

  const sync = {
    __store: store,
    jobs: () => store.get(K.jobs, []),
    on: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    account: () => store.get(K.account, null),
    me: () => store.get(K.me, null),
    outbox: () => store.get(K.outbox, []),
    meta: () => store.get(K.meta, {}),
    unreadCount: () => store.get(K.jobs, []).filter((j) => j.unread).length,

    async register(name) {
      const d = await api('POST', '/api/register', { name }, null);
      store.set(K.account, { token: d.token, userId: d.user.id });
      saveMe(d);
      return d;
    },
    signOut() { store.set(K.account, null); store.set(K.me, null); store.set(K.outbox, []); emit({ type: 'me' }); },
    refreshMe: async () => saveMe(await api('GET', '/api/me')),
    rename: async (name) => saveMe(await api('POST', '/api/me', { name })),
    addContact: async (code) => saveMe(await api('POST', '/api/contacts', { code })),
    removeContact: async (id) => saveMe(await api('POST', '/api/contacts/remove', { id })),
    createCrew: async (name) => saveMe(await api('POST', '/api/crews', { name })),
    joinCrew: async (code) => saveMe(await api('POST', '/api/crews/join', { code })),
    leaveCrew: async (id) => saveMe(await api('POST', '/api/crews/leave', { id })),

    /** Queue a job for sending (works offline), then try to flush. */
    async send(job, to, labels = []) {
      const item = { clientMsgId: uid(), job: wireJob(job), to: { users: to.users || [], crews: to.crews || [] }, labels, queuedAt: now() };
      store.set(K.outbox, [...store.get(K.outbox, []), item]);
      emit({ type: 'outbox' });
      const r = await sync.flush();
      return { queued: true, sent: r.sent.some((s) => s.clientMsgId === item.clientMsgId), failed: r.failed.find((s) => s.clientMsgId === item.clientMsgId) };
    },

    async flush() {
      const sent = [], failed = [];
      for (const item of store.get(K.outbox, [])) {
        try {
          await api('POST', '/api/send', { job: item.job, to: item.to, clientMsgId: item.clientMsgId });
          sent.push(item);
        } catch (e) {
          if (e.status === 0 || e.status >= 500 || e.status === 429 || e.status === 401) { // keep queued, retry later
            store.set(K.meta, { ...store.get(K.meta, {}), online: e.status !== 0, error: e.status === 0 ? 'offline' : e.message });
            break;
          }
          failed.push({ ...item, error: e.message });                                          // permanent (4xx): drop
        }
        store.set(K.outbox, store.get(K.outbox, []).filter((x) => x.clientMsgId !== item.clientMsgId));
      }
      if (sent.length || failed.length) emit({ type: 'outbox', sent, failed });
      return { sent, failed };
    },

    async pull() {
      const { items } = await api('GET', '/api/inbox');
      const received = [];
      if (items.length) {
        let jobs = store.get(K.jobs, []);
        for (const it of items) {
          const r = mergeReceived(jobs, it, now());
          jobs = r.jobs;
          if (r.status === 'added' || r.status === 'updated') received.push({ ...r, from: it.from });
        }
        store.set(K.jobs, jobs);
        await api('POST', '/api/inbox/ack', { upTo: Math.max(...items.map((i) => i.id)) });
      }
      return received;
    },

    /** One full sync round: send queued jobs, then receive. Never throws. */
    async syncNow() {
      if (!sync.account()) return { skipped: true };
      const meta = store.get(K.meta, {});
      try {
        const out = await sync.flush();
        const received = await sync.pull();
        if (!store.get(K.me, null) || now() - (store.get(K.me, {}).at || 0) > 5 * 60000) await sync.refreshMe().catch(() => {});
        store.set(K.meta, { ...meta, lastSync: now(), online: true, error: null });
        if (received.length) emit({ type: 'received', received });
        emit({ type: 'synced' });
        return { sent: out.sent, failed: out.failed, received };
      } catch (e) {
        store.set(K.meta, { ...meta, online: e.status !== 0, error: e.status === 0 ? 'offline' : e.message });
        emit({ type: 'synced' });
        return { error: e };
      }
    },

    /** Browser wiring: sync on start, on reconnect, when app becomes visible, and every intervalMs while visible. */
    start({ intervalMs = 30000, win = globalThis.window, doc = globalThis.document } = {}) {
      const tick = () => { if (!doc || doc.visibilityState !== 'hidden') sync.syncNow(); };
      win?.addEventListener('online', tick);
      doc?.addEventListener('visibilitychange', tick);
      const h = setInterval(tick, intervalMs);
      tick();
      return () => { clearInterval(h); win?.removeEventListener('online', tick); doc?.removeEventListener('visibilitychange', tick); };
    },
  };
  return sync;
}
