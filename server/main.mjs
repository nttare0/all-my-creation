import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';
import { openStore } from './store.mjs';

import { localAssets } from './assets.mjs';
import { siteConfig } from './config.mjs';

const config = siteConfig(process.env, process.env.NODE_ENV === 'production');
if (config.production && !config.publicOrigin) throw new Error('Set PUBLIC_ORIGIN for production.');
const port = Number(process.env.PORT || 3000);
process.umask(0o077);
const store = openStore(process.env.DATABASE_PATH || fileURLToPath(new URL('../data/indexroom.sqlite', import.meta.url)));
const server = createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 16384 }, createApp(store, { ...config, assets: localAssets() }));
server.listen(port, '0.0.0.0', () => console.log(`Indexroom is ready on port ${port}`));
function close() { server.close(() => store.close()); }
process.once('SIGTERM', close);
process.once('SIGINT', close);
