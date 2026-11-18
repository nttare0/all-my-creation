import { createElement as h, Fragment } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Check, CircleAlert, FlaskConical, Folder, Globe, Link2, Lock, Plus, Search, Shapes, Star } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent } from '../components/ui/card.js';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '../components/ui/empty.js';
import { Input } from '../components/ui/input.js';
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select.js';
import { COLLECTIONS } from './store.mjs';
import { buttonLink, glyph, hidden } from './layout.mjs';

const folderIcon = { web: Globe, design: Shapes, labs: FlaskConical, unfiled: Folder };
const date = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export function readFilters(params) {
  return {
    q: (params.get('q') || '').trim().slice(0, 160),
    collection: COLLECTIONS.find(c => c.id === params.get('collection'))?.id || '',
    starred: params.get('view') === 'starred', sort: params.get('sort') === 'name' ? 'name' : 'newest',
    page: Math.max(1, Number.parseInt(params.get('page'), 10) || 1),
  };
}
export function libraryPath(f = {}) {
  const p = new URLSearchParams();
  if (f.collection) p.set('collection', f.collection);
  if (f.starred) p.set('view', 'starred');
  if (f.q) p.set('q', f.q);
  if (f.sort === 'name') p.set('sort', 'name');
  if (f.page > 1) p.set('page', f.page);
  return '/library' + (p.size ? `?${p}` : '') + '#entries';
}

function capture(ctx, collection) {
  return h(Card, { className: 'capture-card' }, h(CardContent, null,
    h('form', { className: 'capture', action: '/creations', method: 'post', 'data-pending': 'Saving link…' },
      hidden('csrf', ctx.csrf), collection && hidden('collection', collection),
      h('label', { htmlFor: 'quick-url' }, glyph(Link2, 16), 'Quick save a URL'),
      h('div', { className: 'capture-row' }, h(Input, { type: 'url', name: 'url', id: 'quick-url', placeholder: 'https://your-creation.com', required: true, maxLength: 2048, autoComplete: 'url', spellCheck: false }),
        h(Button, { type: 'submit' }, glyph(Plus), 'Save link')))));
}
function libraryFilters(counts, filters) {
  return h('nav', { className: 'folder-strip', 'aria-label': 'Filter your library' },
    buttonLink(libraryPath({ ...filters, starred: !filters.starred, page: 1 }), 'Starred', {
      variant: 'outline', icon: Star, className: 'collection-chip', 'aria-current': filters.starred ? 'true' : undefined,
    }),
    ...COLLECTIONS.map(c => h(Button, { asChild: true, variant: 'outline', key: c.id, className: 'collection-chip' }, h('a', {
      href: libraryPath({ ...filters, collection: filters.collection === c.id ? '' : c.id, page: 1 }), 'aria-current': filters.collection === c.id ? 'true' : undefined,
    }, h('span', { className: `folder-dot ${c.id}`, 'aria-hidden': true }), c.label, h('small', null, counts[c.id] || 0)))));
}
function findForm(f) {
  return h('form', { className: 'library-search', method: 'get', action: '/library#entries', role: 'search', 'aria-label': 'Search and sort creations' },
    f.collection && hidden('collection', f.collection), f.starred && hidden('view', 'starred'),
    h(Input, { type: 'search', name: 'q', 'aria-label': 'Search creations', defaultValue: f.q, maxLength: 160, placeholder: 'Search creations…', enterKeyHint: 'search' }),
    h(Button, { type: 'submit', variant: 'outline', size: 'sm' }, 'Search'),
    h(NativeSelect, { id: 'sort', name: 'sort', defaultValue: f.sort, 'aria-label': 'Sort creations by' },
      h(NativeSelectOption, { value: 'newest' }, 'Newest first'), h(NativeSelectOption, { value: 'name' }, 'Title A–Z')));
}
function recordCard(r, csrf, filters) {
  const c = COLLECTIONS.find(x => x.id === r.collection);
  return h('article', { key: r.id }, h(Card, { className: 'bookmark-card' }, h(CardContent, null,
    h('div', { className: 'bookmark-meta' }, h('span', { className: 'folder-tag' }, glyph(folderIcon[c.id], 14), c.label), h('time', { dateTime: r.created_at }, date.format(new Date(r.created_at)))),
    h('h3', null, h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, r.title, glyph(ArrowUpRight, 15))),
    h('p', { className: 'record-url' }, r.url), h('div', { className: 'bookmark-actions' },
      h('form', { method: 'post', action: `/creations/${r.id}/star` }, hidden('csrf', csrf), hidden('starred', r.starred ? '0' : '1'),
        hidden('filters', libraryPath(filters).split('#')[0].split('?')[1] || ''),
        h(Button, { type: 'submit', size: 'sm', variant: 'ghost' }, glyph(Star, 14), r.starred ? 'Unstar' : 'Star')),
      buttonLink(`/creations/${r.id}/edit`, 'Edit details', { variant: 'ghost', size: 'sm' })))));
}
export function libraryView(ctx, f, data, saved) {
  const group = COLLECTIONS.find(c => c.id === f.collection);
  const title = f.starred ? 'Starred creations' : group?.label || 'All creations';
  const filtered = Boolean(f.starred || group || f.q);
  return h(Fragment, null,
    h('header', { className: 'page-heading' }, h('h1', null, 'My library'), h(Badge, { variant: 'outline', className: 'count' }, Object.values(data.counts).reduce((a, b) => a + b, 0))),
    saved && h(Alert, { className: 'save-notice', role: 'status' }, glyph(Check), h(AlertTitle, null, 'Creation saved'),
      h(AlertDescription, null, h('p', null, `“${saved.title}” is in your library. `, h('a', { href: `/creations/${saved.id}/edit` }, 'Edit details')))),
    capture(ctx, f.collection), libraryFilters(data.counts, f),
    h('section', { id: 'entries', className: 'library-entries' }, h('div', { className: 'library-head' },
      h('h2', null, title, h('small', null, data.total)), findForm(f)),
      filtered && h('p', { className: 'filter-note' }, f.q ? `Results for “${f.q}”` : `Viewing ${title.toLowerCase()}`, h('a', { href: '/library#entries' }, 'Clear filters')),
      data.rows.length ? h('div', { className: 'bookmarks' }, ...data.rows.map(r => recordCard(r, ctx.csrf, f))) :
        h(Empty, { className: 'empty-box' }, h(EmptyHeader, null, h(EmptyMedia, { variant: 'icon' }, glyph(f.q ? Search : Bookmark)),
          h(EmptyTitle, null, f.q ? 'No matching creations' : f.starred ? 'No starred creations yet' : group ? 'An open folder' : 'Your first creation goes here.'),
          h(EmptyDescription, null, f.q ? 'Try a different title or URL.' : f.starred ? 'Star a bookmark to find it here.' : 'Save a URL above, or file a new creation with a title and collection.')),
          buttonLink(filtered && !group ? '/library#entries' : `/new${group ? `?collection=${group.id}` : ''}`, filtered && !group ? 'View all creations' : 'Add a creation', { variant: 'outline', size: 'sm' })),
      data.pages > 1 && h('nav', { className: 'pagination', 'aria-label': 'Results pages' },
        data.page > 1 && buttonLink(libraryPath({ ...f, page: data.page - 1 }), 'Previous', { variant: 'outline' }),
        h('span', null, `Page ${data.page} of ${data.pages}`), data.page < data.pages && buttonLink(libraryPath({ ...f, page: data.page + 1 }), 'Next', { variant: 'outline' }))));
}

function back(href, text) { return h('a', { href, className: 'back-link' }, glyph(ArrowLeft, 15), text); }
function intro(label, title, text) { return h('header', { className: 'form-intro' }, h('span', { className: 'kicker' }, label), h('h1', null, title), h('p', null, text)); }
export function editorView(ctx, record = {}, error) {
  const editing = Boolean(record.id);
  function field(name, label, control, hint) {
    return h('div', { className: 'form-field' }, h('label', { htmlFor: `entry-${name}` }, label), control,
      (error?.field === name || hint) && h('p', { className: error?.field === name ? 'field-error' : 'hint', id: `hint-${name}` }, error?.field === name ? error.message : hint));
  }
  const attrs = (name, hasHint = false) => ({ name, id: `entry-${name}`, defaultValue: record[name] || '',
    'aria-invalid': error?.field === name || undefined, 'aria-describedby': (error?.field === name || hasHint) ? `hint-${name}` : undefined });
  return h('section', { className: 'reading-column' }, back('/library#entries', 'Back to library'),
    intro('ENTRY DESK', editing ? 'Edit creation' : 'New creation', editing ? 'Update this bookmark or move it into another collection.' : 'Save a link to your private library. A title and collection are optional.'),
    h(Card, { className: 'entry-card' }, h(CardContent, null,
      error && h(Alert, { variant: 'destructive' }, glyph(CircleAlert), h(AlertTitle, null, 'This creation wasn’t saved'), h(AlertDescription, null, error.message)),
      h('form', { method: 'post', action: editing ? `/creations/${record.id}/edit` : '/creations', 'data-pending': 'Saving creation…' }, hidden('csrf', ctx.csrf),
        field('url', 'Creation URL', h(Input, { ...attrs('url'), type: 'url', inputMode: 'url', required: true, autoComplete: 'url', maxLength: 2048, placeholder: 'https://your-creation.com' })),
        field('title', 'Title', h(Input, { ...attrs('title', true), maxLength: 140, placeholder: 'A name to remember it by' }), 'Leave blank to use the site’s hostname.'),
        field('collection', 'Collection', h(NativeSelect, { ...attrs('collection'), defaultValue: record.collection || 'unfiled' }, ...COLLECTIONS.map(c => h(NativeSelectOption, { key: c.id, value: c.id }, c.label)))),
        h('div', { className: 'form-actions' }, h(Button, { type: 'submit' }, glyph(Check), editing ? 'Save changes' : 'Save creation'), buttonLink('/library#entries', 'Cancel', { variant: 'ghost' }))))),
    h('p', { className: 'browser-note' }, glyph(Lock, 14), 'This browser’s cookie is your library key. ', h('a', { href: '/privacy' }, 'How it works')),
    editing && h('a', { className: 'remove-link', href: `/creations/${record.id}/remove` }, 'Remove this creation'));
}
export function removeView(ctx, record) {
  return h('section', { className: 'reading-column' }, back(`/creations/${record.id}/edit`, 'Back to entry'),
    intro('ENTRY DESK', 'Remove this creation?', 'This removes the bookmark from your library, not the original website. This can’t be undone.'),
    h(Card, { className: 'entry-card' }, h(CardContent, null, h('h2', null, record.title), h('p', { className: 'record-url' }, record.url),
      h('form', { action: `/creations/${record.id}/remove`, method: 'post', className: 'form-actions' }, hidden('csrf', ctx.csrf),
        h(Button, { type: 'submit', variant: 'destructive' }, 'Remove creation'), buttonLink(`/creations/${record.id}/edit`, 'Keep creation', { variant: 'outline' })))));
}
export function messageView(code, title, text) {
  return h('section', { className: 'reading-column' }, intro(String(code), title, text), buttonLink('/', 'Back to directory', { variant: 'outline', icon: ArrowRight }));
}
export function legalView(kind, contact) {
  const privacy = kind === 'privacy';
  const sections = privacy ? [
    ['What is saved', 'The public portfolio contains project names and production links. Your bookmarks, collections, stars and save dates are kept separately in SQLite. In the hosted app, Vercel serves the site and Turso hosts the private database. The app does not fetch content from bookmarked websites.'],
    ['Your browser key', 'Browsing the public index does not set a library cookie. Opening the private library or entry desk sets one essential HTTP-only cookie. Return using this site and browser profile. Clearing the cookie or changing browsers disconnects you from the stored records; it does not erase them.'],
    ['Sharing and retention', 'The app uses no analytics, ad cookies or third-party embeds. Following a saved link visits that website under its own policy. Records stay until you remove them or the operator deletes the database. Backups may outlast a deletion.'],
  ] : [
    ['Using the index', 'Use the library to organize links you are entitled to keep. Do not store sign-in secrets, private access tokens, or material that violates the rights of others.'],
    ['Ownership and links', 'Saving a bookmark does not transfer ownership of a creation. External websites are not controlled by this app and may change or disappear.'],
    ['Availability and removal', 'You can edit or remove your records. The operator must establish final service, termination, liability and applicable-law terms before a public launch. Keep a separate backup of important work.'],
  ];
  return h('article', { className: 'reading-column legal' }, back('/', 'Back to directory'),
    intro('WORKSPACE NOTES  /  DRAFT', privacy ? 'Privacy policy' : 'Terms and conditions', 'Draft for operator review before public launch. This is not a final legal policy.'),
    ...sections.map(([title, text]) => h('section', { key: title }, h('h2', null, title), h('p', null, text))),
    h('section', { id: 'contact' }, h('h2', null, 'Contact'), h('p', null, contact ? h('a', { href: `mailto:${contact}` }, contact) : 'The operator has not yet supplied a public contact address.')));
}
