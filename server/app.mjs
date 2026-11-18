import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { layout } from './layout.mjs';
import { editorView, legalView, libraryPath, libraryView, messageView, readFilters, removeView } from './views.mjs';
import { directoryFilters, portfolioView } from './portfolio.mjs';
import { InputError, validateCreation } from './store.mjs';

const PUBLIC_PAGES = new Map([
  ['/', ['Project portfolio', 'Explore the public index of nttare’s Vercel projects. Open a project’s production site or save a personal copy in your private bookmark library.']],
  ['/privacy', ['Privacy policy', 'How Indexroom stores creation links in SQLite, uses an essential browser key, and handles access, retention and removal of your saved records.']],
  ['/terms', ['Terms and conditions', 'Read the draft workspace terms covering acceptable use, ownership of bookmarked creations, external links and availability of the personal archive.']],
]);
const hash = value => createHash('sha256').update(value).digest('hex');
const problem = (status, message) => Object.assign(new Error(message), { status });
const originHost = value => /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(value || '') ? value : '';

// Request-derived origin is only for local/preview metadata and Origin checks, never a redirect.
function requestOrigin(req, configured, forceHttps = false) {
  if (configured) return configured;
  const forwarded = originHost(String(req.headers['x-forwarded-host'] || '').split(',')[0].trim());
  const host = forwarded || originHost(req.headers.host) || 'localhost';
  const tls = forceHttps || req.socket.encrypted || req.headers['x-forwarded-proto']?.split(',')[0].trim() === 'https' || host.endsWith('.e2b.app');
  return URL.parse(`${tls ? 'https' : 'http'}://${host}`)?.origin || 'http://localhost';
}

async function readForm(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') throw problem(415, 'Submit this action using the library form.');
  const limit = 16 * 1024;
  if (Number(req.headers['content-length']) > limit) throw problem(413, 'This form is too large. Shorten the URL or title and try again.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) { req.resume(); throw problem(413, 'This form is too large.'); }
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

export function createApp(store, { publicOrigin, contact = '', production = false, assets = new Map(), vercel = false } = {}) {
  const visits = new Map();
  let windowEnd = Date.now() + 60000;
  return async function app(req, res) {
    // A Vercel deployment may have several aliases. Validate POSTs against the
    // actual request origin, not the canonical URL of another alias.
    const origin = requestOrigin(req, vercel ? undefined : publicOrigin, vercel);
    const canonicalOrigin = publicOrigin || origin;
    const secure = vercel || origin.startsWith('https://');
    const cookieName = secure ? '__Host-indexroom' : 'indexroom';
    const path = URL.parse(req.url, 'http://internal.invalid');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'" + (production ? "; frame-ancestors 'none'" : ''));
    if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    if (production) res.setHeader('X-Frame-Options', 'DENY');
    const send = (status, type, body) => {
      res.writeHead(status, { 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : body);
    };
    const html = (status, title, description, view, extra = {}) => send(status, 'text/html; charset=utf-8',
      layout({ origin: canonicalOrigin, writable: store.writable, title: `${title} — Indexroom`, description, contact, noindex: true, ...extra }, view));
    const redirect = to => { res.writeHead(303, { Location: to }); res.end(); };
    const missing = () => html(404, 'Page not found', 'This entry or page is not in your library.', messageView('404', 'Off the index.', 'This page is missing, or this creation doesn’t belong to your browser’s library.'));
    try {
      if (!path) throw problem(400, 'This address could not be read.');
      const route = path.pathname;
      const reading = req.method === 'GET' || req.method === 'HEAD';
      if (reading && assets.has(route)) {
        const { body, type, zipped } = assets.get(route);
        res.setHeader('Cache-Control', production ? 'public, max-age=3600' : 'no-cache');
        if (zipped) res.setHeader('Vary', 'Accept-Encoding');
        if (zipped && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { res.setHeader('Content-Encoding', 'gzip'); return send(200, type, zipped); }
        return send(200, type, body);
      }
      if (Date.now() >= windowEnd) { visits.clear(); windowEnd = Date.now() + 60000; }
      const client = (vercel && req.headers['x-vercel-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress;
      const weight = (visits.get(client) || 0) + (reading ? 1 : 3);
      visits.set(client, weight);
      if (weight > 300) { res.setHeader('Retry-After', '60'); throw problem(429, 'Too many requests. Wait a minute and try again.'); }
      if (reading && route === '/robots.txt') return send(200, 'text/plain; charset=utf-8', `User-agent: *\nDisallow: /library\nDisallow: /creations\nDisallow: /saved/\nDisallow: /new\nDisallow: /?\nSitemap: ${canonicalOrigin}/sitemap.xml\n`);
      if (reading && route === '/sitemap.xml') return send(200, 'application/xml; charset=utf-8', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...PUBLIC_PAGES.keys()].map(p => `<url><loc>${canonicalOrigin}${p}</loc></url>`).join('')}</urlset>`);
      if (reading && route === '/') {
        // Preserve old library filter URLs without mixing public and private results.
        if (['view', 'collection', 'q', 'sort', 'page'].some(key => path.searchParams.has(key))) return redirect(libraryPath(readFilters(path.searchParams)));
        const filters = directoryFilters(path.searchParams);
        return html(200, ...PUBLIC_PAGES.get('/'), portfolioView(await store.portfolio(), store.writable, filters), { nav: 'portfolio', noindex: Boolean(path.search) });
      }
      if (reading && (route === '/privacy' || route === '/terms')) return html(200, ...PUBLIC_PAGES.get(route), legalView(route.slice(1), contact), { path: route, noindex: false });
      if (!reading && req.method !== 'POST') { res.setHeader('Allow', 'GET, HEAD, POST'); throw problem(405, 'This method is not available.'); }
      const item = /^\/creations\/(\d{1,15})\/(edit|star|remove)$/.exec(route);
      const saved = /^\/saved\/(\d{1,15})$/.exec(route);
      if (!(reading ? route === '/library' || route === '/new' || saved || (item && item[2] !== 'star') : route === '/creations' || item)) return missing();
      if (!store.writable) {
        const note = 'The hosted database is not connected yet. You can still browse every public project. No private bookmarks can be saved on this deployment yet.';
        return html(503, 'Private library not connected', note, messageView('PRIVATE LIBRARY', 'Not connected yet.', note));
      }
      let token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
      if (!/^[a-f0-9]{64}$/.test(token || '')) {
        if (!reading) throw problem(403, 'Your library key is missing. Enable cookies for this site, reopen the library and try again.');
        token = randomBytes(32).toString('hex');
      }
      if (reading) {
        const policy = secure && !production ? 'Secure; SameSite=None; Partitioned' : `${secure ? 'Secure; ' : ''}SameSite=Lax`;
        res.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; Max-Age=31536000; ${policy}`);
      }
      const owner = hash(`owner:${token}`);
      const ctx = { csrf: hash(`form:${token}`) };
      const f = readFilters(path.searchParams);
      const id = item ? Number(item[1]) : saved ? Number(saved[1]) : null;
      const record = id !== null ? await store.get(owner, id) : null;
      if (id !== null && !record) return missing();
      if (reading) {
        if (route === '/library' || saved) {
          const [title, description] = saved ? ['Creation saved', 'Your bookmark is in the library. Edit its details, open the original site or file another creation.']
            : f.starred ? ['Starred creations', 'Browse the creations you have starred in this browser’s private library. Search by title or URL to find a favorite.']
            : ['Creation library', 'Save, search and organize links in your private browser-keyed creation archive.'];
          const data = await store.library(owner, f);
          return html(200, title, description, libraryView(ctx, f, data, saved && record), { nav: 'library', path: '/library' });
        }
        if (route === '/new' || item?.[2] === 'edit') {
          const description = item ? 'Update a saved bookmark’s title, URL or collection in your private Indexroom library.' : 'Enter a creation URL, give it an optional title and file it in a collection in your personal archive.';
          let prefill = { collection: f.collection };
          if (!item && path.searchParams.has('project')) {
            const project = await store.project(path.searchParams.get('project'));
            if (!project) return missing();
            prefill = { url: project.url, title: project.name, collection: 'web' };
          }
          return html(200, item ? 'Edit creation' : 'New creation', description, editorView(ctx, record || prefill), { nav: item ? 'library' : 'new', path: route });
        }
        return html(200, 'Remove creation', 'Confirm removal of this saved link from your personal archive.', removeView(ctx, record));
      }
      if ((req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') throw problem(403, 'Reopen the library and submit the form from this site.');
      const form = await readForm(req);
      const csrf = form.get('csrf') || '';
      if (!/^[a-f0-9]{64}$/.test(csrf) || !timingSafeEqual(Buffer.from(csrf), Buffer.from(ctx.csrf))) throw problem(403, 'This form no longer matches your library. Reopen the library and try again.');
      if (item?.[2] === 'star') {
        if (!['0', '1'].includes(form.get('starred'))) throw problem(400, 'Choose a valid star setting.');
        if (!await store.setStar(owner, id, form.get('starred') === '1')) return missing();
        return redirect(libraryPath(readFilters(new URLSearchParams(form.get('filters') || ''))));
      }
      if (item?.[2] === 'remove') return await store.remove(owner, id) ? redirect('/library#entries') : missing();
      const input = { url: form.get('url'), title: form.get('title'), collection: form.get('collection') || 'unfiled' };
      try {
        const value = validateCreation(input);
        if (item) return await store.edit(owner, id, value) ? redirect(`/saved/${id}`) : missing();
        return redirect(`/saved/${await store.add(owner, value)}`);
      } catch (err) {
        if (!(err instanceof InputError)) throw err;
        return html(err.status, 'Check your entry', 'Correct the highlighted field to save this creation.', editorView(ctx, { ...input, id }, err));
      }
    } catch (err) {
      const status = err.status || 500;
      if (status === 500) console.error('Request failed:', err.name, err.code || 'internal error');
      const note = status === 500 ? 'Your request could not be completed. Please try again.' : err.message;
      return html(status, 'Request not completed', note, messageView(status, 'Not quite filed.', note));
    }
  };
}
