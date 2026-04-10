# Design: Photo-linked Reactions & Light Mode

**Date:** 2026-04-10
**Status:** Approved

---

## Overview

Two interrelated improvements to the apt-app:

1. **Photo-first pros/cons tagging** — structured reactions (👍/👎) linked to specific photos, replacing free-text pros/cons fields
2. **Light mode UI** — full palette swap from dark to light

---

## 1. Light Mode

### CSS Variable Changes

| Variable | Current (dark) | New (light) |
|---|---|---|
| `--bg` | `#0f0f0f` | `#f7f5f2` |
| `--surface` | `#1a1a1a` | `#ffffff` |
| `--surface2` | `#242424` | `#f0ede8` |
| `--card-bg` | `#181818` | `#ffffff` |
| `--border` | `#2e2e2e` | `#e2ddd8` |
| `--text` | `#f0ece4` | `#1a1a1a` |
| `--muted` | `#6b6560` | `#8a8480` |
| `--accent` | `#e8c547` | `#b8860b` |
| `--accent2` | `#4a9eff` | `#2563eb` |
| `--red` | `#ff5f5f` | `#dc2626` |
| `--green` | `#4ecb7e` | `#16a34a` |

All component shapes, spacing, and typography remain unchanged. The FAB (add button) uses `--accent` background with `#ffffff` icon.

---

## 2. Data Model: Reactions

### Before

```js
{
  pros: "Close to subway\nNatural light",  // newline-separated string
  cons: "Small kitchen\nNo storage"        // newline-separated string
}
```

### After

```js
{
  reactions: [
    { id: "r1", text: "Close to subway", type: "pro", photoIndex: null },
    { id: "r2", text: "Natural light", type: "pro", photoIndex: 0 },
    { id: "r3", text: "Small kitchen", type: "con", photoIndex: 2 },
    { id: "r4", text: "No storage", type: "con", photoIndex: null }
  ]
}
```

- `id`: timestamp string, unique per reaction
- `type`: `"pro"` or `"con"`
- `photoIndex`: index into `apt.photos[]`, or `null` if not linked to a photo

### Migration

On load, for any apartment that has `pros` or `cons` strings and no `reactions` array, automatically convert:
- Each non-empty line of `pros` → `{ type: "pro", photoIndex: null, text: line }`
- Each non-empty line of `cons` → `{ type: "con", photoIndex: null, text: line }`
- Set `reactions` array, remove `pros`/`cons` fields

Migration runs in the `fetch('/apts')` `.then()` callback before first render, and immediately persists the converted data.

---

## 3. Photo Viewer — Tagging Flow

### Trigger

Tapping a photo in detail view opens a new full-screen photo overlay (a lightweight `<div>` with `position:fixed`, separate from the annotation sheet which is edit-form-only). Photos in detail view currently have no tap handler — this adds one.

### Layout

```
[ full-screen photo ]

[ existing reactions for this photo as chips ]
  ✓ Natural light  ✗ Small closet

[ 👍 Pro ]  [ 👎 Con ]
```

- Tapping 👍 or 👎 reveals an inline text input: "What did you notice?" with a submit button
- Submit creates a reaction: `{ id: Date.now().toString(), text, type, photoIndex: currentIndex }`
- Appends to `apt.reactions`, calls `persist()`, re-renders the chip list inline (no full re-render)
- Existing reactions for this photo shown as deletable chips above the buttons
- Deleting a chip removes from `apt.reactions` and calls `persist()`

---

## 4. Detail View — Reactions Section

Replace the current "Pros & Cons" section with a structured list.

### Layout

```
PROS
  ✓ Close to subway
  ✓ Natural light  [tiny photo thumb]   ← tappable, scrolls to photo

CONS
  ✗ Small kitchen  [tiny photo thumb]
  ✗ No storage
```

- Photo thumbnails are 28×28px, rounded, shown inline to the right of the text
- Tapping a thumbnail opens that photo full-screen
- If no reactions: show "Tap a photo to add reactions" prompt
- No inline editing in detail view — editing happens via the photo viewer or the edit form

### Edit Form

The edit form replaces the `pros`/`cons` textareas with a simple reaction list:
- Each reaction shown as a row: `[type toggle] [text] [delete]`
- "Add pro" / "Add con" buttons at the bottom
- No photo linking from the edit form — photo links are only set via the photo viewer

---

## 5. Compare View — Reactions

Replace the current pros/cons table row with two stacked bullet lists per column.

### Layout (per apartment column)

```
PROS
  ✓ Close to subway
  ✓ Natural light 🖼

CONS
  ✗ Small kitchen 🖼
  ✗ Noisy street
```

- 🖼 icon (not full thumbnail) indicates a photo is linked — tapping navigates to that apt's detail
- Max 4 pros + 4 cons shown; if more, show "+ N more"
- If no reactions: show "—"

---

## 6. Shortlist — Stack Ranking

### Behavior

- Shortlist tab shows all 4+ star apartments (unchanged threshold)
- Items are drag-to-reorder; order is saved as a `rank` field on each apartment (`rank: 0` = top pick)
- On first load of the shortlist after this feature ships, `rank` is assigned by descending star rating
- Dragging and dropping updates `rank` for all affected items and calls `persist()`
- Display order: ascending `rank` (0 first)

### Implementation

Use the HTML5 drag-and-drop API (`draggable`, `dragstart`, `dragover`, `drop`). No external library. Touch drag support via `touchstart`/`touchmove`/`touchend` events (needed for iPhone).

---

## Out of Scope

- Sharing with others
- Commute time / map view
- Export to PDF/CSV
- Push notifications

---

## Files Changed

All changes are in `index.js` (single-file Cloudflare Worker). No new files needed.

Sections affected:
- CSS variables (`:root` block)
- `persist()` / load callback — migration logic
- `renderDetail()` — reactions section, photo viewer
- `renderCompare()` — reactions columns
- `renderShortlist()` — drag-to-reorder
- Edit form HTML — replace pros/cons textareas
- `saveApt()` / `applyData()` — handle reactions field
