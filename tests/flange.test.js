import { describe, it, expect } from 'vitest';
import { B165, FLANGE_CLASSES, PT_11, PT_22, STAR_NUMBERING } from '../src/data/flanges.js';
import { flangeLookup, npsList, ptRating, starPattern, tighteningOrder, inches } from '../src/lib/flange.js';

describe('ASME B16.5 flange data — spot checks vs published tables', () => {
  it('6" Class 300 (Texas Flange / Summers / flangeboltchart)', () => {
    expect(flangeLookup('6', 300)).toMatchObject({ od: '12-1/2', bolts: 12, dia: '3/4', bc: '10-5/8', rf: '4-3/4', rtj: '5-1/2', nutSocket: '1-1/4', rfHeight: '1/16' });
  });
  it('other spot checks', () => {
    expect(flangeLookup('4', 150)).toMatchObject({ od: '9', bolts: 8, dia: '5/8', bc: '7-1/2', rf: '3-1/2', rtj: '4', nutSocket: '1-1/16' });
    expect(flangeLookup('1/2', 150)).toMatchObject({ bolts: 4, dia: '1/2', bc: '2-3/8', rf: '2-1/4', rtj: null });
    expect(flangeLookup('24', 150)).toMatchObject({ od: '32', bolts: 20, dia: '1-1/4', bc: '29-1/2', nutSocket: '2' });
    expect(flangeLookup('8', 600)).toMatchObject({ od: '16-1/2', bolts: 12, dia: '1-1/8', bc: '13-3/4', nutSocket: '1-13/16' });
    expect(flangeLookup('12', 2500)).toMatchObject({ bolts: 12, dia: '2-3/4' });
    expect(flangeLookup('16', 900).bc).toBe('24-1/4'); // resolved discrepancy
    expect(flangeLookup('24', 400)).toMatchObject({ rf: '10-1/2', rtj: '11', rfHeight: '1/4' });
  });
  it('coverage and exclusions', () => {
    expect(FLANGE_CLASSES).toEqual([150, 300, 400, 600, 900, 1500, 2500]);
    expect(npsList(150)).toHaveLength(20);
    expect(npsList(150)).not.toContain('22');
    expect(npsList(900)).not.toContain('3-1/2');
    expect(npsList(2500).at(-1)).toBe('12');
    expect(flangeLookup('22', 150)).toBeNull();
  });
  it('internal consistency: bolt count multiple of 4, BC < OD, every bolt size maps to a heavy-nut socket', () => {
    for (const c of FLANGE_CLASSES) for (const r of B165[c]) {
      const f = flangeLookup(r[0], c);
      expect(f.bolts % 4).toBe(0);
      expect(inches(f.bc)).toBeLessThan(inches(f.od));
      expect(f.nutSocket).toBeTruthy();
      if (f.rtj) expect(inches(f.rtj)).toBeGreaterThanOrEqual(inches(f.rf));
      expect(STAR_NUMBERING[f.bolts]).toBeTruthy();
    }
  });
  it('Class 400 ≤3-1/2 uses Class 600 dimensions', () => {
    for (const n of ['1/2', '1', '2', '3', '3-1/2']) {
      const a = flangeLookup(n, 400), b = flangeLookup(n, 600);
      expect([a.od, a.bolts, a.dia, a.bc]).toEqual([b.od, b.bolts, b.dia, b.bc]);
    }
  });
});

describe('P-T ratings', () => {
  it('Group 1.1 spot checks (B16.5-2017)', () => {
    expect(PT_11[100]).toEqual([285, 740, 985, 1480, 2220, 3705, 6170]);
    expect(ptRating('1.1', 300, 100).psig).toBe(740);
    expect(ptRating('1.1', 150, 650).psig).toBe(125);
    expect(ptRating('1.1', 600, 800).psig).toBe(825);
  });
  it('uses next higher tabulated temperature (conservative)', () => {
    expect(ptRating('1.1', 300, 450)).toMatchObject({ psig: 605, rowF: 500 });
    expect(ptRating('1.1', 300, -20)).toMatchObject({ psig: 740, rowF: 100 });
    expect(ptRating('1.1', 150, 1001).psig).toBeNull();
    expect(ptRating('1.1', 150, -21).psig).toBeNull();
  });
  it('Group 2.2 omits 650/700°F and steps to 750°F', () => {
    expect(PT_22[650]).toBeUndefined();
    expect(PT_22[700]).toBeUndefined();
    expect(ptRating('2.2', 300, 620)).toMatchObject({ psig: 425, rowF: 750 });
    expect(ptRating('2.2', 150, 100).psig).toBe(275);
    expect(ptRating('2.2', 150, 1100).psig).toBeNull();
    expect(ptRating('2.2', 2500, 1500).psig).toBe(345);
  });
  it('ratings decrease with temperature within each class', () => {
    for (const t of [PT_11, PT_22]) {
      const rows = Object.keys(t).map(Number).sort((a, b) => a - b);
      for (let i = 1; i < rows.length; i++) t[rows[i]].forEach((v, c) => { if (v != null) expect(v).toBeLessThanOrEqual(t[rows[i - 1]][c]); });
    }
  });
  it('bar conversion', () => { expect(ptRating('1.1', 150, 100).bar).toBeCloseTo(19.65, 1); });
});

describe('cross pattern', () => {
  it('each pattern is a permutation of 1..n and 2 is opposite 1', () => {
    for (const [n, p] of Object.entries(STAR_NUMBERING)) {
      expect([...p].sort((a, b) => a - b)).toEqual(Array.from({ length: +n }, (_, i) => i + 1));
      expect(p.indexOf(2)).toBe(+n / 2);
    }
  });
  it('4 and 8 bolt sequences', () => {
    expect(tighteningOrder(4)).toEqual([0, 2, 1, 3]);
    expect(tighteningOrder(8)).toEqual([0, 4, 2, 6, 1, 5, 3, 7]);
    expect(starPattern(12)).toEqual([1, 9, 5, 3, 11, 7, 2, 10, 6, 4, 12, 8]);
    expect(starPattern(5)).toBeNull();
  });
});
