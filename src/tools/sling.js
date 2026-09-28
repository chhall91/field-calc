// Sling angle / tension per leg calculator.
import { angleFromHL, loadAngleFactor, tensionPerLeg, effectiveLegs } from '../lib/rigging.js';
import { parseNumber } from '../lib/fraction.js';
import { fmt } from '../lib/units.js';
import { seg, wireSeg, esc, rigBanner, numField, RIG_FINE } from '../ui.js';

const WU = { lb: 'lb', kg: 'kg', ton: 'tons' };

function diagram(ang, legs) {
  const a = Math.min(Math.max(ang || 45, 5), 90) * Math.PI / 180;
  const W = 300, H = 150, by = 130; let hy = 20, dx = (by - hy) / Math.tan(a);
  if (dx > 135) { dx = 135; hy = by - 135 * Math.tan(a); }
  const cx = 150, lx = cx - dx, rx = cx + dx;
  const one = legs === 1;
  return `<svg viewBox="0 0 ${W} ${H}" class="diagram" role="img" aria-label="Sling angle diagram">
    <rect x="${Math.min(lx, cx - 20) - 10}" y="${by}" width="${Math.max(rx - lx, 40) + 20}" height="16" rx="3" class="d-grip"/>
    ${one ? `<line x1="${cx}" y1="${hy}" x2="${cx}" y2="${by}" class="d-adapter"/>` : `<line x1="${cx}" y1="${hy}" x2="${lx}" y2="${by}" class="d-adapter"/><line x1="${cx}" y1="${hy}" x2="${rx}" y2="${by}" class="d-adapter"/>
    <line x1="${lx}" y1="${by}" x2="${lx + 50}" y2="${by}" class="d-dash"/><text x="${lx + 24}" y="${by - 8}" class="d-txt small">${esc(fmt(ang, 1))}°</text>`}
    <circle cx="${cx}" cy="${hy}" r="7" class="d-drive"/>
  </svg>`;
}

export default {
  id: 'sling', title: 'Sling Angle', icon: '🔺', desc: 'Tension per leg', group: 'rigging', isNew: true,
  render(el, state, ctx) {
    const s = { w: state.w ?? '', wu: WU[state.wu] ? state.wu : 'lb', legs: ['1', '2', '3', '4'].includes(state.legs) ? state.legs : '2', m: state.m === 'hl' ? 'hl' : 'ang', a: state.a ?? '60', h: state.h ?? '', l: state.l ?? '' };
    el.innerHTML = `${rigBanner()}
      <div class="card">
        <label class="field"><span class="lbl">Load weight</span><div class="row"><input type="text" inputmode="decimal" id="w" value="${esc(s.w)}" placeholder="e.g. 4000">${seg('wu', Object.entries(WU), s.wu)}</div></label>
        <span class="lbl">Number of legs</span>${seg('legs', [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], s.legs)}
        <div id="angbox">
          <span class="lbl mt">Sling angle measured</span>${seg('m', [['ang', 'Angle from horizontal'], ['hl', 'Height H / Length L']], s.m)}
          <div class="row gap mt" id="angin"></div>
        </div>
      </div>
      <div id="out"></div>
      <div class="card info"><h3>How it works</h3><ul>
        <li>Tension per leg = (Load ÷ legs carrying) × load angle factor, where factor = 1 ÷ sin(angle from horizontal) = L ÷ H.</li>
        <li><b>3- and 4-leg slings: only 2 legs are assumed to carry the load</b> (common conservative practice), because legs rarely share equally. Note: some manufacturer bridle charts rate 3-/4-leg slings on 3 legs — use your site procedure.</li>
        <li>Assumes a symmetric pick with the hook over the center of gravity. For off-center loads use the CG / Load Share tool.</li>
        <li>Keep sling angles ≥ 45° where possible; <b>never below 30°</b> without engineering approval.</li>
      </ul><p class="fine">${esc(RIG_FINE)}</p></div>`;
    const $ = (id) => el.querySelector('#' + id);
    const drawInputs = () => {
      $('angbox').hidden = s.legs === '1';
      $('angin').innerHTML = s.m === 'ang' ? numField('a', 'Angle from horizontal (°)', s.a, 'e.g. 60')
        : numField('h', 'Height H (hook to load, vertical)', s.h, 'e.g. 5') + numField('l', 'Sling leg length L', s.l, 'e.g. 6');
      $('angin').querySelectorAll('input').forEach((i) => i.addEventListener('input', () => { s[i.id] = i.value.trim(); calc(); }));
    };
    const calc = () => {
      const W = parseNumber(s.w), legs = +s.legs;
      let ang = legs === 1 ? 90 : s.m === 'ang' ? parseNumber(s.a) : angleFromHL(parseNumber(s.h), parseNumber(s.l));
      const hlBad = legs > 1 && s.m === 'hl' && parseNumber(s.h) > parseNumber(s.l);
      if (!(W > 0) || !(ang > 0) || ang > 90) {
        $('out').innerHTML = `<div class="card"><p class="hint">${hlBad ? 'H cannot be longer than the leg length L.' : 'Enter the load and sling angle (0–90° from horizontal).'}</p></div>`;
        ctx.update({ ...s }, null); return;
      }
      const T = tensionPerLeg(W, legs, ang), laf = legs === 1 ? 1 : loadAngleFactor(ang), n = legs === 1 ? 1 : effectiveLegs(legs);
      const u = WU[s.wu];
      const warn = legs > 1 && ang < 30 ? `<div class="warnbox bad"><b>Angle below 30°.</b> Leg tension is ${fmt(laf, 2)}× the share per leg and rises steeply. Not recommended — use longer slings or a spreader/lifting beam (aim for 45°–60°).</div>`
        : legs > 1 && ang < 45 ? `<div class="warnbox">Angle below 45°: tension climbs quickly. Prefer 45°–60° or steeper.</div>` : '';
      $('out').innerHTML = `${warn}<div class="card result">
        <div class="big-label">Tension per leg</div>
        <div class="big-num ${ang < 30 && legs > 1 ? 'warn' : ''}">${fmt(T, T >= 100 ? 0 : 2)}<span class="unit"> ${u}</span></div>
        <div class="kv">
          <div><span>Load angle factor</span><b>${fmt(laf, 3)}</b><em>1 ÷ sin ${fmt(ang, 1)}°</em></div>
          <div><span>Sling angle</span><b>${fmt(ang, 1)}°</b><em>from horizontal</em></div>
          <div><span>Legs carrying load</span><b>${n}</b>${legs >= 3 ? `<em>of ${legs} (only 2 assumed)</em>` : ''}</div>
          ${legs > 1 ? `<div><span>Horizontal force per leg</span><b>${fmt(T * Math.cos(ang * Math.PI / 180), 0)} ${u}</b><em>compression on load / spreader</em></div>` : ''}
        </div>
        ${diagram(ang, legs)}
        <p class="hint">Choose slings and hardware rated for at least ${fmt(T, T >= 100 ? 0 : 2)} ${u} each at this angle (check the tag).</p></div>`;
      ctx.update({ ...s }, `${fmt(W, 2)} ${u}, ${legs}-leg @ ${fmt(ang, 1)}° → ${fmt(T, T >= 100 ? 0 : 2)} ${u}/leg (LAF ${fmt(laf, 3)}${legs >= 3 ? ', 2 legs assumed' : ''})`);
    };
    $('w').addEventListener('input', (e) => { s.w = e.target.value.trim(); calc(); });
    wireSeg(el, (k, v) => { s[k] = v; if (k === 'm' || k === 'legs') drawInputs(); calc(); });
    drawInputs(); calc();
  },
};
