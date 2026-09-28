// Sling capacity reference (manufacturer catalog values). Data + sources: src/data/rigging.js
import { WIRE_ROPE, CHAIN, WEB, ROUND } from '../data/rigging.js';
import { fmt } from '../lib/units.js';
import { seg, wireSeg, esc, rigBanner, RIG_FINE } from '../ui.js';

const TYPES = { wire: 'Wire rope', chain: 'Alloy chain', web: 'Web', round: 'Round' };
const lb = (n) => n.toLocaleString('en-US');
const tons = (n) => fmt(n, 2);

function rows(s) {
  if (s.ty === 'wire') return WIRE_ROPE.map((r) => ({ key: r.size, name: `${r.size}"`, v: r.v, c: r.c, b: r.b, unit: 'tons' }));
  if (s.ty === 'chain') return CHAIN[s.gr].map(([size, v]) => ({ key: size, name: `${size}"`, v, unit: 'lb' }));
  if (s.ty === 'web') return WEB[s.ply].map(([w, la, asc]) => {
    const lo = la.map((x, i) => Math.min(x, asc[i]));
    return { key: String(w), name: `${w}"`, v: lo[0], c: lo[1], b: lo[2], la, asc, unit: 'lb' };
  });
  return ROUND.map((r) => ({ key: r.color, name: r.color, hex: r.hex, v: r.v, c: r.c, b: r.b, unit: 'lb' }));
}

const NOTES = {
  wire: 'Single-leg, 6x19 / 6x37 class, EIPS, IWRC, mechanical (pressed) splice. Tons = 2,000 lb. Basket assumes D/d ≥ 25 and vertical legs; choker assumes choke angle ≥ 120°. Hand-tucked splices and fiber core rate lower. Sources agree: Lift-All, CERTEX, Island Operating.',
  chain: 'Single-leg VERTICAL working load limit, lb (4:1). Grade 80 and 100 must be marked and tagged accordingly. Choker hitch: reduce per the tag (manufacturers use ~75–80%). Sources: Peerless, Laclede, Lift-All, CERTEX, Unirope, DOE-STD-1090.',
  web: 'Type 3/4 eye-and-eye nylon/polyester web slings, Class 5 (5:1). Capacities differ by manufacturer and series — shown is the LOWER of Lift-All Series 1800 and ASC Industries per cell. Basket is vertical legs. Your sling tag governs.',
  round: 'Polyester endless round slings, WSTDA RS-1 standard color code (Lift-All Tuflex identical). Colors above Orange/25,000 lb vary by maker and are omitted. Basket is vertical legs. Tag governs — color is only a guide.',
};

export default {
  id: 'capacity', title: 'Sling Capacity', icon: '🪢', desc: 'Wire, chain, web, round', group: 'rigging', isNew: true,
  render(el, state, ctx) {
    const s = { ty: TYPES[state.ty] ? state.ty : 'wire', gr: state.gr === '100' ? '100' : '80', ply: state.ply === '2' ? '2' : '1', sel: state.sel || '' };
    const draw = () => {
      const R = rows(s), three = s.ty !== 'chain', u = R[0].unit;
      const sel = R.find((r) => r.key === s.sel);
      const f = u === 'tons' ? tons : lb;
      el.innerHTML = `${rigBanner()}
        <div class="card">${seg('ty', Object.entries(TYPES), s.ty)}
          ${s.ty === 'chain' ? `<div class="mt">${seg('gr', [['80', 'Grade 80'], ['100', 'Grade 100']], s.gr)}</div>` : ''}
          ${s.ty === 'web' ? `<div class="mt">${seg('ply', [['1', '1-ply'], ['2', '2-ply']], s.ply)}</div>` : ''}
          <p class="hint"><b>Capacities vary by manufacturer. Always use the sling tag.</b> Values below are catalog references for inspection/planning only.</p></div>
        <div id="sel"></div>
        <div class="card flush"><div class="tbl-wrap"><table class="tbl" id="tbl">
          <thead><tr><th>${s.ty === 'round' ? 'Color' : s.ty === 'web' ? 'Width' : 'Size'}</th><th>Vertical</th>${three ? '<th>Choker</th><th>Basket</th>' : ''}</tr></thead>
          <tbody>${R.map((r) => `<tr data-size="${esc(r.key)}" class="${r.key === s.sel ? 'sel' : ''}"><td><b>${r.hex ? `<span class="swatch" style="background:${r.hex}"></span>` : ''}${esc(r.name)}</b></td><td class="num">${f(r.v)}</td>${three ? `<td class="num">${f(r.c)}</td><td class="num">${f(r.b)}</td>` : ''}</tr>`).join('')}</tbody>
        </table></div><p class="hint pad">Units: ${u === 'tons' ? 'US tons (2,000 lb)' : 'lb'} · tap a row for details.</p><div class="pad"></div></div>
        <div class="card info"><p>${esc(NOTES[s.ty])}</p><p class="fine">${esc(RIG_FINE)}</p></div>`;
      if (sel) {
        el.querySelector('#sel').innerHTML = `<div class="card result"><div class="big-label">${esc(TYPES[s.ty])}${s.ty === 'chain' ? ` Grade ${s.gr}` : ''}${s.ty === 'web' ? ` ${s.ply}-ply` : ''} · ${esc(sel.name)}</div>
          <div class="kv"><div><span>Vertical</span><b>${f(sel.v)} ${u}</b>${u === 'tons' ? `<em>${lb(sel.v * 2000)} lb</em>` : ''}</div>
          ${three ? `<div><span>Choker</span><b>${f(sel.c)} ${u}</b>${u === 'tons' ? `<em>${lb(Math.round(sel.c * 2000))} lb</em>` : ''}</div>
          <div><span>Basket (vertical)</span><b>${f(sel.b)} ${u}</b>${u === 'tons' ? `<em>${lb(sel.b * 2000)} lb</em>` : ''}</div>` : ''}
          ${sel.la ? `<div><span>Lift-All / ASC</span><b class="small">${sel.la.map(lb).join(' / ')}</b><em>ASC: ${sel.asc.map(lb).join(' / ')} (V/C/B)</em></div>` : ''}</div>
          <p class="hint">Angled basket/bridle: multiply by sin(angle from horizontal) — or use the Sling Angle tool. Over a small pin/edge, check D/d.</p></div>`;
      }
      wireSeg(el, (k, v) => { s[k] = v; s.sel = k === 'ty' || k === 'gr' || k === 'ply' ? '' : s.sel; draw(); });
      el.querySelector('#tbl').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-size]'); if (!tr) return; s.sel = tr.dataset.size; draw(); el.querySelector('#sel').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
      const label = `${TYPES[s.ty]}${s.ty === 'chain' ? ` G${s.gr}` : ''}${s.ty === 'web' ? ` ${s.ply}-ply` : ''}`;
      ctx.update({ ...s }, sel ? `${label} ${sel.name}: V ${f(sel.v)}${three ? ` / C ${f(sel.c)} / B ${f(sel.b)}` : ''} ${u} (catalog ref — tag governs)` : null);
    };
    draw();
  },
};
