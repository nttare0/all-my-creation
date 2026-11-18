-- Public release snapshot, 2026-11-18. Names and assigned production origins only.
-- Refreshed inside the same transaction as the schema; never seed a personal library.
CREATE TABLE IF NOT EXISTS public_projects (
  name TEXT PRIMARY KEY NOT NULL,
  url TEXT NOT NULL UNIQUE
) STRICT;
DELETE FROM public_projects;
INSERT INTO public_projects(name, url) VALUES
  ('drop', 'https://zepvi.vercel.app'),
  ('hugo123', 'https://hugo123-two.vercel.app'),
  ('linknest', 'https://linknest-one-rosy.vercel.app'),
  ('load-bearing', 'https://load-bearing-pi.vercel.app'),
  ('nttare0', 'https://nttare0.vercel.app'),
  ('paper-style', 'https://paper-style.vercel.app'),
  ('saving-404', 'https://saving-404.vercel.app'),
  ('screen-2-screen', 'https://screen-2-screen.vercel.app'),
  ('shool', 'https://shool-dusky.vercel.app'),
  ('stream12', 'https://stream12-sand.vercel.app'),
  ('tiny-office', 'https://tiny-office-smoky.vercel.app'),
  ('v0-live-score-web-app', 'https://v0-live-score-web-app-beryl.vercel.app'),
  ('v0-mirror', 'https://v0-mirror-two.vercel.app');
