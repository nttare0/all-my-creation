import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createVercelHandler } from '../api/index.mjs';
import { hostedStore } from '../server/turso.mjs';

const env = { TURSO_DATABASE_URL: 'libsql://test.invalid', TURSO_AUTH_TOKEN: 'test-only' };

test('hosted config requires both settings, a secure origin, no embedded secrets or query', () => {
  assert.equal(hostedStore({}), null);
  for (const url of ['http://test.invalid', 'https://test.invalid/db', 'file:/tmp/index.sqlite', 'libsql://user@test.invalid', 'https://test.invalid/?token=bad']) {
    assert.throws(() => hostedStore({ ...env, TURSO_DATABASE_URL: url }), /Configure both/);
  }
  assert.throws(() => hostedStore({ TURSO_AUTH_TOKEN: env.TURSO_AUTH_TOKEN }), /Configure both/);
  assert.throws(() => hostedStore({ TURSO_DATABASE_URL: env.TURSO_DATABASE_URL }), /Configure both/);
});

test('bound values, typed rows and scrubbed transport errors on the hosted path', async () => {
  const text = "notes ' and ?";
  let packet;
  const store = hostedStore(env, async (url, options) => {
    assert.equal(url.href, 'https://test.invalid/v2/pipeline');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    packet = JSON.parse(options.body);
    return Response.json({ results: [{ type: 'ok', response: { type: 'execute', result: {
      cols: [{ name: 'id' }], rows: [[{ type: 'integer', value: '7' }]],
    } } }, { type: 'ok', response: { type: 'close' } }] });
  });
  assert.equal(await store.add('owner', { title: text, url: 'https://example.org/', collection: 'web' }), 7);
  assert.equal(packet.requests[0].stmt.sql.includes(text), false);
  assert.deepEqual(packet.requests[0].stmt.args[2], { type: 'text', value: text });
  assert.deepEqual(packet.requests[1], { type: 'close' });
  const unavailable = hostedStore(env, () => new Response('private upstream details', { status: 401 }));
  await assert.rejects(unavailable.portfolio(), { status: 503, message: 'The database is unavailable. Please try again later.' });
});

test('unconfigured Vercel handler serves the released catalog and does not open a writable file', async t => {
  const server = createServer(createVercelHandler({ VERCEL_PROJECT_PRODUCTION_URL: 'portfolio.example' }));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(done => server.close(done)));
  const request = path => fetch(`http://127.0.0.1:${server.address().port}${path}`);
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /https:\/\/portfolio\.example\/share\.png/);
  assert.equal(home.headers.get('set-cookie'), null);
  assert.equal((await request('/library')).status, 503);
  for (const path of ['/catalog/projects.sql', '/data/indexroom.sqlite', '/api/index']) assert.equal((await request(path)).status, 404);
});
