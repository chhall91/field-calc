import { INCH_SOCKETS, METRIC_SOCKETS, SOCKET_SOURCES } from '../data/sockets.js';
import { fracToIn, IN_MM, findBySocket, parseSocket, INCH_TYPES, METRIC_TYPES } from '../lib/sockets.js';
import { seg, wireSeg, esc } from '../ui.js';

const inMm = (frac) => `${(fracToIn(frac) * IN_MM).toFixed(1)} mm`;
const mmIn = (mm) => `${(mm / IN_MM).toFixed(3).replace(/^0/, '')}"`;

function row(label, val, sub, flag) {
  return `<div class="srow ${flag ? 'flag' : ''}"><span>${label}</span><b>${val}</b><em>${sub}${flag ? ` · <strong>${flag}</strong>` : ''}</em></div>`;
}

export default {
  id: 'socket', title: 'Bolt → Socket', icon: '🔧', desc: 'Socket size for bolt heads & nuts · reverse lookup', featured: true,
  render(el, state, ctx) {
    const s = { mode: state.mode || 'bolt', sys: state.sys || 'inch', hx: state.hx || 'std', size: state.size || '', q: state.q ?? '', u: state.u || 'in' };
    el.innerHTML = `
      <div class="card">${seg('mode', [['bolt', 'Bolt → Socket'], ['rev', 'Socket → Bolt']], s.mode)}</div>
      <div id="body"></div>
      <div class="card info small"><h3>Sources (cross-checked, ≥2 each)</h3><ul>${SOCKET_SOURCES.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <p>Sizes are nominal (basic/max) width across flats. Always confirm fit on the actual part. Reference only — follow site procedures.</p></div>`;
    const body = el.querySelector('#body');
    wireSeg(el.querySelector('.card'), (n, v) => { s.mode = v; draw(); });

    const drawBolt = () => {
      const inch = s.sys === 'inch';
      const list = inch ? INCH_SOCKETS : METRIC_SOCKETS;
      if (!list.some((r) => r.size === s.size)) s.size = inch ? '1/2' : 'M12';
      body.innerHTML = `
        <div class="card">
          ${seg('sys', [['inch', 'Inch'], ['metric', 'Metric']], s.sys)}
          ${seg('hx', [['std', 'Standard hex'], ['heavy', 'Heavy hex']], s.hx)}
          <div class="chips scroll" id="chips">${list.map((r) => `<button type="button" class="chip ${r.size === s.size ? 'on' : ''}" data-size="${esc(r.size)}">${esc(r.size)}${inch ? '"' : ''}</button>`).join('')}</div>
        </div>
        <div class="card result" id="res"></div>`;
      wireSeg(body, (n, v) => { s[n] = v; if (n === 'sys') s.size = ''; drawBolt(); });
      body.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => { s.size = b.dataset.size; drawBolt(); }));
      const on = body.querySelector('#chips .chip.on');
      if (on) { const c = body.querySelector('#chips'); c.scrollLeft = on.offsetLeft - c.clientWidth / 2 + on.clientWidth / 2; }
      const r = list.find((x) => x.size === s.size);
      const res = body.querySelector('#res');
      let html = '', summary = '';
      if (inch) {
        if (s.hx === 'std') {
          const differs = r.hexNut !== r.hexHead;
          html = `<div class="big-label">${esc(r.size)}" · standard hex</div>
            <div class="big-num">${esc(r.hexHead)}" <span class="unit">head</span></div>
            <div class="srows">
              ${row('Bolt / cap screw head', `${esc(r.hexHead)}"`, inMm(r.hexHead))}
              ${row('Hex nut', `${esc(r.hexNut)}"`, inMm(r.hexNut), differs ? 'differs from head' : '')}
              ${row('Hex jam nut', `${esc(r.hexNut)}"`, `${inMm(r.hexNut)} · same as hex nut`)}
            </div>
            ${r.d > 1.5 ? '<p class="hint">Finished hex nuts above 1-1/2" are rarely stocked — large bolting normally uses heavy hex nuts (switch to Heavy hex).</p>' : ''}
            ${r.size === '9/16' ? '<p class="hint">9/16" is a cap-screw size (no B18.2.1 hex bolt).</p>' : ''}`;
          summary = `${r.size}" std hex: head ${r.hexHead}", nut ${r.hexNut}"`;
        } else {
          const rows = [];
          if (r.heavyHead) rows.push(row('Heavy hex bolt / screw head', `${esc(r.heavyHead)}"`, inMm(r.heavyHead)));
          if (r.structural) rows.push(row('Structural bolt A325/A490', `${esc(r.structural)}"`, `${inMm(r.structural)} · ASME B18.2.6`));
          rows.push(row('Heavy hex nut', `${esc(r.heavyNut)}"`, inMm(r.heavyNut), r.heavyHead && r.heavyNut !== r.heavyHead ? 'differs from head' : ''));
          rows.push(row('Heavy hex jam nut', `${esc(r.heavyNut)}"`, `${inMm(r.heavyNut)} · same as heavy nut`));
          const big = r.heavyHead || r.heavyNut;
          html = `<div class="big-label">${esc(r.size)}" · heavy hex</div>
            <div class="big-num">${esc(big)}" <span class="unit">${r.heavyHead ? 'head & nut' : 'nut'}</span></div>
            <div class="srows">${rows.join('')}</div>
            ${!r.heavyHead ? '<p class="hint">No heavy hex bolt/screw head is standardized at this size — heavy hex nut only.</p>' : ''}
            ${r.d > 3 ? '<p class="hint">Above 3" the head values are from the ASME B18.2.1 heavy hex <i>screw</i> table (heavy hex bolts are tabulated to 3").</p>' : ''}
            ${r.d <= 1.5 && r.d >= 0.5 ? `<p class="hint">Mixed hardware: a standard hex bolt (${esc(r.hexHead)}") with a heavy hex nut (${esc(r.heavyNut)}") is common — two different sockets.</p>` : ''}`;
          summary = `${r.size}" heavy hex: head ${r.heavyHead ?? '—'}", nut ${r.heavyNut}"`;
        }
      } else if (s.hx === 'std') {
        html = `<div class="big-label">${esc(r.size)} · standard hex</div>
          <div class="big-num">${r.iso} mm${r.din ? ` <span class="unit">ISO · ${r.din} DIN</span>` : ''}</div>
          <div class="srows">
            ${row('Bolt head ISO 4014/4017', `${r.iso} mm`, mmIn(r.iso))}
            ${row('Nut ISO 4032 · jam ISO 4035', `${r.iso} mm`, mmIn(r.iso))}
            ${r.din ? row('Bolt DIN 931/933 · nut DIN 934/439', `${r.din} mm`, mmIn(r.din), 'older DIN size differs') : ''}
          </div>
          ${r.din ? '<p class="hint">Older DIN hardware is still common at this size — check which you have.</p>' : ''}`;
        summary = `${r.size}: ${r.iso} mm ISO${r.din ? `, ${r.din} mm DIN` : ''}`;
      } else {
        const rows = [];
        if (r.asmeHeavyBolt) rows.push(row('Structural bolt B18.2.3.7M (A325M)', `${r.asmeHeavyBolt} mm`, mmIn(r.asmeHeavyBolt)));
        if (r.asmeHeavyNut) rows.push(row('Heavy hex nut B18.2.4.6M', `${r.asmeHeavyNut} mm`, mmIn(r.asmeHeavyNut)));
        if (r.hv) rows.push(row('HV bolt & nut EN 14399-4', `${r.hv} mm`, mmIn(r.hv), r.asmeHeavyNut && r.hv !== r.asmeHeavyNut ? 'differs from ASME' : ''));
        const big = r.asmeHeavyBolt || r.asmeHeavyNut || r.hv;
        html = `<div class="big-label">${esc(r.size)} · heavy hex</div>
          ${big ? `<div class="big-num">${big} mm</div><div class="srows">${rows.join('')}</div>`
            : '<div class="big-num muted">—</div><p class="hint">No metric heavy hex series is standardized at this size in ASME B18.2.3.7M/B18.2.4.6M or EN 14399-4. Standard ISO size: ' + r.iso + ' mm.</p>'}`;
        summary = `${r.size} heavy hex: ${rows.length ? [r.asmeHeavyBolt && `A325M ${r.asmeHeavyBolt}`, r.asmeHeavyNut && `nut ${r.asmeHeavyNut}`, r.hv && `HV ${r.hv}`].filter(Boolean).join(', ') + ' mm' : 'n/a'}`;
      }
      res.innerHTML = html;
      ctx.update({ mode: 'bolt', sys: s.sys, hx: s.hx, size: s.size }, summary);
    };

    const drawRev = () => {
      body.innerHTML = `
        <div class="card">
          <label class="field big"><span class="lbl">Socket / wrench size</span>
            <div class="row"><input type="text" inputmode="decimal" id="q" autocomplete="off" value="${esc(s.q)}" placeholder="${s.u === 'in' ? '1-1/2' : '36'}">
            ${seg('u', [['in', 'inch'], ['mm', 'mm']], s.u)}</div></label>
          <p class="hint">Fractions OK (1-7/16). Add “mm” or “"” to override the unit.</p>
        </div>
        <div id="rres"></div>`;
      const q = body.querySelector('#q');
      const run = () => {
        s.q = q.value;
        const mm = parseSocket(s.q, s.u);
        const out = body.querySelector('#rres');
        if (!(mm > 0)) { out.innerHTML = '<div class="card"><p class="hint">Enter a socket size to see which bolt heads and nuts it fits.</p></div>'; ctx.update({ mode: 'rev', u: s.u }, null); return; }
        const { exact, near } = findBySocket(mm);
        const label = `${s.q.trim()}${/mm|"|in/.test(s.q) ? '' : s.u === 'in' ? '"' : ' mm'}`;
        const item = (e, extra = '') => `<li><b>${esc(e.size)}</b><span>${esc(e.label)}</span><em>${esc(e.af)}${extra}</em></li>`;
        out.innerHTML = `
          <div class="card result"><div class="big-label">${esc(label)} = ${mm.toFixed(2)} mm = ${mmIn(mm)}</div>
            <h3 class="mt">Fits (${exact.length})</h3>
            ${exact.length ? `<ul class="fits">${exact.map((e) => item(e)).join('')}</ul>` : '<p class="hint">No standard bolt head or nut uses exactly this size.</p>'}
          </div>
          ${near.length ? `<div class="card"><h3>Loose — other system (≤0.5 mm oversize)</h3>
            <ul class="fits loose">${near.map((e) => item(e, ` · socket +${e.diffMm.toFixed(2)} mm`)).join('')}</ul>
            <p class="hint">A socket that is even slightly oversize can round off the corners, especially at high torque. Use the correct size where possible.</p></div>` : ''}`;
        ctx.update({ mode: 'rev', q: s.q, u: s.u }, `${label} socket fits: ${exact.slice(0, 4).map((e) => `${e.size} ${e.type}`).join(', ') || 'none'}`);
      };
      q.addEventListener('input', run);
      wireSeg(body, (n, v) => { s.u = v; q.placeholder = v === 'in' ? '1-1/2' : '36'; run(); });
      run();
    };
    const draw = () => (s.mode === 'rev' ? drawRev() : drawBolt());
    draw();
  },
};
