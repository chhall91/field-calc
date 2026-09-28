import { describe, it, expect } from 'vitest';
import { wrenchSetting, actualTorque, tensileAreaInch, tensileAreaMetric, boltTorqueInch } from '../src/lib/torque.js';
import { inchTorqueTable, metricTorqueTable } from '../src/data/bolts.js';
import { metricTapDrill } from '../src/data/fasteners.js';
import { drillLookup, nearestDrills } from '../src/data/drills.js';

const close = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe("adapter / crow's foot formula  T_w = T_a·L/(L+E)", () => {
  it('100 ft·lb, 12" wrench, 2" crow\'s foot inline -> 85.714', () => close(wrenchSetting(100, 12, 2, 0), 85.7142857, 1e-6));
  it('50 ft·lb, 15" wrench, 3" adapter -> 41.667', () => close(wrenchSetting(50, 15, 3), 41.6666667, 1e-6));
  it('150 N·m, 400 mm wrench, 50 mm adapter -> 133.333', () => close(wrenchSetting(150, 400, 50), 133.3333333, 1e-6));
  it('90° adapter needs no correction', () => close(wrenchSetting(100, 12, 2, 90), 100, 1e-9));
  it('180° (adapter pointing back) -> 120', () => close(wrenchSetting(100, 12, 2, 180), 120, 1e-9));
  it('45° -> T_a·L/(L+E·cos45)', () => close(wrenchSetting(100, 12, 2, 45), 100 * 12 / (12 + 2 * Math.SQRT1_2), 1e-9));
  it('zero extension = no change', () => close(wrenchSetting(80, 18, 0), 80, 1e-12));
  it('reverse calc round-trips', () => close(actualTorque(wrenchSetting(100, 12, 2, 30), 12, 2, 30), 100, 1e-9));
  it('invalid length returns NaN', () => { expect(wrenchSetting(100, 0, 2)).toBeNaN(); expect(wrenchSetting(100, 2, 4, 180)).toBeNaN(); });
});

describe('tensile stress area', () => {
  it('1/2-13 As = 0.1419 in² (ASME B1.1 table)', () => close(tensileAreaInch(0.5, 13), 0.1419, 5e-5));
  it('1/4-20 As = 0.0318 in²', () => close(tensileAreaInch(0.25, 20), 0.0318, 5e-5));
  it('1-8 As = 0.606 in²', () => close(tensileAreaInch(1, 8), 0.6057, 5e-4));
  it('M10x1.5 As = 58.0 mm² (ISO 898-1)', () => close(tensileAreaMetric(10, 1.5), 58.0, 0.05));
  it('M12x1.75 As = 84.3 mm²', () => close(tensileAreaMetric(12, 1.75), 84.3, 0.05));
  it('M20x2.5 As = 245 mm²', () => close(tensileAreaMetric(20, 2.5), 245, 0.5));
});

// Spot checks against Fastenal published charts (values read from the PDFs).
describe('bolt torque vs. Fastenal published chart', () => {
  const row = (t, s) => t.find((r) => r.size === s);
  it('Gr5 1/2-13 dry ≈ 75 ft·lb, lube ≈ 56', () => {
    close(row(inchTorqueTable('5', 'unc', 'dry'), '1/2').ftlb, 75, 1);
    close(row(inchTorqueTable('5', 'unc', 'lube'), '1/2').ftlb, 56, 1);
  });
  it('Gr5 3/4-10: clamp 21322 lb, dry 267 ft·lb', () => {
    const r = row(inchTorqueTable('5', 'unc', 'dry'), '3/4');
    close(r.clamp, 21322, 10); close(r.ftlb, 267, 1);
  });
  it('Gr8 1-8: clamp 54517 lb, dry 909 ft·lb, lube 681', () => {
    const r = row(inchTorqueTable('8', 'unc', 'dry'), '1');
    close(r.clamp, 54517, 60); close(r.ftlb, 909, 2);
    close(row(inchTorqueTable('8', 'unc', 'lube'), '1').ftlb, 681, 2);
  });
  it('Gr5 5/8-18 fine: clamp 16317, dry 170', () => {
    const r = row(inchTorqueTable('5', 'unf', 'dry'), '5/8');
    close(r.clamp, 16317, 10); close(r.ftlb, 170, 1);
  });
  it('Gr8 3/8-24 fine: dry 49 ft·lb', () => close(row(inchTorqueTable('8', 'unf', 'dry'), '3/8').ftlb, 49, 1));
  it('Gr5 1-1/8-12 fine uses 74 ksi: clamp 47493', () => close(row(inchTorqueTable('5', 'unf', 'dry'), '1-1/8').clamp, 47493, 60));
  it('Gr8 1/4-20 dry ≈ 143 in·lb', () => close(row(inchTorqueTable('8', 'unc', 'dry'), '1/4').inlb, 143, 6));
  it('8.8 M10 coarse: clamp 5671 lbf, dry 37.2 ft·lb', () => {
    const r = row(metricTorqueTable('8.8', 'coarse', 'dry'), 'M10');
    close(r.clampLbf, 5671, 5); close(r.ftlb, 37.2, 0.2);
  });
  it('10.9 M12 coarse: clamp 11792 lbf, dry 92.8 ft·lb, lube 69.6', () => {
    const r = row(metricTorqueTable('10.9', 'coarse', 'dry'), 'M12');
    close(r.clampLbf, 11792, 10); close(r.ftlb, 92.8, 0.3);
    close(row(metricTorqueTable('10.9', 'coarse', 'lube'), 'M12').ftlb, 69.6, 0.3);
  });
  it('12.9 M8 coarse: dry 31.4 ft·lb', () => close(row(metricTorqueTable('12.9', 'coarse', 'dry'), 'M8').ftlb, 31.4, 0.2));
  it('8.8 M20 coarse: dry 314 ft·lb', () => close(row(metricTorqueTable('8.8', 'coarse', 'dry'), 'M20').ftlb, 314, 1.5));
  it('12.9 M36 coarse: dry 3154 ft·lb', () => close(row(metricTorqueTable('12.9', 'coarse', 'dry'), 'M36').ftlb, 3154, 15));
  it('Grade 2 uses 33 ksi above 3/4"', () => {
    const r = boltTorqueInch({ D: 0.875, tpi: 9, proofPsi: 33000, K: 0.2 });
    close(row(inchTorqueTable('2', 'unc', 'dry'), '7/8').ftlb, r.ftlb, 1e-9);
  });
});

describe('thread / drill reference', () => {
  it('metric tap drill = d − P', () => { expect(metricTapDrill(10, 1.5)).toBe(8.5); expect(metricTapDrill(12, 1.75)).toBe(10.3); expect(metricTapDrill(8, 1.25)).toBe(6.8); });
  it('drill lookup', () => {
    close(drillLookup('#7').inch, 0.201, 1e-9);
    close(drillLookup('F').inch, 0.257, 1e-9);
    close(drillLookup('6.8mm').inch, 6.8 / 25.4, 1e-9);
    expect(drillLookup('#81')).toBeNull();
  });
  it('nearest drills to 1/4"', () => {
    const n = nearestDrills(0.25);
    expect(n.letter.name).toBe('E'); expect(n.fraction.name).toBe('1/4"'); expect(n.number.name).toBe('#1') // #1 = .228 is the largest number drill;
  });
});
