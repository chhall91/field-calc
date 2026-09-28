// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../server/app.js';
import { createSync, mergeReceived } from '../src/lib/sync.js';
import { newJob, addCalc, editJob } from '../src/lib/jobs.js';

let server, base;
beforeAll(async () => { server = createServer({ dbPath: ':memory:' }); await new Promise((r) => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}`; });
afterAll(() => new Promise((r) => server.close(r)));

const call = async (method, path, body, token) => {
  const res = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
};
const memStore = () => { const m = {}; return { get: (k, d) => (k in m ? structuredClone(m[k]) : d), set: (k, v) => { m[k] = structuredClone(v); }, raw: m }; };
const calc = { tool: 'socket', state: { mode: 'bolt', sys: 'inch', hx: 'heavy', size: '1-1/2' }, summary: '1-1/2" heavy hex: head 2-3/8", nut 2-3/8"' };
const job = (name = 'Flange bolt-up') => addCalc(newJob(name), calc);

describe('API', () => {
  let a, b, c;
  it('registers users with friend codes and hashed tokens', async () => {
    a = (await call('POST', '/api/register', { name: 'Colton' })).body;
    b = (await call('POST', '/api/register', { name: 'Dana' })).body;
    c = (await call('POST', '/api/register', { name: 'Eli' })).body;
    expect(a.user.friendCode).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
    expect(a.token.length).toBeGreaterThan(30);
    const row = server.db.prepare('SELECT token_hash FROM users WHERE id = ?').get(a.user.id);
    expect(row.token_hash).not.toBe(a.token);
  });
  it('rejects bad input and missing auth', async () => {
    expect((await call('POST', '/api/register', { name: '   ' })).status).toBe(400);
    expect((await call('GET', '/api/me')).status).toBe(401);
    expect((await call('GET', '/api/me', null, 'x'.repeat(40))).status).toBe(401);
    expect((await call('GET', '/api/nope', null, a.token)).status).toBe(404);
    const r = await fetch(base + '/api/contacts', { method: 'POST', headers: { Authorization: `Bearer ${a.token}`, 'Content-Type': 'text/plain' }, body: '{}' });
    expect(r.status).toBe(415);
  });
  it('adds contacts by friend code (mutual), rejects own/unknown code', async () => {
    const r = await call('POST', '/api/contacts', { code: b.user.friendCode.toLowerCase().replace('-', '') }, a.token);
    expect(r.status).toBe(201);
    expect(r.body.contacts.map((x) => x.name)).toEqual(['Dana']);
    expect((await call('GET', '/api/me', null, b.token)).body.contacts.map((x) => x.name)).toEqual(['Colton']);
    expect((await call('POST', '/api/contacts', { code: a.user.friendCode }, a.token)).status).toBe(400);
    expect((await call('POST', '/api/contacts', { code: 'ZZZ-ZZZ' }, a.token)).status).toBe(404);
  });
  it('only sends to contacts / own crews', async () => {
    const j = job();
    expect((await call('POST', '/api/send', { job: j, to: { users: [c.user.id] }, clientMsgId: 'msg-00000001' }, a.token)).status).toBe(403);
    expect((await call('POST', '/api/send', { job: { id: '../bad' }, to: { users: [b.user.id] }, clientMsgId: 'msg-00000002' }, a.token)).status).toBe(400);
    expect((await call('POST', '/api/send', { job: j, to: { users: [] }, clientMsgId: 'msg-00000003' }, a.token)).status).toBe(400);
  });
  it('send → inbox → ack, idempotent by clientMsgId', async () => {
    const j = job('Pump A');
    const s1 = await call('POST', '/api/send', { job: j, to: { users: [b.user.id] }, clientMsgId: 'msg-00000010' }, a.token);
    expect(s1.status).toBe(201);
    const s2 = await call('POST', '/api/send', { job: j, to: { users: [b.user.id] }, clientMsgId: 'msg-00000010' }, a.token);
    expect(s2.body.duplicate).toBe(true);
    const inbox = (await call('GET', '/api/inbox', null, b.token)).body.items;
    expect(inbox).toHaveLength(1);
    expect(inbox[0].from.name).toBe('Colton');
    expect(inbox[0].job.name).toBe('Pump A');
    await call('POST', '/api/inbox/ack', { upTo: inbox[0].id }, b.token);
    expect((await call('GET', '/api/inbox', null, b.token)).body.items).toHaveLength(0);
  });
  it('crews: create, join by code, send to whole crew (not to sender)', async () => {
    const cr = (await call('POST', '/api/crews', { name: 'Outage Crew B' }, a.token)).body.crews[0];
    expect(cr.code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
    expect((await call('POST', '/api/crews/join', { code: cr.code }, c.token)).body.crews[0].members.map((m) => m.name).sort()).toEqual(['Colton', 'Eli']);
    await call('POST', '/api/crews/join', { code: cr.code }, b.token);
    const s = await call('POST', '/api/send', { job: job('Crew job'), to: { crews: [cr.id] }, clientMsgId: 'msg-00000020' }, a.token);
    expect(s.body.recipients).toBe(2);
    expect((await call('GET', '/api/inbox', null, c.token)).body.items[0].crew.name).toBe('Outage Crew B');
    expect((await call('GET', '/api/inbox', null, a.token)).body.items).toHaveLength(0);
    expect((await call('POST', '/api/send', { job: job(), to: { crews: [cr.id] }, clientMsgId: 'msg-00000021' }, (await call('POST', '/api/register', { name: 'Outsider' })).body.token)).status).toBe(403);
  });
});

describe('sync client (two users, real server)', () => {
  it('A sends → B receives automatically; resend updates B copy and keeps history', async () => {
    const sa = createSync({ store: memStore(), base }), sb = createSync({ store: memStore(), base });
    await sa.register('Colton'); await sb.register('Dana');
    await sa.addContact(sb.me().user.friendCode);
    let j = job('Heat exchanger head');
    const r = await sa.send(j, { users: [sb.me().user.id] });
    expect(r.sent).toBe(true);
    const got = await sb.syncNow();
    expect(got.received).toHaveLength(1);
    const bJobs = () => createStoreJobs(sb);
    expect(bJobs()[0].name).toBe('Heat exchanger head');
    expect(bJobs()[0].from.name).toBe('Colton');
    expect(sb.unreadCount()).toBe(1);
    // resend updated version
    j = editJob(j, { notes: 'Use heavy hex nuts, anti-seize' });
    await sa.send(j, { users: [sb.me().user.id] });
    await sb.syncNow();
    expect(bJobs()).toHaveLength(1);
    expect(bJobs()[0].notes).toBe('Use heavy hex nuts, anti-seize');
    expect(bJobs()[0].history[0].notes).toBe('');
    // syncing again is a no-op
    expect((await sb.syncNow()).received).toHaveLength(0);
  });
  it('offline: sends queue and go out when back online', async () => {
    const store = memStore();
    let online = false;
    const f = (...args) => (online ? fetch(...args) : Promise.reject(new TypeError('Failed to fetch')));
    const sa = createSync({ store, base, fetch: f });
    const sb = createSync({ store: memStore(), base });
    online = true; await sa.register('Offline Olly'); await sb.register('Pat'); await sa.addContact(sb.me().user.friendCode); online = false;
    const r = await sa.send(job('Queued job'), { users: [sb.me().user.id] });
    expect(r.sent).toBe(false);
    expect(sa.outbox()).toHaveLength(1);
    expect((await sa.syncNow()).error.status).toBe(0);
    expect(sa.meta().error).toBe('offline');
    online = true;
    await sa.syncNow();
    expect(sa.outbox()).toHaveLength(0);
    await sb.syncNow();
    expect(createStoreJobs(sb)[0].name).toBe('Queued job');
  });
});

// helper: read jobs via the store the sync client uses
function createStoreJobs(s) { return s.jobs(); }

describe('mergeReceived', () => {
  it('ignores invalid items and duplicates', () => {
    expect(mergeReceived([], { job: { id: 'x' } }).status).toBe('invalid');
    const r1 = mergeReceived([], { job: job(), from: { id: 'u1', name: 'A' } });
    expect(r1.status).toBe('added');
    const again = mergeReceived(r1.jobs, { job: r1.job, from: { id: 'u1', name: 'A' } });
    expect(again.status).toBe('duplicate');
  });
});
