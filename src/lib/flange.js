// Flange lookups (pure). Data: src/data/flanges.js
import { B165, FLANGE_CLASSES, PT_GROUPS, STAR_NUMBERING } from '../data/flanges.js';
import { INCH_SOCKETS } from '../data/sockets.js';
import { parseNumber } from './fraction.js';

export const npsList = (cls) => (B165[cls] || []).map((r) => r[0]);

export function flangeLookup(nps, cls) {
  const r = (B165[cls] || []).find((x) => x[0] === String(nps));
  if (!r) return null;
  const [n, od, bolts, dia, bc, rf, rtj] = r;
  const sock = INCH_SOCKETS.find((s) => s.size === dia);
  return {
    nps: n, cls: +cls, od, bolts, dia, bc, rf, rtj,
    nutSocket: sock ? sock.heavyNut : null,
    rfHeight: +cls <= 300 ? '1/16' : '1/4',
  };
}

/** P-T rating (psig) for a material group, class and temperature (°F). Uses the NEXT HIGHER tabulated temperature
 *  (conservative, no interpolation). Returns {psig, rowF, below} or null if out of range / not rated. */
export function ptRating(group, cls, tempF) {
  const g = PT_GROUPS[group]; if (!g) return null;
  const ci = FLANGE_CLASSES.indexOf(+cls); if (ci < 0) return null;
  const t = Number(tempF); if (!Number.isFinite(t)) return null;
  if (t < -20) return { psig: null, rowF: null, reason: 'Below −20°F: outside these tables (impact-test / low-temp materials rules apply).' };
  const rows = Object.keys(g.table).map(Number).sort((a, b) => a - b);
  const rowF = rows.find((r) => r >= t);
  if (rowF == null) return { psig: null, rowF: null, reason: `Above ${rows[rows.length - 1]}°F: not tabulated here.` };
  const psig = g.table[rowF][ci];
  if (psig == null) return { psig: null, rowF, reason: `Class ${cls} is not rated at ${rowF}°F for this group.` };
  return { psig, rowF, bar: psig * 0.0689476 };
}

/** Star/cross pattern: returns array where index i = position clockwise from top (0), value = tightening order no. */
export const starPattern = (n) => STAR_NUMBERING[n] || null;

/** Sequence of positions (0-based clockwise) in tightening order. */
export function tighteningOrder(n) {
  const p = starPattern(n); if (!p) return null;
  return p.map((num, pos) => [num, pos]).sort((a, b) => a[0] - b[0]).map(([, pos]) => pos);
}

export const inches = (s) => parseNumber(String(s));
