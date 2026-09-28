import { createSync } from './lib/sync.js';
import { store } from './storage.js';
export const sync = createSync({ store: { get: store.get, set: store.set } });
