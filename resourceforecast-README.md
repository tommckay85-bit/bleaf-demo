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
2. **Demand → required hours by task** — each service is a **list of tasks**;
   every task is one role doing one activity, with a **time per order** and an
   **incidence %** (how many orders need it). Task hours =
   `orders × incidence% × time ÷ 3600`, attributed to the task's group. An order
   can span several tasks across **different roles** — async *review + messaging*,
   or synchronous *pre-screen + specialist consult + GP letter*. Incidence also
   carries the prescriber/GP order-routing split and funnels (e.g. only 60% of
   orders reach a consult).
3. **Upload the HR extract** (current team **and** already-planned hires) and map
   HR role names to the tool's roles. Known mappings **auto-apply**; only
   new/unmatched roles are **flagged** for live mapping and **block export** —
   never dropped.
4. **Compare** required vs available capacity, per **group** per month → gap. A
   group pools its roles' capacity; already-planned hires count from their
   **Ready month** so they aren't re-recommended.
5. **Lead-time-aware recruitment** — to be useful in a given month, recruiting
   starts *lead-to-hire + lead-to-useful* earlier. **Cost is booked from the hire
   month; capacity only counts from the useful month.** A group's gap is filled by
   its **cheapest-capable role**.
6. **Resource plan + cost forecast** — gaps, recommended hires with recruit /
   hire / useful dates, and phased cost (new hires, planned, baseline).
7. **Export** everything to an auditable `.xlsx`.

The default config is seeded from the client's **AssumptionsBacking Data** tab
(48 services with category, IP/GP/Nurse share, prescribing AHT and messaging
time per order).

## Config & persistence

Config is a **flexible data model** — groups, roles, services and their
*attributes* (columns) are added as rows in-app, not code. All parameters are
editable:

- **Groups:** the demand pools services share orders across (e.g. IP, GP, Nurse).
- **Per service:** category, and a **list of tasks** — each with a name, the
  **group** that performs it, **time per order (sec)** and **incidence %**. This
  models multi-person orders (async and synchronous) uniformly.
- **Per role:** its **group**, **cost per hour**, **Non-Prescribing time %**,
  contracted hours/month, **lead time to hire (weeks)** and **lead time to become
  useful (weeks)**. Monthly cost = cost/hour × contracted hours; productive hours
  = contracted × (1 − non-prescribing %).
- **Global:** forecast horizon, currency, start month.

Roles carry a **group** (e.g. IP and Nurse IP both sit in the *IP* group), so a
group's demand can be met by any of its roles, cheapest first.

Config **and** remembered role mappings persist by **exporting/importing a small
JSON file** you keep next to the app (top-right *Export config* / *Import
config*). The JSON file is the source of truth, so config moves between machines
— there is **no** localStorage dependency.

## Auditable `.xlsx` output

Computed values with a full visible breakdown (live cross-sheet formulas are a
later pass). Tabs:

| Tab | Contents |
|-----|----------|
| **Inputs** | Raw demand + raw HR (incl. Start/Ready months). **Staff names appear on this tab only.** |
| **Config** | Global, groups, roles, and per-service handler splits as used in the run. |
| **Mapping** | HR role → clinician role, with auto vs manual noted. |
| **Calc** | Orders → handler hours (per service/group), then group required/available/gap. |
| **Capacity & Gap** | Required vs available vs recommended vs gap (hours), by group by month. |
| **Recruitment & Cost** | Hires with recruit / hire / useful months + lead times, and phased cost. |
| **Self-Check** | The app re-derives totals and reconciles cost ↔ gap → PASS/FAIL. |
| **Methodology** | Plain-English explanation of every calculation. |

Calc/cost tabs are aggregated to **group / role level** — no staff names
scattered through them.

## Modelling defaults — all **editable config**, not hardcoded

Starting assumptions to revisit during iteration:

- **Non-Prescribing time %** reduces contracted → productive hours (per role).
- **Group overlap:** a group's gap is filled by its **cheapest-capable role** (by
  cost per productive hour).
- **Lead times (weeks):** to be useful in a month, recruitment starts
  `hire + useful` lead earlier; cost is booked from the **hire** month, capacity
  from the **useful** month. Dates before the horizon start are flagged *overdue*.
- **Planned hires** in the HR file (Start = cost begins, Ready = capacity counts)
  are counted and **never re-recommended**.
- **Weekly demand** is aggregated to months by day-count proration; the first/last
  months of a window can be **partial** (fewer days), so trim the horizon in
  Config if you want whole months only.
- **Gap = required − (existing + planned)** in hours; recommended hires fill it
  cumulatively (earlier hires are netted off, so no double-hiring).
- **Workload model only** (no queueing/SLA maths); **no attrition/backfill** yet.

The engine is isolated pure functions (an `ASSUMPTIONS` block), decoupled from the
DOM, so a queueing/SLA model and attrition can be added without a rewrite.

## Try it

Open the file and click **Load sample data** — the 48 real services, a sample
monthly demand, and a sample team that includes one **planned hire** and one
**unmatched role** (to show the mapping flag). Map the unmatched role, press
**Recompute**, then **Export .xlsx**.
