// Bolt → socket (wrench) size data: width across flats (basic / max), verified against at least
// two published tables per column (see SOURCES). Inch values are strings (fractions), metric in mm.
//
// INCH (ASME)
//  hexHead   : Hex bolt / hex cap screw head, ASME B18.2.1 (1/4–4").
//              Sources: Boltport "ASME B18.2.1 Hex Bolts" + "Hex Cap Screws"; HBS Fasteners B18.2.1 TDS (PDF);
//              TorqBolt/astma320 "B18.2.1 hex bolts". 9/16 (cap screw only): Boltport cap screws, ASMC chart.
//  hexNut    : Hex nut (finished hex) ASME B18.2.2. Hex jam nuts have the same across-flats.
//              Sources: AmesWeb hex nut table (Machinery's Handbook 30th ed. / B18.2.2-2010); Boltport B18.2.2 hex nuts;
//              Portland Bolt hex nuts (1/2–1-1/2). Note: sizes above 1-1/2" are listed by both sources but are rarely stocked.
//  heavyHead : Heavy hex bolt / heavy hex screw head, ASME B18.2.1 (bolts 1/2–3", screws 3/8–6").
//              Sources: Portland Bolt heavy hex bolts (1/2–2-1/2); Boltport + Bolting Specialist B18.2.1 heavy hex screws (3/8–6).
//  structural: Heavy hex structural bolt ASTM F3125 (A325/A490), ASME B18.2.6 (1/2–1-1/2).
//              Sources: Portland Bolt structural bolts (B18.2.6-2011); across-flats identical to B18.2.1 heavy hex (Boltport).
//  heavyNut  : Heavy hex nut ASME B18.2.2 (1/4–4"). Heavy hex jam nuts have the same across-flats.
//              Sources: AmesWeb heavy hex nut table; Portland Bolt heavy hex nuts; Boltport B18.2.2 heavy hex nuts;
//              Global Supply heavy hex nut data sheet.
//
// METRIC
//  iso       : Hex bolt/screw ISO 4014/4017 and hex nut ISO 4032 (thin/jam nut ISO 4035 same s).
//              Sources: ISO 4032:2012/2023 preview tables (iTeh); BOLTS library ISO 4014/4032 tables;
//              Brooks Forgings ISO 4014 catalogue page (M12–M64); Würth "DIN-EN-ISO standards" conversion guide.
//  din       : DIN 931/933 bolts and DIN 934 nuts (DIN 439 jam nut same s) — only where different from ISO:
//              M10 17, M12 19, M14 22, M22 32. Sources: Würth guide; SpecVise DIN 933 vs ISO 4017; EurolinkFSS.
//  asmeHeavyBolt: ASME B18.2.3.7M metric heavy hex structural bolt (A325M/A490M), M16–M36.
//              Sources: Boltport B18.2.3.7M; Bolting Specialist B18.2.3.7M.
//  asmeHeavyNut : ASME B18.2.4.6M metric heavy hex nut, M12–M64. Sources: Bolting Specialist; TorqBolt.
//  hv        : EN 14399-4 system HV structural bolt and nut, M12–M36.
//              Sources: Andrews Fasteners (bolt & nut tables); globalfastener.com EN 14399-4 (bolt); BS EN 14399-4:2015 text.

export const INCH_SOCKETS = [
  // size, d(in), hexHead, hexNut, heavyHead, structural, heavyNut
  ['1/4',   0.25,   '7/16',    '7/16',    null,      null,      '1/2'],
  ['5/16',  0.3125, '1/2',     '1/2',     null,      null,      '9/16'],
  ['3/8',   0.375,  '9/16',    '9/16',    '11/16',   null,      '11/16'],
  ['7/16',  0.4375, '5/8',     '11/16',   null,      null,      '3/4'],
  ['1/2',   0.5,    '3/4',     '3/4',     '7/8',     '7/8',     '7/8'],
  ['9/16',  0.5625, '13/16',   '7/8',     null,      null,      '15/16'],
  ['5/8',   0.625,  '15/16',   '15/16',   '1-1/16',  '1-1/16',  '1-1/16'],
  ['3/4',   0.75,   '1-1/8',   '1-1/8',   '1-1/4',   '1-1/4',   '1-1/4'],
  ['7/8',   0.875,  '1-5/16',  '1-5/16',  '1-7/16',  '1-7/16',  '1-7/16'],
  ['1',     1.0,    '1-1/2',   '1-1/2',   '1-5/8',   '1-5/8',   '1-5/8'],
  ['1-1/8', 1.125,  '1-11/16', '1-11/16', '1-13/16', '1-13/16', '1-13/16'],
  ['1-1/4', 1.25,   '1-7/8',   '1-7/8',   '2',       '2',       '2'],
  ['1-3/8', 1.375,  '2-1/16',  '2-1/16',  '2-3/16',  '2-3/16',  '2-3/16'],
  ['1-1/2', 1.5,    '2-1/4',   '2-1/4',   '2-3/8',   '2-3/8',   '2-3/8'],
  ['1-5/8', 1.625,  '2-7/16',  '2-7/16',  '2-9/16',  null,      '2-9/16'],
  ['1-3/4', 1.75,   '2-5/8',   '2-5/8',   '2-3/4',   null,      '2-3/4'],
  ['1-7/8', 1.875,  '2-13/16', '2-13/16', '2-15/16', null,      '2-15/16'],
  ['2',     2.0,    '3',       '3',       '3-1/8',   null,      '3-1/8'],
  ['2-1/4', 2.25,   '3-3/8',   '3-3/8',   '3-1/2',   null,      '3-1/2'],
  ['2-1/2', 2.5,    '3-3/4',   '3-3/4',   '3-7/8',   null,      '3-7/8'],
  ['2-3/4', 2.75,   '4-1/8',   '4-1/8',   '4-1/4',   null,      '4-1/4'],
  ['3',     3.0,    '4-1/2',   '4-1/2',   '4-5/8',   null,      '4-5/8'],
  ['3-1/4', 3.25,   '4-7/8',   '4-7/8',   '5',       null,      '5'],
  ['3-1/2', 3.5,    '5-1/4',   '5-1/4',   '5-3/8',   null,      '5-3/8'],
  ['3-3/4', 3.75,   '5-5/8',   '5-5/8',   '5-3/4',   null,      '5-3/4'],
  ['4',     4.0,    '6',       '6',       '6-1/8',   null,      '6-1/8'],
].map(([size, d, hexHead, hexNut, heavyHead, structural, heavyNut]) => ({ size, d, hexHead, hexNut, heavyHead, structural, heavyNut }));

export const METRIC_SOCKETS = [
  // size, iso, din(if different), asmeHeavyBolt, asmeHeavyNut, hv
  ['M5', 8], ['M6', 10], ['M8', 13],
  ['M10', 16, 17], ['M12', 18, 19, null, 21, 22], ['M14', 21, 22, null, 24, null],
  ['M16', 24, null, 27, 27, 27], ['M18', 27], ['M20', 30, null, 34, 34, 32],
  ['M22', 34, 32, 36, 36, 36], ['M24', 36, null, 41, 41, 41], ['M27', 41, null, 46, 46, 46],
  ['M30', 46, null, 50, 50, 50], ['M33', 50], ['M36', 55, null, 60, 60, 60],
  ['M39', 60], ['M42', 65, null, null, 70], ['M45', 70], ['M48', 75, null, null, 80],
  ['M52', 80], ['M56', 85, null, null, 90], ['M60', 90], ['M64', 95, null, null, 100],
].map(([size, iso, din = null, asmeHeavyBolt = null, asmeHeavyNut = null, hv = null]) =>
  ({ size, d: parseInt(size.slice(1), 10), iso, din, asmeHeavyBolt, asmeHeavyNut, hv }));

export const SOCKET_SOURCES = [
  'ASME B18.2.1 hex bolts & cap screws — Boltport tables; HBS Fasteners B18.2.1 data sheet; TorqBolt; ASMC cap screw chart.',
  'ASME B18.2.2 hex & heavy hex nuts (incl. jam nuts) — AmesWeb (from Machinery’s Handbook 30th ed.); Boltport; Portland Bolt; Global Supply data sheet.',
  'ASME B18.2.1 heavy hex bolts/screws — Portland Bolt; Boltport; Bolting Specialist.',
  'ASME B18.2.6 heavy hex structural bolts (F3125 A325/A490) — Portland Bolt.',
  'ISO 4014/4017/4032/4035 — ISO 4032 preview (iTeh); BOLTS parts library; Brooks Forgings ISO 4014 page; Würth DIN→ISO guide.',
  'DIN 931/933/934/439 differences (M10/M12/M14/M22) — Würth guide; SpecVise; EurolinkFSS.',
  'ASME B18.2.3.7M / B18.2.4.6M metric heavy hex — Boltport; Bolting Specialist; TorqBolt.',
  'EN 14399-4 (HV) structural bolts & nuts — Andrews Fasteners; globalfastener.com; BS EN 14399-4:2015.',
];
