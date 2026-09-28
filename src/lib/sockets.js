import { INCH_SOCKETS, METRIC_SOCKETS } from '../data/sockets.js';
import { parseNumber } from './fraction.js';

export const IN_MM = 25.4;
export const fracToIn = (s) => (s == null ? null : parseNumber(s));

export const INCH_TYPES = {
  hexHead:    'Hex bolt / hex cap screw head',
  hexNut:     'Hex nut · hex jam nut',
  heavyHead:  'Heavy hex bolt / screw head',
  structural: 'Heavy hex structural bolt (A325/A490)',
  heavyNut:   'Heavy hex nut · heavy jam nut',
};
export const METRIC_TYPES = {
  iso:           'Bolt ISO 4014/4017 · nut ISO 4032 · jam ISO 4035',
  din:           'Bolt DIN 931/933 · nut DIN 934 · jam DIN 439',
  asmeHeavyBolt: 'Heavy hex structural bolt ASME B18.2.3.7M (A325M)',
  asmeHeavyNut:  'Heavy hex nut ASME B18.2.4.6M',
  hv:            'HV structural bolt & nut EN 14399-4',
};

/** Flat list of every (fastener, across-flats) pair, AF in mm. */
export function allSocketEntries() {
  const out = [];
  for (const r of INCH_SOCKETS) for (const k of Object.keys(INCH_TYPES)) {
    if (r[k]) out.push({ system: 'inch', size: `${r.size}"`, type: k, label: INCH_TYPES[k], af: r[k] + '"', afMm: fracToIn(r[k]) * IN_MM });
  }
  for (const r of METRIC_SOCKETS) for (const k of Object.keys(METRIC_TYPES)) {
    if (r[k]) out.push({ system: 'metric', size: r.size, type: k, label: METRIC_TYPES[k], af: `${r[k]} mm`, afMm: r[k] });
  }
  return out;
}

/** Parse a socket entry: unit 'in' | 'mm'; accepts suffixes (mm, ", in). Returns mm or NaN. */
export function parseSocket(text, unit = 'in') {
  const s = String(text ?? '').trim().toLowerCase();
  if (!s) return NaN;
  if (/mm$/.test(s)) return parseFloat(s);
  if (/("|in|inch)$/.test(s)) return parseNumber(s) * IN_MM;
  return unit === 'mm' ? parseFloat(s) : parseNumber(s) * IN_MM;
}

/**
 * Reverse lookup. exact: |AF − socket| ≤ 0.02 mm. near: socket is LARGER than AF by up to `looseMm`
 * (a smaller socket never fits, so those are excluded).
 */
export function findBySocket(socketMm, looseMm = 0.5) {
  if (!(socketMm > 0)) return { exact: [], near: [] };
  const entries = allSocketEntries();
  const exact = entries.filter((e) => Math.abs(e.afMm - socketMm) <= 0.02);
  const near = entries
    .filter((e) => socketMm - e.afMm > 0.02 && socketMm - e.afMm <= looseMm)
    .map((e) => ({ ...e, diffMm: socketMm - e.afMm }))
    .sort((a, b) => a.diffMm - b.diffMm);
  return { exact, near };
}
