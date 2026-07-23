# ESG Weekly Reporting Dashboard

> Document schema: **PRD → SRS → SSD → UI/UX**, followed by **Edge Cases** and **Definition of Done**.
> Stack: **React Native (Expo)** targeting Android, iOS, and Web (React Native Web). **Google Sheets as the single source of truth (database).**

## Objective
A read-only, no-login mobile + web dashboard that turns the ESG team's manual Google Sheets into an optimized, "smart-metric" reporting surface for weekly review by the General Manager. It reads raw ESG data (Environmental, Social, Governance programs) plus an ESG Award tracker from Google Sheets via an API the user provides, computes derived metrics (efficiency ratios, week-over-week trends, award readiness), and presents them across a sidebar of focused pages — including a Weekly Report page exportable to PDF. All data entry stays in Google Sheets; the app never writes back. It matters because the current process is manual charting in Sheets, which is slow, error-prone, and not GM-ready.

---

# 1. PRD (Product Requirements Document)

## 1.1 Problem
The ESG team maintains initiatives manually in Google Sheets and hand-builds summary charts each week. There is no single, always-consistent, GM-ready view, no derived/"smart" metrics beyond raw totals, and no structured tracking of award submission deadlines.

## 1.2 Goals
- Give the GM (and anyone else, no account needed) a clear weekly picture of ESG performance across all three pillars.
- Present **processed/smart metrics** (ratios, trends, growth) not available in the raw sheets.
- Track ESG awards the org intends to enter, with automatic deadline countdowns and readiness.
- Keep Google Sheets as the only place data is entered.

## 1.3 Non-Goals (Out of Scope for v1)
- No data entry, editing, or write-back to Google Sheets from the app.
- No user accounts, authentication, roles, or permissions.
- No push notifications (deadline alerts are shown in-app only).
- No progress-vs-target metric (deferred until target columns exist in the sheets; see 3.5).
- No offline-first sync engine beyond last-successful-load caching.
- The homepage "search" feature is **exploratory / optional** and deferred (see 1.5).

## 1.4 Users
- **Primary:** General Manager — opens the app/web to review weekly ESG status; receives/exports the Weekly Report PDF.
- **Secondary:** ESG team member (spec author) — opens the same read-only app; maintains data in Google Sheets.
- All users see the same content. No access differentiation.

## 1.5 Deferred / Exploratory
- A global **search** on the homepage was requested but its scope is undecided. v1 ships **without** search. The spec reserves a placeholder in the UI/UX section; implementation of search is explicitly out of scope for v1 and must not block Definition of Done.

## 1.6 Navigation / Sidebar Menu (final)
The app has a persistent sidebar (drawer on mobile, fixed sidebar on web) with these items, in order:
1. **Overview** (landing)
2. **Environmental**
3. **Social**
4. **Governance**
5. **ESG Award Tracker**
6. **Weekly Report**
7. **Trends & Insights**
8. **Settings / Data Source**

---

# 2. SRS (Software Requirements Specification)

## 2.1 Functional Requirements
Each requirement is verifiable.

### Data & Integration
1. The app SHALL read all displayed data from Google Sheets via a single JSON HTTP API endpoint (Google Apps Script Web App or equivalent) configured in the app (see SSD 3.6). The app SHALL NOT contain hard-coded ESG data.
2. The app SHALL fetch data **only** (a) on first load of a session and (b) when the user triggers a manual refresh (a visible Refresh button and pull-to-refresh gesture on mobile). It SHALL NOT auto-poll on an interval.
3. On every successful fetch, the app SHALL store the full dataset and a `lastSyncedAt` timestamp in local persistent storage (AsyncStorage / localStorage).
4. On app launch, if a network fetch fails, the app SHALL load and display the last cached dataset (if any) and show a warning banner containing the `lastSyncedAt` time (formatted, e.g. "Data as of 04 Jul 2026, 14:32 — may be outdated").
5. The manual Refresh action SHALL show a loading indicator while fetching and, on success, replace displayed data and update the `lastSyncedAt` display.

### Overview page
6. Overview SHALL display KPI cards for the selected year: **Total Initiatives**, **Total CO₂ Avoided (ton CO₂/yr)**, **Total Participants**, **Total Training Hours**, and **Total Policies (Kebijakan)**.
7. Overview SHALL render three charts matching the source sheet: (a) a donut of Number of Initiatives by pillar with per-pillar count and %, (b) a bar chart of Participants vs Hours (Social), (c) a bar chart of Avoided CO₂ Reduction (Environmental).
8. Overview KPI and chart values SHALL be computed from the raw program rows (SSD 3.2), not read from a pre-summarized sheet, so numbers stay consistent with detail pages.

### Pillar pages (Environmental / Social / Governance)
9. Each pillar page SHALL list every program row for that pillar in a table/list showing that pillar's columns (SSD 3.2).
10. **Environmental** SHALL show columns: No, Program, Desc, Capacity (kWp), Program Type, CO₂ Avoided (tCO₂e), Net Energy Production (kWh/yr), Implementation Date, Documentation link.
11. **Social** SHALL show columns: No, Program, Desc, Program Type, Participants, Total Hours, Partner (Mitra), Speakers, Implementation Date, Documentation link.
12. **Governance** SHALL show columns: No, Program, Desc, Implementation Date, Link.
13. Any documentation/link cell that contains a URL SHALL render as a tappable link opening in the system browser; cells without a URL SHALL render as plain text/status (e.g. "Finish", "Selected", "TBC").
14. Each pillar page SHALL display that pillar's smart metrics (see 2.1 Smart Metrics below).

### ESG Award Tracker page
15. The Award Tracker SHALL read from a **dedicated Awards sheet/tab** (schema in SSD 3.4) and list each award with: Award Name, Submit Deadline, Days Left, Document, About, Link, Status.
16. **Days Left** SHALL be computed in-app as `deadline − today` (in whole days), not read from the sheet. If the deadline is today, Days Left = 0; if past, it SHALL show a negative value or "Overdue".
17. Awards with Days Left ≤ 14 and ≥ 0 SHALL be visually flagged as "deadline approaching" (e.g. warning color/badge). Overdue awards SHALL be flagged distinctly.
18. The Award Tracker SHALL display a **readiness indicator** per award derived from Status (e.g. Not Started = 0%, In Progress = 50%, Submitted = 100%) and an overall readiness summary across all awards.
19. Awards SHALL be sortable/ordered by soonest deadline by default.

### Weekly Report page
20. The Weekly Report page SHALL show a snapshot for the current reporting week: per-pillar totals and the KPI set from req. 6, plus a **week-over-week comparison** (this week vs previous week) for each KPI showing absolute delta and % change.
21. The "week" boundary SHALL be defined explicitly (SSD 3.3) and programs SHALL be bucketed into weeks by their Implementation Date.
22. The Weekly Report SHALL be **exportable to PDF** via a visible Export button; the PDF SHALL contain the same snapshot, comparison table, and title/date range, and SHALL be shareable/saveable through the OS share sheet (mobile) or download (web).

### Trends & Insights page
23. Trends & Insights SHALL render time-series charts (by week and by month, user-toggleable) of: initiatives count, CO₂ avoided, participants, and hours, bucketed by Implementation Date.
24. It SHALL display the derived **efficiency/ratio** smart metrics (see below) as cards.

### Smart Metrics (computed, shown where noted)
25. **Efficiency & ratios** SHALL be computed and displayed:
    - CO₂ avoided per kWp = Σ CO₂ avoided ÷ Σ capacity (Environmental).
    - Net energy per kWp = Σ net energy ÷ Σ capacity (Environmental).
    - Participants per training hour = Σ participants ÷ Σ hours (Social).
    - Average participants per program and average hours per program (Social).
26. **Trends & growth** SHALL be computed: week-over-week and month-over-month % change per pillar for initiatives, CO₂, participants, and hours.
27. **Award readiness** SHALL be computed as defined in req. 16–18.
28. Any ratio with a zero denominator SHALL display "—" (not NaN/∞) and SHALL NOT crash.

### Settings / Data Source page
29. Settings SHALL display: the configured API endpoint (read-only or editable field), the current `lastSyncedAt`, connection status (OK / Failed), and a manual Refresh button.
30. Settings SHALL allow the user to trigger a full re-fetch and SHALL surface the raw error message on failure (for debugging the API).

### Global
31. The UI language SHALL be **English** throughout.
32. The app SHALL support a **year selector** where more than one year of data exists; all Overview/Weekly/Trends aggregations SHALL respect the selected year.

## 2.2 Non-Functional Requirements
33. The app SHALL run on Android, iOS, and Web from one Expo/React Native Web codebase.
34. The app SHALL render the Overview page from cached data within 2 seconds of launch on a mid-range device when a cache exists (no network wait).
35. The visual theme SHALL use the ESG color scheme: **green = Environmental, gold/yellow = Social, blue = Governance**, applied consistently to pillar pages, KPI cards, and charts.
36. All lists/tables SHALL be horizontally scrollable or responsive so no data is clipped on small screens.
37. No secrets beyond the public API endpoint URL SHALL be stored in the client; the API is expected to be read-only and safe to expose (documented in SSD 3.6).

---

# 3. SSD (System / Software Design Document)

## 3.1 Architecture
- **Client:** Expo (React Native + React Native Web). Navigation via a drawer/sidebar navigator. Charts via a RN-compatible charting library. PDF via an Expo-compatible print/PDF module. Local cache via AsyncStorage (native) / localStorage (web).
- **Data source:** Google Sheets, exposed by a **Google Apps Script Web App** (deployed as "Anyone with the link", returning JSON) — built by the user. The app performs a single GET and receives all tabs in one payload.
- **No backend server** beyond the Apps Script endpoint. All computation (aggregations, ratios, trends, days-left) happens client-side from raw rows.

## 3.2 Source data model (existing sheets)
The app expects these logical tables (tabs). Column headers are matched case-insensitively; empty rows are ignored.

**Environmental** — `No, Program, Desc, Capacity_kWp, Program_Type, CO2_Avoided_tCO2e, Net_Energy_kWh_year, Implementation_Date, Documentation`
- `Program_Type` enum e.g. "Energy efficiency".

**Social** — `No, Program, Desc, Program_Type, Participants, Total_Hours, Partner, Speakers, Implementation_Date, Documentation`
- `Program_Type` enum e.g. "General Education", "Community empowerment", "Technical Training", "Brand & Awareness".

**Governance** — `No, Program, Desc, Implementation_Date, Link`

Notes:
- `Implementation_Date` is a date (used for week/month bucketing and year filtering).
- `Documentation`/`Link` may be a URL or a plain status string.
- Numeric fields may contain thousands separators; the client SHALL parse them robustly.

## 3.3 Derived definitions
- **Year:** calendar year of `Implementation_Date`.
- **Week bucket:** ISO week (Mon–Sun) of `Implementation_Date`. "Current week" = ISO week containing today; "previous week" = prior ISO week.
- **Policies (Kebijakan):** count of Governance rows in the selected year.
- **Initiatives:** count of program rows per pillar in the selected year.

## 3.4 New Awards sheet (to be created by user, guided at build time)
A dedicated tab **`Awards`** with columns (the app reads these; the user maintains them):

| Column | Type | Notes |
|---|---|---|
| `No` | number | row index |
| `Award_Name` | text | required |
| `Submit_Deadline` | date | required; drives Days Left |
| `Document` | text/URL | TOR/brochure link or filename; renders as link if URL |
| `About` | text | short description / angle |
| `Link` | URL | award website |
| `Status` | enum | `Not Started` \| `In Progress` \| `Submitted` |
| `Category` | text (optional) | e.g. pillar or theme |

- **Days Left** and **Readiness %** are **computed by the app**, not stored.

## 3.5 Optional target columns (future, not built in v1)
Progress-vs-target is deferred. When ready, a `Targets` tab with `Year, Pillar, Metric, Target_Value` would enable it. v1 must not depend on it.

## 3.6 API contract (user builds; app consumes)
- **Endpoint:** single HTTPS GET, e.g. `GET {WEB_APP_URL}?action=all`.
- **Response:** JSON of shape:
```json
{
  "generatedAt": "2026-07-04T07:30:00Z",
  "environmental": [ { "No":1, "Program":"...", "Capacity_kWp":5.5, "CO2_Avoided_tCO2e":6.6, "Net_Energy_kWh_year":8568, "Program_Type":"Energy efficiency", "Implementation_Date":"2025-07-10", "Documentation":"Finish" } ],
  "social": [ { "No":1, "Program":"Webinar PII", "Program_Type":"General Education", "Participants":344, "Total_Hours":5, "Partner":"Komunitas Hijau", "Speakers":"...", "Implementation_Date":"2025-03-20", "Documentation":"https://..." } ],
  "governance": [ { "No":1, "Program":"Laporan UNGC", "Implementation_Date":"2025-07-30", "Link":"https://..." } ],
  "awards": [ { "No":1, "Award_Name":"NUSA Awards 2026", "Submit_Deadline":"2026-06-14", "Document":"TOR NUSA.pdf", "About":"National ESG / low-carbon recognition", "Link":"https://...", "Status":"In Progress" } ]
}
```
- Dates returned as ISO `YYYY-MM-DD` (or parseable). Numbers as numbers where possible.
- The endpoint is read-only (GET), returns no secrets, and is safe to be public with the link. **The user is responsible for creating and deploying this endpoint**; the build phase will provide step-by-step Apps Script guidance.
- The app SHALL degrade gracefully if a tab/key is missing (treat as empty list) rather than crash.

## 3.7 Client computation modules
- `parse`: normalize rows, coerce numbers/dates, drop empty rows.
- `aggregate`: pillar totals, KPI set, donut/bar datasets, per-year filtering.
- `smartMetrics`: ratios (3.2/req.25), trends (req.26), award days-left & readiness (req.16–18).
- `cache`: read/write dataset + `lastSyncedAt`.
- `pdf`: render Weekly Report to PDF.

---

# 4. UI/UX

## 4.1 Layout
- **Sidebar/drawer** (persistent on web ≥ tablet width; hamburger drawer on phones) listing the 8 menu items (PRD 1.6) with an icon + label each. Active item highlighted.
- **Top bar** on every page: page title, year selector (when >1 year), Refresh button, and (when applicable) the "data as of {lastSyncedAt}" indicator.
- **Warning banner** (dismissible) appears under the top bar when showing cached data after a failed fetch.

## 4.2 Theme & visual language
- Pillar colors: **Environmental green**, **Social gold/yellow**, **Governance blue** — used for KPI cards, pillar page headers, and chart series to match the source sheets. Neutral background, professional/report-friendly typography.
- KPI cards: large number, label, and (on Weekly Report) a delta chip showing ▲/▼ % vs last week (green up / red down as contextually appropriate).

## 4.3 Page-by-page
- **Overview:** row of 5 KPI cards → donut (Number of Initiatives) → Participants vs Hours bar → Avoided CO₂ bar. Colors per pillar.
- **Environmental / Social / Governance:** pillar-colored header, that pillar's smart-metric cards, then the program list/table (horizontally scrollable on mobile) with tappable links.
- **ESG Award Tracker:** list of award cards/rows sorted by soonest deadline; each shows name, deadline, **Days Left** badge (warning if ≤14, distinct if overdue), status/readiness, About, and links. A header shows overall readiness.
- **Weekly Report:** title with week date range, KPI snapshot with WoW deltas, a comparison table (this week vs last week), and a prominent **Export PDF** button.
- **Trends & Insights:** week/month toggle, time-series line/bar charts, and efficiency-ratio cards.
- **Settings / Data Source:** endpoint field, connection status, last sync time, Refresh button, and raw error display on failure.

## 4.4 States
- **Loading:** spinner/skeleton on first load and during refresh.
- **Empty:** if a pillar/awards list has zero rows, show an "No data yet" empty state (not a blank screen).
- **Error (no cache):** full-screen message with the error and a Retry button.
- **Error (with cache):** cached content + warning banner (4.1).
- **Search placeholder:** a disabled/"coming soon" search affordance MAY be shown on Overview but performs no action in v1.

---

# Edge Cases
- **No network on first ever launch (no cache):** show full-screen error + Retry; no crash. (req. 4, 4.4)
- **Network fails on later launch (cache exists):** show cached data + warning banner with `lastSyncedAt`. (req. 4)
- **API returns malformed JSON / non-200:** treated as a fetch failure → same as above; raw error visible in Settings. (req. 30, 3.6)
- **A sheet/tab or column is missing or renamed:** treat that dataset as empty, render empty state, do not crash. (req. 3.6)
- **Zero-denominator ratios** (e.g. no capacity, no hours): display "—", never NaN/∞. (req. 28)
- **Numbers with thousands separators / stray text** in numeric cells: parsed to numbers; unparseable → treated as 0 for aggregation but flagged in the raw list. (req. 3.2)
- **Documentation cell is a status word, not a URL** (e.g. "Finish", "TBC", "Selected"): render as plain text/badge, not a broken link. (req. 13)
- **Award deadline is today / in the past:** Days Left = 0 / negative → "Overdue" styling. (req. 16–17)
- **Award with blank deadline:** show "No deadline" and exclude from deadline sorting/alerts, do not crash.
- **Empty week (no programs this week):** Weekly Report shows 0s and correct deltas vs last week, not blank.
- **Multiple years in data:** year selector controls all aggregations; default to most recent year. (req. 32)
- **PDF export on web vs mobile:** web triggers download, mobile opens OS share sheet; both contain identical content. (req. 22)
- **Very long program/desc text:** truncates with wrap/expand, does not break layout.
- **Small phone screen:** tables scroll horizontally; sidebar collapses to drawer; no clipped data. (req. 36, 4.1)

# Definition of Done
- [ ] App builds and runs on Android, iOS, and Web from one Expo codebase.
- [ ] Sidebar shows all 8 menu items and navigates to each page.
- [ ] All displayed data comes from the configured API/Google Sheets; no ESG data is hard-coded (verifiable by changing a sheet value and refreshing).
- [ ] Data refreshes only on first load and manual Refresh / pull-to-refresh; no interval polling.
- [ ] After a successful load, closing and reopening with the network off shows cached data plus a warning banner with the last sync time.
- [ ] With no cache and no network, a Retry error screen shows (no crash).
- [ ] Overview shows the 5 KPI cards and the 3 charts (donut + two bars) with values matching the sum of the pillar detail rows.
- [ ] Environmental, Social, and Governance pages each list their rows with the exact columns in reqs. 10–12 and render links vs plain-status correctly.
- [ ] Efficiency ratios (CO₂/kWp, net energy/kWp, participants/hour, avg participants & hours per program) display correct values and show "—" on zero denominators.
- [ ] Trends & Insights shows week/month-toggle time-series for initiatives, CO₂, participants, and hours.
- [ ] Award Tracker reads the dedicated Awards tab, computes Days Left from today, flags deadlines ≤14 days and overdue items, and shows a readiness indicator.
- [ ] Weekly Report shows current-week KPIs with week-over-week deltas and exports an identical-content PDF that can be shared/downloaded.
- [ ] Settings shows endpoint, connection status, last sync time, a working Refresh, and the raw error on failure.
- [ ] UI is entirely in English and uses the ESG color scheme (green/gold/blue) consistently.
- [ ] Year selector filters all aggregations; a second-year dataset is bucketed correctly.
- [ ] Every Edge Case above is handled without crashing.
