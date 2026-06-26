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
UK residency · 5) pregnancy **+** psychosis history · 6) medications **+**
records consent · 7) acknowledgements → outcome (contact captured only on a
pass / caveated-pass).

Age gives **inline feedback the moment it's selected**: "Under 18" shows a stop
message and the next button takes the user straight to the hard-stop outcome (no
need to finish the form); "18–25" shows an amber caution that they may not be
accepted, but they can continue. These live in the `notices` map on the age
field (`type:'stop'` ends the flow at the given `outcome`; `type:'warn'` is
advisory only).

## Where to change things

All copy and rules live in clearly-named constants inside the `<script>` in
`eligibility.html`:

| What | Where |
|------|-------|
| Questions, options, help text, "Other"/follow-up fields | `STEPS` array |
| Which answers block (e.g. residency "No") | the `gate` flag on each step + `evaluate()` |
| Outcome headings / body / warnings / CTA | `OUTCOMES` object |
| Hard-stop age, caveat age | `evaluate()` |

Non-devs can review wording by reading `STEPS` and `OUTCOMES`; the clinical team can
adjust gates by editing the `gate` flags and `evaluate()` without touching the form
rendering.

## Decision logic (mirrors the spec)

```
HARD_STOP        if age == "Under 18"            -> no booking path
otherwise, NEGATIVE if ANY blocker is true:
    treatments_tried == "No"
    residency        == "No"
    pregnancy        == "Yes"
    psychosis        == "Yes"
    records_consent  == unchecked
    acknowledgements  not all checked
otherwise CAVEATED_PASS if age == "18–25"
otherwise POSITIVE
```

## Flow & compliance notes
- **Privacy first.** Step 0 is the special-category-data notice; the user must accept
  it before any health question, and before any answer is held.
- **Soft-fail wording.** A NEGATIVE result says "we're unlikely to be able to help
  right now", never "you are not eligible".
- **Contact capture.** Name/email/phone are only requested on POSITIVE or
  CAVEATED_PASS outcomes (shown on the result screen), never before screening, and
  never on HARD_STOP.
- **No prescription promise.** Positive copy says a consultation "may be
  appropriate" only.
- Fully keyboard accessible (radio/checkbox groups, Enter to advance, focus moved to
  the first field on each step, `aria-live` progress and errors).

## TODO for the team (also flagged inline as `TODO(team)`)
1. Confirm whether NEGATIVE outcomes route to the same booking flow as POSITIVE or a
   separate "review" booking type.
2. Confirm refund / no-refund wording with legal & compliance before launch.
3. Wire the "Book an appointment" CTA (and POST of answers + contact) to the real
   booking system / CRM. Currently it shows a demo `alert()`.
