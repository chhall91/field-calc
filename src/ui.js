export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Segmented control. options: [[value, label], ...] */
export function seg(name, options, current) {
  return `<div class="seg" role="radiogroup" data-seg="${name}">${options.map(([v, l]) =>
    `<button type="button" role="radio" aria-checked="${String(v) === String(current)}" class="${String(v) === String(current) ? 'on' : ''}" data-v="${esc(v)}">${l}</button>`).join('')}</div>`;
}

/** Wire all segmented controls inside root. cb(name, value) */
export function wireSeg(root, cb) {
  root.querySelectorAll('.seg').forEach((s) => {
    s.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      s.querySelectorAll('button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      cb(s.dataset.seg, b.dataset.v);
    });
  });
}

export function options(map, current) {
  return Object.entries(map).map(([k, v]) => `<option value="${esc(k)}" ${k === current ? 'selected' : ''}>${esc(typeof v === 'string' ? v : v.label)}</option>`).join('');
}

export const DISCLAIMER = 'Reference only. Always follow the equipment manufacturer’s specifications, engineering documents and your site/work procedures. Values are typical calculated figures and are not a substitute for a qualified procedure.';

import { RIG_DISCLAIMER } from './data/rigging.js';
/** Persistent rigging disclaimer banner (shown at the top of every rigging screen). */
export const rigBanner = () => `<div class="warnbox rig-banner" role="note"><b>⚠ Reference only.</b> Follow your site rigging procedures, the manufacturer’s tags and ratings, and a qualified rigger’s judgment.</div>`;
export const RIG_FINE = RIG_DISCLAIMER;
/** Small number input field. */
export const numField = (id, label, val, ph = '', extra = '') => `<label class="field grow"><span class="lbl">${label}</span><input type="text" inputmode="decimal" id="${id}" value="${esc(val)}" placeholder="${esc(ph)}" ${extra}></label>`;
