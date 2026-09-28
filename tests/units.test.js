import { describe, it, expect } from 'vitest';
import { convert, convertTemp, fmt } from '../src/lib/units.js';
import { parseNumber, nearestFraction } from '../src/lib/fraction.js';

const close = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('torque conversion', () => {
  it('1 ft·lb = 1.355818 N·m (NIST SP 811)', () => close(convert(1, 'ftlb', 'Nm', 'torque'), 1.3558179483));
  it('1 ft·lb = 12 in·lb', () => close(convert(1, 'ftlb', 'inlb', 'torque'), 12, 1e-9));
  it('1 in·lb = 0.1129848 N·m', () => close(convert(1, 'inlb', 'Nm', 'torque'), 0.112984829));
  it('1 kgf·m = 9.80665 N·m', () => close(convert(1, 'kgfm', 'Nm', 'torque'), 9.80665, 1e-12));
  it('1 kgf·m = 7.23301 ft·lb', () => close(convert(1, 'kgfm', 'ftlb', 'torque'), 7.2330138512, 1e-8));
  it('100 N·m = 73.7562 ft·lb', () => close(convert(100, 'Nm', 'ftlb', 'torque'), 73.7562149, 1e-6));
  it('round trip is lossless', () => close(convert(convert(250, 'ftlb', 'kgfm', 'torque'), 'kgfm', 'ftlb', 'torque'), 250, 1e-9));
});

describe('length / pressure / flow / mass / force', () => {
  it('1 in = 25.4 mm', () => close(convert(1, 'in', 'mm', 'length'), 25.4, 1e-12));
  it('1 ft = 0.3048 m', () => close(convert(1, 'ft', 'm', 'length'), 0.3048, 1e-12));
  it('1 psi = 6.894757 kPa', () => close(convert(1, 'psi', 'kPa', 'pressure'), 6.894757293, 1e-8));
  it('1 bar = 14.5038 psi', () => close(convert(1, 'bar', 'psi', 'pressure'), 14.503773773, 1e-6));
  it('1 MPa = 145.038 psi', () => close(convert(1, 'MPa', 'psi', 'pressure'), 145.03773773, 1e-5));
  it('1 inHg = 0.491154 psi', () => close(convert(1, 'inHg', 'psi', 'pressure'), 0.4911541, 1e-6));
  it('1 atm = 14.6959 psi', () => close(convert(1, 'atm', 'psi', 'pressure'), 14.6959488, 1e-6));
  it('1 gpm = 3.785412 L/min', () => close(convert(1, 'gpm', 'Lpm', 'flow'), 3.785411784, 1e-12));
  it('100 L/min = 26.417 gpm', () => close(convert(100, 'Lpm', 'gpm', 'flow'), 26.4172052, 1e-6));
  it('1 lb = 0.45359237 kg', () => close(convert(1, 'lb', 'kg', 'mass'), 0.45359237, 1e-12));
  it('1 lbf = 4.448222 N', () => close(convert(1, 'lbf', 'N', 'force'), 4.4482216153, 1e-9));
  it('1 kgf = 2.204623 lbf', () => close(convert(1, 'kgf', 'lbf', 'force'), 2.2046226218, 1e-9));
});

describe('temperature', () => {
  it('32 °F = 0 °C', () => close(convertTemp(32, 'F', 'C'), 0));
  it('212 °F = 100 °C', () => close(convertTemp(212, 'F', 'C'), 100));
  it('-40 °F = -40 °C', () => close(convertTemp(-40, 'F', 'C'), -40));
  it('0 °C = 273.15 K', () => close(convertTemp(0, 'C', 'K'), 273.15));
  it('0 °F = 459.67 °R', () => close(convertTemp(0, 'F', 'R'), 459.67));
  it('100 °C = 671.67 °R', () => close(convertTemp(100, 'C', 'R'), 671.67));
});

describe('fractions', () => {
  it('parses fractions and mixed numbers', () => {
    expect(parseNumber('3/8')).toBe(0.375);
    expect(parseNumber('1-3/8')).toBe(1.375);
    expect(parseNumber('1 3/8"')).toBe(1.375);
    expect(parseNumber('.5')).toBe(0.5);
    expect(parseNumber('2.25in')).toBe(2.25);
    expect(parseNumber('abc')).toBeNaN();
    expect(parseNumber('1/0')).toBeNaN();
  });
  it('nearest 1/64', () => {
    expect(nearestFraction(0.375).text).toBe('3/8');
    expect(nearestFraction(0.201).text).toBe('13/64');       // #7 drill ≈ 13/64 (0.2031)
    expect(nearestFraction(1.0).text).toBe('1');
    expect(nearestFraction(25 / 25.4).text).toBe('63/64');   // 25 mm = 0.9843"
    expect(nearestFraction(1.53).text).toBe('1-17/32');      // 1.53 -> 98/64 = 1.53125
    const f = nearestFraction(10 / 25.4);                    // 10 mm = 0.3937"
    expect(f.text).toBe('25/64');
    close(f.error, 0.3937007874 - 0.390625, 1e-9);
  });
  it('fmt trims', () => { expect(fmt(135.5817948)).toBe('135.582'); expect(fmt(1200)).toBe('1200'); });
});
