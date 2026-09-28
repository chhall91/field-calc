import { wrenchSetting, actualTorque, effectiveLength } from '../lib/torque.js';
import { parseNumber } from '../lib/fraction.js';
import { fmt } from '../lib/units.js';
import { seg, wireSeg, esc } from '../ui.js';

const TU = { ftlb: 'ft·lb', inlb: 'in·lb', Nm: 'N·m' };

function diagram(L, E, ang) {
  // wrench along +x from the drive (origin) back to the grip; adapter from drive at angle.
  const W = 300, H = 150, s = 170 / Math.max(L + Math.abs(E), 1);
  const ox = 90, oy = 75;
  const gx = ox + L * s; // grip to the right
  const r = (ang * Math.PI) / 180;
  const ax = ox - E * s * Math.cos(r), ay = oy - E * s * Math.sin(r); // adapter points left at 0°
  return `<svg viewBox="0 0 ${W} ${H}" class="diagram" role="img" aria-label="Wrench and adapter diagram">
    <line x1="${ox}" y1="${oy}" x2="${gx}" y2="${oy}" class="d-wrench"/>
    <rect x="${gx - 22}" y="${oy - 9}" width="44" height="18" rx="6" class="d-grip"/>
    <line x1="${ox}" y1="${oy}" x2="${ax}" y2="${ay}" class="d-adapter"/>
    <circle cx="${ox}" cy="${oy}" r="6" class="d-drive"/>
    <circle cx="${ax}" cy="${ay}" r="9" class="d-nut"/>
    <text x="${(ox + gx) / 2}" y="${oy + 26}" class="d-txt" text-anchor="middle">L</text>
    <text x="${(ox + ax) / 2}" y="${(oy + ay) / 2 - 10}" class="d-txt" text-anchor="middle">E</text>
    <text x="${ox + 10}" y="${oy - 12}" class="d-txt small">${esc(ang)}°</text>
  </svg>`;
}

export default {
  id: 'adapter', title: 'Extension / Crow’s Foot', icon: '📐', desc: 'Wrench setting with adapter',
  render(el, state, ctx) {
    const s = { t: state.t ?? '', tu: state.tu || 'ftlb', L: state.L ?? '', E: state.E ?? '', lu: state.lu || 'in', a: state.a ?? '0', rw: state.rw ?? '' };
    el.innerHTML = `
      <div class="card">
        <label class="field"><span class="lbl">Desired torque at fastener (T<sub>a</sub>)</span>
          <div class="row"><input type="text" inputmode="decimal" id="t" value="${esc(s.t)}" placeholder="e.g. 100">
          ${seg('tu', Object.entries(TU), s.tu)}</div></label>
        <div class="row gap">
          <label class="field grow"><span class="lbl">Wrench length (L)</span><input type="text" inputmode="decimal" id="L" value="${esc(s.L)}" placeholder="e.g. 12"></label>
          <label class="field grow"><span class="lbl">Adapter length (E)</span><input type="text" inputmode="decimal" id="E" value="${esc(s.E)}" placeholder="e.g. 2"></label>
        </div>
        ${seg('lu', [['in', 'inches'], ['mm', 'mm']], s.lu)}
        <span class="lbl mt">Adapter angle to wrench</span>
        <div class="row">${seg('a', [['0', '0° inline'], ['90', '90°'], ['180', '180° back']], ['0', '90', '180'].includes(s.a) ? s.a : '')}
          <input type="text" inputmode="decimal" id="a" class="narrow" value="${esc(s.a)}" aria-label="Angle in degrees"></div>
      </div>
      <div class="card result" id="out"></div>
      <div class="card">
        <h3>Check: wrench reading → actual torque</h3>
        <label class="field"><span class="lbl">Wrench reading (T<sub>w</sub>)</span><input type="text" inputmode="decimal" id="rw" value="${esc(s.rw)}" placeholder="reading"></label>
        <div id="rout" class="big-num small"></div>
      </div>
      <div class="card info">
        <h3>How it works</h3><div id="diag"></div>
        <p><b>T<sub>w</sub> = T<sub>a</sub> × L / (L + E·cos θ)</b> — inline (θ = 0°) this is the standard
          <b>T<sub>w</sub> = T<sub>a</sub> × L / (L + E)</b>.</p>
        <ul>
          <li><b>L</b>: center of the wrench drive to the center of the hand grip (the load point / pivot mark on the handle).</li>
          <li><b>E</b>: center of the wrench drive to the center of the fastener, measured along the adapter.</li>
          <li>At 90° the adapter adds no length — set the wrench to the desired torque.</li>
          <li>Push/pull at 90° to the handle, on the grip mark. Plain socket extensions in line with the drive axis do not change torque.</li>
        </ul>
      </div>`;
    const $ = (id) => el.querySelector('#' + id);
    const calc = () => {
      const Ta = parseNumber($('t').value), L = parseNumber($('L').value), E = parseNumber($('E').value) || 0;
      const a = parseNumber($('a').value) || 0;
      s.t = $('t').value; s.L = $('L').value; s.E = $('E').value; s.a = $('a').value; s.rw = $('rw').value;
      const out = $('out');
      const lu = s.lu, tu = TU[s.tu];
      const diag = diagram(isFinite(L) && L > 0 ? L : 12, isFinite(E) ? E : 2, a);
      $('diag').innerHTML = diag;
      if (!(isFinite(Ta) && isFinite(L) && L > 0)) {
        out.innerHTML = `<div class="big-label">Wrench setting</div><div class="big-num muted">—</div><p class="hint">Enter desired torque, wrench length and adapter length.</p>`;
      } else {
        const Tw = wrenchSetting(Ta, L, E, a);
        const eff = effectiveLength(L, E, a);
        if (!isFinite(Tw)) {
          out.innerHTML = `<div class="big-label">Wrench setting</div><div class="big-num warn">Invalid</div><p class="hint">Effective length L + E·cosθ must be positive.</p>`;
        } else {
          out.innerHTML = `<div class="big-label">Set wrench to</div>
            <div class="big-num">${fmt(Tw, Tw < 100 ? 1 : 0)} <span class="unit">${tu}</span></div>
            <div class="sub">for ${fmt(Ta)} ${tu} at the fastener · effective length ${fmt(eff, 2)} ${lu} · ratio ${fmt(L / eff, 4)}</div>
            ${a % 180 === 90 ? '<p class="hint">At 90° no correction is needed.</p>' : ''}`;
          ctx.update({ ...s }, `${fmt(Ta)} ${tu}, L ${fmt(L)} ${lu}, E ${fmt(E)} ${lu} @ ${fmt(a)}° → set ${fmt(Tw, 1)} ${tu}`);
        }
      }
      const Tr = parseNumber($('rw').value);
      $('rout').innerHTML = isFinite(Tr) && isFinite(L) && L > 0
        ? (isFinite(actualTorque(Tr, L, E, a)) ? `Actual at fastener: <b>${fmt(actualTorque(Tr, L, E, a), 1)} ${tu}</b>` : 'Invalid geometry') : '';
    };
    el.querySelectorAll('input').forEach((i) => i.addEventListener('input', () => {
      if (i.id === 'a') el.querySelectorAll('[data-seg="a"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === i.value));
      calc();
    }));
    wireSeg(el, (name, v) => { if (name === 'a') $('a').value = v; else s[name] = v; calc(); });
    calc();
  },
};
