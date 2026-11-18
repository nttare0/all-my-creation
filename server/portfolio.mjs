import { createElement as h, Fragment } from 'react';
import { ArrowDownUp, ArrowUpRight, BookmarkPlus, Globe, LayoutGrid, List, Search, X } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import { Input } from '../components/ui/input.js';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '../components/ui/empty.js';
import { buttonLink, glyph, hidden } from './layout.mjs';
import { folio } from './folio.mjs';

export function directoryFilters(params) {
  return { find: (params.get('find') || '').trim().slice(0, 160), descending: params.get('order') === 'desc', list: params.get('layout') === 'list' };
}
function directoryPath({ find, descending, list }) {
  const p = new URLSearchParams();
  if (find) p.set('find', find);
  if (descending) p.set('order', 'desc');
  if (list) p.set('layout', 'list');
  return p.size ? `/?${p}#projects` : '/#projects';
}
function toolbar(f) {
  const viewLink = (label, list, Icon) => buttonLink(directoryPath({ ...f, list }), glyph(Icon, 17), {
    size: 'icon', variant: 'ghost', className: 'view-choice', title: label, 'aria-label': label, 'aria-current': f.list === list ? 'true' : undefined,
  });
  return h('div', { className: 'directory-tools' },
    h('form', { role: 'search', method: 'get', action: '/#projects', className: 'directory-search', 'aria-label': 'Find public projects' },
      f.descending && hidden('order', 'desc'), f.list && hidden('layout', 'list'),
      h('label', { className: 'sr-only', htmlFor: 'find-project' }, 'Search projects by name or domain'),
      h(Input, { type: 'search', name: 'find', id: 'find-project', defaultValue: f.find, placeholder: 'Search projects…', maxLength: 160, autoComplete: 'off', enterKeyHint: 'search', 'aria-keyshortcuts': 'Control+K Meta+K' }),
      h(Button, { type: 'submit', size: 'icon', variant: 'ghost', className: 'search-submit', 'aria-label': 'Search projects', title: 'Search projects' }, glyph(Search)),
      h('kbd', { className: 'search-key', 'aria-hidden': true, hidden: true })),
    h('div', { className: 'display-tools' },
      buttonLink(directoryPath({ ...f, descending: !f.descending }), f.descending ? 'Name: Z–A' : 'Name: A–Z', {
        icon: ArrowDownUp, size: 'sm', variant: 'outline', className: 'sort-order',
        title: f.descending ? 'Switch to ascending order' : 'Switch to descending order',
      }),
      h('nav', { className: 'view-switch', 'aria-label': 'Directory layout' }, viewLink('Grid view', false, LayoutGrid), viewLink('List view', true, List))));
}
function projectCard({ name, url, number }, writable) {
  return h('article', { key: name, className: 'project' }, h(Card, { className: 'project-card' }, folio(name, number),
    h(CardContent, { className: 'project-content' },
      h('div', { className: 'project-info' }, h('h2', null, h('a', { className: 'project-link', href: url, target: '_blank', rel: 'noopener noreferrer' },
        name, glyph(ArrowUpRight, 16), h('span', { className: 'sr-only' }, ' (opens in a new tab)'))),
        h('p', { className: 'domain' }, glyph(Globe, 12), new URL(url).hostname)),
      writable && buttonLink(`/new?project=${encodeURIComponent(name)}`, glyph(BookmarkPlus, 17), {
        variant: 'ghost', size: 'icon', className: 'save-copy', 'aria-label': `Save ${name} privately`, title: 'Save privately',
      }))));
}
export function portfolioView(projects, writable, f) {
  const needle = f.find.toLowerCase();
  const rows = projects.map((p, i) => ({ ...p, number: i + 1 })).filter(p => `${p.name} ${new URL(p.url).hostname}`.toLowerCase().includes(needle));
  if (f.descending) rows.reverse();
  return h('section', { id: 'projects', 'aria-labelledby': 'directory-heading' },
    h('div', { className: 'page-heading' }, h('h1', { id: 'directory-heading' }, 'Project directory'),
      h(Badge, { variant: 'outline', className: 'count', 'aria-label': `${projects.length} projects` }, projects.length)),
    toolbar(f),
    f.find && h('p', { className: 'filter-note' }, `${rows.length} ${rows.length === 1 ? 'match' : 'matches'} for “${f.find}”`,
      h('a', { href: directoryPath({ ...f, find: '' }) }, glyph(X, 13), 'Clear search')),
    rows.length ? h(Fragment, null, h('div', { className: 'project-grid', 'data-layout': f.list ? 'list' : 'grid' }, ...rows.map(p => projectCard(p, writable))),
      h('div', { className: 'directory-end', 'aria-hidden': true }, h('i'), 'END OF DIRECTORY', h('i'))) :
      h(Empty, { className: 'empty-box' }, h(EmptyHeader, null, glyph(Search, 24), h(EmptyTitle, null, 'No matching projects'),
        h(EmptyDescription, null, 'Try another project name or production domain.')), buttonLink(directoryPath({ ...f, find: '' }), 'View all projects', { variant: 'outline' })));
}
