// Tiny localStorage wrapper (safe when storage is blocked / private mode).
const mem = {};
function get(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
  catch { return key in mem ? mem[key] : fallback; }
}
function set(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { mem[key] = value; }
}

const MAX_RECENTS = 25;

export const store = {
  get, set,
  recents: () => get('fc.recents', []),
  favs: () => get('fc.favs', []),
  addRecent(entry) {
    const list = get('fc.recents', []).filter((e) => !(e.tool === entry.tool && e.summary === entry.summary));
    list.unshift({ ...entry, ts: Date.now() });
    set('fc.recents', list.slice(0, MAX_RECENTS));
  },
  isFav(entry) { return get('fc.favs', []).some((e) => e.tool === entry.tool && e.summary === entry.summary); },
  toggleFav(entry) {
    const list = get('fc.favs', []);
    const i = list.findIndex((e) => e.tool === entry.tool && e.summary === entry.summary);
    if (i >= 0) list.splice(i, 1); else list.unshift({ ...entry, ts: Date.now() });
    set('fc.favs', list);
    return i < 0;
  },
  removeFav(idx) { const l = get('fc.favs', []); l.splice(idx, 1); set('fc.favs', l); },
  clearRecents() { set('fc.recents', []); },
};

// ---------- Saved Jobs ----------
export const jobStore = {
  all: () => get('fc.jobs', []),
  save: (jobs) => set('fc.jobs', jobs),
  get: (id) => get('fc.jobs', []).find((j) => j.id === id),
  put(job) {
    const jobs = get('fc.jobs', []);
    const i = jobs.findIndex((j) => j.id === job.id);
    if (i >= 0) jobs[i] = job; else jobs.unshift(job);
    set('fc.jobs', jobs);
    return job;
  },
  remove(id) { set('fc.jobs', get('fc.jobs', []).filter((j) => j.id !== id)); },
};
