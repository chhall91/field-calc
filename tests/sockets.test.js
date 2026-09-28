// Spot checks of socket / wrench sizes against the published tables cited in src/data/sockets.js.
import { describe, it, expect } from 'vitest';
import { INCH_SOCKETS, METRIC_SOCKETS } from '../src/data/sockets.js';
import { INCH_WRENCH, METRIC_THREADS } from '../src/data/fasteners.js';
import { findBySocket, parseSocket, allSocketEntries, fracToIn } from '../src/lib/sockets.js';

const inch = (s) => INCH_SOCKETS.find((r) => r.size === s);
const met = (s) => METRIC_SOCKETS.find((r) => r.size === s);

describe('inch ASME B18.2.1 / B18.2.2 (Boltport, Portland Bolt, AmesWeb)', () => {
  it('hex bolt heads', () => {
    expect(inch('1/2').hexHead).toBe('3/4');
    expect(inch('7/16').hexHead).toBe('5/8');
    expect(inch('9/16').hexHead).toBe('13/16');   // cap screw 0.812
    expect(inch('1-1/4').hexHead).toBe('1-7/8');
    expect(inch('2').hexHead).toBe('3');
    expect(inch('3').hexHead).toBe('4-1/2');
    expect(inch('4').hexHead).toBe('6');
  });
  it('hex nuts differ from bolt head at 7/16 and 9/16 only', () => {
    expect(inch('7/16').hexNut).toBe('11/16');
    expect(inch('9/16').hexNut).toBe('7/8');
    const diffs = INCH_SOCKETS.filter((r) => r.hexNut !== r.hexHead).map((r) => r.size);
    expect(diffs).toEqual(['7/16', '9/16']);
  });
  it('heavy hex nuts = 1.5D + 1/8 for 1/2" and up (B18.2.2)', () => {
    expect(inch('1/2').heavyNut).toBe('7/8');
    expect(inch('1').heavyNut).toBe('1-5/8');
    expect(inch('1-1/2').heavyNut).toBe('2-3/8');
    expect(inch('2-1/2').heavyNut).toBe('3-7/8');
    expect(inch('4').heavyNut).toBe('6-1/8');
    // 9/16 is the published exception (15/16, not 31/32) in B18.2.2 tables
    for (const r of INCH_SOCKETS.filter((x) => x.d >= 0.5 && x.size !== '9/16')) expect(fracToIn(r.heavyNut)).toBeCloseTo(1.5 * r.d + 0.125, 6);
  });
  it('small heavy hex nuts', () => {
    expect(inch('1/4').heavyNut).toBe('1/2');
    expect(inch('3/8').heavyNut).toBe('11/16');
    expect(inch('9/16').heavyNut).toBe('15/16');
  });
  it('heavy hex heads and structural bolts', () => {
    expect(inch('3/4').heavyHead).toBe('1-1/4');
    expect(inch('1-1/2').heavyHead).toBe('2-3/8');
    expect(inch('3').heavyHead).toBe('4-5/8');
    expect(inch('1').structural).toBe('1-5/8');
    expect(inch('1-3/8').structural).toBe('2-3/16');
    expect(inch('1-5/8').structural).toBeNull();
  });
  it('covers 1/4" through 4"', () => {
    expect(INCH_SOCKETS[0].size).toBe('1/4');
    expect(INCH_SOCKETS.at(-1).size).toBe('4');
  });
  it('thread table wrench data derives from the verified table; 9/16 SHCS key fixed', () => {
    expect(INCH_WRENCH['7/16'].hexNut).toBe('11/16');
    expect(INCH_WRENCH['1'].heavyNut).toBe('1-5/8');
    expect(INCH_WRENCH['9/16'].shcs).toBe('7/16');
    expect(INCH_WRENCH['1-1/4'].shcs).toBe('7/8');
  });
});

describe('metric (ISO 4014/4032, DIN, ASME metric heavy, EN 14399-4)', () => {
  it('ISO sizes', () => {
    expect(met('M10').iso).toBe(16); expect(met('M12').iso).toBe(18); expect(met('M22').iso).toBe(34);
    expect(met('M36').iso).toBe(55); expect(met('M42').iso).toBe(65); expect(met('M64').iso).toBe(95);
  });
  it('DIN differs only at M10/M12/M14/M22', () => {
    expect(METRIC_SOCKETS.filter((r) => r.din).map((r) => [r.size, r.din])).toEqual([['M10', 17], ['M12', 19], ['M14', 22], ['M22', 32]]);
  });
  it('ASME heavy hex and HV', () => {
    expect(met('M20').asmeHeavyBolt).toBe(34); expect(met('M20').hv).toBe(32);
    expect(met('M12').asmeHeavyNut).toBe(21); expect(met('M12').hv).toBe(22);
    expect(met('M36').asmeHeavyNut).toBe(60); expect(met('M64').asmeHeavyNut).toBe(100);
  });
  it('M5 through M64', () => { expect(METRIC_SOCKETS[0].size).toBe('M5'); expect(METRIC_SOCKETS.at(-1).size).toBe('M64'); });
  it('SHCS keys ISO 4762', () => {
    const k = (s) => METRIC_THREADS.find((t) => t.size === s).shcs;
    expect(k('M8')).toBe(6); expect(k('M20')).toBe(17); expect(k('M30')).toBe(22); expect(k('M33')).toBe(24); expect(k('M36')).toBe(27);
  });
  it('existing thread table agrees with socket table', () => {
    for (const t of METRIC_THREADS) { const r = met(t.size); if (r) { expect(t.iso).toBe(r.iso); expect(t.din).toBe(r.din); } }
  });
});

describe('reverse lookup', () => {
  it('parses input', () => {
    expect(parseSocket('1-1/2', 'in')).toBeCloseTo(38.1, 6);
    expect(parseSocket('36', 'mm')).toBe(36);
    expect(parseSocket('19mm', 'in')).toBe(19);
    expect(parseSocket('3/4"', 'mm')).toBeCloseTo(19.05, 6);
  });
  it('2-3/8" fits 1-1/2 heavy hex head, structural bolt and heavy nut, plus 1-9/16? no', () => {
    const { exact } = findBySocket(parseSocket('2-3/8'));
    const got = exact.map((e) => `${e.size} ${e.type}`);
    expect(got).toEqual(expect.arrayContaining(['1-1/2" heavyHead', '1-1/2" structural', '1-1/2" heavyNut']));
    expect(got.length).toBe(3);
  });
  it('3/4" fits 1/2 hex bolt, 1/2 hex nut and 7/16 heavy nut; 19 mm socket is not offered for 3/4"', () => {
    const { exact } = findBySocket(19.05);
    expect(exact.map((e) => `${e.size} ${e.type}`)).toEqual(['7/16" heavyNut', '1/2" hexHead', '1/2" hexNut']);
    const r19 = findBySocket(19);
    expect(r19.exact.map((e) => e.size)).toEqual(['M12']); // DIN M12
    expect(r19.near.length).toBe(0);                          // 19 mm is SMALLER than 3/4" → excluded
  });
  it('36 mm fits M24 ISO and M22 heavy/HV; 1-7/16" (36.51 mm) is not a fit for 36 mm', () => {
    const { exact, near } = findBySocket(36);
    expect(exact.map((e) => `${e.size} ${e.type}`)).toEqual(['M22 asmeHeavyBolt', 'M22 asmeHeavyNut', 'M22 hv', 'M24 iso']);
    expect(near.some((e) => e.af === '1-7/16"')).toBe(false);
  });
  it('every entry has a positive AF', () => { for (const e of allSocketEntries()) expect(e.afMm).toBeGreaterThan(0); });
});
