# Indexroom

**`/` is a public portfolio. `/library` is your private bookmark library.** The portfolio lists 13 existing projects in the `nttare` Vercel team by name and assigned production URL. It does not expose deployment metadata or personal bookmarks. The links are a release snapshot, not a live Vercel API feed. Indexroom itself is excluded.

The homepage opens directly on the directory. Search by name or production domain, switch between grid and list, or reverse the alphabetical order. These controls are ordinary links and a GET form; they work without JavaScript. Select a project name to visit it or its bookmark icon to **save privately** when storage is connected. In the library, paste an HTTP(S) URL into **Quick save a URL** or use **New creation** to supply a title and collection. You can search, filter, star, edit and remove bookmarks. A private edit never changes the public portfolio. The app does not fetch the bookmarked sites.

## Run locally

Use **Node.js 26.x** with npm, matching the production runtime. `engines.node` allows minor and patch updates within 26 but not an automatic major upgrade.

```sh
npm ci
npm start              # http://localhost:3000, or open the workspace preview
npm run dev            # alternative: watch server modules
npm run build          # compile shadcn/Tailwind CSS, check the catalog and produce allowlisted assets
npm test               # disposable SQLite, HTTP, portfolio and hosted-adapter tests
npm audit
```

`npm start`, `npm run dev`, and `npm test` compile the small local stylesheet first. Install dev dependencies for these commands. The deployed Node function needs neither Tailwind nor a client-side React bundle.

The server binds to `0.0.0.0` on `PORT` (default 3000). All public and private records are stored in **`data/indexroom.sqlite`**; set `DATABASE_PATH` to override it. No external service, Vercel token or browser storage is needed. The release SQL in [`catalog/projects.sql`](catalog/projects.sql) imports only the `public_projects` table; restarting or redeploying leaves `creations` intact.

## Deploy to Vercel with hosted SQLite

Use the **[`indexroom` project in `nttare`](https://vercel.com/nttare/indexroom)**, linked to this repo. `vercel.json` selects the Other preset, `npm ci --include=dev`, `npm run build`, and **`dist`** for static assets. A Node function handles pages and standard HTML form submissions. Do not deploy `dist` on its own: it is not a standalone website.

The build leaves npm’s cache at its default (or the supported `NPM_CONFIG_CACHE` setting). The empty build-only `*_CACHE_DIR` settings clear the obsolete npm option inherited from the builder; they do not turn off caching or warnings. Tailwind uses the prebuilt `@parcel/watcher` package for the build platform, so `allowScripts` explicitly denies its optional source-build script. No Astryx packages or script approvals are needed.

1. Create or choose a dedicated **Turso Cloud libSQL** database (the SQLite-compatible libSQL engine). In the Indexroom project's **Settings → Environment Variables**, set `TURSO_DATABASE_URL` to its `libsql://…` or `https://…` database origin and `TURSO_AUTH_TOKEN` to a **database-scoped read/write** token with schema access. Select **Production**; mark the token sensitive. No organization-wide API token is needed. Never paste a token in chat, add it to Git, or prefix these variables with a public/client prefix.
2. Deploy the commit containing this app as **Production**. For an existing deployment, **redeploy the same source after saving the variables**. The Vercel build applies the schema and catalog in one transaction; private records are not deleted or reseeded. Give previews a separate database or leave them catalog-only. Do not give preview builds production credentials.
3. Open `/` on the assigned production domain and check the directory. Open `/library`, save a bookmark, reload, and confirm a second browser profile cannot see it. Return on the **same hostname**: the library cookie is host-specific. `PUBLIC_ORIGIN` is optional on Vercel (defaults to the project production URL for metadata); if supplied, use the actual HTTPS origin.

**Without either variable**, the release still serves the public directory: the SQL snapshot is loaded into a query-only SQLite database, and there is no private table. **Private routes return 503 and do not accept saves.** Supplying only one variable or an invalid origin is a configuration error, not a fallback. With both set, the directory and bookmarks use the hosted database. Nothing writes a mutable SQLite file in a Vercel function or `/tmp`.

The hosted adapter uses native `fetch` and Turso's documented [libSQL HTTP pipeline](https://github.com/tursodatabase/libsql/blob/main/docs/HTTP_V2_SPEC.md). To run the optional end-to-end check against a **disposable local libSQL server**, install `sqld` separately and run `npm run test:libsql` (or set `SQLD_BIN` to its absolute path). It needs no cloud credentials.

## Access, backups and launch settings

Each private library uses one random HTTP-only cookie. Its digest scopes database queries. The public directory does not set a library cookie. Clearing cookies, changing browsers, or changing domains disconnects you from your old library; it does not erase the records. There is no account recovery or cross-device sync.

- **Turso:** configure retention and backups for the production database, and test restoring into a separate database before relying on it. Redeployments are not backups.
- **Self-hosted Node:** use one process behind HTTPS, `NODE_ENV=production`, `PUBLIC_ORIGIN`, and a persistent writable volume for `DATABASE_PATH`. For backup, stop the server cleanly and copy its data directory. Do not copy a live `.sqlite` file without its WAL. Never publish a database or its backups.
- **Site policies:** set `CONTACT_EMAIL` to the operator’s real contact address and review the linked `/privacy` and `/terms` drafts. No analytics, marketing cookies, scraping or external embeds are enabled.

## Project guide

- `server/store.mjs`, `server/turso.mjs`, `catalog/projects.sql`: shared schema/queries, local and hosted SQLite storage, and public release snapshot. Private lists are limited to 12 per page and 3,000 per library.
- `server/app.mjs`, `server/main.mjs`, `api/index.mjs`: HTTP routes, session cookies, headers and runtime entry points.
- `components/ui/`: owned [shadcn/ui](https://ui.shadcn.com/) registry components in the project’s Node ESM format. `components.json` records the registry configuration.
- `server/layout.mjs`, `server/portfolio.mjs`, `server/views.mjs`: server-rendered navigation, directory, and private forms. `styles/ui.css` defines shadcn tokens; `public/site.css` lays out the workspace. `server/folio.mjs` provides decorative cover marks, not screenshots or remote thumbnails.
- `test/`, `scripts/check-libsql.mjs`, [verification notes](docs/verification.md): release checks and their limits.

Figtree and Instrument Serif are self-hosted under the OFL licenses in `public/fonts/`. Development skill versions are recorded in `skills-lock.json`; `npx skills experimental_install -a codex` restores the project’s rule-file skills. They are not required to run the app.
