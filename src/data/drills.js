// Twist drill sizes. Number & letter gauge decimal equivalents per ASME B94.11M
// (as reproduced in Machinery's Handbook). Fractional and metric series are generated.
import { fracText } from '../lib/fraction.js';

export const NUMBER_DRILLS = {
  1: .2280, 2: .2210, 3: .2130, 4: .2090, 5: .2055, 6: .2040, 7: .2010, 8: .1990, 9: .1960, 10: .1935,
  11: .1910, 12: .1890, 13: .1850, 14: .1820, 15: .1800, 16: .1770, 17: .1730, 18: .1695, 19: .1660, 20: .1610,
  21: .1590, 22: .1570, 23: .1540, 24: .1520, 25: .1495, 26: .1470, 27: .1440, 28: .1405, 29: .1360, 30: .1285,
  31: .1200, 32: .1160, 33: .1130, 34: .1110, 35: .1100, 36: .1065, 37: .1040, 38: .1015, 39: .0995, 40: .0980,
  41: .0960, 42: .0935, 43: .0890, 44: .0860, 45: .0820, 46: .0810, 47: .0785, 48: .0760, 49: .0730, 50: .0700,
  51: .0670, 52: .0635, 53: .0595, 54: .0550, 55: .0520, 56: .0465, 57: .0430, 58: .0420, 59: .0410, 60: .0400,
  61: .0390, 62: .0380, 63: .0370, 64: .0360, 65: .0350, 66: .0330, 67: .0320, 68: .0310, 69: .0292, 70: .0280,
  71: .0260, 72: .0250, 73: .0240, 74: .0225, 75: .0210, 76: .0200, 77: .0180, 78: .0160, 79: .0145, 80: .0135,
};

export const LETTER_DRILLS = {
  A: .234, B: .238, C: .242, D: .246, E: .250, F: .257, G: .261, H: .266, I: .272, J: .277, K: .281, L: .290, M: .295,
  N: .302, O: .316, P: .323, Q: .332, R: .339, S: .348, T: .358, U: .368, V: .377, W: .386, X: .397, Y: .404, Z: .413,
};

// All drills as {type, name, inch, mm}
export function allDrills() {
  const list = [];
  for (const [n, v] of Object.entries(NUMBER_DRILLS)) list.push({ type: 'number', name: `#${n}`, inch: v });
  for (const [n, v] of Object.entries(LETTER_DRILLS)) list.push({ type: 'letter', name: n, inch: v });
  for (let i = 1; i <= 96; i++) list.push({ type: 'fraction', name: fracText(i, 64) + '"', inch: i / 64 }); // to 1-1/2"
  // Metric jobber series: 0.3–13.0 mm in 0.1 steps, then 13.5–32 mm in 0.5 steps
  for (let t = 3; t <= 130; t++) list.push({ type: 'metric', name: `${(t / 10).toFixed(1)} mm`, inch: t / 10 / 25.4, mm: t / 10 });
  for (let t = 27; t <= 64; t++) list.push({ type: 'metric', name: `${(t / 2).toFixed(1)} mm`, inch: t / 2 / 25.4, mm: t / 2 });
  for (const d of list) if (d.mm === undefined) d.mm = d.inch * 25.4;
  return list.sort((a, b) => a.inch - b.inch);
}

/** Find a named drill ("#7", "7", "F", "17/64", "6.8mm", "6.8 mm"). Returns inch value or NaN. */
export function drillLookup(q) {
  const s = String(q).trim().toUpperCase().replace(/\s+/g, '');
  let m;
  if ((m = s.match(/^(?:#|NO\.?)?(\d{1,2})$/)) && NUMBER_DRILLS[+m[1]] && !s.includes('.')) {
    // bare integers 1-80 are treated as number drills
    return { inch: NUMBER_DRILLS[+m[1]], label: `#${+m[1]} drill` };
  }
  if (/^[A-Z]$/.test(s) && LETTER_DRILLS[s]) return { inch: LETTER_DRILLS[s], label: `Letter ${s} drill` };
  if ((m = s.match(/^(\d+\.?\d*|\.\d+)MM$/))) return { inch: parseFloat(m[1]) / 25.4, label: `${parseFloat(m[1])} mm` };
  return null;
}

/** Nearest drills in each series to a given inch size */
export function nearestDrills(inch, list = allDrills()) {
  const out = {};
  for (const type of ['number', 'letter', 'fraction', 'metric']) {
    let best = null;
    for (const d of list) if (d.type === type) {
      if (!best || Math.abs(d.inch - inch) < Math.abs(best.inch - inch)) best = d;
    }
    out[type] = best;
  }
  return out;
}
