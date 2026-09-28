// Field Calc prototype backend: static app + JSON API (/api/*) on one origin, SQLite storage.
// Accounts are device tokens (no email/password) — prototype only. See docs/sync-plan.md for the hosted plan.
import http from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import Database from 'better-sqlite3';
import { sanitizeJob } from '../src/lib/jobs.js';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_BODY = 64 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain' };

const sha = (s) => createHash('sha256').update(s).digest('hex');
function code(n = 6) { const b = randomBytes(n); let s = ''; for (let i = 0; i < n; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length]; return s; }
const fmtCode = (c) => `${c.slice(0, 3)}-${c.slice(3)}`;
const normCode = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function openDb(path) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, friend_code TEXT UNIQUE NOT NULL,
      token_hash TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL, last_seen INTEGER);
    CREATE TABLE IF NOT EXISTS contacts (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, PRIMARY KEY (user_id, contact_id));
    CREATE TABLE IF NOT EXISTS crews (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL, created_by TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS crew_members (crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, joined_at INTEGER NOT NULL, PRIMARY KEY (crew_id, user_id));
    CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_msg_id TEXT NOT NULL, job_id TEXT NOT NULL, job_ver INTEGER NOT NULL, job_json TEXT NOT NULL, created_at INTEGER NOT NULL,
      UNIQUE (sender_id, client_msg_id));
    CREATE TABLE IF NOT EXISTS inbox (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE, crew_id TEXT, created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS inbox_recipient ON inbox(recipient_id, id);
  `);
  return db;
}

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

export function createApi(db, { now = () => Date.now() } = {}) {
  const q = {
    userByToken: db.prepare('SELECT * FROM users WHERE token_hash = ?'),
    userByCode: db.prepare('SELECT * FROM users WHERE friend_code = ?'),
    insertUser: db.prepare('INSERT INTO users (id, name, friend_code, token_hash, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)'),
    touch: db.prepare('UPDATE users SET last_seen = ? WHERE id = ?'),
    rename: db.prepare('UPDATE users SET name = ? WHERE id = ?'),
    contacts: db.prepare('SELECT u.id, u.name, u.friend_code FROM contacts c JOIN users u ON u.id = c.contact_id WHERE c.user_id = ? ORDER BY u.name'),
    addContact: db.prepare('INSERT OR IGNORE INTO contacts (user_id, contact_id, created_at) VALUES (?, ?, ?)'),
    delContact: db.prepare('DELETE FROM contacts WHERE (user_id = ? AND contact_id = ?) OR (user_id = ? AND contact_id = ?)'),
    isContact: db.prepare('SELECT 1 FROM contacts WHERE user_id = ? AND contact_id = ?'),
    crews: db.prepare('SELECT cr.* FROM crew_members m JOIN crews cr ON cr.id = m.crew_id WHERE m.user_id = ? ORDER BY cr.name'),
    crewByCode: db.prepare('SELECT * FROM crews WHERE code = ?'),
    crewMembers: db.prepare('SELECT u.id, u.name FROM crew_members m JOIN users u ON u.id = m.user_id WHERE m.crew_id = ? ORDER BY u.name'),
    isMember: db.prepare('SELECT 1 FROM crew_members WHERE crew_id = ? AND user_id = ?'),
    insertCrew: db.prepare('INSERT INTO crews (id, name, code, created_by, created_at) VALUES (?, ?, ?, ?, ?)'),
    join: db.prepare('INSERT OR IGNORE INTO crew_members (crew_id, user_id, joined_at) VALUES (?, ?, ?)'),
    leave: db.prepare('DELETE FROM crew_members WHERE crew_id = ? AND user_id = ?'),
    msgByClientId: db.prepare('SELECT id FROM messages WHERE sender_id = ? AND client_msg_id = ?'),
    insertMsg: db.prepare('INSERT INTO messages (sender_id, client_msg_id, job_id, job_ver, job_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
    insertInbox: db.prepare('INSERT INTO inbox (recipient_id, message_id, crew_id, created_at) VALUES (?, ?, ?, ?)'),
    inbox: db.prepare(`SELECT i.id, i.crew_id, i.created_at, m.job_json, u.id AS from_id, u.name AS from_name, cr.name AS crew_name
      FROM inbox i JOIN messages m ON m.id = i.message_id JOIN users u ON u.id = m.sender_id LEFT JOIN crews cr ON cr.id = i.crew_id
      WHERE i.recipient_id = ? ORDER BY i.id LIMIT 50`),
    ack: db.prepare('DELETE FROM inbox WHERE recipient_id = ? AND id <= ?'),
    gcMessages: db.prepare('DELETE FROM messages WHERE id NOT IN (SELECT message_id FROM inbox) AND created_at < ?'),
  };

  const userOut = (u) => ({ id: u.id, name: u.name, friendCode: fmtCode(u.friend_code) });
  const cleanName = (n, max = 40) => { const s = String(n ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max); if (!s) throw new HttpError(400, 'Name required'); return s; };

  function me(u) {
    return {
      user: userOut(u),
      contacts: q.contacts.all(u.id).map((c) => ({ id: c.id, name: c.name, friendCode: fmtCode(c.friend_code) })),
      crews: q.crews.all(u.id).map((c) => ({ id: c.id, name: c.name, code: fmtCode(c.code), members: q.crewMembers.all(c.id) })),
    };
  }

  const routes = {
    'POST /api/register': (_u, body) => {
      const name = cleanName(body.name);
      const token = randomBytes(32).toString('base64url');
      let fc; do { fc = code(); } while (q.userByCode.get(fc));
      const id = randomUUID();
      q.insertUser.run(id, name, fc, sha(token), now(), now());
      return { status: 201, body: { token, ...me(q.userByToken.get(sha(token))) } };
    },
    'GET /api/me': (u) => ({ body: me(u) }),
    'POST /api/me': (u, body) => { q.rename.run(cleanName(body.name), u.id); return { body: me({ ...u, name: cleanName(body.name) }) }; },
    'POST /api/contacts': (u, body) => {
      const other = q.userByCode.get(normCode(body.code));
      if (!other) throw new HttpError(404, 'No user with that friend code');
      if (other.id === u.id) throw new HttpError(400, 'That is your own code');
      db.transaction(() => { q.addContact.run(u.id, other.id, now()); q.addContact.run(other.id, u.id, now()); })(); // mutual
      return { status: 201, body: me(u) };
    },
    'POST /api/contacts/remove': (u, body) => { q.delContact.run(u.id, String(body.id), String(body.id), u.id); return { body: me(u) }; },
    'POST /api/crews': (u, body) => {
      const name = cleanName(body.name);
      let c; do { c = code(); } while (q.crewByCode.get(c));
      const id = randomUUID();
      db.transaction(() => { q.insertCrew.run(id, name, c, u.id, now()); q.join.run(id, u.id, now()); })();
      return { status: 201, body: me(u) };
    },
    'POST /api/crews/join': (u, body) => {
      const crew = q.crewByCode.get(normCode(body.code));
      if (!crew) throw new HttpError(404, 'No crew with that code');
      q.join.run(crew.id, u.id, now());
      return { body: me(u) };
    },
    'POST /api/crews/leave': (u, body) => { q.leave.run(String(body.id), u.id); return { body: me(u) }; },
    'POST /api/send': (u, body) => {
      const job = sanitizeJob(body.job);
      if (!job) throw new HttpError(400, 'Invalid job');
      const clientMsgId = String(body.clientMsgId ?? '');
      if (!/^[\w-]{8,64}$/.test(clientMsgId)) throw new HttpError(400, 'clientMsgId required');
      const existing = q.msgByClientId.get(u.id, clientMsgId);
      if (existing) return { body: { ok: true, duplicate: true, messageId: existing.id } }; // idempotent retry
      const users = Array.isArray(body.to?.users) ? body.to.users.map(String).slice(0, 50) : [];
      const crews = Array.isArray(body.to?.crews) ? body.to.crews.map(String).slice(0, 10) : [];
      const recipients = new Map(); // id -> crew_id|null
      for (const id of users) {
        if (!q.isContact.get(u.id, id)) throw new HttpError(403, 'Can only send to your contacts');
        recipients.set(id, null);
      }
      for (const cid of crews) {
        if (!q.isMember.get(cid, u.id)) throw new HttpError(403, 'Not a member of that crew');
        for (const m of q.crewMembers.all(cid)) if (m.id !== u.id && !recipients.has(m.id)) recipients.set(m.id, cid);
      }
      if (!recipients.size) throw new HttpError(400, 'No recipients');
      const messageId = db.transaction(() => {
        const r = q.insertMsg.run(u.id, clientMsgId, job.id, job.ver, JSON.stringify(job), now());
        for (const [rid, cid] of recipients) q.insertInbox.run(rid, r.lastInsertRowid, cid, now());
        return Number(r.lastInsertRowid);
      })();
      return { status: 201, body: { ok: true, messageId, recipients: recipients.size } };
    },
    'GET /api/inbox': (u) => ({
      body: { items: q.inbox.all(u.id).map((r) => ({ id: r.id, sentAt: r.created_at, from: { id: r.from_id, name: r.from_name },
        crew: r.crew_id ? { id: r.crew_id, name: r.crew_name } : null, job: JSON.parse(r.job_json) })) },
    }),
    'POST /api/inbox/ack': (u, body) => {
      const upTo = Number(body.upTo);
      if (!Number.isInteger(upTo) || upTo < 1) throw new HttpError(400, 'upTo required');
      const n = q.ack.run(u.id, upTo).changes;
      q.gcMessages.run(now() - 86400000);
      return { body: { ok: true, removed: n } };
    },
  };

  return async function handleApi(req, res, body) {
    const key = `${req.method} ${req.url.split('?')[0]}`;
    const route = routes[key];
    if (!route) throw new HttpError(404, 'Not found');
    let user = null;
    if (key !== 'POST /api/register') {
      const m = /^Bearer ([\w-]{20,100})$/.exec(req.headers.authorization || '');
      user = m && q.userByToken.get(sha(m[1]));
      if (!user) throw new HttpError(401, 'Not signed in');
      q.touch.run(now(), user.id);
    }
    return route(user, body || {});
  };
}

// --- tiny rate limiter (per token or IP) ---
function limiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const t = Date.now(), h = hits.get(key);
    if (!h || t - h.start > windowMs) { hits.set(key, { start: t, n: 1 }); return true; }
    return ++h.n <= max;
  };
}

export function createServer({ dbPath = ':memory:', staticDir = null } = {}) {
  const db = openDb(dbPath);
  const api = createApi(db);
  const apiLimit = limiter(240, 60000), regLimit = limiter(20, 3600000);
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      if (req.url.startsWith('/api/')) {
        const ip = req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
        const who = (req.headers.authorization || '').slice(-16) || ip;
        if (!apiLimit(who) || (req.url === '/api/register' && !regLimit(ip))) throw new HttpError(429, 'Too many requests');
        let body = null;
        if (req.method === 'POST') {
          if (!/^application\/json/.test(req.headers['content-type'] || '')) throw new HttpError(415, 'JSON required');
          let size = 0; const chunks = [];
          for await (const c of req) { size += c.length; if (size > MAX_BODY) throw new HttpError(413, 'Too large'); chunks.push(c); }
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new HttpError(400, 'Bad JSON'); }
        }
        const out = await api(req, res, body);
        res.writeHead(out.status || 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(out.body));
        return;
      }
      if (!staticDir || !['GET', 'HEAD'].includes(req.method)) throw new HttpError(404, 'Not found');
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = normalize(join(staticDir, p));
      if (!file.startsWith(staticDir)) throw new HttpError(403, 'Forbidden');
      let data;
      try { if (!(await stat(file)).isFile()) throw 0; data = await readFile(file); }
      catch { data = await readFile(join(staticDir, 'index.html')); p = '/index.html'; } // SPA fallback
      const ext = extname(p);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: status === 500 ? 'Server error' : e.message }));
    }
  });
  server.db = db;
  return server;
}
