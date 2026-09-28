// Center of gravity / unequal load share between two pick points.
import { cgShare, cgTensions } from '../lib/rigging.js';
import { parseNumber } from '../lib/fraction.js';
import { fmt } from '../lib/units.js';
import { seg, wireSeg, esc, rigBanner, numField, RIG_FINE } from '../ui.js';

const WU = { lb: 'lb', kg: 'kg', ton: 'tons' };
const nf = (x) => fmt(x, x >= 100 ? 0 : 2);

function diagram(dA, dB, H, r) {
  const W = 300, Hh = 170, span = dA + dB, sx = 240 / span, ax = 30, bx = ax + span * sx, cgx = ax + dA * sx, by = 140;
  const hy = H > 0 ? Math.max(by - Math.min(H * sx, 120), 14) : null;
  return `<svg viewBox="0 0 ${W} ${Hh}" class="diagram tall" role="img" aria-label="Load share diagram">
    <rect x="${ax - 12}" y="${by}" width="${bx - ax + 24}" height="18" rx="3" class="d-grip"/>
    ${hy != null ? `<line x1="${cgx}" y1="${hy}" x2="${ax}" y2="${by}" class="d-adapter"/><line x1="${cgx}" y1="${hy}" x2="${bx}" y2="${by}" class="d-adapter"/><circle cx="${cgx}" cy="${hy}" r="6" class="d-drive"/>` : ''}
    <line x1="${cgx}" y1="${by - 8}" x2="${cgx}" y2="${by + 30}" class="d-dash"/>
    <text x="${cgx}" y="${by + 12}" text-anchor="middle" class="d-cg">⊕</text>
    <circle cx="${ax}" cy="${by}" r="6" class="d-nut"/><circle cx="${bx}" cy="${by}" r="6" class="d-nut"/>
    <text x="${ax}" y="${by - 12}" text-anchor="middle" class="d-txt">A</text><text x="${bx}" y="${by - 12}" text-anchor="middle" class="d-txt">B</text>
    <text x="${ax}" y="${by + 34}" class="d-txt small">${esc(nf(r.A))}</text><text x="${bx}" y="${by + 34}" text-anchor="end" class="d-txt small">${esc(nf(r.B))}</text>
  </svg>`;
}

export default {
  id: 'cg', title: 'CG / Load Share', icon: '⚖️', desc: 'Unequal pick points', group: 'rigging', isNew: true,
  render(el, state, ctx) {
    const s = { w: state.w ?? '', wu: WU[state.wu] ? state.wu : 'lb', da: state.da ?? '', db: state.db ?? '', h: state.h ?? '' };
    el.innerHTML = `${rigBanner()}
      <div class="card">
        <label class="field"><span class="lbl">Load weight</span><div class="row"><input type="text" inputmode="decimal" id="w" value="${esc(s.w)}" placeholder="e.g. 10000">${seg('wu', Object.entries(WU), s.wu)}</div></label>
        <div class="row gap">${numField('da', 'CG → pick point A', s.da, 'e.g. 4')}${numField('db', 'CG → pick point B', s.db, 'e.g. 8')}</div>
        ${numField('h', 'Hook height above pick points (optional)', s.h, 'same units — for sling tension')}
        <p class="hint">Horizontal distances, any consistent unit (ft, in, m). Hook assumed directly over the CG.</p>
      </div>
      <div id="out"></div>
      <div class="card info"><h3>How it works</h3><ul>
        <li>Load at A = W × d<sub>B</sub> ÷ (d<sub>A</sub> + d<sub>B</sub>); load at B = W × d<sub>A</sub> ÷ (d<sub>A</sub> + d<sub>B</sub>). <b>The pick point closer to the CG carries more.</b></li>
        <li>With hook height H: leg length L = √(d² + H²), leg tension = vertical share × L ÷ H.</li>
        <li>Rig each leg and its hardware for its own tension, not half the load. Verify CG from drawings/vendor data; a CG estimate error shifts the share.</li>
      </ul><p class="fine">${esc(RIG_FINE)}</p></div>`;
    const $ = (id) => el.querySelector('#' + id);
    const calc = () => {
      const W = parseNumber(s.w), dA = parseNumber(s.da), dB = parseNumber(s.db), H = parseNumber(s.h);
      const r = W > 0 ? cgShare(W, dA, dB) : null, u = WU[s.wu];
      if (!r) { $('out').innerHTML = '<div class="card"><p class="hint">Enter the weight and both horizontal distances from the CG (≥ 0).</p></div>'; ctx.update({ ...s }, null); return; }
      const t = H > 0 ? cgTensions(W, dA, dB, H) : null;
      const lowAng = t && Math.min(t.angA, t.angB) < 30;
      $('out').innerHTML = `${lowAng ? '<div class="warnbox bad"><b>A sling angle is below 30°.</b> Tension rises steeply — use longer slings, raise the hook or use a spreader.</div>' : ''}
        <div class="card result"><div class="big-label">Load on each pick point</div>
        <div class="kv">
          <div><span>Point A (${esc(fmt(dA, 3))} from CG)</span><b>${nf(r.A)} ${u}</b><em>${fmt(r.A / W * 100, 1)}% of load</em></div>
          <div><span>Point B (${esc(fmt(dB, 3))} from CG)</span><b>${nf(r.B)} ${u}</b><em>${fmt(r.B / W * 100, 1)}% of load</em></div>
          ${t ? `<div><span>Leg A tension</span><b>${nf(t.TA)} ${u}</b><em>leg ${fmt(t.LA, 2)} long · ${fmt(t.angA, 1)}° from horizontal</em></div>
          <div><span>Leg B tension</span><b>${nf(t.TB)} ${u}</b><em>leg ${fmt(t.LB, 2)} long · ${fmt(t.angB, 1)}° from horizontal</em></div>` : ''}
        </div>${diagram(dA, dB, H, r)}</div>`;
      ctx.update({ ...s }, `${nf(W)} ${u}, CG ${fmt(dA, 3)} / ${fmt(dB, 3)} → A ${nf(r.A)}, B ${nf(r.B)} ${u}${t ? `; legs ${nf(t.TA)} / ${nf(t.TB)} @ H ${fmt(H, 3)}` : ''}`);
    };
    el.querySelectorAll('input').forEach((i) => i.addEventListener('input', () => { s[i.id] = i.value.trim(); calc(); }));
    wireSeg(el, (k, v) => { s[k] = v; calc(); });
    calc();
  },
};
