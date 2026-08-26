# Saathi — Product Requirements Document

## Value proposition

Saathi is a caregiver directory built specifically for Indian families in
the Dallas–Fort Worth area. The value isn't "another care marketplace" —
it's removing the burden of re-explaining your family's needs (language,
diet, religious practice, generational expectations) to a caregiver who has
no context for them. Every caregiver on Saathi already speaks the language
and understands the household norms a family is searching within.

## Pain points (what exists today and why it falls short)

- **General marketplaces (care.com, Care.com-alikes) are culturally blind.**
  A family can filter by "speaks Hindi," but that's a checkbox, not a
  guarantee of fit — the caregiver still may not know what a "confinement
  period," a vegetarian-strict kitchen, or touching an elder's feet as
  greeting means in practice.
- **Word-of-mouth (temple groups, WhatsApp forwards, community Facebook
  groups) doesn't scale and has no trust signal.** A recommendation from
  one family doesn't tell the next family about a caregiver's actual
  availability, rate, or specialty.
- **Families don't know what "vetted" should even mean here.** Background
  checks exist in the general market, but nothing tells a family whether a
  check specifically matters for, say, live-in postpartum care vs. hourly
  companionship.
- **Caregivers with the right cultural fluency are invisible to search
  engines and general platforms** because there's no shared place that
  specifically surfaces "caregivers who work with Indian families in DFW."

## ICP (Ideal Customer Profile)

**Primary — the family:**
- Indian-American household in DFW (Irving, Plano, Frisco, Richardson,
  Carrollton, and nearby), first- or second-generation.
- Searching for one of: elder care/companionship for aging parents,
  postpartum/newborn support, or dementia-experienced care.
- Values a caregiver who speaks the household's language and already
  understands routines (diet, religious observance, family structure)
  without needing them explained.
- Comfortable doing their own final vetting (references, in-person meeting)
  once Saathi narrows the field — Saathi is a directory + matching layer,
  not an agency that manages the relationship.

**Secondary — the caregiver:**
- Caregiver serving (or wanting to serve) Indian families specifically,
  often already working informally through community word-of-mouth.
- Wants a public, searchable listing that surfaces their specific language
  and care-type fluency, plus a way to build verifiable trust (reviews, a
  Saathi-reviewed background-check badge) beyond word-of-mouth alone.

**Explicitly not the ICP (for now):** families outside DFW, care types
Saathi doesn't specialize in (e.g. pediatric nursing, medical home health),
and caregivers looking for agency-style job placement/payroll handling.

## Core features (what's built)

- Public caregiver directory: gallery/list/map views, filters (language,
  city, care type, rate), full-text search.
- Matching algorithm (`match_caregivers` Postgres function): ranks
  caregivers against a signed-in family's explicit filters *and* their past
  search history, surfaced as "Recommended for you."
- Accounts: family and caregiver signup/login, separate admin login.
- Caregiver onboarding: guided multi-step listing wizard (basics + photo →
  languages/care types → experience → bio → get verified).
- Family onboarding: short preference quiz that seeds the matching
  algorithm's first signal.
- Reviews & ratings (1-5 stars + comment, one per family/caregiver pair).
- Background-check status: caregiver uploads supporting documents, admin
  reviews and approves/rejects, approved caregivers show a Verified badge.
- Favorites (saved caregivers) for signed-in families.
- Contact form (one-shot message, not a full inbox).

## Success metrics (what "working" looks like)

- **Caregiver-side:** a caregiver completes the listing wizard and gets at
  least one contact request within their first two weeks live.
- **Family-side:** a family's first browse session includes at least one
  filter/search action that gets logged (proof the matching signal has
  something to work with) and results in either a saved favorite or a
  contact request.
- **Trust:** a rising share of active caregiver listings carry a Verified
  badge over time (proxy for admin review actually happening, not just
  requests piling up unreviewed).

## Non-goals

See [`docs/ENVIRONMENTS.md`](./ENVIRONMENTS.md) for infra non-goals and the
README's "Deliberate scope boundaries" / "Ideas from care.com not built
yet" sections for product non-goals (no real third-party background-check
vendor integration, no messaging inbox, no booking/payment handling, no
availability calendar).
