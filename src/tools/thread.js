import { INCH_THREADS, INCH_WRENCH, METRIC_THREADS, metricTapDrill } from '../data/fasteners.js';
import { drillLookup } from '../data/drills.js';
import { parseNumber } from '../lib/fraction.js';
import { seg, wireSeg, esc } from '../ui.js';

const dec = (name) => {
  if (!name) return '';
  const d = drillLookup(name);
  const v = d ? d.inch : parseNumber(name);
  return isFinite(v) ? `${v.toFixed(4).replace(/^0/, '')}"` : '';
};
const fr = (x) => (x ? `${x}"` : '—');

export default {
  id: 'thread', title: 'Threads & Wrenches', icon: '🪛', desc: 'TPI · pitch · tap drill · socket size',
  render(el, state, ctx) {
    const s = { sys: state.sys || 'inch', size: state.size || '' };
    el.innerHTML = `
      <div class="card">${seg('sys', [['inch', 'Inch (UNC/UNF)'], ['metric', 'Metric']], s.sys)}
        <div class="chips" id="chips"></div></div>
      <div class="card result" id="detail"></div>
      <div class="card flush"><div class="tbl-wrap"><table class="tbl" id="tbl"></table></div></div>
      <div class="card info small"><h3>Sources</h3><ul>
        <li>Inch threads: ASME B1.1. Tap drills ≈75% thread (Machinery’s Handbook tables).</li>
        <li>Inch wrench sizes: ASME B18.2.1 / B18.2.2, cross-checked against Boltport, Portland Bolt and AmesWeb tables; B18.3 socket head keys. Bigger sizes (to 4") and heavy hex: see Bolt → Socket.</li>
        <li>Metric pitches: ISO 261/262. Tap drill = d − P. Wrench: ISO 4014/4017/4032; DIN 931/933/934 where different. Socket head keys: ISO 4762.</li>
      </ul></div>`;
    const $ = (id) => el.querySelector('#' + id);
    const list = () => (s.sys === 'inch' ? INCH_THREADS : METRIC_THREADS);
    const draw = () => {
      if (!list().some((t) => t.size === s.size)) s.size = s.sys === 'inch' ? '1/2' : 'M10';
      $('chips').innerHTML = list().map((t) => `<button type="button" class="chip ${t.size === s.size ? 'on' : ''}" data-size="${esc(t.size)}">${esc(t.size)}</button>`).join('');
      const t = list().find((x) => x.size === s.size);
      if (s.sys === 'inch') {
        const w = INCH_WRENCH[t.size] || {};
        $('detail').innerHTML = `<div class="big-label">${esc(t.size)}${t.size.startsWith('#') ? ' screw' : '" bolt'} · major Ø ${t.d.toFixed(4).replace(/^0/, '')}" (${(t.d * 25.4).toFixed(2)} mm)</div>
          <div class="kv">
            <div><span>UNC</span><b>${t.unc ? `${t.size}-${t.unc}` : '—'}</b><em>${t.tapUnc ? `tap drill ${t.tapUnc} (${dec(t.tapUnc)})` : ''}</em></div>
            <div><span>UNF</span><b>${t.unf ? `${t.size}-${t.unf}` : '—'}</b><em>${t.tapUnf ? `tap drill ${t.tapUnf} (${dec(t.tapUnf)})` : ''}</em></div>
            <div><span>Hex bolt / cap screw</span><b>${fr(w.hexBolt)}</b></div>
            <div><span>Hex nut</span><b>${fr(w.hexNut)}</b>${w.hexNut && w.hexNut !== w.hexBolt ? '<em>differs from bolt head!</em>' : ''}</div>
            <div><span>Heavy hex bolt head</span><b>${fr(w.heavy)}</b></div>
            <div><span>Heavy hex nut</span><b>${fr(w.heavyNut)}</b></div>
            <div><span>Socket head key</span><b>${fr(w.shcs)}</b></div>
          </div>`;
        ctx.update({ ...s }, `${t.size}: UNC ${t.unc ?? '—'} tpi (tap ${t.tapUnc ?? '—'}), UNF ${t.unf} tpi (tap ${t.tapUnf}); wrench ${w.hexBolt ?? '—'}`);
        $('tbl').innerHTML = `<thead><tr><th>Size</th><th>UNC · tap</th><th>UNF · tap</th><th>Bolt / Nut</th></tr></thead><tbody>${INCH_THREADS.map((x) => {
          const ww = INCH_WRENCH[x.size] || {};
          return `<tr data-size="${esc(x.size)}" class="${x.size === s.size ? 'sel' : ''}"><td><b>${esc(x.size)}</b></td><td>${x.unc ?? '—'} · ${x.tapUnc ?? '—'}</td><td>${x.unf} · ${x.tapUnf}</td><td>${ww.hexBolt ? ww.hexBolt + (ww.hexNut !== ww.hexBolt ? ' / ' + ww.hexNut : '') : '—'}</td></tr>`;
        }).join('')}</tbody>`;
      } else {
        $('detail').innerHTML = `<div class="big-label">${esc(t.size)} · major Ø ${t.d} mm (${(t.d / 25.4).toFixed(4).replace(/^0/, '')}")</div>
          <div class="kv">
            <div><span>Coarse</span><b>${t.size}×${t.coarse}</b><em>tap drill ${metricTapDrill(t.d, t.coarse)} mm</em></div>
            ${t.fine.map((p) => `<div><span>Fine</span><b>${t.size}×${p}</b><em>tap drill ${metricTapDrill(t.d, p)} mm</em></div>`).join('')}
            <div><span>Hex wrench (ISO)</span><b>${t.iso} mm</b>${t.din ? `<em>DIN / older: ${t.din} mm</em>` : ''}</div>
            <div><span>Socket head key</span><b>${t.shcs} mm</b></div>
          </div>`;
        ctx.update({ ...s }, `${t.size}: coarse ${t.coarse} (tap ${metricTapDrill(t.d, t.coarse)} mm), fine ${t.fine.join('/')}; wrench ${t.iso} mm${t.din ? ` (DIN ${t.din})` : ''}`);
        $('tbl').innerHTML = `<thead><tr><th>Size</th><th>Coarse · tap</th><th>Fine · tap</th><th>Wrench</th></tr></thead><tbody>${METRIC_THREADS.map((x) =>
          `<tr data-size="${x.size}" class="${x.size === s.size ? 'sel' : ''}"><td><b>${x.size}</b></td><td>${x.coarse} · ${metricTapDrill(x.d, x.coarse)}</td><td>${x.fine.map((p) => `${p} · ${metricTapDrill(x.d, p)}`).join('<br>')}</td><td>${x.iso}${x.din ? ` (${x.din})` : ''}</td></tr>`).join('')}</tbody>`;
      }
    };
    wireSeg(el, (n, v) => { s[n] = v; s.size = ''; draw(); });
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-size]'); if (!b) return; s.size = b.dataset.size; draw(); });
    draw();
  },
};
