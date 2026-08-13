# Saathi

A caregiver directory for Indian families in the Dallas–Fort Worth area.
Originally a static-mock [Claude artifact](https://claude.ai/code/artifact/30ff2c3b-8ad8-47ea-8a4d-2c77678b82c4); this repo turns it into a real app backed by Supabase.

## What's here

- **Directory browsing** with gallery/list/**map** view modes, language/city/care-type/rate filters, and full-text search. The map (Leaflet + OpenStreetMap, no API key) jitters pins around each caregiver's city center since listings only store a city, not an address.
- **A matching algorithm** (`match_caregivers` Postgres function) that ranks caregivers against a signed-in family's filters *and* their past search history, surfaced as a "Recommended for you" rail on the browse page.
- **Login/signup** for families and caregivers, plus a separate **admin login** at `/admin/login`. New caregivers land in a **care.com-style multi-step wizard** (basics + photo → languages/care types → experience → bio → get verified); new families land in a short 2-step "what are you looking for" quiz that seeds their first search-history row so recommendations aren't empty on day one.
- **Reviews & testimonials**: signed-in families can leave a 1-5 star rating + comment per caregiver (one per pair, editable); average rating shows on cards and profiles; a few recent 4-5★ reviews surface on the landing page.
- **Caregiver photos**: uploaded to a public Supabase Storage bucket, shown on cards/profile/map in place of the initials avatar once set.
- **Background-check status with document verification**: a caregiver can upload supporting documents (ID, certifications — private Storage bucket, owner + admin only) and request a review; an admin reviews the documents and approves/rejects from `/admin`; approved requests show a Verified badge on the public profile.
- **Saved caregivers** (favorites) for signed-in families.

## Architecture

Buildless static site — plain HTML/CSS/ES modules, no bundler, no Node
required to develop. Supabase provides auth, Postgres, and Row Level
Security; the Supabase JS SDK is loaded from a CDN in `index.html`.
Hash-based routing (`#/browse`, `#/login`, ...) means it deploys as a plain
static site with zero server config — no rewrites needed.

```
index.html            shell, mounts #app
css/styles.css         all styles
js/
  supabaseClient.js    Supabase client (public URL + publishable key)
  constants.js          shared reference data + icon helpers
  auth.js                session/profile state, sign up/in/out, role guards
  api.js                  all Supabase table/RPC calls
  router.js              hash router + auth guards
  components/            navbar, footer, contact modal, caregiver card
  pages/                  one module per route
supabase/migrations/    schema, RLS policies, match_caregivers(), seed data
```

## Running locally

No build step — just serve the directory statically:

```bash
npx serve .
# or: python3 -m http.server 8000
```

Then open the printed URL. The Supabase project it talks to is already live
(URL + publishable key are hardcoded in `js/supabaseClient.js` — that key is
safe to expose client-side; every access rule is enforced by Postgres RLS,
not by keeping the key secret).

## Database

Schema and policies live in `supabase/migrations/0001_init.sql`, applied via
the Supabase MCP tools. Key design points:

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

No Vercel CLI was available in the environment this was built in, so
deployment isn't wired up automatically. To deploy:
1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repo.
2. Framework preset: **Other** (no build command, output directory `.`).
3. Deploy — hash routing means no rewrite rules are needed.
