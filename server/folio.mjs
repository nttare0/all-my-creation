import { createElement as h } from 'react';

// Decorative catalog marks, not site previews. No requests to the indexed domains.
const repeat = (n, draw) => Array.from({ length: n }, (_, i) => draw(i));
const rect = (x, y, width, height, extra) => h('rect', { x, y, width, height, ...extra });
const sheet = 'var(--sheet)', ink = 'currentColor';
function ripple() {
  return h('g', { transform: 'rotate(-24)', fill: sheet, stroke: ink, strokeWidth: 2.4 },
    ...repeat(8, i => h('ellipse', { key: i, cx: (i - 3.5) * 2, cy: (3.5 - i) * 6.5, rx: 42 - i / 2, ry: 18 })),
    h('ellipse', { cx: 7, cy: -22.75, rx: 27, ry: 11, fill: ink, stroke: 'none' }));
}
function numerals(value) {
  return h('g', { transform: 'skewY(-7)', fontFamily: 'Figtree, sans-serif', fontWeight: 840, fontSize: 68, letterSpacing: -6, textAnchor: 'middle', stroke: ink, strokeWidth: 1.2, strokeLinejoin: 'round' },
    ...repeat(5, i => h('text', { key: i, x: 6 - i * 2, y: 27 - i * 2, fill: i === 4 ? ink : sheet }, value)));
}
function links() {
  return h('g', { transform: 'rotate(-34)', fill: 'none', stroke: ink, strokeWidth: 10 },
    rect(-58, -20, 69, 40, { rx: 20 }), rect(-10, -20, 69, 40, { rx: 20, transform: 'rotate(12 22 0)' }),
    h('path', { d: 'M-21 -20h12', stroke: sheet, strokeWidth: 17 }), h('path', { d: 'M-25 -20h17' }));
}
function layers() {
  return h('g', { stroke: ink, strokeWidth: 2, strokeLinejoin: 'round' }, ...repeat(4, i => h('g', { key: i, transform: `translate(${i * 2 - 3},${22 - i * 14})` },
    h('path', { d: 'M-49 -1 0 -21 49 -1 0 20Z', fill: sheet }), h('path', { d: 'M-49 -1 0 20v6L-49 5Z', fill: ink }), h('path', { d: 'M0 20 49 -1v6L0 26Z', fill: sheet }))));
}
function rosette() {
  return h('g', { fill: 'none', stroke: ink, strokeWidth: 2.4 }, ...repeat(14, i => h('ellipse', { key: i, cx: 0, cy: 0, rx: 17, ry: 48, transform: `rotate(${i * 180 / 14})` })));
}
function pages() {
  return h('g', { fill: sheet, stroke: ink, strokeWidth: 2, strokeLinejoin: 'round' }, ...repeat(7, i => rect(-29, -36, 62, 74, { key: i, rx: 2, transform: `rotate(${i * 8 - 24})` })),
    h('g', { transform: 'rotate(24)' }, h('path', { d: 'M-17 -19H18 M-17 -11H18 M-17 -3H7', fill: 'none' })));
}
function wave() {
  return h('g', { fill: 'none', stroke: ink, strokeWidth: 2.6, strokeLinecap: 'round', transform: 'rotate(-10)' },
    ...repeat(10, i => h('path', { key: i, transform: `translate(0 ${i * 4.7 - 21})`, d: 'M-56 7C-38 8 -31 -31 -14 -18S6 32 26 5 45 -15 56 -8' })));
}
const catalog = {
  drop: ['iris', ripple], hugo123: ['persimmon', () => numerals('123')], linknest: ['mint', links],
  'load-bearing': ['ochre', layers], nttare0: ['rose', rosette], 'paper-style': ['sky', pages],
  'saving-404': ['ink', () => numerals('404')], 'screen-2-screen': ['mint', layers], shool: ['iris', pages],
  stream12: ['sky', wave], 'tiny-office': ['persimmon', layers], 'v0-live-score-web-app': ['ochre', () => numerals('0:0')], 'v0-mirror': ['rose', links],
};
export function folio(name, number) {
  const [color, mark] = Object.hasOwn(catalog, name) ? catalog[name] : ['sky', rosette];
  return h('div', { className: `folio ${color}`, 'aria-hidden': true },
    h('span', { className: 'folio-id' }, `IR—${String(number).padStart(3, '0')}`), h('span', { className: 'register' }, '+'),
    h('svg', { className: 'folio-mark', viewBox: '-75 -55 150 110', focusable: false }, mark()),
    h('span', { className: 'folio-bars' }));
}
