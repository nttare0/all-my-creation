import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const local = f => new URL(`../public/${f}`, import.meta.url);
export const assetPaths = [
  ['/assets/shadcn.css', new URL('../build/shadcn.css', import.meta.url), 'text/css'],
  ['/assets/site.css', local('site.css'), 'text/css'], ['/assets/enhance.js', local('enhance.js'), 'text/javascript'],
  ['/icon.svg', local('icon.svg'), 'image/svg+xml'], ['/favicon.ico', local('favicon.ico'), 'image/x-icon'],
  ['/apple-touch-icon.png', local('apple-touch-icon.png'), 'image/png'], ['/share.png', local('share.png'), 'image/png'],
  ['/fonts/Figtree-LICENSE.txt', local('fonts/Figtree-LICENSE.txt'), 'text/plain'],
  ['/fonts/InstrumentSerif-LICENSE.txt', local('fonts/InstrumentSerif-LICENSE.txt'), 'text/plain'],
  ['/fonts/figtree.ttf', local('fonts/figtree.ttf'), 'font/ttf'], ['/fonts/instrument-italic.ttf', local('fonts/instrument-italic.ttf'), 'font/ttf'],
];

export function localAssets() {
  return new Map(assetPaths.map(([path, src, type]) => {
    const body = readFileSync(src);
    return [path, { body, type, zipped: type.startsWith('text/') && body.length > 1000 ? gzipSync(body) : null }];
  }));
}
