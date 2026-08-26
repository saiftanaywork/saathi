# Saathi

A caregiver directory for South Asian families in the Dallas–Fort Worth area.
Originally a static-mock [Claude artifact](https://claude.ai/code/artifact/30ff2c3b-8ad8-47ea-8a4d-2c77678b82c4); this repo turns it into a real app backed by Supabase.

## Docs

- [`CLAUDE.md`](./CLAUDE.md) — tech stack, folder structure, and
  conventions (read by Claude Code automatically)
- [`docs/PRD.md`](./docs/PRD.md) — value prop, pain points, ICP, non-goals
- [`docs/BRAND.md`](./docs/BRAND.md) — name, positioning, voice, palette
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — tokens and component map
- [`docs/TASKS.md`](./docs/TASKS.md) — backlog, broken out from the PRD
- [`docs/ENVIRONMENTS.md`](./docs/ENVIRONMENTS.md) — staging/prod strategy

## What's here

- **Directory browsing** with gallery/list/**map** view modes, language/city/care-type/rate filters, and full-text search. The map (Leaflet + OpenStreetMap, no API key) jitters pins around each caregiver's city center since listings only store a city, not an address.
- **A matching algorithm** (`match_caregivers` Postgres function) that ranks caregivers against a signed-in family's filters *and* their past search history, surfaced as a "Recommended for you" rail on the browse page.
- **Login/signup** for families and caregivers, plus a separate **admin login** at `/admin/login`. New caregivers land in a **care.com-style multi-step wizard** (basics + photo → languages/care types → experience → bio → get verified); new families land in a short 2-step "what are you looking for" quiz that seeds their first search-history row so recommendations aren't empty on day one.
- **Reviews & testimonials**: signed-in families can leave a 1-5 star rating + comment per caregiver (one per pair, editable); average rating shows on cards and profiles; a few recent 4-5★ reviews surface on the landing page.
- **Caregiver photos**: uploaded to a public Supabase Storage bucket, shown on cards/profile/map in place of the initials avatar once set.
- **Background-check status with document verification**: a caregiver can upload supporting documents (ID, certifications — private Storage bucket, owner + admin only) and request a review; an admin reviews the documents and approves/rejects from `/admin`; approved requests show a Verified badge on the public profile.
- **Saved caregivers** (favorites) for signed-in families.
- **Error tracking**: a minimal self-hosted alternative to a third-party
  service (no external account needed) — uncaught client errors and
  rejections report to an admin-only `error_logs` table, visible on the
  admin dashboard. See `js/errorTracking.js`.

## Architecture

Buildless static site — plain HTML/CSS/ES modules, no bundler, no Node
required to develop. Supabase provides auth, Postgres, and Row Level
Security; the Supabase JS SDK is loaded from a CDN in `index.html`.
Hash-based routing (`#/browse`, `#/login`, ...) means it deploys as a plain
static site with zero server config — no rewrites needed.

```
index.html            shell, mounts #app
css/styles.css         all styles
api/config.js          serverless function: exposes SUPABASE_URL/ANON_KEY env vars to the client
js/
  supabaseClient.js    Supabase client (fetches config from /api/config, falls back to a dev default)
  constants.js          shared reference data + icon helpers
  auth.js                session/profile state, sign up/in/out, role guards
  api.js                  all Supabase table/RPC calls
  router.js              hash router + auth guards
  components/            navbar, footer, contact modal, caregiver card
  pages/                  one module per route
supabase/migrations/    schema, RLS policies, match_caregivers(), seed data
```

## Environment variables

The site itself is still buildless, but `api/config.js` is a small Vercel
Serverless Function (auto-detected — any file under `api/` is picked up with
zero config, no `package.json` needed) that hands the client its Supabase
URL/key from environment variables, so **Production**, **Preview**, and
**Development** can each point at a different Supabase project if you want
one:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (the publishable/anon key — safe to expose client-side; every access rule is enforced by Postgres RLS, not by keeping this secret)

Set these per environment in the Vercel dashboard under **Settings →
Environment Variables**, or via the CLI (`vercel env add SUPABASE_URL
production`, etc.). See `.env.example` for the shape.

If `/api/config` isn't reachable or the env vars aren't set for the current
environment (e.g. Local Development without `vercel dev`), `supabaseClient.js`
falls back to the same dev Supabase project this was built against, so
`python3 -m http.server` still works out of the box.

## Running locally

**Full fidelity (matches Preview/Production, including `/api/config`):**
```bash
npm i -g vercel   # once
vercel link       # links this directory to the saathi-4c17f716/saathi project
vercel env pull   # writes .env.local from the Development environment
vercel dev
```

**Plain static (no serverless functions, uses the hardcoded fallback config):**
```bash
npx serve .
# or: python3 -m http.server 8000
```

## Database

Schema and policies live in `supabase/migrations/`, applied in order via
the Supabase MCP tools (no local Supabase CLI is used for this project).
Key design points:

- `profiles.role` (`family` / `caregiver` / `admin`) can only become
  `admin` through a direct SQL update — signup metadata is whitelisted
  server-side so a client can never self-promote.
- `caregiver_profiles` is publicly readable (it's the directory); other
  users' `profiles` rows are private unless they own a caregiver listing.
- `background_checks.status` moves from `pending` → `verified`/`rejected`
  only by an admin (RLS-enforced); a caregiver can only ever insert their
  own request as `pending`.
- `match_caregivers(...)` is a `stable sql` function, weighting exact
  language/city/care-type/budget matches highest, with smaller boosts from
  the family's own `family_search_history` and from verified/experienced
  caregivers.

**Getting an admin account:** sign up normally through the app with the
email you want as admin, then run:
```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
```

**Email confirmation:** new Supabase projects require confirming your email
before you get a session, so `signUp()` won't drop you straight into the
onboarding wizard until you click the confirmation link. For frictionless
local testing, you can turn this off in the Supabase dashboard under
Authentication → Providers → Email → "Confirm email" — not done here since
it's a dashboard-only setting, not something scriptable via migrations.

Storage: `avatars` (public, one photo per user at `<user_id>/avatar.<ext>`)
and `verification-docs` (private, `<user_id>/<timestamp>_<filename>`) are
created by `0002_reviews_photos_docs.sql`, with RLS on `storage.objects`
restricting writes to the owning folder and reads to the owner + admins
(avatars are additionally public-read).

## Deliberate scope boundaries

- **Background checks are an admin-reviewed status, not a real vendor
  integration.** Wiring up an actual provider (Checkr, Sterling, etc.)
  would need that vendor's API keys and is a natural next step, not
  something this repo fakes as if it were already live.
- **The matching algorithm is a weighted heuristic**, not a trained model —
  appropriate for a directory this size; revisit if the caregiver count
  grows into the thousands.

## Ideas from care.com not built yet

Noted here rather than built, to keep this pass scoped:
- In-app messaging inbox (currently: one-shot contact form)
- Availability calendar / booking requests
- Formal application/proposal flow for caregivers responding to a family's posted job
- Photo galleries beyond a single profile photo

## Deploying

Already imported into Vercel (`saathi-4c17f716/saathi`, live at
[saathi-two-jet.vercel.app](https://saathi-two-jet.vercel.app), framework
preset **Other**, no build command). Every push to `main` deploys to
**Production**; every other branch or PR gets its own **Preview**
deployment, per [Vercel's environments
model](https://vercel.com/docs/deployments/environments) — hash routing
means no rewrite rules are needed either way.

Before Production/Preview will talk to Supabase for real (rather than
silently using the hardcoded fallback), set `SUPABASE_URL` and
`SUPABASE_ANON_KEY` in the project's Environment Variables settings for
each environment that needs them.
