import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { openStore } from '../server/store.mjs';
import { localAssets } from '../server/assets.mjs';
import { createApp } from '../server/app.mjs';

async function fixture(t, config) {
  const store = openStore(':memory:');
  const server = createServer(createApp(store, { assets: localAssets(), ...config }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise(done => server.close(done)); store.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options) => fetch(origin + path, { redirect: 'manual', ...options });
  const home = await request('/library');
  const cookie = home.headers.get('set-cookie').split(';')[0];
  const html = await home.text();
  const csrf = /name="csrf" value="([a-f0-9]{64})"/.exec(html)?.[1];
  assert.ok(csrf, 'save form includes a session-bound token');
  const post = (path, fields, overrides) => request(path, {
    method: 'POST', headers: { cookie, origin, ...overrides }, body: new URLSearchParams({ csrf, ...fields }),
  });
  return { get: path => request(path, { headers: { cookie } }), post, request };
}

test('save, open, find, edit, star, confirm and remove a creation through ordinary forms', async t => {
  const { get, post, request } = await fixture(t);
  const save = await post('/creations', { url: 'https://example.org/new' });
  assert.equal(save.status, 303);
  assert.equal(save.headers.get('location'), '/saved/1');
  assert.match(await (await get('/saved/1')).text(), /Creation saved/);
  assert.match(await (await get('/library')).text(), /href="https:\/\/example.org\/new"/);
  assert.doesNotMatch(await (await request('/library')).text(), /example\.org\/new/);
  assert.equal((await post('/creations', { url: 'https://example.org/new' })).status, 409);
  assert.equal((await post('/creations/1/edit', { title: 'Poster study', collection: 'design', url: 'https://example.org/poster' })).status, 303);
  assert.match(await (await get('/library?q=study&collection=design')).text(), /Poster study/);
  assert.equal((await post('/creations/1/star', { starred: '1' })).status, 303);
  assert.match(await (await get('/library?view=starred')).text(), /Poster study/);
  const confirm = await (await get('/creations/1/remove')).text();
  assert.match(confirm.replace(/<[^>]+>/g, ''), /Remove this creation\?/);
  assert.match(confirm, /action="\/creations\/1\/remove" method="post"/);
  assert.equal((await post('/creations/1/remove', {})).status, 303);
  assert.doesNotMatch(await (await get('/library')).text(), /Poster study/);
  assert.equal((await get('/saved/1')).status, 404);
});

test('invalid input is preserved, and writes require a valid library session and token', async t => {
  const { get, post, request } = await fixture(t);
  const error = await post('/creations', { url: 'not a link', title: 'Keep this title' });
  assert.equal(error.status, 422);
  assert.match(await error.text(), /value="Keep this title"/);
  assert.equal((await post('/creations', { csrf: 'wrong', url: 'https://example.org' })).status, 403);
  assert.equal((await post('/creations', { url: 'https://example.org' }, { origin: 'https://another.example' })).status, 403);
  assert.equal((await post('/creations', { title: 'a'.repeat(20000) })).status, 413);
  const denied = await request('/creations', { method: 'POST', body: new URLSearchParams({ url: 'https://example.org' }) });
  assert.equal(denied.status, 403);
  for (const path of ['/missing', '/.git/config', '/data/indexroom.sqlite', '/app.js.map']) assert.equal((await get(path)).status, 404);
});

test('public routes and share assets exist, private records stay out of the sitemap', async t => {
  const { get } = await fixture(t);
  const map = await (await get('/sitemap.xml')).text();
  assert.match(map, /\/privacy<\/loc>/);
  assert.doesNotMatch(map, /\/saved|\/creations/);
  for (const path of ['/privacy', '/terms', '/new', '/robots.txt', '/favicon.ico', '/icon.svg', '/apple-touch-icon.png', '/share.png']) {
    const res = await get(path);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  }
});

test('HTTPS deployments have private responses, secure cookies and restricted framing', async t => {
  const { get } = await fixture(t, { publicOrigin: 'https://library.example', production: true });
  const res = await get('/library');
  assert.match(res.headers.get('set-cookie'), /^__Host-indexroom=.+HttpOnly;.+Secure; SameSite=Lax/);
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  assert.equal(res.headers.get('referrer-policy'), 'same-origin');
  assert.match(res.headers.get('strict-transport-security'), /max-age=/);
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  assert.match(await (await get('/sitemap.xml')).text(), /https:\/\/library\.example\/privacy/);
});

test('proxied HTTPS preview forms use a partitioned cookie and accept their own origin', async t => {
  const { request } = await fixture(t);
  const headers = { 'x-forwarded-host': '3000-preview.e2b.app', 'x-forwarded-proto': 'https' };
  const res = await request('/library', { headers });
  const set = res.headers.get('set-cookie');
  assert.match(set, /Secure; SameSite=None; Partitioned/);
  assert.equal(res.headers.get('x-frame-options'), null);
  const csrf = /name="csrf" value="([a-f0-9]{64})"/.exec(await res.text())[1];
  const saved = await request('/creations', {
    method: 'POST', headers: { ...headers, origin: 'https://3000-preview.e2b.app', cookie: set.split(';')[0] },
    body: new URLSearchParams({ csrf, url: 'https://example.org/work' }),
  });
  assert.equal(saved.status, 303);
});
