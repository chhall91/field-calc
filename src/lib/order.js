// Home-screen tile order helpers (pure; unit-tested in tests/order.test.js).

/**
 * Merge a saved tile order with the current default order.
 * - Unknown / duplicate / non-string saved ids are dropped (tool removed in a later version).
 * - Tools missing from the saved order (added in a later version) are inserted at their
 *   default position: right after the nearest tool that precedes them in the default order
 *   (or at the very front if nothing precedes them).
 * - A missing / invalid saved value returns the default order.
 */
export function mergeOrder(saved, defaults) {
  const def = [...defaults];
  if (!Array.isArray(saved)) return def;
  const known = new Set(def);
  const out = [];
  for (const id of saved) if (typeof id === 'string' && known.has(id) && !out.includes(id)) out.push(id);
  def.forEach((id, i) => {
    if (out.includes(id)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) { const k = out.indexOf(def[j]); if (k >= 0) { at = k + 1; break; } }
    out.splice(at, 0, id);
  });
  return out;
}

/** Return a copy of list with the item at `from` moved to index `to` (clamped). */
export function moveItem(list, from, to) {
  const out = [...list];
  if (from < 0 || from >= out.length) return out;
  const dest = Math.max(0, Math.min(out.length - 1, to));
  const [x] = out.splice(from, 1);
  out.splice(dest, 0, x);
  return out;
}

/** True when `order` is exactly the default order. */
export const isDefaultOrder = (order, defaults) => order.length === defaults.length && order.every((id, i) => id === defaults[i]);
