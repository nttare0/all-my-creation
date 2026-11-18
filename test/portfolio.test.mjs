import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { openPublicCatalog, openStore } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';

async function site(t, store) {
  const server = createServer(createApp(store)).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise(done => server.close(done)); store.close(); });
  return (path, init) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { redirect: 'manual', ...init });
}

test('portfolio lists the released production links, without a cookie or private bookmarks', async t => {
  const store = openStore(':memory:');
  await store.add('private', { title: 'Private draft', url: 'https://private.example/', collection: 'design' });
  const request = await site(t, store);
  const res = await request('/');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('set-cookie'), null);
  const html = await res.text();
  const rows = await store.portfolio();
  assert.equal(rows.length, 13);
  for (const { name, url } of rows) {
    assert.equal(new URL(url).origin, url);
    assert.notEqual(name, 'indexroom');
    assert.ok(html.includes(`href="${url}"`), name);
  }
  assert.match(html, /https:\/\/zepvi\.vercel\.app/);
  assert.doesNotMatch(html, /Private draft|private\.example|name="csrf"/);
  assert.equal((await store.library('private', {})).total, 1);
  assert.match(await (await request('/new?project=drop')).text(), /value="https:\/\/zepvi\.vercel\.app"/);
  assert.equal((await request('/new?project=unknown')).status, 404);
  assert.equal((await request('/?view=starred')).headers.get('location'), '/library?view=starred#entries');
  assert.doesNotMatch(await (await request('/sitemap.xml')).text(), /\/library/);
});

test('public-only deployment has a portfolio but cannot issue private forms or accept writes', async t => {
  const request = await site(t, openPublicCatalog());
  const html = await (await request('/')).text();
  assert.match(html, /v0-mirror-two\.vercel\.app/);
  assert.doesNotMatch(html, /Save privately/);
  for (const [path, method] of [['/library', 'GET'], ['/new', 'GET'], ['/creations', 'POST']]) {
    const res = await request(path, { method });
    assert.equal(res.status, 503);
    assert.equal(res.headers.get('set-cookie'), null);
    assert.doesNotMatch(await res.text(), /name="csrf"/);
  }
});
