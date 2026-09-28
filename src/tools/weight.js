// Load weight estimator: plate/block, round bar, pipe. Densities & pipe data: src/data/rigging.js
import { DENSITY, PIPE } from '../data/rigging.js';
import { plateLb, roundBarLb, pipeLb, LB_KG } from '../lib/rigging.js';
import { parseNumber } from '../lib/fraction.js';
import { fmt } from '../lib/units.js';
import { seg, wireSeg, esc, rigBanner, numField, options, RIG_FINE } from '../ui.js';

const TO_IN = { in: 1, ft: 12, mm: 1 / 25.4, m: 1000 / 25.4 };
const SH = { plate: 'Plate / block', bar: 'Round bar', pipe: 'Pipe' };

export default {
  id: 'weight', title: 'Load Weight', icon: '🏋️', desc: 'Plate, bar, pipe', group: 'rigging', isNew: true,
  render(el, state, ctx) {
    const s = {
      sh: SH[state.sh] ? state.sh : 'plate', mat: DENSITY[state.mat] ? state.mat : 'steel',
      su: state.su === 'mm' ? 'mm' : 'in', lu: TO_IN[state.lu] ? state.lu : 'ft',
      a: state.a ?? '', b: state.b ?? '', c: state.c ?? '', nps: state.nps || '6', sch: ['40', '80', 'x'].includes(state.sch) ? state.sch : '40',
      od: state.od ?? '', wt: state.wt ?? '', wtr: state.wtr === '1' ? '1' : '0', q: state.q ?? '1',
    };
    const draw = () => {
      const lu = s.lu, su = s.su;
      let dims = '';
      if (s.sh === 'plate') dims = `<div class="row gap">${numField('a', `Length (${lu})`, s.a, 'e.g. 8')}${numField('b', `Width (${lu})`, s.b, 'e.g. 4')}</div>${numField('c', `Thickness (${su})`, s.c, 'e.g. 1')}`;
      else if (s.sh === 'bar') dims = `<div class="row gap">${numField('c', `Diameter (${su})`, s.c, 'e.g. 4')}${numField('a', `Length (${lu})`, s.a, 'e.g. 10')}</div>`;
      else dims = `<label class="field"><span class="lbl">NPS</span><select id="nps">${options(Object.fromEntries(PIPE.map((p) => [p.nps, p.nps + '"'])), s.nps)}</select></label>
          <div class="field"><span class="lbl">Wall</span>${seg('sch', [['40', 'Sch 40'], ['80', 'Sch 80'], ['x', 'Custom OD/wall']], s.sch)}</div>
          ${s.sch === 'x' ? `<div class="row gap">${numField('od', `OD (${su})`, s.od, 'e.g. 6.625')}${numField('wt', `Wall (${su})`, s.wt, 'e.g. 0.280')}</div>` : ''}
          ${numField('a', `Length (${lu})`, s.a, 'e.g. 20')}
          <span class="lbl">Contents</span>${seg('wtr', [['0', 'Empty'], ['1', 'Full of water']], s.wtr)}`;
      el.innerHTML = `${rigBanner()}
        <div class="card">${seg('sh', Object.entries(SH), s.sh)}
          <div class="row gap mt"><label class="field grow"><span class="lbl">Material</span><select id="mat">${options(Object.fromEntries(Object.entries(DENSITY).map(([k, v]) => [k, `${v.label} (${v.lbft3} lb/ft³)`])), s.mat)}</select></label></div>
          <div class="field"><span class="lbl">Length unit</span>${seg('lu', [['in', 'in'], ['ft', 'ft'], ['mm', 'mm'], ['m', 'm']], lu)}</div>
          ${s.sh !== 'pipe' || s.sch === 'x' ? `<div class="field"><span class="lbl">${s.sh === 'plate' ? 'Thickness' : 'Diameter / wall'} unit</span>${seg('su', [['in', 'in'], ['mm', 'mm']], su)}</div>` : ''}
          ${dims}
          ${numField('q', 'Quantity', s.q, '1')}
        </div>
        <div id="out"></div>
        <div class="card info"><h3>Notes</h3><ul>
          <li>Estimate only — use nameplate, drawings, shipping papers or a load cell when available. Add rigging, hooks, blocks and spreader weight.</li>
          <li>Pipe weight = π·(OD − t)·t·length·density (plain end). Sch 40/80 walls per ASME B36.10M. Fittings, flanges, valves, insulation and residual fluid add weight.</li>
          <li>Densities (lb/ft³): DOE-STD-1090 Table 11-1 and Engineering ToolBox; the higher value is used where they differ. <b>Stainless 500</b> is the upper end of the published range (conservative). <b>Cast iron 450</b> (DOE) — cast iron grades vary up to ≈487 lb/ft³, so weigh castings or add margin. Concrete 150 is normal-weight; reinforced/heavyweight concrete is heavier.</li>
        </ul><p class="fine">${esc(RIG_FINE)}</p></div>`;
      el.querySelectorAll('input').forEach((i) => i.addEventListener('input', () => { s[i.id] = i.value.trim(); calc(); }));
      el.querySelectorAll('select').forEach((i) => i.addEventListener('change', () => { s[i.id] = i.value; calc(); }));
      wireSeg(el, (k, v) => { s[k] = v; if (k === 'sh' || k === 'sch' || k === 'lu' || k === 'su') draw(); else calc(); });
      calc();
    };
    const calc = () => {
      const L = parseNumber(s.a) * TO_IN[s.lu], sec = TO_IN[s.su], q = parseNumber(s.q) || 1;
      let lb = NaN, desc = '';
      const mat = DENSITY[s.mat].label;
      if (s.sh === 'plate') {
        const W = parseNumber(s.b) * TO_IN[s.lu], T = parseNumber(s.c) * sec;
        if (L > 0 && W > 0 && T > 0) { lb = plateLb(L, W, T, s.mat); desc = `${mat} plate ${s.a}×${s.b} ${s.lu} × ${s.c} ${s.su}`; }
      } else if (s.sh === 'bar') {
        const D = parseNumber(s.c) * sec;
        if (L > 0 && D > 0) { lb = roundBarLb(D, L, s.mat); desc = `${mat} round bar ⌀${s.c} ${s.su} × ${s.a} ${s.lu}`; }
      } else {
        const p = PIPE.find((x) => x.nps === s.nps);
        const OD = s.sch === 'x' ? parseNumber(s.od) * sec : p.od, t = s.sch === 'x' ? parseNumber(s.wt) * sec : s.sch === '80' ? p.s80 : p.s40;
        if (L > 0 && OD > 0 && t > 0) {
          lb = pipeLb(OD, t, L, s.mat, s.wtr === '1');
          desc = `${mat} pipe ${s.sch === 'x' ? `OD ${fmt(OD, 3)}" × ${fmt(t, 3)}" wall` : `${s.nps}" Sch ${s.sch}`} × ${s.a} ${s.lu}${s.wtr === '1' ? ', water-filled' : ''}`;
          if (!Number.isFinite(lb)) desc = '';
        }
      }
      const out = el.querySelector('#out');
      if (!Number.isFinite(lb)) { out.innerHTML = '<div class="card"><p class="hint">Enter the dimensions to estimate the weight.</p></div>'; ctx.update({ ...s }, null); return; }
      const total = lb * q;
      const perFt = s.sh !== 'plate' ? lb / (L / 12) : null;
      out.innerHTML = `<div class="card result"><div class="big-label">Estimated weight${q !== 1 ? ` (× ${fmt(q, 2)})` : ''}</div>
        <div class="big-num">${fmt(total, total >= 100 ? 0 : 1)}<span class="unit"> lb</span></div>
        <div class="kv"><div><span>Kilograms</span><b>${fmt(total * LB_KG, total >= 100 ? 0 : 1)} kg</b></div>
        <div><span>US tons</span><b>${fmt(total / 2000, 3)}</b><em>${fmt(total * LB_KG / 1000, 3)} metric t</em></div>
        ${perFt ? `<div><span>Per foot</span><b>${fmt(perFt, 2)} lb/ft</b></div>` : ''}</div>
        <p class="hint">${esc(desc)}. Add rigging weight.</p></div>`;
      ctx.update({ ...s }, `${desc}${q !== 1 ? ` ×${fmt(q, 2)}` : ''} ≈ ${fmt(total, 0)} lb (${fmt(total * LB_KG, 0)} kg)`);
    };
    draw();
  },
};
