// Rigging math (pure functions). Formulas are standard statics as used in DOE-STD-1090, ASME B30.9 and
// manufacturer rigging handbooks (Crosby, Lift-All, CM).
import { DD_EFF, SHACKLE_SIDE, EYEBOLT, DENSITY } from '../data/rigging.js';

const RAD = Math.PI / 180;

/** Effective legs sharing the load: 1 or 2 as given; 3–4 leg bridles assume only 2 legs carry the load. */
export const effectiveLegs = (legs) => (legs >= 3 ? 2 : Math.max(1, Math.floor(legs)));

/** Sling angle (deg from horizontal) from vertical height H and leg length L (same units). */
export function angleFromHL(H, L) {
  if (!(H > 0) || !(L > 0) || H > L) return NaN;
  return Math.asin(H / L) / RAD;
}

/** Load angle factor = 1 / sin(angle from horizontal). */
export const loadAngleFactor = (deg) => 1 / Math.sin(deg * RAD);

/** Tension per leg for a symmetric bridle. Single-leg vertical (legs=1) ignores the angle. */
export function tensionPerLeg(W, legs, deg) {
  const n = effectiveLegs(legs);
  if (n === 1 && legs === 1) return W; // single vertical leg
  return (W / n) * loadAngleFactor(deg);
}

/** Two pick points at horizontal distances dA, dB from the CG: vertical share at each. */
export function cgShare(W, dA, dB) {
  const s = dA + dB;
  if (!(s > 0) || dA < 0 || dB < 0) return null;
  return { A: (W * dB) / s, B: (W * dA) / s };
}

/** Sling tensions for two legs meeting at a hook directly above the CG at height H above the pick points. */
export function cgTensions(W, dA, dB, H) {
  const sh = cgShare(W, dA, dB); if (!sh || !(H > 0)) return null;
  const LA = Math.hypot(dA, H), LB = Math.hypot(dB, H);
  return {
    ...sh, LA, LB,
    TA: (sh.A * LA) / H, TB: (sh.B * LB) / H,
    angA: Math.atan2(H, dA) / RAD, angB: Math.atan2(H, dB) / RAD,
  };
}

/** Step-down lookup in [[threshold, pct], ...] ascending by threshold: largest threshold ≤ x. */
function stepDown(table, x) {
  let v = null;
  for (const [t, p] of table) if (x >= t) v = p;
  return v;
}
/** Step-up lookup (angle tables): first row whose max ≥ x. */
function stepUp(table, x) {
  for (const [t, p] of table) if (x <= t) return p;
  return null;
}

/** D/d efficiency (%) — conservative step-down; null if D/d < 1. */
export const ddEfficiency = (D, d) => (D > 0 && d > 0 ? stepDown(DD_EFF, D / d) : null);

/** Crosby screw-pin/bolt shackle side-load % of WLL (0° = in line). */
export const shackleSidePct = (deg) => (deg >= 0 ? stepUp(SHACKLE_SIDE, Math.ceil(deg)) : null);

/** Crosby G-277 shoulder eye bolt % of WLL vs angle from in-line (rounded UP to the next tabulated angle). */
export const eyeboltPct = (deg) => (deg >= 0 ? stepUp(EYEBOLT, deg) : null);

const IN3_PER_FT3 = 1728;
/** Weight (lb) of a rectangular plate/block, dims in inches. */
export const plateLb = (L, W, T, mat = 'steel') => (L * W * T / IN3_PER_FT3) * DENSITY[mat].lbft3;
/** Weight (lb) of a round bar, diameter & length in inches. */
export const roundBarLb = (D, L, mat = 'steel') => (Math.PI / 4 * D * D * L / IN3_PER_FT3) * DENSITY[mat].lbft3;
/** Weight (lb) of pipe/tube, OD, wall, length in inches. Optional water fill. */
export function pipeLb(OD, t, L, mat = 'steel', water = false) {
  if (!(t > 0) || 2 * t > OD) return NaN;
  const metal = (Math.PI * (OD - t) * t * L / IN3_PER_FT3) * DENSITY[mat].lbft3;
  const ID = OD - 2 * t;
  const w = water ? (Math.PI / 4 * ID * ID * L / IN3_PER_FT3) * DENSITY.water.lbft3 : 0;
  return metal + w;
}

export const LB_KG = 0.45359237;
