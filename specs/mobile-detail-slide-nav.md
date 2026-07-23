# Mobile Detail Slide Navigation

## Objective
On the "Detail Proyek" page, mobile users currently see a sticky detail card (with thumbnail) stacked above the project list, which eats most of the viewport and pushes the list mostly out of view. This feature removes the always-visible detail card on mobile: the list becomes the default (and only) view, and tapping a project slides in a dedicated full-screen detail view for that project, with a way back to the list. Desktop keeps its current side-by-side list + detail layout, completely unchanged. This is for SUN Energy staff browsing project video status on their phones.

## Requirements

1. This behavior applies **only** below the existing mobile breakpoint (`max-width: 768px`, matching the breakpoint already used elsewhere in `ProjectDetailPage.jsx`). At `769px` and above, the current side-by-side list + detail layout is unchanged.
2. On mobile, the default view for the Detail Proyek page is the **list view**: search bar, filter chips, and the scrollable project list. The detail card (with thumbnail, status, info grid, and links) is **not rendered/visible** in this view.
3. Tapping a project card in the list triggers a **slide-in transition from the right** to a full-screen **detail view** showing that project's detail card (same content as the existing `DetailPanel`: thumbnail if published, status badge, name, info grid, links).
4. While in the detail view, the topbar shows the **project's name** (instead of "Detail Proyek") with a back arrow.
5. Tapping the back arrow while in the detail view returns to the **list view** with a **slide transition to the right** (reverse of the entry transition). The topbar reverts to showing "Detail Proyek" with its own back arrow (existing behavior, unchanged) that returns to Highlight.
6. A **swipe-back gesture** (left-edge swipe, standard iOS-style back gesture) is also supported while in the detail view, performing the same action as the back arrow (return to list, same reverse transition).
7. When returning to the list (via arrow or swipe), the list's **scroll position and highlighted item are preserved** exactly as they were before the detail view was opened — the list does not reset to top or lose its highlight.
8. Active search text and filter chip selection **persist** across opening and closing the detail view (opening/closing a detail must not clear or reset search/filter state).
9. When a project detail is opened via a "Lihat N tautan lainnya" ("view more") link from the Highlight or Data page (i.e. `initialId` is passed into `ProjectDetailPage`), and the viewport is mobile-width, the page **jumps straight into the slid-in detail view** for that project — the user does not see the list first.
10. When a project detail is opened via `initialId` and the viewport is desktop-width, behavior is unchanged from today (side-by-side view with that project pre-selected).
11. Selecting a different project from the list while already in a mobile session re-triggers the same slide-in transition for the newly selected project (i.e., tapping any list card from the list view always performs the slide-in, regardless of which project was previously viewed).
12. The transition (both directions) uses a consistent duration/easing in line with the app's existing motion (e.g. the `Drawer` component's `.25s cubic-bezier(.4,0,.2,1)` slide) — no jank, no layout shift during the animation.

## Edge Cases
- **Filtered/searched list becomes empty while a detail is open**: if the user changes search/filter while in the detail view (not expected via normal interaction since filter UI isn't visible in detail view, but covers state edge cases) — on return to list, if the previously-viewed project is no longer in the filtered results, fall back to the existing "auto-select first visible item" logic already present in the component, without erroring.
- **Resizing across the breakpoint while a detail is open** (e.g. rotating a tablet, resizing a browser window): if the viewport crosses from mobile to desktop width while the mobile detail view is open, the page should render the existing desktop side-by-side layout with that same project selected — no blank state or crash. If it crosses back from desktop to mobile, the mobile view should show list view by default (not auto-open a detail), unless a detail was already actively open in the mobile session immediately prior to crossing to desktop and back.
- **Rapid repeated taps** on different list items in quick succession: each tap should cleanly re-trigger the slide-in for the latest tapped project; no stacking of multiple transitions or visual glitches.
- **Swipe-back gesture started but not completed** (user drags partway then releases without crossing the threshold): the detail view returns to its fully-open resting position (standard cancelable swipe-back behavior), not left in a half-transitioned state.
- **No projects match the current filter** (empty list): tapping is impossible since there are no cards, so no detail view can be entered — list view simply shows the existing "no projects found" empty state.

## Definition of Done
- [ ] On a viewport ≤768px wide, opening Detail Proyek from the sidebar/bottom-nav shows only the list (search + filter chips + scrollable cards) — no detail card is visible without tapping.
- [ ] Tapping any project card slides in a full-screen detail view from the right, showing that project's thumbnail (if applicable), status, name, info grid, and links.
- [ ] The topbar during the detail view shows the project's name and a back arrow; tapping it slides back to the list (topbar reverts to "Detail Proyek").
- [ ] A left-edge swipe gesture on the detail view also returns to the list with the same reverse slide.
- [ ] Returning to the list preserves the exact scroll position and highlighted item from before the detail was opened.
- [ ] Search text and active filter chip remain unchanged after opening and closing a detail view.
- [ ] Clicking "Lihat N tautan lainnya" from Highlight or Data, on a mobile-width viewport, navigates directly into the slid-in detail view for that project (list is not shown first).
- [ ] The same "view more" flow on a desktop-width viewport still shows the existing unchanged side-by-side layout.
- [ ] At viewport widths ≥769px, the entire feature is inactive — layout and behavior match the current side-by-side list + detail experience exactly.
- [ ] Resizing the window across the 768px breakpoint while viewing a detail does not crash, blank out, or lose the currently selected project.
- [ ] No console errors/warnings introduced, and the existing sticky-list-scroll and thumbnail-sizing behaviors (from prior fixes this session) remain intact on both mobile and desktop.
