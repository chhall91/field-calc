// Shackle & eye bolt reference (Crosby). Data + sources: src/data/rigging.js
import { SHACKLES, SHACKLE_SIDE, EYEBOLT } from '../data/rigging.js';
import { shackleSidePct, eyeboltPct } from '../lib/rigging.js';
import { parseNumber } from '../lib/fraction.js';
import { fmt } from '../lib/units.js';
import { seg, wireSeg, esc, rigBanner, numField, RIG_FINE } from '../ui.js';

const T_LB = 2204.62; // metric tonne → lb

export default {
  id: 'hardware', title: 'Shackles & Eyebolts', icon: '🧷', desc: 'WLL, side-load, angle', group: 'rigging', isNew: true,
  render(el, state, ctx) {
    const s = { ty: state.ty === 'eye' ? 'eye' : 'shk', sel: state.sel || '', ang: state.ang ?? '', wll: state.wll ?? '' };
    const draw = () => {
      el.innerHTML = `${rigBanner()}<div class="card">${seg('ty', [['shk', 'Anchor shackles'], ['eye', 'Shoulder eye bolts']], s.ty)}</div>` + (s.ty === 'shk' ? `
        <div id="sel"></div>
        <div class="card flush"><h3 class="pad">Crosby G-209 screw pin / G-2130 bolt type</h3><div class="tbl-wrap"><table class="tbl" id="tbl">
          <thead><tr><th>Nominal size</th><th>WLL (t)</th><th>≈ lb</th></tr></thead>
          <tbody>${SHACKLES.map((r) => `<tr data-size="${esc(r.size)}" class="${r.size === s.sel ? 'sel' : ''}"><td><b>${esc(r.size)}"</b>${r.boltOnly ? ' <small>G-2130 only ⚑</small>' : ''}</td><td class="num">${fmt(r.t, 2)}</td><td>${Math.round(r.t * T_LB).toLocaleString('en-US')}</td></tr>`).join('')}</tbody>
        </table></div><p class="hint pad">WLL in metric tonnes as stamped on Crosby shackles (6:1 design factor). Tap a size. ⚑ 3"–4" confirmed in the Crosby catalog only.</p><div class="pad"></div></div>
        <div class="card info"><h3>Side loading (Crosby screw pin & bolt type, 3/16"–3")</h3>
          <table class="tbl"><thead><tr><th>Angle from in-line</th><th>% of WLL</th></tr></thead><tbody>
          ${SHACKLE_SIDE.map(([a, p], i) => `<tr><td>${i ? SHACKLE_SIDE[i - 1][0] + 1 : 0}°–${a}°</td><td class="num">${p}%</td></tr>`).join('')}</tbody></table>
          <p><b>Never side-load round pin shackles.</b> Other brands may differ — use the manufacturer’s data. Load must be centered in the bow; pin fully engaged / nut & cotter installed.</p>
          <p class="fine">Source: Crosby 2022 catalog (G-209 p.24, G-2130 p.26, Warnings & Application Instructions); G-209 spec sheet. ${esc(RIG_FINE)}</p></div>` : `
        <div class="card">
          <div class="row gap">${numField('ang', 'Angle of pull from in-line (°)', s.ang, 'e.g. 30')}${numField('wll', 'Rated WLL (from tag)', s.wll, 'optional')}</div>
          <div id="eyeout"></div>
        </div>
        <div class="card info"><h3>Crosby G-277 shoulder eye bolts</h3>
          <table class="tbl"><thead><tr><th>Direction of pull (from in-line)</th><th>% of rated WLL</th></tr></thead><tbody>
          ${EYEBOLT.map(([a, p]) => `<tr><td>${a === 5 ? 'In-line (≤5°)' : a + '°'}</td><td class="num">${p}%</td></tr>`).join('')}</tbody></table>
          <ul><li><b>Plain (non-shoulder) eye bolts: in-line (vertical) loading only.</b></li>
          <li>Shoulder must be flush/seated on the load; pull in the plane of the eye; use shims so the eye aligns with the load.</li>
          <li>Angles between tabulated values: use the next larger angle (the app does this).</li>
          <li>Other brands, eye nuts and swivel hoist rings have their own ratings.</li></ul>
          <p class="fine">Source: Crosby 2022 catalog p.417 (eye bolt warnings); Crosby eye bolt safety information. ${esc(RIG_FINE)}</p></div>`);
      wireSeg(el, (k, v) => { s[k] = v; s.sel = ''; draw(); });
      if (s.ty === 'shk') {
        el.querySelector('#tbl').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-size]'); if (!tr) return; s.sel = tr.dataset.size; draw(); el.querySelector('#sel').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
        const r = SHACKLES.find((x) => x.size === s.sel);
        if (r) {
          el.querySelector('#sel').innerHTML = `<div class="card result"><div class="big-label">${esc(r.size)}" anchor shackle (Crosby)</div>
            <div class="big-num">${fmt(r.t, 2)}<span class="unit"> t WLL</span></div><div class="sub">≈ ${Math.round(r.t * T_LB).toLocaleString('en-US')} lb</div>
            <div class="row gap mt">${numField('ang', 'Side-load angle from in-line (°)', s.ang, 'optional')}</div><div id="side"></div></div>`;
          const upd = () => {
            const noTbl = r.boltOnly && r.size !== '3';
            const a = parseNumber(s.ang), p = s.ang === '' || noTbl ? null : shackleSidePct(a);
            el.querySelector('#side').innerHTML = s.ang === '' ? '' : noTbl ? '<p class="hint">Crosby side-load table covers 3/16"–3" only — contact the manufacturer.</p>' : p == null ? '<p class="hint">Enter 0–90°.</p>'
              : `<div class="kv"><div><span>Reduced WLL</span><b>${fmt(r.t * p / 100, 2)} t</b><em>${p}% at ${fmt(a, 0)}° · ≈ ${Math.round(r.t * p / 100 * T_LB).toLocaleString('en-US')} lb</em></div></div>`;
            ctx.update({ ...s }, `${r.size}" Crosby anchor shackle WLL ${fmt(r.t, 2)} t${p != null ? `; ${fmt(a, 0)}° side load → ${fmt(r.t * p / 100, 2)} t (${p}%)` : ''}`);
          };
          const i = el.querySelector('#ang'); i.addEventListener('input', () => { s.ang = i.value.trim(); upd(); }); upd();
        } else ctx.update({ ...s }, null);
      } else {
        const upd = () => {
          const a = parseNumber(s.ang), w = parseNumber(s.wll), p = s.ang === '' ? null : eyeboltPct(a);
          el.querySelector('#eyeout').innerHTML = s.ang === '' ? '<p class="hint">Enter the pull angle measured from the bolt axis (0° = straight in line).</p>'
            : p == null ? '<p class="hint">Enter 0–90°.</p>'
              : `<div class="big-num">${p}<span class="unit">% of WLL</span></div>${w > 0 ? `<div class="sub">Reduced WLL: <b>${fmt(w * p / 100, 2)}</b> (same units as tag WLL)</div>` : ''}`;
          ctx.update({ ...s }, p != null ? `Shoulder eye bolt @ ${fmt(a, 0)}° → ${p}% WLL${w > 0 ? ` = ${fmt(w * p / 100, 2)} of ${fmt(w, 2)}` : ''} (Crosby G-277)` : null);
        };
        el.querySelectorAll('#ang, #wll').forEach((i) => i.addEventListener('input', () => { s[i.id] = i.value.trim(); upd(); }));
        upd();
      }
    };
    draw();
  },
};
