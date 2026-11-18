import { createElement as h, Fragment } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Field } from '@astryxdesign/core/Field';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Grid } from '@astryxdesign/core/Grid';
import { Link } from '@astryxdesign/core/Link';
import { TextInput } from '@astryxdesign/core/TextInput';
import { COLLECTIONS } from './store.mjs';
import { art, heading, hidden, icon, link, micro } from './layout.mjs';

const two = n => String(n).padStart(2, '0');
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

function fileSpecimen(count, portfolio = false) {
  return h('div', { className: 'specimen', 'aria-hidden': true },
    h('span', { className: 'register r1' }, '+'), h('span', { className: 'register r2' }, '+'),
    h('span', { className: 'register r3' }, '+'), h('span', { className: 'register r4' }, '+'),
    h('div', { className: 'paper-stack' },
      h('div', { className: 'slip slip-back' }, h('b', null, '03'), h('i', null, portfolio ? 'PROJECTS' : 'EXPERIMENTS')),
      h('div', { className: 'slip slip-mid' }, h('b', null, '02'), h('i', null, portfolio ? 'WEBSITES' : 'DESIGN')),
      h('div', { className: 'slip slip-front' },
        h('div', { className: 'slip-head' }, h('span', null, 'INDEXROOM'), h('span', null, 'IR—01')),
        h('div', { className: 'slip-center' }, h('em', null, 'Index'), h('span', { className: 'print-star' }, '✳')),
        h('div', { className: 'slip-foot' }, h('span', null, portfolio ? 'PUBLIC PORTFOLIO' : 'PERSONAL ARCHIVE'), h('span', { className: 'barcode' })))),
    h('span', { className: 'spec-caption' }, `FIG 01  /  ${String(count).padStart(3, '0')} ${portfolio ? 'PROJECTS' : 'FILED'}`));
}

export function portfolioView(projects, writable) {
  const colors = ['web', 'design', 'unfiled', 'labs'];
  return h(Fragment, null,
    h('section', { className: 'hero portfolio-hero', 'aria-label': 'Public portfolio' },
      h('div', { className: 'hero-copy' },
        h('p', { className: 'eyebrow' }, h('span', { className: 'eyebrow-line' }), 'NTTARE   /   PUBLIC PORTFOLIO'),
        heading(1, 'The project ', h('em', null, 'index.')),
        h('p', { className: 'lede' }, 'A directory of my projects on Vercel. Pick a name below to open the original site.'),
        h('div', { className: 'portfolio-actions' }, h(Button, { href: '#projects', label: 'Browse projects', endContent: icon('arrow'), variant: 'primary' }),
          micro(`${two(projects.length)} PROJECTS   /   A–Z`))), fileSpecimen(projects.length, true)),
    h('section', { className: 'entries public-entries', id: 'projects', 'aria-label': 'Project directory' },
      h('div', { className: 'section-head' }, h('div', { className: 'results-heading' },
        heading(2, 'Project directory'), h('span', { className: 'result-count' }, projects.length)), micro('PRODUCTION LINKS')),
      h('div', { className: 'record-grid' }, h(Grid, { columns: { minWidth: 245 }, gap: 4 }, ...projects.map((p, i) =>
        h('article', { key: p.name, className: `record public-record ${colors[i % colors.length]}` }, h(Card, { padding: 0 },
          h('div', { className: 'record-head' }, h('span', { className: 'file-code' }, icon('web'), 'PROJECT'), micro('Nº ', two(i + 1))),
          h('div', { className: 'record-body' }, heading(3, h(Link, { href: p.url, isExternalLink: true, color: 'inherit', type: 'inherit' }, p.name)),
            h('p', { className: 'record-url' }, new URL(p.url).hostname)),
          writable && h('div', { className: 'record-foot' }, link(`/new?project=${encodeURIComponent(p.name)}`, icon('bookmark', 'xsm'), 'Save privately'))
        )))))));
}

function capture(ctx, count, collection) {
  return h('section', { className: 'hero', 'aria-label': 'Your creation index' },
    h('div', { className: 'hero-copy' },
      h('div', { className: 'eyebrow' }, h('span', { className: 'eyebrow-line' }), 'THE PERSONAL ARCHIVE', h('span', { className: 'vol' }, '/  VOL. 01')),
      heading(1, 'Creation ', h('em', null, 'index.')),
      h('p', { className: 'lede' }, 'A home for the things you make. Save a link, file it away, and come back to it anytime.'),
      h('form', { className: 'capture', action: '/creations', method: 'post', 'data-pending': 'Saving link…' },
        hidden('csrf', ctx.csrf), collection && hidden('collection', collection),
        h(TextInput, { htmlName: 'url', label: 'Quick save a URL', value: '', type: 'url', inputMode: 'url', enterKeyHint: 'go',
          startIcon: art.chain, placeholder: 'Paste your link…', autoComplete: 'url', hasSpellCheck: false, isRequired: true, width: '100%' }),
        h(Button, { type: 'submit', label: 'Save link', variant: 'primary', icon: icon('plus') }))),
    fileSpecimen(count));
}

function folders(counts, filters) {
  return h('section', { className: 'collections', 'aria-label': 'Filter by collection' },
    h('div', { className: 'section-head' }, heading(2, 'Collections'), micro('04 FOLDERS')),
    h('div', { className: 'folder-grid' }, ...COLLECTIONS.map((c, i) => {
      const selected = filters.collection === c.id;
      return h('div', { key: c.id, className: `folder ${c.id}${selected ? ' chosen' : ''}` },
        h(Link, { href: libraryPath({ collection: selected ? '' : c.id }), display: 'block', color: 'inherit', type: 'inherit' },
          h('span', { className: 'tab' }, `F / ${two(i + 1)}`),
          h('span', { className: 'folder-face' },
            h('span', { className: 'folder-details' }, icon(c.id, 'md'), h('span', { className: 'folder-count' }, two(counts[c.id] || 0))),
            h('span', { className: 'folder-name' }, c.label, icon('arrow')))));
    })));
}

function recordCard(r, csrf, filters) {
  const collection = COLLECTIONS.find(c => c.id === r.collection);
  return h('article', { key: r.id, className: `record ${r.collection}` }, h(Card, { padding: 0 },
    h('div', { className: 'record-head' }, h('span', { className: 'file-code' }, icon(r.collection), collection.code), micro('Nº ', String(r.id).padStart(3, '0'))),
    h('div', { className: 'record-body' }, heading(3, h(Link, { href: r.url, isExternalLink: true, color: 'inherit', type: 'inherit' }, r.title)),
      h('p', { className: 'record-url', dir: 'auto' }, r.url), h('time', { dateTime: r.created_at }, date.format(new Date(r.created_at)))),
    h('div', { className: 'record-foot' },
      h('form', { method: 'post', action: `/creations/${r.id}/star` }, hidden('csrf', csrf), hidden('starred', r.starred ? '0' : '1'),
        hidden('filters', libraryPath(filters).split('#')[0].split('?')[1] || ''),
        h(Button, { type: 'submit', size: 'sm', variant: 'ghost', icon: icon('star'), label: r.starred ? 'Unstar' : 'Star' })),
      link(`/creations/${r.id}/edit`, 'Edit details', icon('chevronRight', 'xsm')))));
}

function findForm(f) {
  return h('form', { className: 'find-form', method: 'get', action: '/library#entries', role: 'search', 'aria-label': 'Search and sort creations' },
    f.collection && hidden('collection', f.collection), f.starred && hidden('view', 'starred'),
    h(TextInput, { type: 'search', htmlName: 'q', label: 'Search creations', isLabelHidden: true, value: f.q,
      startIcon: 'search', placeholder: 'Search creations…', enterKeyHint: 'search', autoComplete: 'off', controlClassName: 'search-control' }),
    h(Button, { type: 'submit', label: 'Search', size: 'sm', variant: 'secondary' }),
    h(Field, { label: 'Sort by', inputID: 'sort', isLabelHidden: true },
      h('select', { name: 'sort', id: 'sort', defaultValue: f.sort }, h('option', { value: 'newest' }, 'Newest first'), h('option', { value: 'name' }, 'Title A–Z'))));
}

export function libraryView(ctx, f, data, saved) {
  const totalFiled = Object.values(data.counts).reduce((a, b) => a + b, 0);
  const group = COLLECTIONS.find(c => c.id === f.collection);
  const title = f.starred ? 'Starred creations' : group ? group.label : 'All creations';
  const filtered = Boolean(f.starred || group || f.q);
  const emptyTitle = f.q ? 'No matching creations' : f.starred ? 'No starred creations yet' : group ? 'An open folder' : 'Your first creation goes here.';
  const hint = f.q ? `Nothing matches “${f.q}”. Try a different title or URL.` : f.starred ? 'Star a creation in your library to keep it close at hand.' : group ? `Save a link to ${group.label}, or move one here from Edit details.` : 'Paste a URL above, or add a creation with a title and collection.';
  return h(Fragment, null,
    saved && h('div', { className: 'notice' }, h(Banner, { status: 'success', title: 'Creation saved', description: `“${saved.title}” is filed in your library.`,
      endContent: h(Button, { href: `/creations/${saved.id}/edit`, label: 'Edit details', variant: 'secondary' }) })),
    capture(ctx, totalFiled, f.collection), folders(data.counts, f),
    h('section', { id: 'entries', className: 'entries' },
      h('div', { className: 'section-head entries-head' }, h('div', { className: 'results-heading' }, heading(2, title), h('span', { className: 'result-count' }, data.total), h('span', { className: 'starred-view' }, link(libraryPath({ ...f, starred: !f.starred, page: 1 }), icon('star', 'xsm'), f.starred ? 'Show all' : 'Starred'))), findForm(f)),
      filtered && h('p', { className: 'filter-summary' }, f.q ? `Results for “${f.q}”` : `Viewing ${title.toLowerCase()}`, ' · ', link('/library#entries', 'Clear filters')),
      data.rows.length ? h('div', { className: 'record-grid' }, h(Grid, { columns: { minWidth: 265 }, gap: 4 }, ...data.rows.map(r => recordCard(r, ctx.csrf, f)))) :
        h('div', { className: 'empty-panel' }, h(EmptyState, { title: emptyTitle, description: hint, headingLevel: 3, isCompact: true,
          icon: h('span', { className: 'empty-icon' }, icon(f.q ? 'search' : f.starred ? 'star' : 'bookmark', 'md')),
          actions: h(Button, { label: filtered && !group ? 'View all creations' : 'Add a creation', href: filtered && !group ? '/library#entries' : `/new${group ? `?collection=${group.id}` : ''}`, variant: 'ghost', size: 'sm', endContent: icon('arrow') }) })),
      data.pages > 1 && h('nav', { className: 'pagination', 'aria-label': 'Results pages' },
        data.page > 1 && link(libraryPath({ ...f, page: data.page - 1 }), '← Previous'), micro(`PAGE ${data.page} / ${data.pages}`),
        data.page < data.pages && link(libraryPath({ ...f, page: data.page + 1 }), 'Next →'))));
}

function pageIntro(label, title, italic, description) {
  return h('header', { className: 'page-intro' }, micro(label), heading(1, title, h('em', null, italic)), h('p', null, description));
}
export function editorView(ctx, record = {}, error) {
  const editing = Boolean(record.id);
  const status = field => error?.field === field ? { type: 'error', message: error.message } : undefined;
  return h('section', { className: 'inner-page editor' }, link('/library#entries', '← Back to library'),
    pageIntro('ENTRY DESK   /   ' + (editing ? 'EDIT' : 'NEW'), editing ? 'Edit ' : 'New ', 'creation.',
      editing ? 'Keep this entry up to date, or move it into a different collection.' : 'Start with a URL. Give it a name and a folder if you like.'),
    h(Card, { padding: 6 },
      error && h('div', { className: 'form-error' }, h(Banner, { status: 'error', title: 'This creation wasn’t saved', description: error.message, role: 'alert' })),
      h('form', { method: 'post', action: editing ? `/creations/${record.id}/edit` : '/creations', 'data-pending': 'Saving creation…' }, hidden('csrf', ctx.csrf),
        h(FormLayout, null,
          h(TextInput, { label: 'Creation URL', htmlName: 'url', type: 'url', inputMode: 'url', isRequired: true, value: record.url || '', placeholder: 'https://your-creation.com', autoComplete: 'url', startIcon: art.chain, status: status('url'), statusVariant: 'detached' }),
          h(TextInput, { label: 'Title', htmlName: 'title', value: record.title || '', placeholder: 'A name to remember it by', isOptional: true, description: 'Leave blank to use the site’s hostname.', status: status('title'), statusVariant: 'detached' }),
          h(Field, { label: 'Collection', inputID: 'collection', status: status('collection'), statusVariant: 'detached' },
            h('select', { name: 'collection', id: 'collection', defaultValue: record.collection || 'unfiled' }, ...COLLECTIONS.map(c => h('option', { key: c.id, value: c.id }, c.label))))),
        h('div', { className: 'form-actions' }, h(Button, { label: editing ? 'Save changes' : 'Save creation', type: 'submit', variant: 'primary', icon: icon('check') }), link('/library#entries', 'Cancel')))),
    h('p', { className: 'browser-note' }, icon('lock', 'xsm'), ' Saved in SQLite. This browser’s cookie is your library key. ', link('/privacy', 'How it works')),
    editing && h('div', { className: 'remove-link' }, link(`/creations/${record.id}/remove`, 'Remove this creation')));
}

export function removeView(ctx, record) {
  return h('section', { className: 'inner-page' }, link(`/creations/${record.id}/edit`, '← Back to entry'),
    pageIntro('ENTRY DESK   /   REMOVE', 'Remove this ', 'creation?', 'This removes the bookmark from your library, not the original website. This can’t be undone.'),
    h(Card, { padding: 6 }, heading(2, record.title), h('p', { className: 'record-url' }, record.url),
      h('form', { action: `/creations/${record.id}/remove`, method: 'post', className: 'form-actions' }, hidden('csrf', ctx.csrf),
        h(Button, { type: 'submit', label: 'Remove creation', variant: 'destructive' }), link(`/creations/${record.id}/edit`, 'Keep creation'))));
}

export function messageView(code, title, text) {
  return h('section', { className: 'inner-page' }, pageIntro(`INDEXROOM  /  ${code}`, title, '', text), h(Button, { href: '/', label: 'Browse public projects', variant: 'primary' }));
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
  return h('article', { className: 'inner-page legal' }, link('/', '← Back to portfolio'),
    pageIntro('WORKSPACE NOTES   /   DRAFT', privacy ? 'Privacy ' : 'Terms & ', privacy ? 'policy.' : 'conditions.', 'Draft for operator review before public launch. This is not a final legal policy.'),
    ...sections.map(([title, text]) => h('section', { key: title }, heading(2, title), h('p', null, text))),
    h('section', { id: 'contact' }, heading(2, 'Contact'), h('p', null, contact ? link(`mailto:${contact}`, contact) : 'The operator has not yet supplied a public contact address.')));
}
