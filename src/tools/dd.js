// Wire rope D/d efficiency (bending over a pin, shackle, hook or sheave).
import { DD_EFF } from '../data/rigging.js';
import { ddEfficiency } from '../lib/rigging.js';
import { parseNumber } from '../lib/fraction.js';
import { fmt } from '../lib/units.js';
import { esc, rigBanner, numField, RIG_FINE } from '../ui.js';

export default {
  id: 'dd', title: 'D/d Ratio', icon: '➰', desc: 'Wire rope bend efficiency', group: 'rigging', isNew: true,
  render(el, state, ctx) {
    const s = { bd: state.bd ?? '', rd: state.rd ?? '', cap: state.cap ?? '' };
    el.innerHTML = `${rigBanner()}
      <div class="card">
        <div class="row gap">${numField('bd', 'D — pin / sheave / object diameter', s.bd, 'e.g. 2')}${numField('rd', 'd — rope (body) diameter', s.rd, 'e.g. 1/2')}</div>
        ${numField('cap', 'Rated basket capacity from tag (optional)', s.cap, 'any unit')}
        <p class="hint">Same units for D and d (fractions OK).</p>
      </div>
      <div id="out"></div>
      <div class="card info"><h3>Efficiency table (used by this tool)</h3>
        <table class="tbl"><thead><tr><th>D/d</th><th>% of rated basket</th></tr></thead><tbody>
        ${DD_EFF.map(([r, p]) => `<tr><td>${r === 25 ? '≥ 25' : r}:1</td><td class="num">${p}%</td></tr>`).join('')}</tbody></table>
        <ul><li>Catalog basket/choker ratings assume D/d ≥ 25. Below that, capacity is reduced.</li>
        <li>Two published tables differ slightly (Wire Rope Technical Board curve vs. Riggs, Crane &amp; Rigging Hotline 2012); the <b>lower value</b> at each point is used and ratios <b>step down</b> to the next lower row (no interpolation).</li>
        <li>For 6x19 / 6x37 class wire rope only. Chain, synthetic slings and other constructions have their own rules — see the manufacturer. Small D/d also causes permanent kinking/damage.</li></ul>
        <p class="fine">${esc(RIG_FINE)}</p></div>`;
    const $ = (id) => el.querySelector('#' + id);
    const calc = () => {
      const D = parseNumber(s.bd), d = parseNumber(s.rd), cap = parseNumber(s.cap);
      if (!(D > 0) || !(d > 0)) { $('out').innerHTML = '<div class="card"><p class="hint">Enter D and d.</p></div>'; ctx.update({ ...s }, null); return; }
      const ratio = D / d, e = ddEfficiency(D, d);
      if (e == null) {
        $('out').innerHTML = `<div class="warnbox bad"><b>D/d = ${fmt(ratio, 2)}:1 — below 1:1.</b> Not covered; do not bend wire rope this sharply. Use a larger pin/shackle or softeners with a qualified rigger's approval.</div>`;
        ctx.update({ ...s }, `D/d ${fmt(ratio, 2)}:1 — below 1:1, not permitted`); return;
      }
      $('out').innerHTML = `${e < 100 ? `<div class="warnbox${ratio < 4 ? ' bad' : ''}">D/d below 25:1 — reduce the rated basket capacity to ${e}%.</div>` : ''}
        <div class="card result"><div class="big-label">D/d ${fmt(ratio, 2)} : 1</div>
        <div class="big-num">${e}<span class="unit">% efficiency</span></div>
        ${cap > 0 ? `<div class="sub">Reduced capacity: <b>${fmt(cap * e / 100, 2)}</b> (of ${fmt(cap, 2)} rated)</div>` : ''}</div>`;
      ctx.update({ ...s }, `D/d ${fmt(ratio, 2)}:1 → ${e}%${cap > 0 ? ` → ${fmt(cap * e / 100, 2)} of ${fmt(cap, 2)}` : ''}`);
    };
    el.querySelectorAll('input').forEach((i) => i.addEventListener('input', () => { s[i.id] = i.value.trim(); calc(); }));
    calc();
  },
};
