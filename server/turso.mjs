import { createStore, installSql } from './store.mjs';

// Minimal documented libSQL HTTPS operations, with no native driver in the function.
// All user values are bound. Never follow redirects carrying the database token.
const unavailable = () => Object.assign(new Error('The database is unavailable. Please try again later.'), { status: 503 });
function bind(value) {
  if (typeof value === 'string') return { type: 'text', value };
  if (Number.isSafeInteger(value)) return { type: 'integer', value: String(value) };
  throw new TypeError('Unsupported SQL parameter');
}
function decode(cell) {
  if (cell.type === 'text') return cell.value;
  if (cell.type === 'integer' && Number.isSafeInteger(Number(cell.value))) return Number(cell.value);
  throw unavailable();
}

export function hostedStore(env, fetcher = fetch) {
  const raw = env.TURSO_DATABASE_URL, token = env.TURSO_AUTH_TOKEN;
  if (!raw && !token) return null;
  const url = URL.parse(String(raw).replace(/^libsql:\/\//i, 'https://'));
  if (!token || !url || url.protocol !== 'https:' || url.username || url.password || url.href !== url.origin + '/') {
    throw new Error('Configure both TURSO_DATABASE_URL (a libsql:// or https:// database origin) and TURSO_AUTH_TOKEN.');
  }
  const endpoint = new URL('/v2/pipeline', url);
  async function run(operation) {
    let first;
    try {
      const res = await fetcher(endpoint, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ baton: null, requests: [operation, { type: 'close' }] }),
      });
      if (!res.ok) throw unavailable();
      [first] = (await res.json()).results;
    } catch { throw unavailable(); }
    if (first?.type === 'error') {
      // Preserve only constraint signals the store translates into form feedback.
      const { code, message = '' } = first.error || {};
      if (code === 'SQLITE_CONSTRAINT_UNIQUE' || message.includes('UNIQUE constraint failed: creations.owner, creations.url')) {
        throw Object.assign(new Error('Duplicate link'), { code: 'SQLITE_CONSTRAINT_UNIQUE' });
      }
      if (message.includes('library_full')) throw new Error('library_full');
      throw unavailable();
    }
    if (first?.response?.type !== operation.type) throw unavailable();
    return first.response.result;
  }
  return {
    ...createStore(async (sql, args = []) => {
      const { rows, cols } = await run({ type: 'execute', stmt: { sql, args: args.map(bind) } });
      return rows.map(row => Object.fromEntries(row.map((cell, i) => [cols[i].name, decode(cell)])));
    }),
    // One transaction, stopped at the first error; closing the stream rolls it back.
    migrate: () => run({ type: 'sequence', sql: installSql }),
    close() {},
  };
}
