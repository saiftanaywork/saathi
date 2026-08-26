# Saathi — guidance for Claude Code

Read [`docs/PRD.md`](./docs/PRD.md) first for product context (value prop,
pain points, ICP, non-goals) before making product decisions — not just
architectural ones.

## Tech stack (locked — don't introduce alternatives without discussion)

- **No build step.** Plain HTML/CSS/ES modules, loaded directly by the
  browser. No bundler, no framework, no npm dependency tree. This was a
  deliberate choice to match the project's other app (ROS-Pipeline) and
  keep the whole thing servable as static files.
- **Supabase** — Postgres, Auth, Storage, all accessed via the Supabase JS
  SDK loaded from a CDN in `index.html`. All access control is enforced by
  Postgres Row Level Security, never by keeping keys secret (the anon/
  publishable key is safe to expose client-side by design).
- **Vercel** — static hosting + one serverless function (`api/config.js`)
  that exposes `SUPABASE_URL`/`SUPABASE_ANON_KEY` from environment
  variables. Auto-deploys on push to `main`. See
  [`docs/ENVIRONMENTS.md`](./docs/ENVIRONMENTS.md) for the staging/prod
  strategy (currently: one shared Supabase project, deliberately).
- **Leaflet + OpenStreetMap** for the map view — chosen specifically
  because it needs no API key.
- Do not add React, Vue, Vite, webpack, TypeScript, or a package.json
  full of dependencies without discussing it first — the buildless
  approach is intentional, not a starting point to graduate from.

## Folder structure

```
index.html            shell, mounts #app, loads CDN scripts
api/config.js          Vercel serverless function: env vars -> JSON
css/styles.css          all styles (design tokens documented in docs/DESIGN_SYSTEM.md)
js/
  supabaseClient.js    resolves config from /api/config (falls back to a hardcoded dev project)
  constants.js          shared reference data, icon helpers, brand mark
  auth.js                session/profile state, sign up/in/out, role guards
  api.js                  every Supabase table/RPC/storage call lives here -- pages never call supabase.* directly
  router.js              hash router + auth guards (requireAuth/requireAdmin/requireCaregiver)
  errorTracking.js        global error/rejection handler -> error_logs table
  components/            navbar, footer, contact modal, caregiver card, star rating
  pages/                  one module per route, exports a `render`-html function + a `mount*` function that wires listeners after insertion
supabase/migrations/    schema, RLS policies, match_caregivers(), seed data -- applied via Supabase MCP tools, not a local CLI
docs/                   PRD, brand, design system, task backlog, environments strategy
```

## Conventions

- **`js/api.js` is the only file that talks to Supabase directly.** Pages
  and components import from it; this keeps RLS-shaped queries in one
  place and makes it obvious what the app's actual data surface is.
- **Every new table needs RLS enabled and explicit policies**, following
  the existing pattern: public directory data is `using (true)` for
  select, everything else is scoped to `auth.uid()` or gated through
  `internal.is_admin(auth.uid())`.
- **`is_admin()` and other RLS-helper functions live in the `internal`
  schema**, not `public` — this keeps them out of PostgREST's exposed API
  while still being callable from policies (which run under the querying
  role's own privileges, so they need `GRANT EXECUTE`, not `REVOKE`).
  Don't move helper functions back into `public` to "fix" a security
  lint about them being directly callable — that revocation approach
  was tried already and broke every RLS policy that references them.
  See `supabase/migrations/` history for how this was worked out.
- **Role can never come from client-supplied signup metadata except
  `family`/`caregiver`** — `admin` is only ever set via a direct SQL
  update. Don't change `handle_new_user()` to trust more of
  `raw_user_meta_data` than that.
- **Pages follow a two-function pattern**: a synchronous function
  returning the page's HTML shell (possibly with loading placeholders),
  and an async `mount*` function called after that HTML is inserted into
  the DOM, which fetches data and wires event listeners. See
  `js/pages/browse.js` for the fullest example (it also shows the pattern
  for view-mode toggling and cleaning up the Leaflet map instance on
  navigation-away).
- **Dark mode is not optional** — any new color needs a light `:root`
  definition, a `@media (prefers-color-scheme: dark)` override, and a
  `:root[data-theme="dark"]` override, matching the existing tokens.
- **Commit small and often.** Prefer several focused commits with clear
  messages over one large one, especially for anything touching RLS
  policies or the schema — it makes a later `git bisect` or migration
  rollback tractable.

## What we won't build (don't relitigate without updating docs/PRD.md first)

- A real third-party background-check vendor integration (Checkr,
  Sterling, etc.) — the Verified badge reflects an admin's own review, and
  that's a deliberate, disclosed limitation, not a stopgap to "finish."
- An in-app messaging inbox, availability calendar/booking, or a formal
  application/proposal flow — see `docs/TASKS.md` and README for the full
  list of care.com-style features considered and intentionally deferred.
- A staging Supabase project, until `docs/ENVIRONMENTS.md`'s trigger
  conditions are actually met.

## Where things are documented

- Product: [`docs/PRD.md`](./docs/PRD.md)
- Brand/voice/palette: [`docs/BRAND.md`](./docs/BRAND.md)
- Design system (components, tokens): [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md)
- Backlog: [`docs/TASKS.md`](./docs/TASKS.md)
- Environments/staging strategy: [`docs/ENVIRONMENTS.md`](./docs/ENVIRONMENTS.md)
- Setup, running locally, deploying: [`README.md`](./README.md)
