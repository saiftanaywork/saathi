# Saathi — Brand

## Name

"Saathi" (साथी) — Hindi/Urdu for "companion" or "one who walks alongside
you." Chosen over more literal names (e.g. "DFW Caregivers") because the
product's actual value is companionship and shared understanding, not just
a listings mechanism.

## Positioning

A directory built for Indian families in DFW, not a generic care
marketplace with a translated homepage. Warm and specific, not corporate
and broad.

**Deliberately not:** saffron/marigold color clichés, stock-photo hero
images of smiling multi-generational families, or the clinical-blue SaaS
look of general care marketplaces. The visual language should feel more
like a well-made paper invitation than a health-tech dashboard.

## Voice

- Direct and plain-spoken, never salesy. ("Free to browse and list. No
  bookings, no fees — you connect directly.")
- Honest about what the product isn't — the footer disclaimer and the
  README's scope boundaries are part of the brand voice, not legal
  boilerplate bolted on afterward.
- Specific over generic: "the first forty days," "confinement diet
  cooking," "temple trips" — concrete cultural detail beats vague
  reassurance every time.

## Color palette

Warm, paper-toned, desaturated. Full token values live in
`css/styles.css` (`:root`, plus a dark-mode variant) — this is the palette
summary:

| Role | Light | Usage |
|---|---|---|
| Paper (background) | `#faf3e6` | Page background |
| Card | `#fffcf6` | Card/panel surfaces |
| Ink (text) | `#2c241c` | Primary text |
| Terracotta | `#bd5b39` | Primary accent — CTAs, brand mark |
| Teal | `#2f4a52` | Secondary accent — brand mark, tags |
| Ochre | `#b7862e` | Tertiary accent — icons, highlights |
| Rose | `#9c5468` | Avatar/tag accent variant |
| Moss | `#5c6b47` | Avatar/tag accent variant, success-adjacent |

Avatar/tag accent colors (terracotta/teal/ochre/rose/moss) are assigned
deterministically per person (hashed from name), not randomly — see
`accentFor()` in `js/constants.js`.

## Typography

- **Fraunces** (serif, variable weight 400–700, includes italic) — display
  headings, brand wordmark, dollar amounts on rate displays. Chosen for
  warmth and a slightly literary feel, not a typical tech-startup
  geometric sans.
- **Work Sans** — body text, UI labels, forms.

Both loaded via Google Fonts in `index.html`.

## Logo / brand mark

Two overlapping circles (terracotta + teal, `BrandMark()` in
`js/constants.js`) — meant to read as two people close together, not as an
abstract "companionship" icon. Kept simple enough to render as a small
inline SVG with no external asset dependency.

## Imagery guidelines (for future use)

If/when real photography is introduced (caregiver profile photos aside,
which are user-uploaded), avoid stock imagery that reads as generic
American senior-living marketing. Prefer specific, textured detail over
posed smiling-family shots.
