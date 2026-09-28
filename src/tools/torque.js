import { CATEGORIES, convert, fmt } from '../lib/units.js';
import { parseNumber } from '../lib/fraction.js';

const U = CATEGORIES.torque.units;

export default {
  id: 'torque', title: 'Torque Units', icon: '🔄', desc: 'ft·lb · in·lb · N·m · kgf·m',
  render(el, state, ctx) {
    el.innerHTML = `
      <div class="card">
        ${Object.entries(U).map(([k, u]) => `
          <label class="field big"><span class="lbl">${u.label}</span>
            <input type="text" inputmode="decimal" autocomplete="off" data-u="${k}" placeholder="0" aria-label="${u.label}"></label>`).join('')}
        <p class="hint">Type in any box — the others update live.</p>
      </div>
      <div class="card">
        <h3>Quick facts</h3>
        <table class="tbl"><tbody>
          <tr><td>1 ft·lb</td><td>12 in·lb · 1.3558 N·m</td></tr>
          <tr><td>1 N·m</td><td>0.7376 ft·lb · 8.8507 in·lb</td></tr>
          <tr><td>1 kgf·m</td><td>9.80665 N·m · 7.2330 ft·lb</td></tr>
        </tbody></table>
      </div>`;
    const inputs = [...el.querySelectorAll('input[data-u]')];
    const update = (src) => {
      const from = src.dataset.u;
      const v = parseNumber(src.value);
      for (const i of inputs) if (i !== src) i.value = isFinite(v) ? fmt(convert(v, from, i.dataset.u, 'torque')) : '';
      if (isFinite(v)) {
        const parts = inputs.filter((i) => i !== src).map((i) => `${i.value} ${U[i.dataset.u].label}`);
        ctx.update({ v: src.value, u: from }, `${src.value} ${U[from].label} = ${parts.join(' = ')}`);
      }
    };
    inputs.forEach((i) => i.addEventListener('input', () => update(i)));
    const start = inputs.find((i) => i.dataset.u === (state.u || 'ftlb'));
    if (state.v) { start.value = state.v; update(start); }
  },
};
