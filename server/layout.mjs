import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Archive, Bookmark, Database, Plus } from 'lucide-react';
import { Button } from '../components/ui/button.js';

export const glyph = (Icon, size = 16) => h(Icon, { size, strokeWidth: 1.7, 'aria-hidden': true });
export const hidden = (name, value) => h('input', { key: name, type: 'hidden', name, value });
export const buttonLink = (href, label, { variant = 'default', size, icon, className, ...attrs } = {}) =>
  h(Button, { asChild: true, variant, size, className }, h('a', { href, ...attrs }, icon && glyph(icon), label));

function Header({ nav, writable }) {
  return h('header', { className: 'topbar' }, h('nav', { className: 'topbar-inner', 'aria-label': 'Main navigation' },
    h('a', { href: '/', className: 'brand', 'aria-label': 'Indexroom project directory', 'aria-current': nav === 'portfolio' ? 'page' : undefined },
      h('img', { src: '/icon.svg', alt: '', width: 29, height: 29 }), 'Indexroom'),
    buttonLink('/library', 'My library', { icon: Bookmark, size: 'sm', variant: 'ghost', 'aria-current': nav === 'library' ? 'page' : undefined }),
    writable ? buttonLink('/new', 'New creation', { icon: Plus, size: 'sm', 'aria-current': nav === 'new' ? 'page' : undefined })
      : h('span', { className: 'public-note' }, glyph(Archive, 14), 'Public view')));
}

export function layout({ title, description, origin, path = '/', noindex = false, nav = '', contact = '', writable = true }, content) {
  const canonical = new URL(path, origin).href;
  const share = new URL('/share.png', origin).href;
  const meta = (name, value) => h('meta', { key: name, [name.startsWith('og:') ? 'property' : 'name']: name, content: value });
  return '<!doctype html>' + renderToStaticMarkup(h('html', { lang: 'en' },
    h('head', null, h('meta', { charSet: 'utf-8' }), meta('viewport', 'width=device-width, initial-scale=1'),
      h('title', null, title), meta('description', description), meta('theme-color', '#fafaf8'),
      noindex && meta('robots', 'noindex, nofollow'), h('link', { rel: 'canonical', href: canonical }),
      meta('og:site_name', 'Indexroom'), meta('og:type', 'website'), meta('og:title', title), meta('og:description', description),
      meta('og:url', canonical), meta('og:image', share), meta('og:image:width', '1200'), meta('og:image:height', '630'),
      meta('og:image:alt', 'Indexroom — the personal creation index'), meta('twitter:card', 'summary_large_image'),
      meta('twitter:title', title), meta('twitter:description', description), meta('twitter:image', share),
      h('link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }), h('link', { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' }),
      h('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }),
      h('link', { rel: 'stylesheet', href: '/assets/shadcn.css' }), h('link', { rel: 'stylesheet', href: '/assets/site.css' }),
      h('script', { src: '/assets/enhance.js', defer: true })),
    h('body', null, h('a', { className: 'skip-link', href: '#main' }, 'Skip to content'),
      h(Header, { nav, writable }), h('main', { id: 'main', tabIndex: -1, className: 'page' }, content),
      h('footer', { className: 'site-footer' }, h('span', null, glyph(Database, 14), 'SQLite storage'),
        h('nav', { 'aria-label': 'Site information' }, h('a', { href: '/privacy' }, 'Privacy'), h('a', { href: '/terms' }, 'Terms'), contact && h('a', { href: `mailto:${contact}` }, 'Contact'))),
      h('div', { className: 'sr-only', role: 'status', id: 'navigation-status' }))));
}
