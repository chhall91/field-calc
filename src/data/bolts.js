// Bolt torque reference data.
//
// METHOD (identical to the Fastenal published charts, see SOURCES below):
//   T = K × D × F
//   F = clamp load = 75% of minimum proof load
//   proof load = proof stress × tensile stress area (As)
//   K = 0.20 plain & dry, K = 0.15 lubricated
//
// PROOF STRESS:
//   SAE J429 (inch):  Grade 2: 55,000 psi (1/4–3/4"), 33,000 psi (>3/4–1-1/2")
//                     Grade 5: 85,000 psi (1/4–1"),   74,000 psi (>1–1-1/2")
//                     Grade 8: 120,000 psi (1/4–1-1/2")
//   ISO 898-1 (metric): 8.8: 580 MPa; 10.9: 830 MPa; 12.9: 970 MPa.
//     NOTE: ISO 898-1 lists 600 MPa for class 8.8 above M16. Fastenal's published chart uses
//     580 MPa for all 8.8 sizes; we follow the published chart (≈3% conservative above M16).
//
// SOURCES:
//   [1] Fastenal, "Torque-Tension Relationship for A307A, Grade 5, 8 & 9 Bolts"
//       https://crafter.fastenal.com/static-assets/pdfs/Torque-Tension_Chart_for_A307_Gr5_Gr8_Gr9.pdf
//   [2] Fastenal, "Torque-Tension Relationship for Metric Fasteners" (Rev 3-4-09)
//       https://www.fastenal.com/content/feds/pdf/Torque-Tension%20Chart%20for%20Metric%20Fasteners.pdf
//   [3] SAE J429 Mechanical and Material Requirements for Externally Threaded Fasteners
//   [4] ISO 898-1 Mechanical properties of fasteners made of carbon steel and alloy steel
//   Grade 2 and metric fine thread values are NOT in the Fastenal charts; they are computed with the
//   same method and the SAE J429 / ISO 898-1 proof stresses above.

import { boltTorqueInch, boltTorqueMetric } from '../lib/torque.js';
import { INCH_THREADS, METRIC_THREADS } from './fasteners.js';

export const K_VALUES = { dry: 0.20, lube: 0.15 };

export const SAE_GRADES = {
  '2': { label: 'SAE Grade 2', marking: 'No marks', proof: (d) => (d <= 0.75 ? 55000 : 33000) },
  '5': { label: 'SAE Grade 5', marking: '3 radial lines', proof: (d) => (d <= 1.0 ? 85000 : 74000) },
  '8': { label: 'SAE Grade 8', marking: '6 radial lines', proof: () => 120000 },
};

export const METRIC_CLASSES = {
  '8.8':  { label: 'Class 8.8',  proof: () => 580 },
  '10.9': { label: 'Class 10.9', proof: () => 830 },
  '12.9': { label: 'Class 12.9', proof: () => 970 },
};

const INCH_BOLT_SIZES = ['1/4', '5/16', '3/8', '7/16', '1/2', '9/16', '5/8', '3/4', '7/8', '1', '1-1/8', '1-1/4', '1-3/8', '1-1/2'];

export function inchTorqueTable(grade, series /* 'unc'|'unf' */, cond /* 'dry'|'lube' */) {
  const g = SAE_GRADES[grade];
  return INCH_BOLT_SIZES.map((size) => {
    const t = INCH_THREADS.find((x) => x.size === size);
    const tpi = t[series];
    const r = boltTorqueInch({ D: t.d, tpi, proofPsi: g.proof(t.d), K: K_VALUES[cond] });
    return { size, thread: `${size}-${tpi}`, d: t.d, tpi, ...r };
  });
}

const METRIC_FINE_FOR_TORQUE = { M8: 1.0, M10: 1.25, M12: 1.5, M14: 1.5, M16: 1.5, M18: 1.5, M20: 1.5, M22: 1.5, M24: 2.0, M27: 2.0, M30: 2.0, M33: 2.0, M36: 3.0 };

export function metricTorqueTable(cls, series /* 'coarse'|'fine' */, cond) {
  const c = METRIC_CLASSES[cls];
  const rows = [];
  for (const t of METRIC_THREADS) {
    if (t.d < 4) continue;
    const P = series === 'coarse' ? t.coarse : METRIC_FINE_FOR_TORQUE[t.size];
    if (!P) continue;
    const r = boltTorqueMetric({ d: t.d, P, proofMPa: c.proof(t.d), K: K_VALUES[cond] });
    rows.push({ size: t.size, thread: `${t.size}×${P}`, d: t.d, P, ...r });
  }
  return rows;
}

export const BOLT_SOURCES = [
  'Fastenal Engineering, “Torque-Tension Relationship for A307A, Grade 5, 8 & 9 Bolts” and fine-thread chart (T = KDF, clamp = 75% proof, K 0.20 dry / 0.15 lubricated).',
  'Fastenal Engineering, “Torque-Tension Relationship for Metric Fasteners,” Rev 3-4-09.',
  'SAE J429 — proof strengths for Grades 2, 5, 8.',
  'ISO 898-1 — proof stresses for property classes 8.8, 10.9, 12.9.',
  'ASME B1.1 / ISO 898-1 — tensile stress area formulas.',
];
