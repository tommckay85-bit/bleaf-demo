# Eligibility checker — `eligibility.html`

A self-contained, pre-booking **suitability** screen for the True Leaf demo. It
pre-qualifies visitors *before* they book a specialist consultation. It is **not**
a guarantee of a prescription — the decision always rests with the specialist/MDT.

No build step or dependencies: it's a single HTML file that reuses `trueleaf.css`
for fonts/colours/buttons, with all checker styles and logic inline. State lives in
JavaScript memory only — nothing is written to browser storage, and nothing is
captured until the user accepts the privacy notice on the first screen.

## Flow (7 steps)

Questions are grouped to keep the form short — a step can hold more than one
field: 1) privacy consent · 2) condition · 3) prior treatment · 4) age **+**
UK residency · 5) pregnancy **+** psychosis history · 6) records consent ·
7) acknowledgements → results page (contact captured only when the overall
verdict is green/amber).

**Inline feedback** appears the moment certain options are selected, via the
`notices` map on a field. Three note types:
- `stop` — ends the flow immediately at the given `outcome` (used for **Under 18**:
  "we're unable to help", no booking).
- `danger` — red, advisory (used for **pregnancy**: "we won't be able to
  prescribe"); the user can still continue and it shows as a **red** item on the
  results page.
- `warn` — amber, advisory (18–25, no UK GP, fewer than two prior treatments,
  psychosis/schizophrenia history, "Other" condition).

## Results page — Red / Amber / Green

`summarise()` turns the answers into a per-item RAG list and an overall verdict
(**worst** item wins). The results screen lists every clinical answer with a
green tick / amber / red marker and a short note on anything of concern.

```
RED   item: pregnant / conceiving / breastfeeding        -> overall RED
AMBER items: < 2 prior treatments · age 18–25 · no UK GP ·
             psychosis/schizophrenia history · "Other" condition
GREEN: everything else
overall = RED if any red, else AMBER if any amber, else GREEN
```

- **GREEN → "you may be suitable"** — primary "Book an appointment" button.
- **AMBER → "you can book, but you may not be suitable"** — de-emphasised
  "book anyway" button; fee-not-refunded caveat.
- **RED → "we're not able to prescribe"** — no booking button; signpost GP.

No contact details are collected on the results page — the button hands off to
the booking journey, which captures and persists details itself.
- **Under 18 → HARD_STOP** — immediate, no summary, no booking.

To change conditions, gates, notices or wording, edit the `STEPS` array, the
`summarise()` function (statuses + notes) and the `OUTCOMES` object — all
clearly-named constants in the `<script>` in `eligibility.html`. Non-devs can
review all copy there.

## Compliance notes
- **Privacy first.** Step 1 is the special-category-data notice; nothing is held
  until the user accepts it.
- **No contact details are captured** anywhere in the checker — the booking
  journey handles that downstream.
- **No prescription promise.** Copy says a consultation "may be appropriate" and
  that it's "ultimately a joint decision between you and one of our clinicians".
- **Not persisted.** Free-text fields were removed; answers live in component
  memory only.
- Fully keyboard accessible (radio/checkbox groups, Enter to advance, focus moved
  to the first field on each step, `aria-live` progress and errors).

## TODO for the team (also flagged inline as `TODO(team)`)
1. Confirm whether amber "book anyway" routes to the same booking flow as green or
   a separate "review" booking type.
2. Confirm refund / no-refund wording with legal & compliance before launch.
3. Wire the "Book an appointment" CTA (and POST of answers + contact) to the real
   booking system / CRM. Currently it shows a demo `alert()`.
