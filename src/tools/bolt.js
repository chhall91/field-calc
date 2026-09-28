import { inchTorqueTable, metricTorqueTable, SAE_GRADES, METRIC_CLASSES, K_VALUES, BOLT_SOURCES } from '../data/bolts.js';
import { seg, wireSeg, esc, DISCLAIMER } from '../ui.js';

const r1 = (n) => (n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString('en-US'));

export default {
  id: 'bolt', title: 'Bolt Torque Chart', icon: '🔩', desc: 'SAE Gr 2/5/8 · Metric 8.8/10.9/12.9',
  render(el, state, ctx) {
    const s = { sys: state.sys || 'sae', g: state.g || '5', m: state.m || '8.8', th: state.th || 'coarse', c: state.c || 'dry', sel: state.sel || '' };
    el.innerHTML = `
      <div class="warnbox" role="note"><b>⚠</b> ${DISCLAIMER}</div>
      <div class="card controls">
        ${seg('sys', [['sae', 'SAE (inch)'], ['metric', 'Metric']], s.sys)}
        <div id="gradeSeg"></div>
        ${seg('th', [['coarse', 'Coarse'], ['fine', 'Fine']], s.th)}
        ${seg('c', [['dry', 'Plain / dry (K 0.20)'], ['lube', 'Lubricated (K 0.15)']], s.c)}
      </div>
      <div class="card" id="sel"></div>
      <div class="card flush"><div class="tbl-wrap"><table class="tbl torque" id="tbl"></table></div></div>
      <div class="card info small">
        <h3>Basis &amp; sources</h3>
        <p>T = K × D × F, clamp load F = 75% of minimum proof load. Same method and inputs as the Fastenal torque-tension charts.
        Torque values only achievable when the nut/tapped hole is rated at least as strong as the bolt. Torque is an indirect indicator of tension.</p>
        <ul>${BOLT_SOURCES.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <p>Grade 2 and metric fine-thread rows are calculated with the same method (not printed in the Fastenal charts).
        Class 8.8 uses 580 MPa proof stress for all sizes, as in the Fastenal chart (ISO 898-1 allows 600 MPa above M16 — chart is ≈3% conservative there).</p>
      </div>`;
    const $ = (id) => el.querySelector('#' + id);
    const drawGrade = () => {
      $('gradeSeg').innerHTML = s.sys === 'sae'
        ? seg('g', Object.entries(SAE_GRADES).map(([k, v]) => [k, `Gr ${k}`]), s.g)
        : seg('m', Object.keys(METRIC_CLASSES).map((k) => [k, k]), s.m);
      wireSeg($('gradeSeg'), (n, v) => { s[n] = v; s.sel = ''; draw(); });
    };
    const draw = () => {
      const sae = s.sys === 'sae';
      const rows = sae ? inchTorqueTable(s.g, s.th === 'coarse' ? 'unc' : 'unf', s.c) : metricTorqueTable(s.m, s.th, s.c);
      const gradeLabel = sae ? SAE_GRADES[s.g].label : METRIC_CLASSES[s.m].label;
      $('tbl').innerHTML = `<thead><tr><th>Thread</th><th>Clamp ${sae ? '(lbf)' : '(kN)'}</th><th>ft·lb</th><th>N·m</th></tr></thead><tbody>
        ${rows.map((r) => {
          const ftCell = sae && r.d <= 0.3125 ? `${Math.round(r.inlb)} <small>in·lb</small>` : r1(r.ftlb);
          return `<tr data-size="${esc(r.size)}" class="${r.size === s.sel ? 'sel' : ''}"><td><b>${esc(r.thread)}</b></td>
            <td>${sae ? Math.round(r.clamp).toLocaleString('en-US') : (r.clamp / 1000).toFixed(1)}</td>
            <td class="num">${ftCell}</td><td class="num">${r1(r.Nm)}</td></tr>`;
        }).join('')}</tbody>`;
      const r = rows.find((x) => x.size === s.sel);
      const cond = s.c === 'dry' ? 'plain/dry' : 'lubricated';
      if (r) {
        const ft = sae && r.d <= 0.3125 ? `${Math.round(r.inlb)} in·lb (${r1(r.ftlb)} ft·lb)` : `${r1(r.ftlb)} ft·lb`;
        $('sel').innerHTML = `<div class="big-label">${esc(gradeLabel)} · ${esc(r.thread)} · ${cond}</div>
          <div class="big-num">${sae ? ft : r1(r.Nm) + ' N·m'}</div><div class="sub">${sae ? r1(r.Nm) + ' N·m' : ft} · clamp ≈ ${sae ? Math.round(r.clamp).toLocaleString('en-US') + ' lbf' : (r.clamp / 1000).toFixed(1) + ' kN'} · K = ${K_VALUES[s.c]}</div>`;
        ctx.update({ ...s }, `${gradeLabel} ${r.thread} ${cond}: ${ft} / ${r1(r.Nm)} N·m`);
      } else {
        $('sel').innerHTML = `<div class="big-label">${esc(gradeLabel)} · ${s.th} · ${cond}</div><p class="hint">Tap a row to select it (and save it with ☆).</p>`;
        ctx.update({ ...s }, null);
      }
    };
    wireSeg(el.querySelector('.controls'), (n, v) => { if (n === 'g' || n === 'm') return; s[n] = v; if (n !== 'c') s.sel = ''; if (n === 'sys') drawGrade(); draw(); });
    $('tbl').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-size]'); if (!tr) return; s.sel = tr.dataset.size; draw(); $('sel').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    drawGrade(); draw();
  },
};
