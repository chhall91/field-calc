import { describe, it, expect } from 'vitest';
import { WIRE_ROPE, CHAIN, WEB, ROUND, SHACKLES, DENSITY, PIPE, DD_EFF } from '../src/data/rigging.js';
import { effectiveLegs, angleFromHL, loadAngleFactor, tensionPerLeg, cgShare, cgTensions, ddEfficiency, shackleSidePct, eyeboltPct, plateLb, roundBarLb, pipeLb } from '../src/lib/rigging.js';
import { KNOWN_TOOLS } from '../src/lib/jobs.js';
import { TOOLS } from '../src/tools/index.js';

describe('sling angle math', () => {
  it('load angle factors', () => {
    expect(loadAngleFactor(90)).toBeCloseTo(1, 6);
    expect(loadAngleFactor(60)).toBeCloseTo(1.155, 3);
    expect(loadAngleFactor(45)).toBeCloseTo(1.414, 3);
    expect(loadAngleFactor(30)).toBeCloseTo(2.0, 6);
  });
  it('tension per leg', () => {
    expect(tensionPerLeg(1000, 1, 45)).toBe(1000);
    expect(tensionPerLeg(1000, 2, 60)).toBeCloseTo(577.4, 1);
    expect(tensionPerLeg(1000, 2, 30)).toBeCloseTo(1000, 6);
    expect(tensionPerLeg(1000, 4, 60)).toBeCloseTo(577.4, 1); // only 2 legs carry
    expect(effectiveLegs(3)).toBe(2);
    expect(effectiveLegs(4)).toBe(2);
  });
  it('H/L method', () => {
    expect(angleFromHL(1, 2)).toBeCloseTo(30, 6);
    expect(angleFromHL(5, 5)).toBeCloseTo(90, 6);
    expect(angleFromHL(6, 5)).toBeNaN();
    expect(1 / Math.sin(angleFromHL(5, 6) * Math.PI / 180)).toBeCloseTo(6 / 5, 9); // LAF = L/H
  });
});

describe('CG load share', () => {
  it('closer pick point carries more', () => {
    expect(cgShare(12000, 4, 8)).toEqual({ A: 8000, B: 4000 });
    expect(cgShare(1000, 5, 5)).toEqual({ A: 500, B: 500 });
    expect(cgShare(1000, 0, 5)).toEqual({ A: 1000, B: 0 });
    expect(cgShare(1000, 0, 0)).toBeNull();
    expect(cgShare(1000, -1, 5)).toBeNull();
  });
  it('leg tensions with hook height; horizontal components balance', () => {
    const t = cgTensions(12000, 4, 8, 6);
    expect(t.TA).toBeCloseTo(8000 * Math.hypot(4, 6) / 6, 6);
    expect(t.TB).toBeCloseTo(4000 * Math.hypot(8, 6) / 6, 6);
    expect(t.TA * (4 / t.LA)).toBeCloseTo(t.TB * (8 / t.LB), 6);
    expect(t.TA * (6 / t.LA) + t.TB * (6 / t.LB)).toBeCloseTo(12000, 6);
  });
});

describe('capacity data spot checks (catalog values)', () => {
  const wr = (s) => WIRE_ROPE.find((r) => r.size === s);
  it('wire rope EIPS IWRC mech splice (Lift-All / CERTEX)', () => {
    expect(wr('1/2')).toMatchObject({ v: 2.5, c: 1.9, b: 5.1 });
    expect(wr('1')).toMatchObject({ v: 9.8, c: 7.2, b: 20 });
    expect(wr('3/4')).toMatchObject({ v: 5.6, c: 4.1, b: 11 });
    for (const r of WIRE_ROPE) { expect(r.c).toBeLessThan(r.v); expect(r.b).toBeGreaterThan(r.v * 1.9); expect(r.b).toBeLessThanOrEqual(r.v * 2.1); }
  });
  it('alloy chain', () => {
    expect(Object.fromEntries(CHAIN[80])['3/8']).toBe(7100);
    expect(Object.fromEntries(CHAIN[80])['1/2']).toBe(12000);
    expect(Object.fromEntries(CHAIN[100])['1/2']).toBe(15000);
    expect(Object.fromEntries(CHAIN[100])['3/4']).toBe(35300);
    for (const [s, v] of CHAIN[100]) { const g80 = Object.fromEntries(CHAIN[80])[s]; if (g80) expect(v).toBeGreaterThan(g80); }
  });
  it('web slings: 2" 1-ply lower-of = 3200/2500/6400', () => {
    const [, la, asc] = WEB[1].find((r) => r[0] === 2);
    expect(la.map((x, i) => Math.min(x, asc[i]))).toEqual([3200, 2500, 6400]);
  });
  it('round slings WSTDA colors', () => {
    expect(ROUND.find((r) => r.color === 'Purple')).toMatchObject({ v: 2600, c: 2100, b: 5200 });
    expect(ROUND.find((r) => r.color === 'Yellow').v).toBe(8400);
    expect(ROUND.find((r) => r.color === 'Orange').v).toBe(25000);
    for (const r of ROUND) expect(r.b).toBe(r.v * 2);
  });
  it('Crosby G-209 shackles', () => {
    const t = (s) => SHACKLES.find((r) => r.size === s).t;
    expect(t('1/2')).toBe(2); expect(t('5/8')).toBe(3.25); expect(t('3/4')).toBe(4.75); expect(t('1')).toBe(8.5); expect(t('2')).toBe(35);
    for (let i = 1; i < SHACKLES.length; i++) expect(SHACKLES[i].t).toBeGreaterThan(SHACKLES[i - 1].t);
  });
});

describe('reductions', () => {
  it('shackle side load (Crosby)', () => {
    expect(shackleSidePct(0)).toBe(100); expect(shackleSidePct(10)).toBe(100); expect(shackleSidePct(10.5)).toBe(85);
    expect(shackleSidePct(45)).toBe(70); expect(shackleSidePct(90)).toBe(50); expect(shackleSidePct(91)).toBeNull();
  });
  it('shoulder eye bolt: rounds up to next tabulated angle', () => {
    expect(eyeboltPct(0)).toBe(100); expect(eyeboltPct(15)).toBe(80); expect(eyeboltPct(16)).toBe(65);
    expect(eyeboltPct(45)).toBe(30); expect(eyeboltPct(60)).toBe(25); expect(eyeboltPct(95)).toBeNull();
  });
  it('D/d step-down, lower of two tables', () => {
    expect(ddEfficiency(1, 1)).toBe(50); expect(ddEfficiency(2, 1)).toBe(65); expect(ddEfficiency(3, 1)).toBe(65);
    expect(ddEfficiency(24, 1)).toBe(91); expect(ddEfficiency(25, 1)).toBe(100); expect(ddEfficiency(0.5, 1)).toBeNull();
    expect(DD_EFF.every(([, p], i) => i === 0 || p > DD_EFF[i - 1][1])).toBe(true);
  });
});

describe('weight estimator', () => {
  it('density table', () => {
    expect(DENSITY.steel.lbft3).toBe(490); expect(DENSITY.water.lbft3).toBe(62.4); expect(DENSITY.concrete.lbft3).toBe(150);
  });
  it('steel plate 1" thick = 40.8 lb/ft²', () => { expect(plateLb(12, 12, 1)).toBeCloseTo(40.83, 2); expect(plateLb(96, 48, 1)).toBeCloseTo(1306.7, 1); });
  it('round bar 1" dia = 2.67 lb/ft', () => { expect(roundBarLb(1, 12)).toBeCloseTo(2.67, 2); });
  it('pipe: 6" Sch 40 = 18.97 lb/ft, 2" Sch 40 = 3.65, 4" Sch 80 = 14.98 (B36.10 plain end)', () => {
    const p = (n) => PIPE.find((x) => x.nps === n);
    expect(pipeLb(p('6').od, p('6').s40, 12)).toBeCloseTo(18.97, 1);
    expect(pipeLb(p('2').od, p('2').s40, 12)).toBeCloseTo(3.65, 1);
    expect(pipeLb(p('4').od, p('4').s80, 12)).toBeCloseTo(14.98, 1);
    expect(pipeLb(p('6').od, p('6').s40, 12, 'steel', true) - 18.97).toBeCloseTo(12.5, 0); // water in 6" Sch 40 ≈ 12.5 lb/ft
    expect(pipeLb(2, 1.5, 12)).toBeNaN();
  });
});

describe('integration', () => {
  it('all tools are known to Saved Jobs', () => {
    for (const t of TOOLS) expect(KNOWN_TOOLS).toContain(t.id);
    for (const id of ['flange', 'sling', 'capacity', 'hardware', 'cg', 'weight', 'dd']) expect(TOOLS.some((t) => t.id === id)).toBe(true);
  });
});
