import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Heading } from '@astryxdesign/core/Heading';

// Astryx accepts a direct SVG for glyphs outside its semantic registry.
const strokes = {
  web: 'M3 5h18v14H3z M3 9h18 M6 7h.01 M8 7h.01',
  design: 'M4 16 8 5l9-2 4 4-2 9-11 4-4-4Zm0 4 9-9 M12 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z',
  labs: 'M8 3h8 M10 3v6l-6 10a1.3 1.3 0 0 0 1.1 2h13.8a1.3 1.3 0 0 0 1.1-2L14 9V3 M8 15h8',
  unfiled: 'M3 7h7l2 2h9v10H3z M4 7V5h6l2 2h7v2',
  star: 'm12 3 2.8 5.7 6.3.9-4.55 4.45 1.08 6.27L12 17.36l-5.63 2.96 1.08-6.27L2.9 9.6l6.3-.9L12 3Z',
  chain: 'm10 14 4-4 M9.1 15.8l-1.2 1.3a3.6 3.6 0 0 1-5.1-5.1l4-4a3.6 3.6 0 0 1 5.1 0 M14.9 8.2l1.2-1.3a3.6 3.6 0 0 1 5.1 5.1l-4 4a3.6 3.6 0 0 1-5.1 0',
  grid: 'M3.5 3.5h6.7v6.7H3.5z M14 3.5h6.5v6.7H14z M3.5 14h6.7v6.5H3.5z M14 14h6.5v6.5H14z',
  plus: 'M12 5v14 M5 12h14', arrow: 'M5 12h14m-5-5 5 5-5 5',
  lock: 'M5 10h14v10H5z M8 10V7a4 4 0 0 1 8 0v3 M12 14v2',
  bookmark: 'M6 3.5h12v17l-6-4-6 4z',
};
export const art = Object.fromEntries(Object.entries(strokes).map(([name, d]) => [name,
  props => h('svg', { ...props, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d })),
]));
export const icon = (name, size = 'sm') => h(Icon, { icon: art[name] ?? name, size });
export const hidden = (name, value) => h('input', { key: name, type: 'hidden', name, value });
export const heading = (level, ...children) => h(Heading, { level }, ...children);
export const link = (href, ...children) => h(Link, { href, color: 'inherit', type: 'inherit' }, ...children);
export const micro = (...children) => h('span', { className: 'micro' }, ...children);

const brand = h('span', { className: 'brand' }, h('img', { src: '/icon.svg', alt: '', width: 32, height: 32 }), 'Indexroom');

export function layout({ title, description, origin, path = '/', noindex = false, nav = '', contact = '', writable = true }, content) {
  const canonical = new URL(path, origin).href;
  const share = new URL('/share.png', origin).href;
  const meta = (name, value) => h('meta', { key: name, [name.startsWith('og:') ? 'property' : 'name']: name, content: value });
  function navLink(key, href, glyph, text) {
    return h('span', { className: `nav-item${nav === key ? ' current' : ''}` }, link(href, icon(glyph), h('span', { className: 'nav-title' }, text)));
  }
  return '<!doctype html>' + renderToStaticMarkup(h('html', { lang: 'en' },
    h('head', null, h('meta', { charSet: 'utf-8' }), meta('viewport', 'width=device-width, initial-scale=1'),
      h('title', null, title), meta('description', description), meta('theme-color', '#f9f9f5'),
      noindex && meta('robots', 'noindex, nofollow'), h('link', { rel: 'canonical', href: canonical }),
      meta('og:site_name', 'Indexroom'), meta('og:type', 'website'), meta('og:title', title), meta('og:description', description),
      meta('og:url', canonical), meta('og:image', share), meta('og:image:width', '1200'), meta('og:image:height', '630'),
      meta('og:image:alt', 'Indexroom — the personal creation index'), meta('twitter:card', 'summary_large_image'),
      meta('twitter:title', title), meta('twitter:description', description), meta('twitter:image', share),
      h('link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }),
      h('link', { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' }),
      h('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }),
      h('link', { rel: 'stylesheet', href: '/assets/reset.css' }), h('link', { rel: 'stylesheet', href: '/assets/astryx.css' }),
      h('link', { rel: 'stylesheet', href: '/assets/theme.css' }), h('link', { rel: 'stylesheet', href: '/assets/site.css' }),
      h('script', { src: '/assets/enhance.js', defer: true })),
    h('body', null, h(Theme, { theme: neutralTheme, mode: 'light' },
      h('a', { className: 'skip', href: '#main' }, 'Skip to content'),
      h('header', { className: 'topbar' }, h('div', { className: 'wrap topbar-inner' },
        link('/', brand),
        h('nav', { className: 'navigation', 'aria-label': 'Main navigation' },
          navLink('portfolio', '/', 'grid', 'Portfolio'), navLink('library', '/library', 'bookmark', 'Library')),
        h('div', { className: 'header-end' }, nav && h('span', { className: 'workspace-tag' }, icon(nav === 'portfolio' ? 'web' : 'lock', 'xsm'), nav === 'portfolio' ? 'Public portfolio' : 'Private workspace'),
          writable && h(Button, { href: '/new', label: 'New creation', icon: icon('plus'), variant: 'secondary' })))),
      h('main', { id: 'main', className: 'wrap main', tabIndex: -1 }, content),
      h('footer', { className: 'wrap footer' }, h('span', { className: 'storage' }, h('i', { 'aria-hidden': true }), 'SQLite storage'),
        h('span', { className: 'foot-brand' }, 'Indexroom', h('span', null, ' / '), 'Personal archive'),
        h('nav', { 'aria-label': 'Site information' }, link('/privacy', 'Privacy'), link('/terms', 'Terms'), contact && link(`mailto:${contact}`, 'Contact'))),
      h('div', { id: 'navigation-status', role: 'status', className: 'sr-only' })))));
}
