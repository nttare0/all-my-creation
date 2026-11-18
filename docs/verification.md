# Build verification

## Initial local-library milestone

**Initial decision:** one component system, Astryx (new project), on top of native forms and Modern Web Guidance. Node’s built-in `node:sqlite` stores the data on disk. There is no ORM, database service, client storage fallback, client router or JavaScript bundler.

## Discovery and dependencies

- `npx skills list --json`: Ponytail loaded from its project `SKILL.md`; all 25 Addy Osmani Agent Skills installed. Applied the spec, test and review workflows. Skill pins are separate from runtime dependencies.
- `npm run astryx -- template --list` → `library` is the searchable card-grid template. `template library --skeleton` → filter controls, grid and empty state. Used the structure without its demo records or media.
- `npm run astryx -- component TextInput Button Card Grid EmptyState Link` → `htmlName`, `status`, native `type="submit"`, card/grid composition, empty-state actions and external-link semantics. `component Form` returned `No component named "Form"`; `component FormLayout` documents a **native form** for submission. `component Field` documents wrapping a native control, used for the selects.
- `npm run astryx -- docs getting-started add-base-css-and-a-theme` and `docs icons custom-icons` → local reset/component/theme CSS and the supported SVG slot. `docs setup` returned `Unknown topic "setup"`; `getting-started` is the actual topic.
- `npx modern-web-guidance@latest search 'Responsive card grid layout'` and `search 'accessible form validation'` → retrieved `responsive-design`, `css-layout`, `forms`, `validate-input-after-interaction` and `accessible-error-announcement`. Applied responsive type, native constraints, visible focus and field-level feedback. Installed the skill with `install --agent codex -y` in the non-interactive workspace.
- Direct production dependencies: `@astryxdesign/core` and `@astryxdesign/theme-neutral` 0.7.16; peers `@stylexjs/stylex` 0.19.2, `react` and `react-dom` 19.3.1. Development dependency: `@astryxdesign/cli` 0.7.16. All versions are pinned in the npm lockfile.

## Checks run in the workspace

- `npm run build`, `npm test`, `npm audit` and `npx modern-web-guidance@latest legacy-scan public`. This is JavaScript served by Node; there is no separate TypeScript or frontend compilation step.
- Tests use disposable databases: normalized URLs, duplicate protection, optional metadata, ownership, pagination, filtering, sorting, changes and deletions, and reopening a file after closing SQLite. HTTP tests exercise actual form submissions, CSRF/origin checks, confirmation pages, static-file boundaries and private/production headers.
- Chromium: saved a URL, edited its title and folder, starred it, filtered it, reopened it and confirmed removal. No script exceptions or third-party requests in that flow. Checked the home layout at 320, 360, 390, 570, 768, 1024 and 1440 pixels, and the populated list/editor on a narrow screen.

## Security review (rule 11)

| Checks | Local result / applicability |
| --- | --- |
| 01, 03, 10, 11, 13, 14, 16 | Explicit asset allowlist. No database, Git files, source maps or third-party scripts served. CSP, `nosniff`, referrer and permissions policies. Production HTTPS enables HSTS and denies framing; preview mode intentionally permits the workspace frame. |
| 02, 08, 18, 21–26 | Atomic writes and per-owner uniqueness. Never fetch user URLs. HTTP(S) links without embedded credentials only. React escapes text. Fixed redirect destinations, bound SQL values, explicit writable fields, ownership predicates on all queries, session-bound CSRF token and same-origin forms. No cross-origin API. |
| 27, 30–32 | Random HTTP-only cookie; its digest scopes the library, not a client-supplied account ID. Secure HTTPS cookie; partitioned for embedded previews. Generic server errors. No admin, cron or webhook routes. Bounded bodies, pages, rate and collection size. |
| 28, 29 | Pinned dependencies; npm audit reported zero vulnerabilities. Database and environment files ignored. The base commit contains only the project-name README. No credentials are needed to run the app. |
| 04, 05, 07, 09, 12, 15, 17, 19, 20 | No accounts, password reset, object-storage provider, checkout, SMS, model calls or JWTs. These checks do not apply to the current feature set. |
| 06 and hosting verification | No production domain configured or deployment performed. Check DNS ownership, TLS, actual response headers, storage, backups and restoration on the real host. Restrict direct access to the Node process behind the trusted reverse proxy. |

## Launch review (rule 12)

- **01–14:** branded 404; titles and descriptions; above-fold save form and sticky mobile new-entry action; ICO/SVG/apple-touch icons; robots and sitemap for public routes only; local 1200×630 share card; decorative marks with empty alt or `aria-hidden`; responsive layouts; pending form status, inline errors with preserved input; private `/saved/:id` confirmation after a write. No stock photography or remote image URLs.
- **15–17:** `/privacy` and `/terms` are linked drafts, not finalized legal text. The library uses one essential cookie and no non-essential storage or tracking, so no optional-consent banner is shown.
- **18–20:** analytics are intentionally not enabled on private libraries. `CONTACT_EMAIL` supports a real operator address; none was supplied. Share card and icons are optimized local assets (share PNG under 20 KB).

**At the local milestone, not a production sign-off:** provision a persistent SQLite volume, test backup/restore, review the legal drafts, supply contact details, decide whether analytics belong on this private tool, and validate share metadata at the real origin before launch. Do not enable tracking without the appropriate consent mechanism.

## Vercel portfolio release (2026-11-18)

- Enumerated the `nttare` team through the last Vercel projects page and checked assigned production aliases. Imported 13 distinct names/origins; excluded the new Indexroom host. The reviewed SQL snapshot is the only Vercel project data in the app. Nothing was redeployed or reconfigured on the source projects.
- Kept Astryx as the only component system. Rechecked `template library --skeleton` and `component Link Card Button Grid --detail brief`; used its grid, link and card components. Modern Web Guidance `card`/`accessibility` informed the separate link and save actions. No new npm dependencies. Hosting uses Node's built-in SQLite and native fetch, not an ORM or ephemeral writable file.
- `npm run build`, `npm test` (13), `npm audit --audit-level=high`, `git diff --check`. Local SQLite import verified with 13 public rows and no private seed rows. Public-only mode has no cookie, private table or write handler; the missing binding is reported rather than silently losing saves.
- `SQLD_BIN=… npm run test:libsql` with **real sqld 0.24.32 on loopback**: exercised the Vercel handler and libSQL HTTP protocol, transactional schema/catalog install, private CRUD and duplicate handling, separate visitors, and another migration/cold start without losing a personal record. Not a production Turso credential or backup/restore test.
- Chromium: visited the public directory at 320–1440 px, opened a private copy form, then saved, edited, starred, filtered and removed a bookmark in an isolated library. No horizontal overflow, third-party requests or JS exceptions in the tested flow. Static output includes only the allowlisted assets and font licenses.
- Deployment-specific checks still required: verify the public production domain, configure a dedicated Turso libSQL database in the Vercel dashboard, redeploy and verify production writes in two browser profiles. Review legal drafts, operator contact and backups. Local tests do not establish those production facts.

## Directory-first shadcn/ui redesign

**Decision:** the requested shadcn/ui system replaces Astryx for the public directory, navigation, legal pages and all private flows. Same React SSR, native form submissions, cookies, SQLite schema and hosted adapter. No second component system, client hydration, remote preview service, analytics, or browser storage.

- Restored the pinned Ponytail and Agent Skills installation with `npx skills experimental_install -a codex --frozen-lockfile`. Modern Web Guidance `search` and `retrieve card,css-layout,accessibility` informed the grid, focus states and separate visit/save links.
- shadcn 4.23.0: `search @shadcn --query card --type ui` found `@shadcn/card`; `add -y card input button badge alert empty native-select` installed seven upstream components. Read the installed source and the [Card](https://ui.shadcn.com/docs/components/radix/card), [Button](https://ui.shadcn.com/docs/components/radix/button), and [Input](https://ui.shadcn.com/docs/components/radix/input) docs.
- Direct `init`/registry discovery encountered “Client network socket disconnected before secure TLS connection was established” at `ui.shadcn.com`. Used the official [manual installation configuration](https://ui.shadcn.com/docs/installation/manual) for this plain Node project, and fed the CLI the matching [official registry source and descriptors](https://github.com/shadcn-ui/ui/tree/968d8cb9dc42ae5d52e8fd356cf84596ec832a26/apps/v4/registry/new-york-v4) from a local copy. The installed JSX was converted once to equivalent React JSX-runtime calls for native ESM. Edit the owned `.js` modules; when refreshing a component with the CLI, translate its new `.jsx` to `.js` before importing it into Node. Upstream MIT license included.
- Direct registry runtime dependencies: `cn`, `class-variance-authority`, `radix-ui`, `lucide-react`. Dev-only CSS compilation: `tailwindcss`, `@tailwindcss/cli`. Versions are pinned. React/React DOM stayed on their existing versions; the Astryx CLI, components, theme and StyleX dependency were removed.
- The sidebar was removed from the shared layout. `shadcn search @shadcn --query button --type ui` found the already installed Button; MWG `retrieve navbar` informed the single semantic header navigation and current-page links. Starred and collection filters remain within the private library. No new dependencies.
- `npm run build`, all 15 `npm test` cases, `npm audit --audit-level=high`, and MWG `legacy-scan public` passed locally. Automated HTTP tests cover removal of the hero and sidebar, navigation to private pages, the `#projects` anchor, filtering by assigned domain, descending order, list view, private isolation and catalog-only behavior. Existing security, CRUD, hosted-adapter and persistence tests still pass.
- Chromium: checked layouts from 320 to 1440 px, keyboard search, grid/list links and sorting, no results, saving a public project as a private copy, then editing, starring, searching and deleting it in a disposable database. No horizontal overflow, third-party requests or JavaScript exceptions in this flow. The appearance is typography and decorative vector marks, not generated photography or project screenshots.
- Local review only: no production database migration or production deployment was performed for the redesign. The previous production storage, operator contact, backup and legal review requirements still apply.
