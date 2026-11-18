import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore, validateCreation } from '../server/store.mjs';

test('only HTTP(S) URLs without credentials are stored; title and collection are optional', () => {
  assert.deepEqual(validateCreation({ url: ' https://EXAMPLE.org:443/my-work ' }), {
    url: 'https://example.org/my-work', title: 'example.org', collection: 'unfiled',
  });
  for (const url of ['', 'not a URL', 'file:///tmp/test', 'javascript:void(0)', 'https://user:pass@example.org', 'https://a.org/a b']) {
    assert.throws(() => validateCreation({ url }), { name: 'InputError' });
  }
  assert.throws(() => validateCreation({ url: 'https://example.org', title: 'a'.repeat(141) }));
  assert.throws(() => validateCreation({ url: 'https://example.org', collection: 'unknown' }));
});

test('a record survives closing and reopening the SQLite file; libraries are separate', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'indexroom-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'library.sqlite');
  let store = openStore(file);
  const record = validateCreation({ url: 'https://example.org/art', title: 'Blue study', collection: 'design' });
  const id = await store.add('first', record);
  await assert.rejects(store.add('first', record), /already/);
  await store.add('second', record);
  assert.equal(await store.get('second', id), undefined);
  assert.equal(await store.remove('second', id), false);
  assert.equal(await store.edit('second', id, { ...record, title: 'No' }), false);
  assert.equal(await store.setStar('second', id, true), false);
  await store.setStar('first', id, true);
  store.close();
  store = openStore(file);
  t.after(() => store.close());
  assert.equal((await store.get('first', id)).starred, 1);
  assert.equal((await store.get('first', id)).title, 'Blue study');
  assert.equal((await store.library('first', { q: 'study', starred: true, collection: 'design' })).total, 1);
  assert.equal((await store.library('first', { q: 'unmatched' })).total, 0);
  assert.equal(await store.edit('first', id, { ...record, collection: 'labs' }), true);
  assert.equal((await store.library('first', {})).counts.labs, 1);
  assert.equal(await store.remove('first', id), true);
  assert.equal((await store.library('first', {})).total, 0);
  assert.equal((await store.library('second', {})).total, 1);
});

test('lists have stable pages, literal search and collection counts independent of filters', async t => {
  const store = openStore(':memory:');
  t.after(() => store.close());
  for (let i = 1; i <= 15; i++) await store.add('owner', validateCreation({ title: `Piece ${String(i).padStart(2, '0')}`, url: `https://example.org/${i}`, collection: i < 6 ? 'design' : 'web' }));
  assert.equal((await store.library('owner', {})).rows.length, 12);
  assert.equal((await store.library('owner', { page: 99 })).rows.length, 3);
  assert.equal((await store.library('owner', { sort: 'name' })).rows[0].title, 'Piece 01');
  assert.equal((await store.library('owner', {})).rows[0].title, 'Piece 15');
  assert.equal((await store.library('owner', { q: '%' })).total, 0);
  assert.equal((await store.library('owner', { collection: 'design' })).counts.web, 10);
});
