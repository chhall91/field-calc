// Thread, tap-drill and wrench-size reference data.
// Sources:
//  - Inch thread pitches (UNC/UNF): ASME B1.1 Unified Inch Screw Threads.
//  - Inch tap drills: ~75% thread engagement, standard values as published in
//    Machinery's Handbook (Industrial Press) tap drill tables.
//  - Inch wrench sizes (width across flats): ASME B18.2.1 / B18.2.2 — verified, see sockets.js.
//    Socket head cap screw keys: ASME B18.3.
//  - Metric pitches: ISO 261 / ISO 262 coarse & preferred fine pitches.
//  - Metric tap drills: standard rule d − P (≈ 75–80% thread), matches ISO 2306 / DIN 336 tables.
//  - Metric wrench sizes: ISO 4014/4017/4032 (hex bolts, screws, nuts) and legacy DIN 931/933/934
//    where different (M10, M12, M14, M22). Socket head cap screw keys: ISO 4762.

// d = basic major diameter (in)
export const INCH_THREADS = [
  { size: '#0',     d: 0.060,  unc: null, unf: 80, tapUnc: null,  tapUnf: '3/64' },
  { size: '#1',     d: 0.073,  unc: 64, unf: 72, tapUnc: '#53',   tapUnf: '#53' },
  { size: '#2',     d: 0.086,  unc: 56, unf: 64, tapUnc: '#50',   tapUnf: '#50' },
  { size: '#3',     d: 0.099,  unc: 48, unf: 56, tapUnc: '#47',   tapUnf: '#45' },
  { size: '#4',     d: 0.112,  unc: 40, unf: 48, tapUnc: '#43',   tapUnf: '#42' },
  { size: '#5',     d: 0.125,  unc: 40, unf: 44, tapUnc: '#38',   tapUnf: '#37' },
  { size: '#6',     d: 0.138,  unc: 32, unf: 40, tapUnc: '#36',   tapUnf: '#33' },
  { size: '#8',     d: 0.164,  unc: 32, unf: 36, tapUnc: '#29',   tapUnf: '#29' },
  { size: '#10',    d: 0.190,  unc: 24, unf: 32, tapUnc: '#25',   tapUnf: '#21' },
  { size: '#12',    d: 0.216,  unc: 24, unf: 28, tapUnc: '#16',   tapUnf: '#14' },
  { size: '1/4',    d: 0.2500, unc: 20, unf: 28, tapUnc: '#7',    tapUnf: '#3' },
  { size: '5/16',   d: 0.3125, unc: 18, unf: 24, tapUnc: 'F',     tapUnf: 'I' },
  { size: '3/8',    d: 0.3750, unc: 16, unf: 24, tapUnc: '5/16',  tapUnf: 'Q' },
  { size: '7/16',   d: 0.4375, unc: 14, unf: 20, tapUnc: 'U',     tapUnf: '25/64' },
  { size: '1/2',    d: 0.5000, unc: 13, unf: 20, tapUnc: '27/64', tapUnf: '29/64' },
  { size: '9/16',   d: 0.5625, unc: 12, unf: 18, tapUnc: '31/64', tapUnf: '33/64' },
  { size: '5/8',    d: 0.6250, unc: 11, unf: 18, tapUnc: '17/32', tapUnf: '37/64' },
  { size: '3/4',    d: 0.7500, unc: 10, unf: 16, tapUnc: '21/32', tapUnf: '11/16' },
  { size: '7/8',    d: 0.8750, unc: 9,  unf: 14, tapUnc: '49/64', tapUnf: '13/16' },
  { size: '1',      d: 1.0000, unc: 8,  unf: 12, tapUnc: '7/8',   tapUnf: '59/64' },
  { size: '1-1/8',  d: 1.1250, unc: 7,  unf: 12, tapUnc: '63/64', tapUnf: '1-3/64' },
  { size: '1-1/4',  d: 1.2500, unc: 7,  unf: 12, tapUnc: '1-7/64', tapUnf: '1-11/64' },
  { size: '1-3/8',  d: 1.3750, unc: 6,  unf: 12, tapUnc: '1-7/32', tapUnf: '1-19/64' },
  { size: '1-1/2',  d: 1.5000, unc: 6,  unf: 12, tapUnc: '1-11/32', tapUnf: '1-27/64' },
];

// Wrench (across-flats) sizes, inch — derived from the verified Bolt → Socket table (see sockets.js for sources).
// hexBolt = hex bolt / hex cap screw (B18.2.1); hexNut = hex nut & jam nut (B18.2.2);
// heavy = heavy hex bolt/screw head (B18.2.1); heavyNut = heavy hex nut (B18.2.2);
// shcs = socket head cap screw hex key, ASME B18.3 (sources: Boltport B18.3 SHCS table; AmesWeb hex key chart;
// fasten.it ASME B18.3 table 1A). 9/16 → 7/16 was missing in v0.1.0 and has been added.
import { INCH_SOCKETS } from './sockets.js';
const SHCS_INCH = { '#4': '3/32', '#6': '7/64', '#8': '9/64', '#10': '5/32', '1/4': '3/16', '5/16': '1/4', '3/8': '5/16',
  '7/16': '3/8', '1/2': '3/8', '9/16': '7/16', '5/8': '1/2', '3/4': '5/8', '7/8': '3/4', '1': '3/4', '1-1/8': '7/8',
  '1-1/4': '7/8', '1-3/8': '1', '1-1/2': '1' };
export const INCH_WRENCH = Object.fromEntries(Object.entries(SHCS_INCH).map(([size, shcs]) => {
  const r = INCH_SOCKETS.find((x) => x.size === size);
  return [size, r ? { hexBolt: r.hexHead, hexNut: r.hexNut, heavy: r.heavyHead, heavyNut: r.heavyNut, shcs } : { shcs }];
}));

// Metric: coarse pitch + common fine pitches (ISO 261/262), wrench sizes.
// iso = ISO 4014/4017/4032 across flats; din = DIN 931/933/934 where it differs (verified, see sockets.js).
// shcs = ISO 4762 hex key. Verified: RC Fastener ISO 4762 sheet (M3–M12, M16, M20, M24, M30, M36) + Whole-Spec
// ISO 4762 table (M3–M48) + RoyMech (M3–M24). M14 (12), M18 (14), M22 (17), M27 (19), M33 (24) are non-preferred
// sizes confirmed by one table (Whole-Spec) only.
export const METRIC_THREADS = [
  { size: 'M3',  d: 3,  coarse: 0.5,  fine: [0.35],      iso: 5.5, din: null, shcs: 2.5 },
  { size: 'M4',  d: 4,  coarse: 0.7,  fine: [0.5],       iso: 7,   din: null, shcs: 3 },
  { size: 'M5',  d: 5,  coarse: 0.8,  fine: [0.5],       iso: 8,   din: null, shcs: 4 },
  { size: 'M6',  d: 6,  coarse: 1.0,  fine: [0.75],      iso: 10,  din: null, shcs: 5 },
  { size: 'M8',  d: 8,  coarse: 1.25, fine: [1.0],       iso: 13,  din: null, shcs: 6 },
  { size: 'M10', d: 10, coarse: 1.5,  fine: [1.25, 1.0], iso: 16,  din: 17,   shcs: 8 },
  { size: 'M12', d: 12, coarse: 1.75, fine: [1.5, 1.25], iso: 18,  din: 19,   shcs: 10 },
  { size: 'M14', d: 14, coarse: 2.0,  fine: [1.5],       iso: 21,  din: 22,   shcs: 12 },
  { size: 'M16', d: 16, coarse: 2.0,  fine: [1.5],       iso: 24,  din: null, shcs: 14 },
  { size: 'M18', d: 18, coarse: 2.5,  fine: [1.5],       iso: 27,  din: null, shcs: 14 },
  { size: 'M20', d: 20, coarse: 2.5,  fine: [1.5],       iso: 30,  din: null, shcs: 17 },
  { size: 'M22', d: 22, coarse: 2.5,  fine: [1.5],       iso: 34,  din: 32,   shcs: 17 },
  { size: 'M24', d: 24, coarse: 3.0,  fine: [2.0],       iso: 36,  din: null, shcs: 19 },
  { size: 'M27', d: 27, coarse: 3.0,  fine: [2.0],       iso: 41,  din: null, shcs: 19 },
  { size: 'M30', d: 30, coarse: 3.5,  fine: [2.0],       iso: 46,  din: null, shcs: 22 },
  { size: 'M33', d: 33, coarse: 3.5,  fine: [2.0],       iso: 50,  din: null, shcs: 24 },
  { size: 'M36', d: 36, coarse: 4.0,  fine: [3.0],       iso: 55,  din: null, shcs: 27 },
];

/** Metric tap drill (mm) ≈ d − P, rounded to 0.1 mm. */
export function metricTapDrill(d, P) {
  return Math.round((d - P) * 10) / 10;
}
