// Build-time feature flags. __HAS_SYNC__ is defined in vite.config.js (false for the GitHub Pages build,
// which has no /api server). Defaults to true (local server build, tests).
/* global __HAS_SYNC__ */
export const HAS_SYNC = typeof __HAS_SYNC__ === 'undefined' ? true : !!__HAS_SYNC__;
