import { CATEGORIES, convert, convertTemp, TEMP_UNITS, fmt } from '../lib/units.js';
import { parseNumber, nearestFraction } from '../lib/fraction.js';
import { seg, wireSeg, options, esc } from '../ui.js';

const CATS = [['length', 'Length'], ['pressure', 'Pressure'], ['temp', 'Temp'], ['flow', 'Flow'], ['mass', 'Weight'], ['force', 'Force'], ['torque', 'Torque']];
const DEFAULT_FROM = { length: 'in', pressure: 'psi', temp: 'F', flow: 'gpm', mass: 'lb', force: 'lbf', torque: 'ftlb' };

export default {
  id: 'units', title: 'Unit Converter', icon: '⚖️', desc: 'Length · pressure · temp · flow · weight',
  render(el, state, ctx) {
    const s = { c: state.c || 'length', f: state.f || '', v: state.v ?? '' };
    el.innerHTML = `
      <div class="card">
        <div class="chips cats">${seg('c', CATS, s.c)}</div>
        <div class="row gap">
          <input type="text" inputmode="decimal" id="v" class="grow" placeholder="value" value="${esc(s.v)}" aria-label="Value">
          <select id="f" aria-label="From unit"></select>
        </div>
        <p class="hint" id="hint"></p>
      </div>
      <div class="card flush" id="res"></div>`;
    const $ = (id) => el.querySelector('#' + id);
    const unitMap = () => (s.c === 'temp' ? TEMP_UNITS : CATEGORIES[s.c].units);
    const fillFrom = () => {
      if (!(s.f in unitMap())) s.f = DEFAULT_FROM[s.c];
      $('f').innerHTML = options(unitMap(), s.f);
      $('hint').textContent = s.c === 'length' ? 'Fractions OK: 1-3/8, 3/8, 0.375. Inch results show nearest 1/64.'
        : s.c === 'pressure' ? 'Gauge stays gauge (psig → barg). inHg at 32 °F.' : s.c === 'temp' ? 'Absolute: K and °R.' : '';
    };
    const calc = () => {
      s.v = $('v').value; s.f = $('f').value;
      const v = parseNumber(s.v);
      const units = unitMap();
      if (!isFinite(v)) { $('res').innerHTML = '<p class="hint pad">Enter a value.</p>'; return; }
      const rows = Object.entries(units).filter(([k]) => k !== s.f).map(([k, u]) => {
        const r = s.c === 'temp' ? convertTemp(v, s.f, k) : convert(v, s.f, k, s.c);
        let extra = '';
        if (s.c === 'length' && k === 'in') {
          const nf = nearestFraction(r, 64);
          extra = `<em>≈ ${nf.text}" ${Math.abs(nf.error) < 1e-9 ? '(exact)' : `(${nf.error > 0 ? '+' : ''}${nf.error.toFixed(4)}")`}</em>`;
        }
        return { k, label: typeof u === 'string' ? u : u.label, r, extra };
      });
      const fromLabel = typeof units[s.f] === 'string' ? units[s.f] : units[s.f].label;
      let head = '';
      if (s.c === 'length' && s.f === 'in') {
        const nf = nearestFraction(v, 64);
        head = `<div class="res-row head"><span>${esc(s.v)} in</span><b>${fmt(v, 4)}"</b><em>≈ ${nf.text}"</em></div>`;
      }
      $('res').innerHTML = head + rows.map((x) => `<button type="button" class="res-row" data-k="${x.k}"><span>${esc(x.label)}</span><b>${fmt(x.r)}</b>${x.extra}</button>`).join('');
      ctx.update({ ...s }, `${s.v} ${fromLabel} = ${rows.slice(0, 3).map((x) => `${fmt(x.r)} ${x.label}`).join(' = ')}`);
    };
    $('v').addEventListener('input', calc);
    $('f').addEventListener('change', calc);
    $('res').addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      $('v').value = b.querySelector('b').textContent.replace(/,/g, ''); s.f = b.dataset.k; $('f').value = s.f; calc();
    });
    wireSeg(el, (n, v) => { s.c = v; s.f = ''; fillFrom(); calc(); });
    fillFrom(); calc();
  },
};
