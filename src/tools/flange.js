// ASME B16.5 flange reference: bolting, stud lengths, nut socket, P-T rating and cross-pattern diagram.
import { FLANGE_CLASSES, PT_GROUPS, FLANGE_SOURCES } from '../data/flanges.js';
import { flangeLookup, npsList, ptRating, starPattern } from '../lib/flange.js';
import { tempToC, cToTemp, fmt } from '../lib/units.js';
import { seg, wireSeg, esc } from '../ui.js';

const q = (o) => new URLSearchParams(o).toString();

function starSvg(n) {
  const p = starPattern(n); if (!p) return '';
  const W = 300, cx = 150, cy = 150, R = 118, rb = n > 16 ? 13 : 16;
  const bolts = p.map((num, i) => {
    const a = (-90 + (360 / n) * (i + 0.5)) * Math.PI / 180; // bolts straddle the centerline (B16.5)
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rb}" class="${num === 1 ? 'st-b st-first' : 'st-b'}"/><text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle" class="st-n">${num}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${W}" class="diagram star" role="img" aria-label="${n}-bolt cross tightening pattern">
    <circle cx="${cx}" cy="${cy}" r="142" class="st-od"/><circle cx="${cx}" cy="${cy}" r="${R}" class="st-bc"/><circle cx="${cx}" cy="${cy}" r="70" class="st-bore"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="d-txt">${n} bolts</text><text x="${cx}" y="${cy + 16}" text-anchor="middle" class="d-txt small">tighten 1→${n}</text>
    ${bolts}</svg>`;
}

export default {
  id: 'flange', title: 'Flange Reference', icon: '⭕', desc: 'B16.5 bolts, studs, P-T', group: 'piping', isNew: true,
  render(el, state, ctx) {
    const s = { cls: FLANGE_CLASSES.includes(+state.cls) ? String(+state.cls) : '150', nps: state.nps || '4', grp: PT_GROUPS[state.grp] ? state.grp : '1.1', temp: state.temp ?? '100', tu: state.tu === 'C' ? 'C' : 'F' };
    const draw = () => {
      const list = npsList(s.cls);
      if (!list.includes(s.nps)) s.nps = list.includes('4') ? '4' : list[0];
      const f = flangeLookup(s.nps, s.cls);
      const rtjNote = s.cls === '400' ? ' <em class="flag">single source</em>' : '';
      el.innerHTML = `
        <div class="card">
          <span class="lbl">Pressure class</span>
          <div class="chips" id="cls">${FLANGE_CLASSES.map((c) => `<button type="button" class="chip ${String(c) === s.cls ? 'on' : ''}" data-cls="${c}">${c}</button>`).join('')}</div>
          <span class="lbl mt">Nominal pipe size (NPS)</span>
          <div class="chips scroll" id="nps">${list.map((n) => `<button type="button" class="chip ${n === s.nps ? 'on' : ''}" data-nps="${esc(n)}">${esc(n)}"</button>`).join('')}</div>
        </div>
        <div class="card result" id="res">
          <div class="big-label">NPS ${esc(f.nps)}" · Class ${f.cls} · ASME B16.5</div>
          <div class="big-num">${f.bolts} × ${esc(f.dia)}<span class="unit">" studs</span></div>
          <div class="kv">
            <div><span>Stud length RF</span><b>${esc(f.rf)}"</b></div>
            <div><span>Stud length RTJ</span><b>${f.rtj ? esc(f.rtj) + '"' : '—'}</b>${f.rtj ? rtjNote : '<em>not listed for this size</em>'}</div>
            <div><span>Heavy hex nut socket</span><b>${f.nutSocket ? esc(f.nutSocket) + '"' : '—'}</b><em>ASME B18.2.2 heavy nut</em></div>
            <div><span>Bolt circle</span><b>${esc(f.bc)}"</b></div>
            <div><span>Flange OD</span><b>${esc(f.od)}"</b></div>
            <div><span>Raised face</span><b>${esc(f.rfHeight)}"</b><em>${f.cls <= 300 ? 'included in RF stud length' : 'Cl. 400+ RF 1/4" included'}</em></div>
          </div>
          <div class="linkrow">
            <a class="btn-link" href="#/t/socket?${q({ mode: 'bolt', sys: 'inch', hx: 'heavy', size: f.dia })}">🔧 Socket details</a>
            <a class="btn-link" href="#/t/bolt?${q({ sys: 'sae', sel: f.dia })}">🔩 Torque chart</a>
            <a class="btn-link" href="#/t/adapter">📐 Crow’s foot</a>
          </div>
          <p class="hint">Use ☆ / “Save to job” (top bar) to keep this flange with your job. Torque values for B7 studs come from your procedure/spec — the chart link is for SAE grades.</p>
        </div>
        <div class="card">
          <h3>Pressure–temperature rating</h3>
          ${seg('grp', Object.entries(PT_GROUPS).map(([k]) => [k, k === '1.1' ? 'Group 1.1 CS' : 'Group 2.2 SS316']), s.grp)}
          <div class="big-num">${f.bolts} × ${esc(f.dia)}<span class="unit">" studs</span></div>
          <div class="kv">
            <div><span>Stud length RF</span><b>${esc(f.rf)}"</b></div>
            <div><span>Stud length RTJ</span><b>${f.rtj ? esc(f.rtj) + '"' : '—'}</b>${f.rtj ? rtjNote : '<em>not listed for this size</em>'}</div>
            <div><span>Heavy hex nut socket</span><b>${f.nutSocket ? esc(f.nutSocket) + '"' : '—'}</b><em>ASME B18.2.2 heavy nut</em></div>
            <div><span>Bolt circle</span><b>${esc(f.bc)}"</b></div>
            <div><span>Flange OD</span><b>${esc(f.od)}"</b></div>
            <div><span>Raised face</span><b>${esc(f.rfHeight)}"</b><em>${f.cls <= 300 ? 'included in RF stud length' : 'Cl. 400+ RF 1/4" included'}</em></div>
          </div>
          <div class="linkrow">
            <a class="btn-link" href="#/t/socket?${q({ mode: 'bolt', sys: 'inch', hx: 'heavy', size: f.dia })}">🔧 Socket details</a>
            <a class="btn-link" href="#/t/bolt?${q({ sys: 'sae', sel: f.dia })}">🔩 Torque chart</a>
            <a class="btn-link" href="#/t/adapter">📐 Crow’s foot</a>
          </div>
          <p class="hint">Use ☆ / “Save to job” (top bar) to keep this flange with your job. Torque values for B7 studs come from your procedure/spec — the chart link is for SAE grades.</p>
        </div>
        <div class="card">
          <h3>Pressure–temperature rating</h3>
          ${seg('grp', Object.entries(PT_GROUPS).map(([k]) => [k, k === '1.1' ? 'Group 1.1 CS' : 'Group 2.2 SS316']), s.grp)}
          <p class="hint">${esc(PT_GROUPS[s.grp].label)}</p>
          <div class="row gap mt"><label class="field grow"><span class="lbl">Design temperature</span><input type="text" inputmode="decimal" id="temp" value="${esc(s.temp)}" placeholder="e.g. 400"></label>
          ${seg('tu', [['F', '°F'], ['C', '°C']], s.tu)}</div>
          <div id="pt"></div>
          <p class="hint">From B16.5 (2013/2017) tables via public reproductions. ${s.grp === '2.2' ? '650°F and 700°F rows omitted — published sources disagree; the next higher row (750°F) is used.' : 'Carbon steel: prolonged use above 800°F not recommended (graphitization).'} Ratings are for the flange; gasket and bolting may limit further.</p>
        </div>
        <div class="card">
          <h3>Cross tightening pattern</h3>
          ${starSvg(f.bolts)}
          <p class="hint">Numbers are placed clockwise; tighten in numeric order (1, 2, 3…) in several passes (e.g. 30% → 60% → 100%), then check passes in rotation until nuts stop turning. Legacy cross pattern per ASME PCC-1 style charts (flangeboltchart.com, single source) — <b>your site procedure / PCC-1 governs</b>.</p>
        </div>
        <div class="card info"><h3>Notes</h3><ul>
          <li>Stud lengths are B16.5 thread-to-thread (points excluded). Some suppliers (e.g. Weldbend/Cooney Brothers) publish different lengths — check your job spec.</li>
          <li>Class 400 NPS ½–3½ uses Class 600 dimensions; Class 900 NPS ½–2½ equals Class 1500.</li>
          <li>Class 400 RTJ stud lengths: single public source (flangeboltchart.com) — verify.</li>
          <li>Class 900 NPS 16 bolt circle 24-1/4" (Texas Flange, Unified Alloys, Cooney); one chart shows 24-1/2".</li>
          <li>NPS 22 (MSS SP-44) and B16.47 (26"+) are not included.</li>
        </ul><p class="fine">Sources: ${FLANGE_SOURCES.map(esc).join(' · ')}</p></div>`;
      const on = el.querySelector('#nps .chip.on'); if (on) { const c = el.querySelector('#nps'); c.scrollLeft = on.offsetLeft - c.clientWidth / 2 + on.clientWidth / 2; }
      el.querySelector('#cls').addEventListener('click', (e) => { const b = e.target.closest('[data-cls]'); if (b) { s.cls = b.dataset.cls; draw(); } });
      el.querySelector('#nps').addEventListener('click', (e) => { const b = e.target.closest('[data-nps]'); if (b) { s.nps = b.dataset.nps; draw(); } });
      wireSeg(el, (k, v) => { s[k] = v; draw(); });
      const t = el.querySelector('#temp');
      t.addEventListener('input', () => { s.temp = t.value.trim(); ptUpdate(f); });
      ptUpdate(f);
    };
    const ptUpdate = (f) => {
      const tNum = parseFloat(s.temp);
      const tF = Number.isFinite(tNum) ? Math.round((s.tu === 'C' ? cToTemp(tNum, 'F') : tNum) * 10) / 10 : NaN;
      const pt = Number.isFinite(tF) ? ptRating(s.grp, s.cls, tF) : null;
      el.querySelector('#pt').innerHTML = pt && pt.psig != null ? `<div class="big-num">${pt.psig}<span class="unit"> psig</span></div>
            <div class="sub">${fmt(pt.bar, 1)} bar · Class ${s.cls} at ${pt.rowF}°F (${fmt(tempToC(pt.rowF, 'F'), 0)}°C) row${pt.rowF !== tF ? ' — next higher tabulated temperature used (conservative)' : ''}</div>`
        : `<p class="hint">${esc(pt?.reason || 'Enter a temperature (−20°F and up).')}</p>`;
      const ptTxt = pt && pt.psig != null ? `; Grp ${s.grp} ${pt.psig} psig @ ${pt.rowF}°F` : '';
      ctx.update({ ...s }, `${f.nps}" Cl ${f.cls}: ${f.bolts} × ${f.dia}" studs, RF ${f.rf}"${f.rtj ? `, RTJ ${f.rtj}"` : ''}, BC ${f.bc}", OD ${f.od}", nut ${f.nutSocket}"${ptTxt}`);
    };
    draw();
  },
};
