# Tasks

Broken out from [`docs/PRD.md`](./PRD.md). Checked items are already built
and live; unchecked items are the actual backlog.

## Directory & browsing
- [x] Gallery / list / map view modes with filters (language, city, care
      type, rate) and search
- [x] Caregiver profile page
- [ ] Pagination or infinite scroll (currently loads all listings at once —
      fine at current scale, will need revisiting past a few hundred
      listings)

## Matching
- [x] `match_caregivers` weighted ranking function
- [x] "Recommended for you" rail seeded by filters + search history
- [ ] Surface *why* a caregiver was recommended (score breakdown) in the UI
      instead of just a "Recommended for you" chip

## Accounts & onboarding
- [x] Family/caregiver signup + login, separate admin login
- [x] Role-escalation protection (client can never self-promote to admin)
- [x] Caregiver multi-step listing wizard
- [x] Family preference quiz seeding first search-history row
- [ ] Password reset flow (not yet built — currently no UI path if a user
      forgets their password)

## Trust & verification
- [x] Reviews (1-5 stars + comment, one per family/caregiver pair)
- [x] Background-check request + document upload
- [x] Admin review queue (verify/reject, view uploaded documents)
- [ ] Notify a caregiver when their background check is approved/rejected
      (currently they only find out by revisiting their listing page)

## Engagement
- [x] Favorites (saved caregivers)
- [x] One-shot contact form
- [ ] Messaging inbox (explicit non-goal for now, see PRD)

## Platform / infra
- [x] Supabase Postgres + RLS for every table
- [x] Config via environment variables (Vercel + `api/config.js`)
- [x] Vercel deployment, auto-deploy on push to `main`
- [ ] Staging environment (deliberately deferred — see
      `docs/ENVIRONMENTS.md`)
- [ ] Error tracking (see `docs/ENVIRONMENTS.md`-adjacent write-up in
      README once implemented)
- [ ] Automated tests (none exist yet — this is a real gap once the
      codebase grows past what manual click-through testing can cover)

## Explicitly out of scope for now

See PRD → Non-goals and README → "Deliberate scope boundaries" /
"Ideas from care.com not built yet." Don't re-add these here without
updating those sections first — the point of listing non-goals is to stop
relitigating them every planning pass.
