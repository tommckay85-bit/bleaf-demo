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

1. **Upload a demand forecast** — orders by service, by month (`.xlsx`/`.csv`).
2. **Demand → required resource** — `required hours = orders × AHT`;
   `required FTE = required hours ÷ productive hours per FTE`, where
   `productive hours = contracted hours × (1 − shrinkage%)`.
3. **Upload the HR extract** and map HR role names to the tool's taxonomy. Known
   mappings **auto-apply**; only new/unmatched roles are **flagged** for live
   mapping. Unmatched roles are highlighted and **block export** — never dropped.
4. **Compare** required vs available capacity, per role per month → surplus/gap.
5. **Recruitment lead time** — for each gap, back-date the recruitment start; a
   hire's salary is booked only **from the month it starts**, not the earlier
   recruit-start month.
6. **Resource plan + cost forecast** — gaps, recommended hires, when to start
   recruiting, and phased cost.
7. **Export** everything to an auditable `.xlsx`.

## Config & persistence

Config is a **flexible key/value model** — services, roles and their *attributes*
(columns) are added as rows in-app, not code. All parameters are editable:

- **Per service:** AHT, eligible role pool(s).
- **Per role:** cost / FTE / month, shrinkage %, recruitment lead time (months),
  standard contracted hours.
- **Global:** forecast horizon, currency, start month.

Config **and** remembered role mappings persist by **exporting/importing a small
JSON file** you keep next to the app (top-right *Export config* / *Import
config*). The JSON file is the source of truth, so config moves between machines
— there is **no** localStorage dependency.

## Auditable `.xlsx` output

Computed values with a full visible breakdown (live cross-sheet formulas are a
later pass). Tabs:

| Tab | Contents |
|-----|----------|
| **Inputs** | Raw demand + raw HR. **Staff names appear on this tab only.** |
| **Config** | Every parameter as used in the run. |
| **Mapping** | HR role → taxonomy, with auto vs manual noted. |
| **Calc** | Orders → required hours → required FTE, every intermediate column. |
| **Capacity & Gap** | Available vs required vs gap (FTE), by role by month. |
| **Recruitment & Cost** | Hires, recruit-start month, phased cost. |
| **Self-Check** | The app re-derives totals and reconciles cost ↔ gap → PASS/FAIL. |
| **Methodology** | Plain-English explanation of every calculation. |

Calc/cost tabs are aggregated to **role level** — no staff names scattered through
them.

## v1 modelling defaults — all **editable config**, not hardcoded

These are starting assumptions to revisit first during iteration:

- **Shrinkage %** reduces contracted → productive hours (editable per role).
- **Role overlap:** where several roles can cover a service, existing capacity is
  consumed **cheapest-capable-first** (by cost per productive hour); any remainder
  becomes a gap assigned to the cheapest capable role.
- **Workload model only** (no queueing/SLA maths) for v1.
- **Required FTE rounds up** per role per month. Note: the *gap* that drives
  hiring is computed in productive **hours**, so part-time existing capacity can
  cover a rounded-up requirement without a phantom hire.
- **No attrition / backfill** in v1.

The engine is written as small, named pure functions (`ASSUMPTIONS` block in the
`<script>`), decoupled from the DOM, so a **queueing/SLA model** and **attrition**
can be added later without a rewrite.

## Try it

Open the file and click **Load sample data** — a tiny hardcoded demand + HR set
(one role is intentionally left unmatched to show the mapping flag). Map it, press
**Recompute**, then **Export .xlsx**.
