import { createServer } from './app.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4173);
const server = createServer({ dbPath: process.env.DB || join(root, 'server/data/fieldcalc.db'), staticDir: join(root, 'dist') });
server.listen(PORT, '0.0.0.0', () => console.log(`Field Calc server on http://localhost:${PORT} (static: dist, api: /api)`));
