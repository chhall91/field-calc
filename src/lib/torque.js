// Torque math: extension / crow's-foot adapter correction and T = K·D·F bolt torque.

/**
 * Wrench setting when an adapter (crow's foot, torque adapter, extension that adds length) is used.
 * Standard formula (inline): T_w = T_a × L / (L + E)
 * Generalised for adapter angle θ between the adapter centerline and the wrench centerline:
 *   T_w = T_a × L / (L + E·cos θ)
 * where the hand force is applied perpendicular to the wrench handle.
 *   θ = 0°   adapter pointing straight out (inline)  -> maximum correction
 *   θ = 90°  adapter at right angle                  -> no correction (T_w = T_a)
 *   θ = 180° adapter pointing back toward the handle -> wrench setting > desired torque
 * @param {number} Ta desired torque at the fastener (any unit)
 * @param {number} L  wrench effective length: center of drive to center of hand grip / load point
 * @param {number} E  adapter length: center of wrench drive to center of fastener (same unit as L)
 * @param {number} angleDeg angle between adapter and wrench (degrees, default 0 = inline)
 * @returns {number} torque to set on the wrench (same unit as Ta)
 */
export function wrenchSetting(Ta, L, E, angleDeg = 0) {
  const eff = effectiveLength(L, E, angleDeg);
  if (!(L > 0) || !(eff > 0)) return NaN;
  return (Ta * L) / eff;
}

/** Actual torque applied to the fastener for a given wrench reading. T_a = T_w × (L + E·cosθ) / L */
export function actualTorque(Tw, L, E, angleDeg = 0) {
  const eff = effectiveLength(L, E, angleDeg);
  if (!(L > 0) || !(eff > 0)) return NaN;
  return (Tw * eff) / L;
}

/** Effective lever length L + E·cos θ (the component of the adapter along the wrench). */
export function effectiveLength(L, E, angleDeg = 0) {
  const c = Math.cos((angleDeg * Math.PI) / 180);
  // snap floating-point noise at 90°/270°
  const cc = Math.abs(c) < 1e-12 ? 0 : c;
  return L + E * cc;
}

// ---------------- Bolt torque (T = K·D·F) ----------------
// Method identical to the Fastenal published torque-tension charts:
//   F (clamp load) = 75% of proof load; proof load = proof stress × tensile stress area
//   K = 0.20 plain & dry, K = 0.15 lubricated; D = nominal diameter.

/** Tensile stress area, inch threads (ASME B1.1): As = 0.7854 (D - 0.9743/n)^2 [in^2] */
export function tensileAreaInch(D, tpi) {
  return 0.7853981633974483 * Math.pow(D - 0.9743 / tpi, 2);
}

/** Tensile stress area, ISO metric threads (ISO 898-1): As = (π/4)(d - 0.9382P)^2 [mm^2] */
export function tensileAreaMetric(d, P) {
  return (Math.PI / 4) * Math.pow(d - 0.9382 * P, 2);
}

/** Inch bolt: returns {As, proofLoad, clamp (lbf), ftlb, inlb, Nm} */
export function boltTorqueInch({ D, tpi, proofPsi, K, clampFraction = 0.75 }) {
  const As = tensileAreaInch(D, tpi);
  const proofLoad = As * proofPsi;
  const clamp = proofLoad * clampFraction;
  const inlb = K * D * clamp;
  const ftlb = inlb / 12;
  return { As, proofLoad, clamp, inlb, ftlb, Nm: ftlb * 1.3558179483314004 };
}

/** Metric bolt: returns {As (mm^2), proofLoad (N), clamp (N), clampLbf, Nm, ftlb} */
export function boltTorqueMetric({ d, P, proofMPa, K, clampFraction = 0.75 }) {
  const As = tensileAreaMetric(d, P);
  const proofLoad = As * proofMPa;          // N (mm^2 × N/mm^2)
  const clamp = proofLoad * clampFraction;  // N
  const Nm = (K * d * clamp) / 1000;        // d in mm -> m
  return { As, proofLoad, clamp, clampLbf: clamp / 4.4482216152605, Nm, ftlb: Nm / 1.3558179483314004 };
}
