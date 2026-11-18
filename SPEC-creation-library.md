# Creation library

Save a creation by URL and find it again after refreshing the page or restarting the server. A new library starts empty. A quick save needs only an HTTP(S) URL; a title and a collection are optional. The default title is the hostname. Do not fetch the submitted URL.

Use server-rendered shadcn/ui controls, ordinary links and forms, and one Node process with an on-disk SQLite database. A random, HTTP-only browser cookie identifies the private library; creation data lives only on the server. There is no account system or cross-device sync in this version.

1. Test URL validation, duplicate handling, library isolation and persistence against SQLite.
2. Connect the forms to create, list, search, star, edit and remove records. Confirm removal first. Return clear feedback without losing input.
3. Verify the complete browser flow, including narrow layouts and empty results. Document the database path, backup procedure, and production requirements.

Commands: `npm test` for the persistence and HTTP tests; `npm run build` for the server/module check; `npm start` for the site. No client bundle or external service is required.

## Public portfolio & Vercel

The home page lists the 13 existing Vercel projects from nttare, alphabetically, using only their approved names and production origins. A separate `/library` retains the private browser-keyed bookmark flows. A public project can be copied to a private library without changing the original. Public pages never read private tables or set a library cookie.

Use the same SQLite schema and bound queries on disk and over Turso’s documented libSQL HTTPS interface. A production build with both database variables imports the catalog transactionally without touching private records. With no credentials, serve only the released catalog from a read-only SQLite snapshot; private routes must decline writes rather than use ephemeral storage. Test both modes before requesting a production deployment of this branch.

## Directory-first presentation

The public route begins at `#projects` with one “Project directory” heading and no introductory hero. Pages share a compact top header rather than a sidebar. The Indexroom wordmark links to the directory; Starred and collection filters live in My library. The grid and compact list show the same public projects with their stable production links. Search (`find`), order (`order=desc`) and layout (`layout=list`) are public GET parameters; old private filter URLs still redirect to `/library`. The redesign must not set a cookie on the public page or offer private writes in catalog-only mode.
