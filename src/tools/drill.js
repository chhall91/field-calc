import { allDrills, drillLookup, nearestDrills } from '../data/drills.js';
import { parseNumber, nearestFraction, fracText } from '../lib/fraction.js';
import { seg, wireSeg, esc } from '../ui.js';

const ALL = allDrills();
const d4 = (x) => x.toFixed(4).replace(/^0/, '');

/** Interpret input as a drill name, mm value, fraction or decimal inch. */
function interpret(q) {
  const s = String(q).trim();
  if (!s) return null;
  const named = drillLookup(s);
  if (named) return named;
  const v = parseNumber(s);
  if (isFinite(v) && v > 0) return { inch: v, label: `${s}"` };
  return null;
}

export default {
  id: 'drill', title: 'Fractions & Drills', icon: '🧮', desc: 'Fraction/decimal/mm · drill sizes',
  render(el, state, ctx) {
    const s = { tab: state.tab || 'lookup', q: state.q ?? '', f: state.f || 'all' };
    el.innerHTML = `
      <div class="card">${seg('tab', [['lookup', 'Lookup'], ['chart', 'Fraction chart'], ['drills', 'All drills']], s.tab)}</div>
      <div id="body"></div>`;
    const body = el.querySelector('#body');
    const draw = () => {
      if (s.tab === 'lookup') {
        body.innerHTML = `<div class="card">
            <label class="field big"><span class="lbl">Size: #7, F, 17/64, 6.8mm, .201</span>
            <input type="text" id="q" autocomplete="off" autocapitalize="characters" value="${esc(s.q)}" placeholder="size"></label>
            <p class="hint">Bare numbers 1–80 are read as number drills; use 0.xx or a fraction for inches, or add “mm”.</p>
          </div><div class="card result" id="out"></div>`;
        const q = body.querySelector('#q');
        const run = () => {
          s.q = q.value;
          const r = interpret(s.q);
          const out = body.querySelector('#out');
          if (!r) { out.innerHTML = '<p class="hint">Enter a size to see decimal, mm and the closest drill in every series.</p>'; ctx.update({ ...s }, null); return; }
          const n = nearestDrills(r.inch, ALL);
          const nf = nearestFraction(r.inch, 64);
          const row = (label, d) => {
            const diff = d.inch - r.inch;
            return `<div><span>${label}</span><b>${esc(d.name)}</b><em>${d4(d.inch)}" · ${d.mm.toFixed(2)} mm · ${Math.abs(diff) < 5e-5 ? 'exact' : (diff > 0 ? '+' : '') + d4(diff) + '"'}</em></div>`;
          };
          out.innerHTML = `<div class="big-label">${esc(r.label)}</div>
            <div class="big-num">${d4(r.inch)}" <span class="unit">= ${(r.inch * 25.4).toFixed(3)} mm</span></div>
            <div class="sub">nearest 1/64: ${nf.text}" (${nf.error >= 0 ? '+' : ''}${d4(nf.error)}")</div>
            <div class="kv">${row('Number', n.number)}${row('Letter', n.letter)}${row('Fraction', n.fraction)}${row('Metric', n.metric)}</div>`;
          ctx.update({ ...s }, `${r.label} = ${d4(r.inch)}" = ${(r.inch * 25.4).toFixed(3)} mm (≈ ${nf.text}")`);
        };
        q.addEventListener('input', run); run();
      } else if (s.tab === 'chart') {
        let rows = '';
        for (let i = 1; i <= 64; i++) {
          const cls = i % 8 === 0 ? 'b8' : i % 4 === 0 ? 'b16' : i % 2 === 0 ? 'b32' : '';
          rows += `<tr class="${cls}"><td>${fracText(i, 64)}</td><td>${d4(i / 64)}</td><td>${(i / 64 * 25.4).toFixed(3)}</td></tr>`;
        }
        body.innerHTML = `<div class="card flush"><div class="tbl-wrap"><table class="tbl chart"><thead><tr><th>Fraction</th><th>Decimal (in)</th><th>mm</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        ctx.update({ ...s }, null);
      } else {
        const list = ALL.filter((d) => s.f === 'all' || d.type === s.f).filter((d) => s.f !== 'all' || d.type !== 'metric' || Math.round(d.mm * 10) % 5 === 0);
        body.innerHTML = `<div class="card">${seg('f', [['all', 'All'], ['number', 'Number'], ['letter', 'Letter'], ['fraction', 'Fraction'], ['metric', 'Metric']], s.f)}
          ${s.f === 'all' ? '<p class="hint">“All” shows metric in 0.5 mm steps; pick Metric for 0.1 mm steps.</p>' : ''}</div>
          <div class="card flush"><div class="tbl-wrap"><table class="tbl chart"><thead><tr><th>Drill</th><th>Inch</th><th>mm</th></tr></thead><tbody>
          ${list.map((d) => `<tr class="t-${d.type}"><td>${esc(d.name)}</td><td>${d4(d.inch)}</td><td>${d.mm.toFixed(3)}</td></tr>`).join('')}</tbody></table></div></div>`;
        wireSeg(body, (n, v) => { s.f = v; draw(); });
        ctx.update({ ...s }, null);
      }
    };
    wireSeg(el.querySelector('.card'), (n, v) => { s.tab = v; draw(); });
    draw();
  },
};
