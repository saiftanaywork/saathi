# Environments

## Current setup: one Supabase project, Vercel's built-in Preview/Production split

Saathi uses a **single Supabase project** for everything — there is no
separate staging database. This was a deliberate choice, not an oversight:
a second project (even a free one) means every schema migration has to be
applied twice and kept in sync, and at this stage there's no team of
developers or real user base that a shared database actually puts at risk.

What *is* already in place, for free, with no extra setup:

- **Production** — the `main` branch on GitHub. Every push auto-deploys to
  the production domain.
- **Preview** — any other branch or pull request. Vercel builds a unique
  preview URL per deployment automatically.
- Both currently read `SUPABASE_URL` / `SUPABASE_ANON_KEY` from Vercel
  environment variables (see README → "Environment variables"), and today
  those values are identical across Production and Preview — both point at
  the one real Supabase project.

Because config is already read from environment variables (via
`api/config.js`) rather than hardcoded, splitting the database later is a
**config change, not a code change** — see below.

## When to actually split staging from production

Revisit this once any of the following becomes true:
- Real users' data exists and a bad migration or a broken feature branch
  could plausibly corrupt or expose it.
- More than one person is developing against the database at the same
  time and stepping on each other's test data becomes a real cost.
- A destructive migration needs testing before it touches real data.

## How to split it later (no code changes needed)

1. Create a second Supabase project for staging (`create_project` via the
   Supabase MCP tools, or the dashboard — this is free on the same plan
   the main project uses).
2. Re-apply the migrations in `supabase/migrations/` to the new project,
   in order.
3. In Vercel → Settings → Environment Variables, set `SUPABASE_URL` /
   `SUPABASE_ANON_KEY` for the **Preview** environment only to the staging
   project's values, leaving **Production** pointed at the real project.
4. Redeploy. `api/config.js` and `js/supabaseClient.js` already resolve
   config per-request from environment variables, so no application code
   needs to change.

This is intentionally left undone until it's actually needed, per the
project's working preference to keep infrastructure minimal for now.
