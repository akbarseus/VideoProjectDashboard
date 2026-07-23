# Hari Ini Widget

## Objective
Add a "Hari Ini" (Today) panel to the Highlight page (desktop only) that shows a day-quality reading (favourable/unfavourable activities, primbon/lunar-calendar style) for the current date in Indonesia (WIB, UTC+7), sourced from a new "Kalender 2026" tab in the same Google Sheet used for project data. This lets SUN Energy staff glance at whether today is a good day for activities like shoots/launches without opening the spreadsheet directly.

## Requirements

1. A new Apps Script route (`route=calendar`) is added to `apps-script/Code.gs` that reads the **"Kalender 2026"** tab (same spreadsheet as `video_projects_new_v1`), columns A–H, starting at data row 9 (row 8 is the header row).
2. Column mapping is:
   - A: `Tanggal` — full date, e.g. `"01 January 2026"` (English month name, Google Sheets auto-format)
   - B: `Hari` — day name (Indonesian, e.g. `"Kamis"`)
   - C: `Tahun` — year (e.g. `2026`)
   - D: `Bulan` — month name (Indonesian, e.g. `"Januari"`)
   - E: `Status / Indikator` — e.g. `"UNLUCKY DAY"` or `"MIXED ACTIVITIES"`
   - F: `Favourable Activities` — comma-separated free text, may be blank
   - G: `Unfavourable Activities` — comma-separated free text, may be blank
   - H: `Deskripsi Asli` — a combined free-text description (e.g. `"Unlucky Day - Not suitable for important activities"` or `"Favourable activities: ... Unfavourable activities: ..."`)
3. The backend returns rows as an array of objects (one per sheet row) with normalized keys (e.g. `tanggal`, `hari`, `tahun`, `bulan`, `status`, `favourable`, `unfavourable`, `deskripsi`), following the same alias/no-cache/batch-read conventions already used in `readProjects()`.
4. "Today" is computed using **Indonesia WIB time (UTC+7)**, not the browser's local timezone — a user viewing the app from a different timezone must still see the same "today" as someone in Indonesia at that moment (compute the current UTC time and add the fixed 7-hour WIB offset, rather than relying on `new Date()`'s local-timezone getters).
5. The frontend finds the sheet row whose column A date matches "today" (WIB) by parsing column A into a date and comparing year, month, and day (not exact string match, since the sheet's rendered text format may vary slightly).
6. A new data hook (parallel to `useVideoProjects`) fetches the calendar route on mount, independently of the existing project-data fetch (separate request, separate loading/error state — a calendar fetch failure must not affect or block the existing project dashboard data).
7. On desktop (≥769px) viewports, the Highlight page renders a "Hari Ini" panel to the left of the "Video Production Dashboard" title, matching the layout in the reference mockup: a large date number + month (e.g. "13 Juli"), with the Favourable/Unfavourable Activities content below it.
8. When today's row's `status` indicates a normal/mixed day (i.e. anything other than an "unlucky"-type status), the panel shows two columns/sections: "Favourable Activities" (from column F) and "Unfavourable Activities" (from column G), each rendering the comma-separated items from the sheet dynamically (not hardcoded).
9. ~~When today's row's `status` indicates an "unlucky"-type day, the panel replaces the two-column Favourable/Unfavourable layout with a single descriptive line using column H's text instead.~~ **Revised after visual review**: an "unlucky"-type day keeps the SAME two-column Favourable/Unfavourable layout (columns F/G are blank for these rows in the sheet); both columns display the fixed string "Unlucky day" instead of sheet text, matching the reference mockup. Column H (`deskripsi`) is fetched but not rendered anywhere in the panel.
10. All displayed text (date, day name, activities, description) is rendered dynamically from the fetched sheet data — nothing about a specific day's content is hardcoded in the frontend.
11. The panel layout is responsive to variable text length: longer Favourable/Unfavourable lists or a long column-H description must wrap within the panel (no fixed-height truncation that cuts off content, no horizontal overflow).
12. This feature is **desktop-only** for this iteration — the mobile Highlight page layout is unchanged; the panel is not shown at mobile widths (no mobile placement is implemented yet).

## Edge Cases
- **No row matches today's WIB date** (e.g. the app is opened after the "Kalender 2026" sheet's coverage ends, or a specific date's row is missing) — the "Hari Ini" panel does not render at all; the rest of the Highlight page layout adjusts as if the panel were never there (no empty box, no broken grid).
- **Calendar route fetch fails or times out** — fails silently for this widget only (panel simply doesn't render); this must NOT trigger the existing "Gagal terhubung ke Sheets" banner used for project data, since that banner is specifically about project data failing over to sample data.
- **Column F or G is blank** for a given day's row (e.g. some non-"unlucky" rows might still have one side blank) — render only the side(s) that have content; don't show an empty/placeholder line for a blank list.
- **Column H is blank or missing** on an "unlucky"-type row — fall back to showing nothing extra beyond the date/status rather than rendering an empty description line.
- **Column A date fails to parse** for the row that would otherwise match — treat as no match (panel hidden for that load), rather than crashing or showing an incorrect date.
- **Very long Favourable/Unfavourable lists or description text** — wraps within the panel's width; panel height grows to fit rather than clipping content.

## Definition of Done
- [ ] `apps-script/Code.gs` has a `route=calendar` handler reading the "Kalender 2026" tab (columns A–H, data starting row 9) and returning normalized rows.
- [ ] A new frontend hook fetches this route independently of `useVideoProjects`, with its own loading/error handling that never surfaces the project-data error banner.
- [ ] On a desktop viewport, the Highlight page shows a "Hari Ini" panel to the left of "Video Production Dashboard", matching the reference mockup's structure.
- [ ] The date shown in the panel equals "today" in WIB (UTC+7) — verified by checking it matches the current Indonesia date regardless of the testing machine's local timezone setting.
- [ ] On a row with a "MIXED ACTIVITIES"-type status, both Favourable and Unfavourable Activities lists render from the actual sheet content for that date (verified against at least two different dates with different content).
- [ ] On a row with an "UNLUCKY DAY"-type status, the panel shows the column-H description instead of the two-column layout.
- [ ] If today's date has no matching row in the sheet, the panel does not render and the rest of the Highlight page layout is unaffected.
- [ ] Mobile viewport (≤768px) Highlight page is pixel-for-pixel unchanged from before this feature (panel does not appear).
- [ ] A long Favourable/Unfavourable list or column-H description wraps correctly without clipping or breaking the panel's layout.
- [ ] Simulating a calendar-route fetch failure does not show any error banner and does not affect the rest of the Highlight page (hero, status cards, charts still work normally).
