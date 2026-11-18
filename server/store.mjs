import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const COLLECTIONS = [
  { id: 'web', label: 'Websites', code: 'WEB' },
  { id: 'design', label: 'Design', code: 'DSN' },
  { id: 'labs', label: 'Experiments', code: 'LAB' },
  { id: 'unfiled', label: 'Unfiled', code: 'INB' },
];
export const PAGE_SIZE = 12;

export class InputError extends Error {
  constructor(field, message, status = 422) {
    super(message);
    this.name = 'InputError';
    this.field = field;
    this.status = status;
  }
}

export function validateCreation(input) {
  const raw = String(input.url ?? '').trim();
  const url = URL.parse(raw);
  if (!/^https?:\/\//i.test(raw) || !url || /[\s\\\p{Cc}]/u.test(raw) || raw.length > 2048 || url.href.length > 2048) {
    throw new InputError('url', 'Enter a complete http:// or https:// URL, up to 2,048 characters.');
  }
  if (url.username || url.password) throw new InputError('url', 'Remove the sign-in details from this URL before saving it.');
  const title = String(input.title ?? '').trim() || url.hostname;
  if (title.length > 140 || /\p{Cc}/u.test(title)) throw new InputError('title', 'Use a single-line title of 140 characters or fewer, without control characters.');
  const collection = input.collection ?? 'unfiled';
  if (!COLLECTIONS.some(c => c.id === collection)) throw new InputError('collection', 'Choose one of the listed collections.');
  return { url: url.href, title, collection };
}

// These release files contain only reviewed SQL and the approved PUBLIC project list.
// No request input is ever interpolated into schema or query text.
const catalogSql = readFileSync(new URL('../catalog/projects.sql', import.meta.url), 'utf8');
export const installSql = `BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS creations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      url TEXT NOT NULL CHECK(length(url) BETWEEN 1 AND 2048),
      title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 140),
      collection TEXT NOT NULL CHECK(collection IN ('web','design','labs','unfiled')),
      starred INTEGER NOT NULL DEFAULT 0 CHECK(starred IN (0,1)),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE(owner, url)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS creations_owner_date ON creations(owner, id DESC);
    CREATE TRIGGER IF NOT EXISTS library_capacity BEFORE INSERT ON creations
    WHEN (SELECT count(*) FROM creations WHERE owner = NEW.owner) >= 3000
    BEGIN SELECT RAISE(ABORT, 'library_full'); END;
${catalogSql}
COMMIT;`;

function publicQueries(query) {
  return {
    portfolio: () => query('SELECT name, url FROM public_projects ORDER BY name COLLATE NOCASE'),
    async project(name) { return (await query('SELECT name, url FROM public_projects WHERE name = ?', [name]))[0]; },
  };
}

// Both drivers return arrays of rows. RETURNING keeps inserts and ownership checks atomic.
export function createStore(query) {
  const fields = 'id, url, title, collection, starred, created_at';
  const where = `WHERE owner = ? AND (? = '' OR collection = ?) AND (NOT ? OR starred = 1)
    AND (instr(lower(title), lower(?)) > 0 OR instr(lower(url), lower(?)) > 0)`;
  async function write(sql, args) {
    try { return await query(sql, args); } catch (err) {
      if (err.errcode === 2067 || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message.includes('UNIQUE constraint failed: creations.owner, creations.url')) {
        throw new InputError('url', 'This link is already in your library.', 409);
      }
      if (err.message.includes('library_full')) throw new InputError('url', 'This library holds 3,000 creations. Remove an entry to add another.', 409);
      throw err;
    }
  }
  return {
    ...publicQueries(query), writable: true,
    async get(owner, id) { return (await query(`SELECT ${fields} FROM creations WHERE owner = ? AND id = ?`, [owner, id]))[0]; },
    async add(owner, r) {
      const [row] = await write('INSERT INTO creations(owner,url,title,collection) VALUES (?,?,?,?) RETURNING id', [owner, r.url, r.title, r.collection]);
      return row.id;
    },
    async edit(owner, id, r) {
      return (await write('UPDATE creations SET url=?,title=?,collection=? WHERE owner=? AND id=? RETURNING id', [r.url, r.title, r.collection, owner, id])).length === 1;
    },
    async setStar(owner, id, value) {
      return (await query('UPDATE creations SET starred=? WHERE owner=? AND id=? RETURNING id', [Number(value), owner, id])).length === 1;
    },
    async remove(owner, id) { return (await query('DELETE FROM creations WHERE owner=? AND id=? RETURNING id', [owner, id])).length === 1; },
    async library(owner, { collection = '', starred = false, q = '', sort, page = 1 }) {
      const args = [owner, collection, collection, Number(starred), q, q];
      const [totals, grouped] = await Promise.all([
        query(`SELECT count(*) AS total FROM creations ${where}`, args),
        query('SELECT collection, count(*) AS n FROM creations WHERE owner=? GROUP BY collection', [owner]),
      ]);
      const total = totals[0].total;
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      page = Math.max(1, Math.min(pages, page));
      const order = sort === 'name' ? 'title COLLATE NOCASE, id DESC' : 'id DESC';
      const rows = await query(`SELECT ${fields} FROM creations ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...args, PAGE_SIZE, (page - 1) * PAGE_SIZE]);
      return { rows, total, page, pages, counts: Object.fromEntries(grouped.map(r => [r.collection, r.n])) };
    },
  };
}

export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  try { db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;'); db.exec(installSql); }
  catch (err) { db.close(); throw err; }
  return { ...createStore((sql, args = []) => db.prepare(sql).all(...args)), close: () => db.close() };
}

// When a deployment has no Turso binding, the immutable SQL dump is the only data
// it may serve. There is deliberately no creations table or write API in this mode.
export function openPublicCatalog() {
  const db = new DatabaseSync(':memory:');
  db.exec(catalogSql);
  db.exec('PRAGMA query_only=ON');
  return { ...publicQueries((sql, args = []) => db.prepare(sql).all(...args)), writable: false, close: () => db.close() };
}
