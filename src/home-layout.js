// Home screen tile ordering: saved order, edit mode, pointer drag (touch + mouse), ▲▼ buttons.
import { store } from './storage.js';
import { TOOLS, GROUPS, groupOf, toolById } from './tools/index.js';
import { mergeOrder, moveItem, isDefaultOrder } from './lib/order.js';

const KEY = 'fc.tileOrder';
// Default order = the grouped order shown on a fresh install.
export const DEFAULT_ORDER = GROUPS.flatMap(([g]) => TOOLS.filter((t) => groupOf(t) === g)).map((t) => t.id);

export const savedOrder = () => store.get(KEY, null);
export const hasCustomOrder = () => Array.isArray(savedOrder()) && !isDefaultOrder(mergeOrder(savedOrder(), DEFAULT_ORDER), DEFAULT_ORDER);
export const currentOrder = () => mergeOrder(savedOrder(), DEFAULT_ORDER);
export function saveOrder(order) {
  if (isDefaultOrder(order, DEFAULT_ORDER)) resetOrder(); else store.set(KEY, order);
}
export function resetOrder() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } store.set(KEY, null); }

const badge = (t) => (t.featured || t.isNew ? '<span class="badge">NEW</span>' : '');
const tileLink = (t, flat) => `<a class="tile${t.featured && !flat ? ' featured' : ''}" href="#/t/${t.id}" data-id="${t.id}">${badge(t)}<span class="t-ico">${t.icon}</span><b>${t.title}</b><small>${t.desc}</small></a>`;

/** Normal (non-edit) tiles HTML: grouped when using the default order, one "My tools" grid when customised. */
export function tilesHtml() {
  const bar = '<div class="layout-bar"><button class="btn-sm" id="editLayout" aria-label="Rearrange tools">⇅ Rearrange</button></div>';
  if (!hasCustomOrder()) {
    return bar + GROUPS.map(([g, label]) => {
      const ts = TOOLS.filter((t) => groupOf(t) === g);
      return ts.length ? `<h3 class="grp">${label}</h3><div class="grid">${ts.map((t) => tileLink(t)).join('')}</div>` : '';
    }).join('');
  }
  return bar.replace('<div class="layout-bar">', '<div class="layout-bar"><h3 class="grp">My tools</h3>') +
    `<div class="grid">${currentOrder().map((id) => tileLink(toolById(id), true)).join('')}</div>`;
}

const editTile = (t, i, n) => `<div class="tile editing" data-id="${t.id}" role="listitem" aria-label="${t.title}, position ${i + 1} of ${n}">
  <span class="t-ico">${t.icon}</span><b>${t.title}</b>
  <div class="tile-ctrls">
    <button class="mv" data-mv="-1" aria-label="Move ${t.title} up" ${i === 0 ? 'disabled' : ''}>▲</button>
    <span class="grip" aria-hidden="true" title="Drag to move">⠿</span>
    <button class="mv" data-mv="1" aria-label="Move ${t.title} down" ${i === n - 1 ? 'disabled' : ''}>▼</button>
  </div></div>`;

/** Render edit mode into `view`. onDone() is called when the user taps Done. */
export function renderEdit(view, { onDone, toast }) {
  const order = currentOrder();
  view.innerHTML = `
    <div class="layout-bar editing-bar">
      <span class="lb-hint">Drag <b>⠿</b> or tap ▲▼</span>
      <button class="btn-sm primary" id="layoutDone">Done</button>
    </div>
    <div class="grid edit-grid" id="editGrid" role="list" aria-label="Tool order">${order.map((id, i) => editTile(toolById(id), i, order.length)).join('')}</div>
    <button class="btn ghost" id="resetOrder">↺ Reset to default order</button>
    <p class="hint center">Your order is saved on this phone. Tools open again after you tap Done.</p>`;
  const grid = view.querySelector('#editGrid');
  const readOrder = () => [...grid.children].map((el) => el.dataset.id);
  const commit = () => saveOrder(readOrder());

  view.querySelector('#layoutDone').addEventListener('click', onDone);
  view.querySelector('#resetOrder').addEventListener('click', () => { resetOrder(); renderEdit(view, { onDone, toast }); toast('Default order restored'); });

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mv]'); if (!b) return;
    const id = b.closest('.tile').dataset.id, cur = readOrder(), i = cur.indexOf(id);
    const next = moveItem(cur, i, i + Number(b.dataset.mv));
    saveOrder(next);
    renderEdit(view, { onDone, toast });
    // keep keyboard / screen-reader focus on the same tile's button (or the other arrow at the ends)
    const t = view.querySelector(`#editGrid [data-id="${id}"]`);
    const same = t.querySelector(`button[data-mv="${b.dataset.mv}"]`);
    (same.disabled ? t.querySelector('button[data-mv]:not([disabled])') : same)?.focus();
    t.scrollIntoView({ block: 'nearest' });
  });

  enableDrag(grid, commit, () => renderEdit(view, { onDone, toast }));
}

// ---------- pointer drag ----------
function enableDrag(grid, commit, rerender) {
  let drag = null;
  const EDGE = 90, MAX_SPEED = 18;
  const bottomInset = () => {
    const tb = document.querySelector('.tabbar'), ad = document.getElementById('ad');
    return (tb?.offsetHeight || 0) + (ad && !ad.hidden ? ad.offsetHeight : 0);
  };
  const topInset = () => document.querySelector('.bar')?.offsetHeight || 0;

  grid.addEventListener('pointerdown', (e) => {
    const tile = e.target.closest('.tile.editing');
    if (!tile || e.target.closest('button')) return;
    // Touch/pen: only the grip starts a drag, so swiping on tiles still scrolls. Mouse: whole tile.
    if (e.pointerType !== 'mouse' && !e.target.closest('.grip')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    const r = tile.getBoundingClientRect();
    const ghost = tile.cloneNode(true);
    ghost.classList.add('ghost');
    Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px', left: r.left + 'px', top: r.top + 'px' });
    document.body.appendChild(ghost);
    tile.classList.add('placeholder');
    drag = { tile, ghost, id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, x: e.clientX, y: e.clientY, raf: 0, moved: false };
    try { grid.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    navigator.vibrate?.(10);
    tick();
  });

  const place = () => {
    const { ghost, tile, x, y, dx, dy } = drag;
    ghost.style.left = x - dx + 'px'; ghost.style.top = y - dy + 'px';
    // hit-test against the other tiles using the finger position
    for (const el of grid.children) {
      if (el === tile) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        const kids = [...grid.children], from = kids.indexOf(tile), to = kids.indexOf(el);
        grid.insertBefore(tile, from < to ? el.nextSibling : el);
        drag.moved = true;
        break;
      }
    }
  };

  function tick() {
    if (!drag) return;
    // auto-scroll when the finger is near the top/bottom edge of the visible area
    const top = topInset(), bottom = window.innerHeight - bottomInset();
    let v = 0;
    if (drag.y < top + EDGE) v = -MAX_SPEED * Math.min(1, (top + EDGE - drag.y) / EDGE);
    else if (drag.y > bottom - EDGE) v = MAX_SPEED * Math.min(1, (drag.y - (bottom - EDGE)) / EDGE);
    if (v) { window.scrollBy(0, v); place(); }
    drag.raf = requestAnimationFrame(tick);
  }

  grid.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    drag.x = e.clientX; drag.y = e.clientY;
    place();
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    cancelAnimationFrame(drag.raf);
    drag.ghost.remove();
    drag.tile.classList.remove('placeholder');
    const moved = drag.moved;
    drag = null;
    if (moved) { commit(); rerender(); }
  };
  grid.addEventListener('pointerup', end);
  grid.addEventListener('pointercancel', end);
  grid.addEventListener('lostpointercapture', end);
}
