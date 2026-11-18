import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { assetPaths } from '../server/assets.mjs';
import { openStore } from '../server/store.mjs';
import { hostedStore } from '../server/turso.mjs';
import { createApp } from '../server/app.mjs';

// Keep the Vercel static output allowlisted. Never copy the repo or a DB into dist.
for (const [route, source] of assetPaths) {
  const output = resolve('dist', '.' + route);
  mkdirSync(dirname(output), { recursive: true });
  copyFileSync(source, output);
}
const verification = openStore(':memory:');
try {
  createApp(verification);
  const projects = await verification.portfolio();
  if (!projects.length || projects.some(p => !/^[a-z0-9-]+$/.test(p.name) || !p.url.startsWith('https://') || new URL(p.url).origin !== p.url)) {
    throw new Error('The public catalog must contain only project names and HTTPS production origins.');
  }
  console.log(`Validated ${projects.length} public project links and copied ${assetPaths.length} static assets.`);
} finally { verification.close(); }

// Only mutate the explicitly configured deployment DB, never during a local build.
if (process.env.VERCEL === '1') {
  const remote = hostedStore(process.env);
  if (remote) {
    await remote.migrate();
    console.log('Hosted SQLite schema and public catalog ready.');
  } else {
    console.log('No hosted database configured: serving the public catalog only. Private saves are disabled.');
  }
}
