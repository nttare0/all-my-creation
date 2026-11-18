import { createApp } from '../server/app.mjs';
import { siteConfig } from '../server/config.mjs';
import { openPublicCatalog } from '../server/store.mjs';
import { hostedStore } from '../server/turso.mjs';

// Per-instance client only; no mutable data is written to the function filesystem.
// The Vercel filesystem route serves the allowlisted dist assets before this handler.
export function createVercelHandler(env, fetcher = fetch) {
  const config = siteConfig(env, true);
  if (!config.publicOrigin && /^[a-z0-9.-]+$/i.test(env.VERCEL_PROJECT_PRODUCTION_URL || '')) {
    config.publicOrigin = `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return createApp(hostedStore(env, fetcher) || openPublicCatalog(), { ...config, vercel: true });
}
let app;
export default function handler(req, res) {
  app ??= createVercelHandler(process.env);
  return app(req, res);
}
