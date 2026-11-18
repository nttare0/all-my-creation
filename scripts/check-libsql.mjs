// Optional integration check. Run against an installed sqld binary, NOT a cloud DB.
// Creates and cleans a temporary sqld data directory and uses only loopback traffic.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createVercelHandler } from '../api/index.mjs';
import { hostedStore } from '../server/turso.mjs';

async function listen(server) {
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return 'http://127.0.0.1:' + server.address().port;
}
const close = server => new Promise(done => server.close(done));
const scratch = await mkdtemp(join(tmpdir(), 'indexroom-sqld-'));
const reservation = createServer();
const address = await listen(reservation); await close(reservation);
const child = spawn(process.env.SQLD_BIN || 'sqld', ['-d', join(scratch, 'db'), '--http-listen-addr', new URL(address).host, '--no-welcome'], { cwd: scratch, stdio: 'ignore' });
const ended = new Promise(done => { child.once('close', done); child.once('error', done); });
let server;
try {
  // Wait for the short-lived test daemon, failing promptly if it exited.
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null || !child.pid) throw new Error('sqld did not start. Set SQLD_BIN to the test binary.');
    if (await fetch(address + '/v2').then(r => r.ok).catch(() => false)) break;
    await delay(100);
  }
  const env = { TURSO_DATABASE_URL: 'libsql://fixture.invalid', TURSO_AUTH_TOKEN: 'test-only', VERCEL_PROJECT_PRODUCTION_URL: 'portfolio.example' };
  // The only override is the destination of fetch; payloads reach a real libSQL server.
  const transport = (url, options) => fetch(address + url.pathname, options);
  const backend = hostedStore(env, transport);
  await backend.migrate();
  server = createServer(createVercelHandler(env, transport));
  let origin = await listen(server);
  const headers = { 'x-forwarded-host': 'release.example', 'x-forwarded-proto': 'https' };
  const get = (path, cookie) => fetch(origin + path, { headers: cookie ? { ...headers, cookie } : headers });
  const form = await get('/new?project=drop');
  const cookie = form.headers.get('set-cookie').split(';')[0];
  const csrf = /name="csrf" value="([a-f0-9]{64})"/.exec(await form.text())[1];
  const post = (path, fields) => fetch(origin + path, { method: 'POST', redirect: 'manual', headers: { ...headers, origin: 'https://release.example', cookie }, body: new URLSearchParams({ csrf, ...fields }) });
  const entry = { title: 'Personal copy', url: 'https://zepvi.vercel.app', collection: 'web' };
  assert.equal((await post('/creations', entry)).status, 303);
  assert.equal((await post('/creations', entry)).status, 409);
  assert.equal((await post('/creations/1/star', { starred: '1' })).status, 303);
  // Model another release and cold start. The private row must survive both.
  await backend.migrate(); await close(server);
  server = createServer(createVercelHandler(env, transport)); origin = await listen(server);
  assert.equal((await backend.portfolio()).length, 13);
  assert.match(await (await get('/library?view=starred', cookie)).text(), /Personal copy/);
  assert.doesNotMatch(await (await get('/library')).text(), /Personal copy/);
  assert.doesNotMatch(await (await get('/', cookie)).text(), /Personal copy/);
  assert.equal((await post('/creations/1/edit', { ...entry, title: 'Updated' })).status, 303);
  assert.match(await (await get('/creations/1/remove', cookie)).text(), /Updated/);
  assert.equal((await post('/creations/1/remove', {})).status, 303);
  assert.equal((await get('/saved/1', cookie)).status, 404);
  console.log('PASS: real libSQL HTTP migration, 13 projects, private CRUD, duplicate handling, isolation, and persistence across cold starts.');
} finally {
  if (server?.listening) await close(server);
  child.kill('SIGTERM'); await ended; await rm(scratch, { recursive: true, force: true });
}
