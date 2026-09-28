// Rigging reference data. SAFETY-CRITICAL: every table is from published manufacturer / standards documents and was
// cross-checked against at least two sources unless flagged. Capacities are typical catalog values — the sling/hardware
// TAG governs. Units: wire rope in US tons (2,000 lb); chain, synthetic in lb; shackles in metric tonnes (Crosby "t").

// Wire rope slings, 6x19 / 6x37 class EIPS IWRC, mechanical splice, single leg. [dia, vertical, choker, vertical basket] tons.
// Sources: Lift-All "Wire Rope Slings & IWRC" catalog; CERTEX Section 2 wire rope slings (single leg EIPS IWRC table);
// Island Operating "Wire Rope Load Limits" (1/4–2-1/4, excl. 5/16, 7/16, 9/16). All agree. 6x19 to 1-1/2", 6x37 above
// (Lift-All). Basket ratings assume D/d ≥ 25; choker assumes angle of choke ≥ 120°.
export const WIRE_ROPE = [
  ['1/4', 0.65, 0.48, 1.3], ['5/16', 1.0, 0.74, 2.0], ['3/8', 1.4, 1.1, 2.9], ['7/16', 1.9, 1.4, 3.9],
  ['1/2', 2.5, 1.9, 5.1], ['9/16', 3.2, 2.4, 6.4], ['5/8', 3.9, 2.9, 7.8], ['3/4', 5.6, 4.1, 11],
  ['7/8', 7.6, 5.6, 15], ['1', 9.8, 7.2, 20], ['1-1/8', 12, 9.1, 24], ['1-1/4', 15, 11, 30],
  ['1-3/8', 18, 13, 36], ['1-1/2', 21, 16, 42], ['1-3/4', 28, 21, 57], ['2', 37, 28, 73],
  ['2-1/4', 44, 35, 89], ['2-1/2', 54, 42, 109],
].map(([size, v, c, b]) => ({ size, v, c, b, unit: 'ton' }));

// Alloy chain, single leg vertical WLL, lb (design factor 4:1).
// Grade 80: Peerless G80/100 WLL page + Laclede Chain riggers card (9/32–1); 7/32: Peerless + Lift-All LiftAlloy;
// 1-1/4: Lift-All LiftAlloy + DOE-STD-1090 chain table.
// Grade 100: Peerless + Laclede + CERTEX + Lift-All (9/32–3/4); Peerless + Laclede (7/8); Peerless + Unirope (1").
// Choker hitch: manufacturers differ (Unirope lists ≈75%, others 80%) → not tabulated; use the tag / manufacturer.
export const CHAIN = {
  80: [['7/32', 2100], ['9/32', 3500], ['5/16', 4500], ['3/8', 7100], ['1/2', 12000], ['5/8', 18100], ['3/4', 28300],
    ['7/8', 34200], ['1', 47700], ['1-1/4', 72300]],
  100: [['9/32', 4300], ['5/16', 5700], ['3/8', 8800], ['1/2', 15000], ['5/8', 22600], ['3/4', 35300], ['7/8', 42700], ['1', 59700]],
};

// Synthetic web slings, Type 3/4 eye & eye (nylon/polyester), lb. Capacities VARY BY MANUFACTURER.
// Two published charts: Lift-All Series 1800 (EE1-8xx / EE2-8xx) and ASC Industries nylon web slings Type 3 & 4.
// The app shows the LOWER of the two for each cell (conservative). [width in, [v, c, b] LiftAll, [v, c, b] ASC]
export const WEB = {
  1: [[1, [1600, 1280, 3200], [1600, 1280, 3200]], [2, [3200, 2500, 6400], [3200, 2560, 6400]], [3, [4800, 3800, 9600], [4700, 3760, 9400]],
      [4, [6400, 5000, 12800], [6200, 4960, 12400]], [6, [9600, 7700, 19200], [9300, 7440, 18600]], [8, [12800, 10200, 25600], [12800, 10240, 25600]]],
  2: [[1, [3200, 2500, 6400], [3100, 2480, 6200]], [2, [6400, 5000, 12800], [6200, 4960, 12400]], [3, [8800, 7040, 17600], [8800, 7000, 17600]],
      [4, [11500, 9200, 23000], [11000, 8800, 22000]], [6, [16500, 13200, 33000], [16500, 13200, 33000]], [8, [19200, 15400, 38400], [22700, 18200, 45500]]],
};

// Polyester round slings, WSTDA RS-1 (2019) Table 2-1 colors/capacities; identical in Lift-All Tuflex (EN30–EN280). lb.
// Larger sizes (31,000 lb+) are omitted: color differs between WSTDA (orange) and Lift-All (gray).
export const ROUND = [
  ['Purple', 2600, 2100, 5200, '#8a4fd6'], ['Green', 5300, 4200, 10600, '#2e9d4a'], ['Yellow', 8400, 6700, 16800, '#e8c21a'],
  ['Tan', 10600, 8500, 21200, '#c9a36a'], ['Red', 13200, 10600, 26400, '#d33b2c'], ['White', 16800, 13400, 33600, '#f2f2f2'],
  ['Blue', 21200, 17000, 42400, '#2f6fd6'], ['Orange', 25000, 20000, 50000, '#f07c1a'],
].map(([color, v, c, b, hex]) => ({ color, v, c, b, hex }));

// Crosby G-209 screw pin anchor shackles (and G-2130 bolt type, same WLL for these sizes), WLL metric tonnes, 6:1.
// Sources: Crosby 2022 catalog p.24 (G-209) & p.26 (G-2130); Crosby G-209 spec sheet (via Boise Rigging).
// 3", 3-1/2", 4" bolt type (G-2130 only): Crosby catalog only → flagged.
export const SHACKLES = [
  ['3/16', 0.33], ['1/4', 0.5], ['5/16', 0.75], ['3/8', 1], ['7/16', 1.5], ['1/2', 2], ['5/8', 3.25], ['3/4', 4.75],
  ['7/8', 6.5], ['1', 8.5], ['1-1/8', 9.5], ['1-1/4', 12], ['1-3/8', 13.5], ['1-1/2', 17], ['1-3/4', 25], ['2', 35],
  ['2-1/2', 55], ['3', 85, true], ['3-1/2', 120, true], ['4', 150, true],
].map(([size, t, bolt]) => ({ size, t, boltOnly: !!bolt }));

// Crosby side-loading reduction, screw pin & bolt type shackles 3/16"–3" (load in the plane of the bow). Never side-load
// round pin shackles. Source: Crosby Warnings & Applications (Shackles, 2022 catalog & KitoCrosby 2025 sheet p.350).
export const SHACKLE_SIDE = [[10, 100], [20, 85], [30, 75], [45, 70], [55, 60], [70, 55], [90, 50]]; // [max angle°, % WLL]

// Crosby G-277 SHOULDER nut eye bolts, angle of pull from in-line (axis of bolt), % of rated WLL. Regular (non-shoulder)
// eye bolts: IN-LINE LOADING ONLY. Sources: Crosby 2022 catalog p.417 eye bolt warnings; Crosby eye bolt safety info
// (via I&I Sling). Other brands/eye nuts differ — check the manufacturer.
export const EYEBOLT = [[5, 100], [15, 80], [30, 65], [45, 30], [90, 25]];

// Wire rope (6x19/6x37) strength efficiency vs D/d. Two published tables differ slightly:
//  A) Wire Rope Technical Board curve (as reproduced by Unirope/DOE): 1:50 2:65 4:75 6:79 8:83 10:86 15:89 20:91
//  B) M. Riggs, "Is D/d Ratio Crucial…", Crane & Rigging Hotline (2012), sling strength efficiency vs rated basket:
//     1:50 2:65 4:75 6:80 8:84 10:86 15:88 20:92 25:100
// The app uses the LOWER of A and B at each point and steps DOWN to the next tabulated ratio (no interpolation up).
// At D/d ≥ 25 the catalog basket/choker rating applies (ratings assume D/d ≥ 25).
export const DD_EFF = [[1, 50], [2, 65], [4, 75], [6, 79], [8, 83], [10, 86], [15, 88], [20, 91], [25, 100]];

// Densities, lb/ft³. Sources: DOE-STD-1090 (Hoisting & Rigging) Table 11-1 "Weights of common materials";
// Engineering ToolBox "Metals and Alloys – Densities". Where they differ the higher (conservative) value is used,
// except cast iron (see note) — grades vary; weigh or use drawings for castings.
export const DENSITY = {
  steel:     { label: 'Carbon steel', lbft3: 490 },   // DOE 490; ETB 7850 kg/m³ = 490
  stainless: { label: 'Stainless steel', lbft3: 500 }, // ETB 7480–8000 kg/m³ (467–499); upper end used
  aluminum:  { label: 'Aluminum', lbft3: 170 },        // DOE 166; ETB 6061 2720 kg/m³ = 170
  castiron:  { label: 'Cast iron', lbft3: 450 },       // DOE 450 (≈7200 kg/m³ gray iron); ETB range 6800–7800 kg/m³ (425–487) → FLAGGED
  copper:    { label: 'Copper', lbft3: 558 },          // DOE 550–555; ETB 8940 kg/m³ = 558
  lead:      { label: 'Lead', lbft3: 712 },            // DOE 712; ETB 11340 kg/m³ = 708
  concrete:  { label: 'Concrete', lbft3: 150 },        // DOE "concrete or stone" 140–155; ETB 2400 kg/m³ ≈ 150
  water:     { label: 'Water (fresh)', lbft3: 62.4 },  // ETB ~999 kg/m³ = 62.4 (DOE lists 65 for water, rounded up)
};

// Steel pipe OD and wall (ASME B36.10M), inches: [NPS, OD, Sch 40 wall, Sch 80 wall].
// Sources: Engineering ToolBox B36.10/19 table (NPS 1/2–18) and pipeschedulechart.com (NPS 1/2–24).
export const PIPE = [
  ['1/2', 0.840, 0.109, 0.147], ['3/4', 1.050, 0.113, 0.154], ['1', 1.315, 0.133, 0.179], ['1-1/4', 1.660, 0.140, 0.191],
  ['1-1/2', 1.900, 0.145, 0.200], ['2', 2.375, 0.154, 0.218], ['2-1/2', 2.875, 0.203, 0.276], ['3', 3.500, 0.216, 0.300],
  ['4', 4.500, 0.237, 0.337], ['5', 5.563, 0.258, 0.375], ['6', 6.625, 0.280, 0.432], ['8', 8.625, 0.322, 0.500],
  ['10', 10.750, 0.365, 0.594], ['12', 12.750, 0.406, 0.688], ['14', 14.000, 0.438, 0.750], ['16', 16.000, 0.500, 0.844],
  ['18', 18.000, 0.562, 0.938], ['20', 20.000, 0.594, 1.031], ['24', 24.000, 0.688, 1.219],
].map(([nps, od, s40, s80]) => ({ nps, od, s40, s80 }));

export const RIGGING_SOURCES = [
  'Wire rope slings (EIPS IWRC, mechanical splice) — Lift-All wire rope sling catalog; CERTEX wire rope slings Section 2; Island Operating wire rope load limits.',
  'Alloy chain Grade 80/100 — Peerless Grade 80/100 WLL; Laclede Chain riggers pocket guide; Lift-All LiftAlloy; CERTEX chain slings; Unirope Grade 100.',
  'Web slings — Lift-All web sling catalog (Series 1800); ASC Industries nylon web slings (lower value shown).',
  'Round slings — WSTDA RS-1 (2019) Table 2-1; Lift-All Tuflex roundsling catalog.',
  'Shackles — Crosby 2022 catalog G-209 (p.24) & G-2130 (p.26); Crosby G-209 spec sheet; side-load reduction: Crosby Warnings & Applications (shackles).',
  'Eye bolts — Crosby 2022 catalog p.417 (G-277 shoulder eye bolt angular loading); Crosby eye bolt safety information.',
  'D/d efficiency — Wire Rope Technical Board curve (via Unirope, DOE-STD-1090); M. Riggs, Crane & Rigging Hotline, Jan 2012 (lower value used).',
  'Densities — DOE-STD-1090 Table 11-1; Engineering ToolBox metal densities. Pipe dimensions — ASME B36.10M via Engineering ToolBox and pipeschedulechart.com.',
];

export const RIG_DISCLAIMER = 'Reference only. Follow your site rigging procedures, the manufacturer’s tags and ratings, and a qualified rigger’s judgment. Never exceed the rated capacity marked on the sling or hardware.';
