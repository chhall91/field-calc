import { describe, it, expect } from 'vitest';
import { newJob, addCalc, editJob, duplicateJob, encodeJob, decodeJob, shareUrl, classifyImport, applyImport, restoreVersion, ShareError, LIMITS } from '../src/lib/jobs.js';
import { deflateSync, strToU8 } from 'fflate';

const calcA = { tool: 'socket', state: { mode: 'bolt', sys: 'inch', hx: 'heavy', size: '1-1/2' }, summary: '1-1/2" heavy hex: head 2-3/8", nut 2-3/8"' };
const calcB = { tool: 'bolt', state: { sys: 'sae', g: '8', th: 'coarse', c: 'dry', sel: '1/2' }, summary: 'SAE Grade 8 1/2-13 plain/dry: 106 ft·lb / 144 N·m' };
const calcC = { tool: 'adapter', state: { t: '100', tu: 'ftlb', L: '12', E: '2', lu: 'in', a: '0' }, summary: '100 ft·lb, L 12 in, E 2 in @ 0° → set 85.7 ft·lb' };
const mk = () => addCalc(addCalc(addCalc({ ...newJob('Pump flange — 1½" studs ✓', 1000), notes: 'Heavy nuts, lubed. Ünïcødé ok' }, calcA, 1001), calcB, 1002), calcC, 1003);
const wrap = (obj) => '1.' + Buffer.from(deflateSync(strToU8(JSON.stringify(obj)))).toString('base64url');

describe('job model', () => {
  it('adding calcs bumps version and keeps history', () => {
    const j = mk();
    expect(j.calcs).toHaveLength(3);
    expect(j.ver).toBe(4);
    expect(j.history[0].ver).toBe(3);
    expect(addCalc(j, calcA)).toBe(j); // duplicate calc ignored
  });
  it('history is capped', () => {
    let j = newJob('x');
    for (let i = 0; i < 12; i++) j = editJob(j, { notes: String(i) });
    expect(j.history.length).toBe(LIMITS.history);
    expect(j.ver).toBe(13);
  });
  it('duplicate gets a new id', () => {
    const j = mk(); const d = duplicateJob(j);
    expect(d.id).not.toBe(j.id); expect(d.calcs).toEqual(j.calcs); expect(d.name).toMatch(/copy/);
  });
  it('restore a previous version', () => {
    const j = editJob(mk(), { notes: 'changed' });
    const r = restoreVersion(j, 0);
    expect(r.notes).toBe('Heavy nuts, lubed. Ünïcødé ok');
    expect(r.ver).toBe(j.ver + 1);
  });
});

describe('share link encode/decode', () => {
  it('round trips (unicode, all calc types)', () => {
    const j = mk();
    const d = decodeJob(encodeJob(j));
    expect(d.id).toBe(j.id); expect(d.name).toBe(j.name); expect(d.notes).toBe(j.notes); expect(d.ver).toBe(j.ver);
    expect(d.calcs.map((c) => [c.tool, c.state, c.summary])).toEqual(j.calcs.map((c) => [c.tool, c.state, c.summary]));
    expect(d.dropped).toBe(0);
  });
  it('decodes from a full URL, from pasted text, and URL-encoded', () => {
    const j = mk();
    const url = shareUrl('https://x.trycloudflare.com/#/jobs', j);
    expect(url).toMatch(/^https:\/\/x\.trycloudflare\.com\/#\/import\/1\./);
    expect(decodeJob(url).id).toBe(j.id);
    expect(decodeJob(`Here's the job: ${url} thanks`).id).toBe(j.id);
    expect(decodeJob(url.replace('#/import/', '#/import/').replace(/_/g, '%5F')).id).toBe(j.id);
  });
  it('link is compact enough for a QR code', () => {
    expect(encodeJob(mk()).length).toBeLessThan(700);
  });
  it('history is not shared', () => {
    const j = editJob(mk(), { notes: 'secret old note?' });
    expect(JSON.stringify(decodeJob(encodeJob(j)))).not.toContain('Ünïcødé');
  });
});

describe('malformed links', () => {
  const bad = (x) => expect(() => decodeJob(x)).toThrow(ShareError);
  it('rejects garbage, truncated, wrong version, oversized', () => {
    bad(''); bad('hello'); bad('https://example.com/');
    bad('1.!!!notbase64');
    const p = encodeJob(mk());
    bad(p.slice(0, Math.floor(p.length / 2)));        // truncated
    bad('9.' + p.slice(2));                          // future format
    bad('1.' + 'A'.repeat(LIMITS.payload + 10));     // too long
  });
  it('rejects valid compression with bad structure', () => {
    bad(wrap({ foo: 1 }));
    bad(wrap({ i: '../x', c: [] }));
    bad(wrap({ i: 'abcd1234', c: 'nope' }));
    bad('1.' + Buffer.from(deflateSync(strToU8('not json'))).toString('base64url'));
  });
  it('drops unknown tools and junk state, clips long text', () => {
    const d = decodeJob(wrap({ i: 'abcd1234', n: 'x'.repeat(500), v: 2, c: [
      ['socket', { size: '1/2', 'bad key!': 'x', obj: { a: 1 } }, 'ok'],
      ['evil', {}, 'nope'], ['bolt', {}, ''], 'junk', ['torque', null, 'fine'],
    ] }));
    expect(d.name.length).toBe(LIMITS.name);
    expect(d.calcs.map((c) => c.tool)).toEqual(['socket', 'torque']);
    expect(d.calcs[0].state).toEqual({ size: '1/2' });
    expect(d.dropped).toBe(3);
  });
});

describe('import & versioning', () => {
  it('new → add', () => {
    const inc = decodeJob(encodeJob(mk()));
    expect(classifyImport([], inc).status).toBe('new');
    const { jobs, job } = applyImport([], inc, 'add');
    expect(jobs).toHaveLength(1); expect(job.id).toBe(inc.id); expect(job.ver).toBe(inc.ver);
  });
  it('same content → duplicate (no-op add)', () => {
    const j = mk(); const inc = decodeJob(encodeJob(j));
    const r = applyImport([], inc, 'add');
    expect(classifyImport(r.jobs, inc).status).toBe('duplicate');
    expect(applyImport(r.jobs, inc, 'add').jobs).toHaveLength(1);
  });
  it('sender edits → update replaces and keeps old copy in history', () => {
    const j = mk();
    const mine = applyImport([], decodeJob(encodeJob(j)), 'add').jobs;
    const j2 = editJob(j, { notes: 'Re-torqued to 95%' });
    const inc2 = decodeJob(encodeJob(j2));
    expect(classifyImport(mine, inc2).status).toBe('update');
    const { jobs, job } = applyImport(mine, inc2, 'replace');
    expect(jobs).toHaveLength(1);
    expect(job.notes).toBe('Re-torqued to 95%');
    expect(job.ver).toBe(j2.ver);
    expect(job.history[0].notes).toBe(j.notes);
  });
  it('older incoming → older; conflict at same version; copy keeps both', () => {
    const j = mk();
    let mine = applyImport([], decodeJob(encodeJob(j)), 'add').jobs;
    mine = [editJob(mine[0], { notes: 'my edit' })];
    expect(classifyImport(mine, decodeJob(encodeJob(j))).status).toBe('older');
    const theirs = editJob(j, { notes: 'their edit' });   // same ver as mine, different content
    expect(classifyImport(mine, decodeJob(encodeJob(theirs))).status).toBe('conflict');
    const r = applyImport(mine, decodeJob(encodeJob(theirs)), 'copy');
    expect(r.jobs).toHaveLength(2); expect(r.job.id).not.toBe(j.id); expect(r.job.sharedFrom.id).toBe(j.id);
  });
});
