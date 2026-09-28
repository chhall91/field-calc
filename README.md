# Field Calc — offline mechanic's calculator (PWA)

Vite + vanilla JS. No runtime dependencies. Installable, works with no signal after first load.

```
npm install
npm run dev        # dev server (HMR; service worker disabled in dev)
npm test           # vitest unit tests (conversion math, adapter formula, torque tables vs Fastenal)
npm run build      # production build -> dist/ (sw.js gets full precache list injected)
npm run preview    # serve dist/ (service worker active, offline-capable)
npm run serve      # dist/ + /api push-sharing server (Node + SQLite) on :4173
npm run build:pages  # static build for GitHub Pages at /field-calc/ (crew push-sharing disabled)
node scripts/verify-layout.mjs  # headless check of tile rearranging (BASE=http://localhost:4173/ for local)
npm run icons      # regenerate PNG icons from public/icons/icon.svg
npm run screenshots  # 390x844 screenshots + offline check (needs dev on :5174 and preview on :4173)
```

## Layout
- `src/lib/` — pure math: `units.js` (conversions), `fraction.js`, `torque.js` (adapter formula, T=KDF)
- `src/data/` — reference data with sources in comments: `bolts.js`, `fasteners.js`, `drills.js`
- `src/tools/` — one file per tool screen
- `src/home-layout.js` — home tile rearranging (edit mode, pointer drag + ▲▼, saved in localStorage `fc.tileOrder`); merge logic in `src/lib/order.js`
- `public/sw.js` — offline-first service worker; `vite.config.js` injects the precache list at build
- `tests/` — unit tests

## Data sources
See `src/data/*.js` headers and the in-app About page.

## Live
- GitHub Pages (static, offline PWA): https://chhall91.github.io/field-calc/ — deployed by `.github/workflows/pages.yml` on every push to `main` (npm ci → npm test → build:pages). Crew push-sharing needs the Node server and is disabled there; link/QR job sharing works.

## Disclaimer
Reference only. Follow manufacturer specifications, site procedures, and (for rigging) the equipment tags and a qualified rigger's judgment.
