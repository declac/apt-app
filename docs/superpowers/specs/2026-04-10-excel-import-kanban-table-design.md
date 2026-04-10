# Design: Excel Import, Kanban, Table View & Show Date

**Date:** 2026-04-10
**Status:** Approved

---

## Overview

Four interrelated features for managing a high-volume apartment pipeline:

1. **Excel import** — bulk-load listings from a StreetEasy-style spreadsheet
2. **Show date** — schedule and track apartment showings
3. **Table view** — dense row view for scanning many listings at once
4. **Kanban** — pipeline board with 5 columns matching the full apartment workflow

---

## 1. Unified Status System

### New Status Values

| New status | Replaces | Meaning |
|---|---|---|
| `prospecting` | `active` | Found it, haven't scheduled yet |
| `scheduled` | *(new)* | Showing date is set |
| `shown-liked` | `toured` | Toured, liked it |
| `shown-disliked` | `pass` | Toured, didn't like it |
| `applying` | `applying` | In application process |

### Migration

Runs in the `fetch('/apts')` `.then()` callback, before first render:

```js
const MAP = { active: 'prospecting', toured: 'shown-liked', pass: 'shown-disliked' };
apts = apts.map(a => ({
  ...a,
  status: MAP[a.status] || a.status
}));
```

Immediately persists after migration.

### Display Labels

| Status | Label | Color |
|---|---|---|
| `prospecting` | Prospecting | blue |
| `scheduled` | Scheduled | purple |
| `shown-liked` | Liked | green |
| `shown-disliked` | Disliked | red |
| `applying` | Applying | amber |

Status pill CSS classes updated to match. List view filter pills updated with new labels.

---

## 2. Data Model Additions

```js
{
  // existing fields unchanged...
  showDate: string | null,      // ISO date "2026-04-15", set when scheduling a showing
  retax: string | null,         // RE Tax from Excel (e.g. "Incl." or "$450")
  totalMonthly: string | null,  // Total Monthly Cost from Excel
}
```

`pros` and `cons` fields still exist for backwards compatibility during the migration period alongside the reactions system from the other spec. Both specs apply to the same codebase — reactions spec runs first.

---

## 3. Excel Import

### Library

SheetJS (`xlsx`) loaded from CDN in the HTML `<head>`:
```html
<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
```

### Trigger

"Import" button in the header (next to unit count badge). Opens a hidden `<input type="file" accept=".xlsx,.xls">`.

### Parsing

Client-side only — no server involvement.

Column index mapping (0-based, matching the observed spreadsheet structure):

| Index | Column | Maps to |
|---|---|---|
| 3 | Address | — |
| 4 | Unit | combined → `name` = "Address Unit" |
| 2 | Category | `neighborhood` |
| 6 | StreetEasy Link | `url` (extract real hyperlink via SheetJS `!links`) |
| 8 | Price | `price` (format as "$X,XXX,XXX") |
| 9 | Maint/CC | `maint` |
| 10 | RE Tax | `retax` |
| 11 | Total Monthly | `totalMonthly` |
| 12 | Type | `btype` |
| 13 | Service | `notes` (prepend "Service: Video Intercom" etc.) |
| 14 | Building | `bldg` |
| 1 | Date Seeing | `showDate` (parse as ISO date) |

Rows are skipped if Address (col 3) is empty.

### Hyperlink Extraction

SheetJS exposes hyperlinks via cell object `l.Target`. For the StreetEasy column (col G / index 6), read `ws['G'+rowNum]?.l?.Target` to get the real URL instead of the display text "View on StreetEasy".

### Deduplication

Before importing, check each parsed row against existing `apts` by normalized `name` (lowercase, trimmed). Skip duplicates silently and count them.

### Preview Modal

After parsing, show a bottom sheet:
```
Import 47 listings?
3 already exist and will be skipped.

[ Cancel ]  [ Import ]
```

On confirm: append new apartments to `apts` with `status: 'prospecting'`, `id: String(Date.now() + index)` (ensures unique string IDs when multiple are imported in the same millisecond), call `persist()`, close modal, render list view.

---

## 4. Show Date

### Field

`showDate: string | null` — ISO date string (e.g. `"2026-04-15"`).

### Where It Appears

- **Edit form**: date input field labeled "Showing Date" below the status selector. Setting a date automatically changes status to `scheduled` if current status is `prospecting`.
- **Kanban**: displayed on each card in the Scheduled column as `📅 Apr 15`.
- **Table view**: dedicated "Show Date" column.
- **List card**: shown as a small badge below the status pill when set.
- **Detail view**: shown in the main field grid when set.

---

## 5. Table View

### Toggle

Icon button in the header bar (right side, next to unit count). Toggles between card view and table view. State stored in a `let tableView = false` variable (not persisted — resets on reload).

### Layout

Full-width scrollable table:

| Address | Price | Total/Mo | Type | Neighborhood | Show Date | Status |
|---|---|---|---|---|---|---|
| 55 East 65th St 4C | $550k | $1,287 | Co-op | UES | Apr 15 | Scheduled |

- Tapping any row opens detail view for that apartment
- Column headers are tappable to sort ascending/descending
- Sort state: `let tableSort = { col: null, dir: 'asc' }`
- On mobile: table scrolls horizontally; Address column is sticky (left-pinned)
- Filtered by the same status filter pills as card view

### Sortable Columns

Price, Total Monthly, Show Date, and Status are sortable. Address sorts alphabetically. Neighborhood and Type are not sortable (low value).

---

## 6. Kanban

### New Nav Tab

Add "Board" as a 4th tab in the nav bar (joining List, Compare, Shortlist). Nav becomes: **List · Board · Compare · Shortlist**.

### Layout

Horizontal scrolling container with 5 columns:

```
| Prospecting (12) | Scheduled (5) | Liked (8) | Disliked (20) | Applying (3) |
|------------------|---------------|-----------|---------------|--------------|
| [card]           | [card]        | [card]    | [card]        | [card]       |
| [card]           | 📅 Apr 15     | ...       | ...           | ...          |
| ...              | ...           |           |               |              |
```

Each column:
- Header: label + count badge
- Vertically scrollable list of compact cards
- Compact card shows: name (truncated), price, show date (if set)

### Moving Cards — Desktop

HTML5 drag-and-drop: `draggable="true"` on cards, `dragover`/`drop` on columns. On drop, update `apt.status` and call `persist()`.

### Moving Cards — Mobile

Tap a card → bottom sheet appears:
```
Move "55 East 65th St 4C" to:
○ Prospecting
○ Scheduled  [date input appears if selected]
● Shown Liked  ← current
○ Shown Disliked
○ Applying
[ Done ]
```

If "Scheduled" is selected, an inline date input appears in the sheet to set `showDate`. On Done: update status (and showDate if applicable), call `persist()`, close sheet.

### Mobile Detection

Use `('ontouchstart' in window)` to determine whether to show drag handles or make cards tappable for the move sheet. On touch devices, disable `draggable` and enable the tap-to-move flow.

---

## Navigation Update

Current nav: `List · Compare · Shortlist` (3 tabs)
New nav: `List · Board · Compare · Shortlist` (4 tabs)

`showView()` updated to handle `'board'` view. FAB (add button) hidden on Board, Compare, and Shortlist views.

---

## Out of Scope

- Server-side Excel parsing
- Real-time sync between devices during import
- Editing multiple apartments at once from table view
- Filtering within kanban columns

---

## Files Changed

All changes in `index.js`.

Sections affected:
- `<head>` — add SheetJS CDN script tag
- `:root` CSS — status pill color variables updated
- Status pill CSS classes — new class names for 5 statuses
- Nav HTML — add Board tab
- `showView()` — handle `'board'`
- `render()` — handle `'board'`
- `renderList()` — filter pill labels updated; add table/card toggle; `renderTable()` helper
- `renderBoard()` — new function, kanban layout
- `renderDetail()` — add showDate field
- Edit form HTML — add showDate input, retax, totalMonthly fields
- `saveApt()` — handle new fields
- `persist()` / load callback — status migration
- Header HTML — add Import button + table toggle button
- Import logic — `handleImport()`, file input, SheetJS parsing, preview modal
