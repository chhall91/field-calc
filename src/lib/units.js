// Unit conversion math. All factors are exact definitions or NIST SP 811 values.
// Each unit's `f` is the multiplier that converts 1 of that unit into the category base unit.

export const LBF_N = 4.4482216152605;   // 1 lbf in N (exact, from 0.45359237 kg x 9.80665 m/s^2)
export const IN_M = 0.0254;             // 1 in in m (exact)
export const FT_M = 0.3048;             // exact
export const KGF_N = 9.80665;           // exact (standard gravity)

export const CATEGORIES = {
  torque: {
    label: 'Torque',
    base: 'Nm',
    units: {
      ftlb: { label: 'ft·lb', f: LBF_N * FT_M },   // 1.3558179483314004 N·m
      inlb: { label: 'in·lb', f: LBF_N * IN_M },   // 0.1129848290276167 N·m
      Nm:   { label: 'N·m',   f: 1 },
      kgfm: { label: 'kgf·m', f: KGF_N },          // 9.80665 N·m
    },
  },
  length: {
    label: 'Length',
    base: 'm',
    units: {
      in: { label: 'in', f: IN_M },
      ft: { label: 'ft', f: FT_M },
      yd: { label: 'yd', f: 0.9144 },
      mm: { label: 'mm', f: 0.001 },
      cm: { label: 'cm', f: 0.01 },
      m:  { label: 'm',  f: 1 },
      thou: { label: 'thou (mil)', f: IN_M / 1000 },
      um: { label: 'µm', f: 1e-6 },
    },
  },
  pressure: {
    label: 'Pressure',
    base: 'Pa',
    units: {
      psi:  { label: 'psi',  f: LBF_N / (IN_M * IN_M) }, // 6894.757293168 Pa
      bar:  { label: 'bar',  f: 1e5 },
      kPa:  { label: 'kPa',  f: 1e3 },
      MPa:  { label: 'MPa',  f: 1e6 },
      inHg: { label: 'inHg (32°F)', f: 3386.389 },       // NIST SP 811, conventional mercury at 0 °C
      atm:  { label: 'atm',  f: 101325 },
      kgfcm2: { label: 'kgf/cm²', f: KGF_N * 1e4 },
    },
  },
  flow: {
    label: 'Flow',
    base: 'Lpm',
    units: {
      gpm: { label: 'gpm (US)', f: 3.785411784 },   // US gallon = 231 in^3 exactly
      Lpm: { label: 'L/min',    f: 1 },
      Lps: { label: 'L/s',      f: 60 },
      m3h: { label: 'm³/h',     f: 1000 / 60 },
      cfm: { label: 'ft³/min',  f: 28.316846592 },
      igpm: { label: 'gpm (UK)', f: 4.54609 },
    },
  },
  mass: {
    label: 'Weight',
    base: 'kg',
    units: {
      lb: { label: 'lb',  f: 0.45359237 },
      oz: { label: 'oz',  f: 0.45359237 / 16 },
      kg: { label: 'kg',  f: 1 },
      g:  { label: 'g',   f: 0.001 },
      ton: { label: 'short ton', f: 907.18474 },
      t:  { label: 'metric t', f: 1000 },
    },
  },
  force: {
    label: 'Force',
    base: 'N',
    units: {
      lbf: { label: 'lbf', f: LBF_N },
      N:   { label: 'N',   f: 1 },
      kN:  { label: 'kN',  f: 1000 },
      kgf: { label: 'kgf', f: KGF_N },
      kip: { label: 'kip', f: LBF_N * 1000 },
    },
  },
};

export function convert(value, from, to, category) {
  const cat = CATEGORIES[category];
  if (!cat) throw new Error(`Unknown category ${category}`);
  const a = cat.units[from], b = cat.units[to];
  if (!a || !b) throw new Error(`Unknown unit ${from} or ${to} in ${category}`);
  return (value * a.f) / b.f;
}

export function convertAll(value, from, category) {
  const out = {};
  for (const k of Object.keys(CATEGORIES[category].units)) out[k] = convert(value, from, k, category);
  return out;
}

// Temperature (affine, handled separately)
export const TEMP_UNITS = { F: '°F', C: '°C', K: 'K', R: '°R' };
export function tempToC(v, u) {
  switch (u) {
    case 'C': return v;
    case 'F': return (v - 32) * 5 / 9;
    case 'K': return v - 273.15;
    case 'R': return (v - 491.67) * 5 / 9;
    default: throw new Error(`Unknown temp unit ${u}`);
  }
}
export function cToTemp(c, u) {
  switch (u) {
    case 'C': return c;
    case 'F': return c * 9 / 5 + 32;
    case 'K': return c + 273.15;
    case 'R': return (c + 273.15) * 9 / 5;
    default: throw new Error(`Unknown temp unit ${u}`);
  }
}
export function convertTemp(v, from, to) { return cToTemp(tempToC(v, from), to); }

// Display formatting: up to 6 significant digits, trimmed, max 4 decimals.
export function fmt(n, maxDecimals = 4) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  const p = Number(n.toPrecision(6));
  return p.toLocaleString('en-US', { maximumFractionDigits: maxDecimals, useGrouping: Math.abs(p) >= 10000 });
}
