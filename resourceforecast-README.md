# Clinical resource forecast — `resourceforecast.html`

A **single, self-contained HTML file** that turns a demand forecast into a costed
hiring plan. Double-click to open — no server, no build step, no install, nothing
is hosted. **All processing happens in the browser; no data ever leaves the
machine.** The HR extract (staff names + contracted hours) is personal data and
stays local.

Built on the **True Leaf** design system (`trueleaf.css`) — Boots navy + sage
leaf, Boots Sharp type — with the fonts and [SheetJS](https://sheetjs.com)
(Apache-2.0) **bundled inline** so it works fully offline.

## What it does (7 steps)

1. **Upload a demand forecast** (`.xlsx`/`.csv`). Columns can be **weekly** (or
   any cadence) dated headers — they're **pro-rated into calendar months** by day
   count (no orders lost), and the forecast window (start month + horizon) is
   **auto-detected**. Demand rows are matched to configured services by name;
   unmatched rows are **flagged for mapping** (map to an existing service, create
   it, or ignore) and **block export** — never silently dropped.
2. **Demand → required hours.** Two demand streams feed **one shared pool of
   people**, so nobody's time is counted twice:
   - **Order work** — each service is a **list of tasks** driving prescriber
     (order-handling) resource: every task is one group doing one activity, with a
     **time per order** and an **incidence %**. Task hours =
     `orders × incidence% × time ÷ 3600`. An order can span several tasks across
     groups (e.g. *pre-screen + specialist consult + GP letter*); incidence carries
     the IP/GP routing split and funnels.
   - **Contact work** — total orders generate **calls and messages**
     (calls/order and messages/order set in Global config; fractional values like
     `0.25` allowed). Each handling role takes a % share at its own throughput
     (calls/day, messages/day), converted to **hours** and added to that role's
     group as a *Patient contact* area open to every group member.
3. **Upload the team.** Two shapes are accepted:
   - a simple **HR list** (Name · Role · Contracted hrs/mo · optional Productivity % · Specialisms · Start/Ready month), mapped by **role name**; or
   - a **people/roster export** (auto-detected by a staff-number + Cost Centre
     column) — people in your **clinical Cost Centre**, plus **rule-matched people
     from the support Cost Centre(s)** (e.g. Patient Support advisors, job code
     `FCL`, who sit in a non-clinical cost centre — matched people are pulled in
     without dragging in unrelated non-clinical staff). Mapped **by staff number**;
     rules match on **Staff # + Job code + Location Name** (first match wins) —
     e.g. `FRE → GP`, Location `BDH Independent Prescribers → IP`, `FRH/FRG` +
     `BDH CMO Team → MH Nurse`, `FRI → Pharmacy Technician`, `FCL → Patient
     Support`. New or changed staff numbers are **flagged to map** before a run.
   Either way, each person can carry a **Productivity %** (seniors typically
   lower) and **Specialisms** (the areas they can work).
4. **Match capacity to demand, eligibility-aware.** Staff are allocated only to
   work they're **qualified for** (scarcest area first); the *Patient contact*
   area is open to everyone in the group. Required vs available is compared per
   **group × category** internally — so a shortage in one specialism can't be
   hidden by spare capacity that isn't qualified for it. Planned hires count from
   their **Ready month** (authoritative when given) so they aren't re-recommended.
5. **Lead-time-aware recruitment** — to be useful in a given month, recruiting
   starts *lead-to-hire + lead-to-useful* earlier (both rounded **up** to whole
   months). **Cost is booked from the hire month; capacity only counts from the
   useful month.** New hires are **generalists within their group** — the group's
   per-category shortfalls are pooled and rounded up **once** (per-category
   rounding would over-hire), filled by the group's **cheapest-capable role**,
   with the covered areas listed on each pooled hire row.
6. **Resource plan + cost forecast** — a **single line per resource type** giving
   the **total headcount needed** each month (no split by order category):
   clinician groups from pooled order + contact hours, and **People Managers**
   scaled to prescriber headcount (including recommended hires) at an editable
   ratio. A **recruitment calendar** shows what to advertise and what to have
   hired each month, followed by the pooled recruitment plan and phased cost.
7. **Export** everything to an auditable `.xlsx`.

The default config is seeded from the client's **AssumptionsBacking Data** tab
(48 services with category, IP/GP/Nurse share and prescribing time per order).

## Config & persistence

Config is a **flexible data model** — groups, roles, services and their
*attributes* (columns) are added as rows in-app, not code. All parameters are
editable:

- **Groups:** the demand pools services route work to (e.g. IP, GP, Nurse,
  Technician, Support, Management).
- **Per service:** category, and a **list of tasks** — each with a name, the
  **group** that performs it, **time per order (sec)** and **incidence %**.
  Services drive prescriber resource only; calls & messages are *not* service
  tasks.
- **Per role:** its **group**, **cost per hour**, **Productivity %**, contracted
  hours/month, **lead time to hire (weeks)** and **lead time to become useful
  (weeks)**. Monthly cost = cost/hour × contracted hours; **productive hours =
  contracted × productivity %**. Productivity % and specialisms can be overridden
  **per staff member**.
- **Per staff:** optional **Productivity %** and **Specialisms** — a
  `;`-separated list of categories and/or services, with `-` to exclude
  (e.g. `Skin; Sexual Health; -Psoriasis`). Blank = eligible for everything.
- **Contact model:** working days/month **per person** (~21 — days each person
  works, *not* days the desk is open; 7-day cover is a rota question), and per
  handling role: calls/day, messages/day, % share of calls and of messages
  (each share column must total 100% — a self-check enforces it).
- **Global:** forecast horizon, currency, start month, **People Manager ratio**
  (1 : N prescribers), and **calls per order / messages per order** (fractional
  values allowed).

Roles carry a **group**, so a group's demand can be met by any of its roles,
cheapest first.

Config **and** remembered role mappings persist by **exporting/importing a small
JSON file** you keep next to the app (top-right *Export config* / *Import
config*). The JSON file is the source of truth, so config moves between machines
— there is **no** localStorage dependency. Importing an **older config is
migrated automatically** (legacy Messaging tasks removed, the FCL Patient
Support rule added, old Non-prescribing % converted to Productivity %) and the
import dialog lists exactly what changed.

## Auditable `.xlsx` output

Computed values with a full visible breakdown. Tabs:

| Tab | Contents |
|-----|----------|
| **Inputs** | Raw demand + the team as used (roster mode: mapped role, hours, productivity, specialisms per person). **Staff names appear on this tab only.** |
| **Config** | Global, groups, roles, contact model, and the per-service task breakdown as used in the run. |
| **Mapping** | Person/role → clinician role, with rules and auto vs manual noted. |
| **Calc** | Orders → task hours (per service/task/group, including contact-handling hours), then required / staffed / recommended / gap by group × category. |
| **Capacity & Gap** | Headline **Resource required** (one row per resource type: Need / Workload / Have / Hires / Shortfall by month), then the group × category hours detail, People Manager block and contact volumes. |
| **Recruitment & Cost** | The pooled recruitment plan (one row per role per month needed, areas listed) with recruit / hire / useful dates, and phased cost. |
| **Self-Check** | Six checks re-derived from the output → PASS/FAIL. |
| **Methodology** | Plain-English explanation of every calculation. |

Calc/cost tabs are aggregated to **group / role level** — no staff names
scattered through them.

## Modelling defaults — all **editable config**, not hardcoded

- **One pool of people.** Order work and contact work compete for the same
  capacity; the model never counts a person's time twice.
- **Productivity %** scales contracted → productive hours (per role, or per
  staff member).
- **Specialisms:** existing/planned staff are allocated only to work they're
  eligible for, **scarcest area first, most-specialised staff first** (a
  transparent heuristic, not an optimiser). *Patient contact* is open to all
  group members.
- **Hiring:** new hires are **generalists within their group**; shortfalls are
  pooled per group and rounded up once, filled by the cheapest-capable role
  (by cost per productive hour; config order breaks ties).
- **Post-hire ramp:** 0% productive for the first 2 weeks, then linear to full
  by lead-to-useful; averaged into months. Cost is paid in full from the hire
  month. An explicit **Ready month** on a planned hire is authoritative (0
  before, full from it).
- **Lead times (weeks):** recruiting starts `hire + useful` lead earlier, both
  rounded **up** to whole months. Dates before the horizon start are flagged
  *overdue*.
- **People Manager:** required = ⌈prescriber headcount ÷ ratio⌉, counting
  existing + planned + recommended prescriber hires.
- **Weekly demand** is aggregated to months by day-count proration; first/last
  months of a window can be **partial**, so trim the horizon in Config if you
  want whole months only.
- **Gap** is tracked in hours per group × category internally; the headline
  shows heads per resource type, with hires netted off cumulatively (no
  double-hiring).
- **Workload model only** (no queueing/SLA maths); **no attrition/backfill** yet.

The engine is isolated pure functions (an `ASSUMPTIONS` block), decoupled from the
DOM, so a queueing/SLA model and attrition can be added without a rewrite.

## Try it

Open the file and click **Load sample data** — the 48 real services, a sample
monthly demand, and a sample team that includes one **planned hire** and one
**unmatched role** (to show the mapping flag). Map the unmatched role, press
**Recompute**, then **Export .xlsx**.
