# Excel Import, Kanban, Table View & Show Date — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prerequisite:** Run plan `2026-04-10-photo-reactions-light-mode.md` first. This plan assumes the reactions migration and light mode are already in place.

**Goal:** Add Excel bulk import, a kanban pipeline board, a dense table view, and show date tracking to the apartment app.

**Architecture:** All changes in `index.js`. Status values are unified to 5 new slugs (migrated on load). SheetJS parses Excel client-side. A new "Board" nav tab renders a horizontal kanban with 5 columns. The list view gains a card/table toggle. Show date is a new field threaded through the edit form, detail view, kanban, and table.

**Tech Stack:** Vanilla JS, SheetJS (CDN), HTML5 drag-and-drop, Cloudflare Workers KV

---

## File Map

- Modify: `index.js` — all changes in this one file
  - `<head>` — add SheetJS CDN script tag
  - `:root` CSS — new status pill colors
  - New CSS — kanban board, table view, import modal, show date badge
  - Load callback — status migration
  - Nav HTML — add Board tab
  - Header HTML — add Import button + table toggle
  - Edit form HTML — add showDate, retax, totalMonthly fields; update status select options
  - `showView()` — handle `'board'`
  - `render()` — handle `'board'`
  - `renderList()` — filter pill labels updated; table/card toggle
  - New `renderTable()` function
  - New `renderBoard()` function
  - `renderDetail()` — add showDate, retax, totalMonthly fields
  - `clearForm()`, `fillForm()`, `saveApt()` — handle new fields
  - New `handleImport()` function + import modal HTML

---

## Task 1: Status System Migration

**Files:**
- Modify: `index.js`

- [ ] **Step 1: Update status CSS classes**

Find lines 60–63 (status pill classes). Replace:
```css
.s-active { background: rgba(22,163,74,0.12); color: var(--green); }
.s-toured { background: rgba(37,99,235,0.12); color: var(--accent2); }
.s-applying { background: rgba(184,134,11,0.12); color: var(--accent); }
.s-pass { background: var(--surface2); color: var(--muted); }
```

With:
```css
.s-prospecting { background: rgba(37,99,235,0.1); color: var(--accent2); }
.s-scheduled   { background: rgba(124,58,237,0.1); color: #7c3aed; }
.s-shown-liked { background: rgba(22,163,74,0.12); color: var(--green); }
.s-shown-disliked { background: rgba(220,38,38,0.08); color: var(--red); }
.s-applying    { background: rgba(184,134,11,0.12); color: var(--accent); }
```

- [ ] **Step 2: Update status migration in load callback**

Find the load callback. It already migrates `pros`/`cons` → `reactions`. Add status migration inside the same `.map()`:

```js
apts = Array.isArray(data) ? data : [];
const STATUS_MAP = { active: 'prospecting', toured: 'shown-liked', pass: 'shown-disliked' };
let migrated = false;
apts = apts.map(a => {
  let updated = {...a};
  // Status migration
  if (STATUS_MAP[a.status]) { updated.status = STATUS_MAP[a.status]; migrated = true; }
  // Reactions migration (from plan 1 — keep this block)
  if (!updated.reactions && (a.pros || a.cons)) {
    const r = [];
    if (a.pros) a.pros.split('\n').filter(Boolean).forEach(t => r.push({id: Date.now()+'_'+Math.random(), text: t, type: 'pro', photoIndex: null}));
    if (a.cons) a.cons.split('\n').filter(Boolean).forEach(t => r.push({id: Date.now()+'_'+Math.random(), text: t, type: 'con', photoIndex: null}));
    updated.reactions = r; migrated = true;
  }
  if (!updated.reactions) updated.reactions = [];
  return updated;
});
if (migrated) persist();
render();
```

- [ ] **Step 3: Update status select in edit form**

Find the status select (line ~224):
```html
<select id="f-status"><option value="active">Active</option><option value="toured">Toured</option><option value="applying">Applying</option><option value="pass">Passed</option></select>
```

Replace with:
```html
<select id="f-status">
  <option value="prospecting">Prospecting</option>
  <option value="scheduled">Scheduled</option>
  <option value="shown-liked">Shown — Liked</option>
  <option value="shown-disliked">Shown — Disliked</option>
  <option value="applying">Applying</option>
</select>
```

- [ ] **Step 4: Update `fillForm()` default status**

Find in `fillForm()`:
```js
document.getElementById('f-status').value=a.status||'active';
```
Change to:
```js
document.getElementById('f-status').value=a.status||'prospecting';
```

- [ ] **Step 5: Update status → CSS class mapping everywhere**

Search the file for `sc = {active:'s-active',toured:'s-toured',applying:'s-applying',pass:'s-pass'}`. There are two occurrences (in `renderList()` and `renderDetail()`). Replace both with:
```js
const sc = {prospecting:'s-prospecting',scheduled:'s-scheduled','shown-liked':'s-shown-liked','shown-disliked':'s-shown-disliked',applying:'s-applying'}[a.status]||'s-prospecting';
```

- [ ] **Step 6: Update filter pills in renderList()**

Find in `renderList()`:
```js
const sts = ['all','active','toured','applying','pass'];
const lbs = ['All','Active','Toured','Applying','Passed'];
```

Replace with:
```js
const sts = ['all','prospecting','scheduled','shown-liked','shown-disliked','applying'];
const lbs = ['All','Prospecting','Scheduled','Liked','Disliked','Applying'];
```

- [ ] **Step 7: Verify**

Run `npx wrangler dev`. Open the app. Existing apartments should still show with their statuses (now labeled "Prospecting" instead of "Active", etc.). The status select in the edit form should show 5 new options. Status pills should have the new colors.

- [ ] **Step 8: Commit**

```bash
git add index.js
git commit -m "feat: unified 5-status system with migration"
```

---

## Task 2: Show Date, RE Tax, Total Monthly Fields

**Files:**
- Modify: `index.js`

- [ ] **Step 1: Add showDate field to edit form**

Find in the edit form, after the status select row:
```html
<div class="frow">
  <div class="fg"><label>Beds</label>...
```

Add a new row before it:
```html
<div class="frow">
  <div class="fg"><label>Showing Date</label><input type="date" id="f-showdate"></div>
  <div class="fg"><label>RE Tax /mo</label><input type="text" id="f-retax" placeholder="Incl. or $450"></div>
</div>
<div class="fg"><label>Total Monthly Cost</label><input type="text" id="f-totalmonthly" placeholder="$1,287"></div>
```

- [ ] **Step 2: Update `clearForm()`**

Add `'f-showdate','f-retax','f-totalmonthly'` to the array of IDs being cleared.

- [ ] **Step 3: Update `fillForm()`**

After `sv('f-url',a.url)`, add:
```js
sv('f-showdate', a.showDate);
sv('f-retax', a.retax);
sv('f-totalmonthly', a.totalMonthly);
```

- [ ] **Step 4: Update `saveApt()`**

In the `apt` object being built, after `url:...`, add:
```js
showDate: document.getElementById('f-showdate').value || null,
retax: document.getElementById('f-retax').value.trim() || null,
totalMonthly: document.getElementById('f-totalmonthly').value.trim() || null,
```

Also add auto-status logic — if a showDate is set and current status is `prospecting`, auto-advance to `scheduled`:
```js
// After building `apt` object, before saving:
if (apt.showDate && apt.status === 'prospecting') apt.status = 'scheduled';
```

- [ ] **Step 5: Show showDate in detail view**

In `renderDetail()`, find the `.d-grid` block that shows Price, Layout, Sq Ft, Floor, Year Built. Add after `a.floor` row:
```js
${a.showDate ? `<div class="d-field"><div class="lbl">Showing</div><div class="val">${new Date(a.showDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></div>` : ''}
${a.retax ? `<div class="d-field"><div class="lbl">RE Tax</div><div class="val">${a.retax}</div></div>` : ''}
${a.totalMonthly ? `<div class="d-field"><div class="lbl">Total /mo</div><div class="val" style="font-weight:600">${a.totalMonthly}</div></div>` : ''}
```

- [ ] **Step 6: Show date badge on list cards**

In `renderList()`, inside the card template, find the `.card-bottom` div:
```js
<div class="card-bottom"><div class="stars">${stars}</div><span class="status-pill ${sc}">${a.status}</span></div>
```

Replace with:
```js
<div class="card-bottom">
  <div class="stars">${stars}</div>
  <div style="display:flex;align-items:center;gap:6px">
    ${a.showDate ? `<span style="font-size:10px;color:var(--muted)">📅 ${new Date(a.showDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>` : ''}
    <span class="status-pill ${sc}">${a.status.replace('shown-','').replace('prospecting','prospect')}</span>
  </div>
</div>
```

- [ ] **Step 7: Verify**

Open the edit form for an apartment. Set a showing date. Save. The card in list view should show the date badge. The detail view should show Showing date in the field grid.

- [ ] **Step 8: Commit**

```bash
git add index.js
git commit -m "feat: show date, retax, totalMonthly fields with auto-status to scheduled"
```

---

## Task 3: Table View

**Files:**
- Modify: `index.js`

- [ ] **Step 1: Add table view CSS**

Add before `</style>`:
```css
/* Table view */
.tbl-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -16px; }
.apt-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 620px; }
.apt-table th { position: sticky; top: 0; background: var(--surface); text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border); cursor: pointer; white-space: nowrap; user-select: none; }
.apt-table th:first-child { position: sticky; left: 0; z-index: 2; background: var(--surface); }
.apt-table th.sorted-asc::after { content: ' ↑'; }
.apt-table th.sorted-desc::after { content: ' ↓'; }
.apt-table td { padding: 11px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.apt-table td:first-child { position: sticky; left: 0; background: var(--card-bg); font-weight: 500; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; z-index: 1; }
.apt-table tr { cursor: pointer; background: var(--card-bg); }
.apt-table tr:hover { background: var(--surface2); }
.tbl-toggle { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 5px 10px; font-family: 'Outfit', sans-serif; font-size: 12px; color: var(--muted); cursor: pointer; margin-left: 8px; }
.tbl-toggle.on { background: var(--accent); color: #ffffff; border-color: var(--accent); }
```

- [ ] **Step 2: Add table toggle button to header HTML**

Find the header HTML (line ~187):
```html
<div class="header">
  <div class="header-logo">Apt<span>.</span></div>
  <div class="header-count" id="hdr-count">0 units</div>
</div>
```

Replace with:
```html
<div class="header">
  <div class="header-logo">Apt<span>.</span></div>
  <div style="display:flex;align-items:center;gap:6px">
    <div class="header-count" id="hdr-count">0 units</div>
    <button class="tbl-toggle" id="tbl-tog" onclick="toggleTableView()">☰</button>
  </div>
</div>
```

- [ ] **Step 3: Add `tableView` state variable and toggle function**

Find the variables at the top of `<script>`:
```js
let apts = [];
let view = 'list', editId = null, pendingPhotos = [], rating = 0, filterSt = 'all', lastParsed = null;
```

Add `tableView` and `tableSort`:
```js
let apts = [];
let view = 'list', editId = null, pendingPhotos = [], rating = 0, filterSt = 'all', lastParsed = null;
let tableView = false, tableSort = { col: null, dir: 'asc' };
```

Add `toggleTableView()` function after `setFilter()`:
```js
function toggleTableView() {
  tableView = !tableView;
  document.getElementById('tbl-tog').classList.toggle('on', tableView);
  render();
}
```

- [ ] **Step 4: Add `renderTable()` function**

Add after `renderList()`:
```js
function renderTable() {
  const sts = ['all','prospecting','scheduled','shown-liked','shown-disliked','applying'];
  const lbs = ['All','Prospecting','Scheduled','Liked','Disliked','Applying'];
  const pills = `<div class="filter-row">${sts.map((s,i) => `<button class="fpill ${filterSt===s?'on':''}" onclick="setFilter('${s}')">${lbs[i]}</button>`).join('')}</div>`;
  let filtered = filterSt === 'all' ? [...apts] : apts.filter(a => a.status === filterSt);

  if (tableSort.col) {
    filtered.sort((a, b) => {
      let va, vb;
      if (tableSort.col === 'price') { va = parseFloat((a.price||'').replace(/[^0-9.]/g,'')||0); vb = parseFloat((b.price||'').replace(/[^0-9.]/g,'')||0); }
      else if (tableSort.col === 'total') { va = parseFloat((a.totalMonthly||'').replace(/[^0-9.]/g,'')||0); vb = parseFloat((b.totalMonthly||'').replace(/[^0-9.]/g,'')||0); }
      else if (tableSort.col === 'date') { va = a.showDate||''; vb = b.showDate||''; }
      else if (tableSort.col === 'status') { va = a.status||''; vb = b.status||''; }
      else { va = (a.name||'').toLowerCase(); vb = (b.name||'').toLowerCase(); }
      if (va < vb) return tableSort.dir === 'asc' ? -1 : 1;
      if (va > vb) return tableSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  if (!filtered.length) return pills + `<div class="empty"><p>No apartments match this filter.</p></div>`;

  const th = (label, col) => {
    const active = tableSort.col === col;
    const cls = active ? (tableSort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc') : '';
    return `<th class="${cls}" onclick="sortTable('${col}')">${label}</th>`;
  };

  const rows = filtered.map(a => {
    const sc = {prospecting:'s-prospecting',scheduled:'s-scheduled','shown-liked':'s-shown-liked','shown-disliked':'s-shown-disliked',applying:'s-applying'}[a.status]||'s-prospecting';
    const dateStr = a.showDate ? new Date(a.showDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';
    const label = {prospecting:'Prospect',scheduled:'Scheduled','shown-liked':'Liked','shown-disliked':'Disliked',applying:'Applying'}[a.status]||a.status;
    return `<tr onclick="openDetail('${a.id}')">
      <td>${a.name}</td>
      <td>${a.price||'—'}</td>
      <td>${a.totalMonthly||a.maint||'—'}</td>
      <td>${a.btype||'—'}</td>
      <td>${a.neighborhood||'—'}</td>
      <td>${dateStr}</td>
      <td><span class="status-pill ${sc}">${label}</span></td>
    </tr>`;
  }).join('');

  return pills + `<div class="tbl-wrap"><table class="apt-table">
    <thead><tr>${th('Address','name')}${th('Price','price')}${th('Total /mo','total')}${th('Type','')}<th>Neighborhood</th>${th('Show Date','date')}${th('Status','status')}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function sortTable(col) {
  if (tableSort.col === col) tableSort.dir = tableSort.dir === 'asc' ? 'desc' : 'asc';
  else { tableSort.col = col; tableSort.dir = 'asc'; }
  render();
}
```

- [ ] **Step 5: Wire table view into `renderList()`**

At the very start of `renderList()`, add:
```js
if (tableView) return renderTable();
```

- [ ] **Step 6: Verify**

Open the app. Tap ☰ in the header — list should switch to a dense table. Tap a column header — rows sort. Tap ☰ again — back to cards. Tap a row — detail view opens.

- [ ] **Step 7: Commit**

```bash
git add index.js
git commit -m "feat: table view with sortable columns and card/table toggle"
```

---

## Task 4: Kanban Board

**Files:**
- Modify: `index.js`

- [ ] **Step 1: Add kanban CSS**

Add before `</style>`:
```css
/* Kanban board */
.board-wrap { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 20px; height: calc(100dvh - 120px); -webkit-overflow-scrolling: touch; }
.board-wrap::-webkit-scrollbar { display: none; }
.board-col { flex-shrink: 0; width: 220px; display: flex; flex-direction: column; background: var(--surface2); border-radius: 14px; overflow: hidden; }
.board-col-hd { padding: 12px 14px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
.board-col-count { background: var(--surface); border-radius: 20px; padding: 2px 8px; font-size: 11px; color: var(--muted); font-weight: 600; }
.board-col-cards { flex: 1; overflow-y: auto; padding: 10px 8px; display: flex; flex-direction: column; gap: 8px; -webkit-overflow-scrolling: touch; }
.board-col-cards::-webkit-scrollbar { display: none; }
.board-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 11px 12px; cursor: pointer; transition: border-color 0.15s; }
.board-card:active { border-color: var(--accent); }
.board-card.drag-over { border-color: var(--accent); background: var(--surface2); }
.board-card-name { font-size: 13px; font-weight: 600; line-height: 1.3; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board-card-price { font-size: 12px; color: var(--accent); font-weight: 500; }
.board-card-date { font-size: 11px; color: var(--muted); margin-top: 4px; }

/* Move sheet */
.move-sheet-option { display: flex; align-items: center; gap: 12px; padding: 13px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
.move-sheet-option:last-child { border-bottom: none; }
.move-sheet-option input[type=radio] { width: 18px; height: 18px; accent-color: var(--accent); flex-shrink: 0; }
.move-date-row { padding: 8px 0 4px 30px; }
```

- [ ] **Step 2: Add Board tab to nav HTML**

Find the nav (line ~191):
```html
<nav class="nav">
  <button class="nav-btn active" onclick="showView('list')">All Units</button>
  <button class="nav-btn" onclick="showView('compare')">Compare</button>
  <button class="nav-btn" onclick="showView('shortlist')">Shortlist</button>
</nav>
```

Replace with:
```html
<nav class="nav">
  <button class="nav-btn active" onclick="showView('list')">List</button>
  <button class="nav-btn" onclick="showView('board')">Board</button>
  <button class="nav-btn" onclick="showView('compare')">Compare</button>
  <button class="nav-btn" onclick="showView('shortlist')">Shortlist</button>
</nav>
```

- [ ] **Step 3: Update `showView()` for Board tab**

Find `showView()`:
```js
function showView(v) {
  view = v;
  document.querySelectorAll('.nav-btn').forEach((b,i) => b.classList.toggle('active', ['list','compare','shortlist'][i] === v));
  document.getElementById('fab').style.display = v === 'list' ? 'flex' : 'none';
  render();
}
```

Replace with:
```js
function showView(v) {
  view = v;
  document.querySelectorAll('.nav-btn').forEach((b,i) => b.classList.toggle('active', ['list','board','compare','shortlist'][i] === v));
  document.getElementById('fab').style.display = v === 'list' ? 'flex' : 'none';
  render();
}
```

- [ ] **Step 4: Update `render()` for Board view**

Find `render()`:
```js
function render() {
  const el = document.getElementById('scroll-area');
  if (view === 'list') el.innerHTML = renderList();
  else if (view === 'compare') el.innerHTML = renderCompare();
  else if (view === 'shortlist') el.innerHTML = renderShortlist();
  else if (view === 'detail') el.innerHTML = renderDetail();
  persist();
}
```

Add `'board'` case:
```js
function render() {
  const el = document.getElementById('scroll-area');
  if (view === 'list') el.innerHTML = renderList();
  else if (view === 'board') { el.innerHTML = renderBoard(); initBoardDrag(); }
  else if (view === 'compare') el.innerHTML = renderCompare();
  else if (view === 'shortlist') el.innerHTML = renderShortlist();
  else if (view === 'detail') el.innerHTML = renderDetail();
  persist();
}
```

- [ ] **Step 5: Add `renderBoard()` function**

Add after `renderShortlist()`:
```js
function renderBoard() {
  const isTouch = 'ontouchstart' in window;
  const COLS = [
    { status: 'prospecting',    label: 'Prospecting',    color: 'var(--accent2)' },
    { status: 'scheduled',      label: 'Scheduled',      color: '#7c3aed' },
    { status: 'shown-liked',    label: 'Liked',          color: 'var(--green)' },
    { status: 'shown-disliked', label: 'Disliked',       color: 'var(--red)' },
    { status: 'applying',       label: 'Applying',       color: 'var(--accent)' },
  ];
  const cols = COLS.map(col => {
    const cards = apts.filter(a => a.status === col.status);
    const cardHtml = cards.map(a => {
      const dateStr = a.showDate ? `📅 ${new Date(a.showDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}` : '';
      const drag = isTouch ? '' : `draggable="true" ondragstart="boardDragStart(event,'${a.id}')" ondragend="boardDragEnd(event)"`;
      const tap = isTouch ? `onclick="openMoveSheet('${a.id}')"` : `onclick="openDetail('${a.id}')"`;
      return `<div class="board-card" ${drag} ${tap} data-id="${a.id}">
        <div class="board-card-name">${a.name}</div>
        <div class="board-card-price">${a.price||'—'}</div>
        ${dateStr ? `<div class="board-card-date">${dateStr}</div>` : ''}
      </div>`;
    }).join('') || `<div style="color:var(--muted);font-size:12px;text-align:center;padding:12px">Empty</div>`;
    const dropHandlers = isTouch ? '' : `ondragover="event.preventDefault()" ondrop="boardDrop(event,'${col.status}')"`;
    return `<div class="board-col" ${dropHandlers}>
      <div class="board-col-hd" style="color:${col.color}">
        ${col.label}
        <span class="board-col-count">${cards.length}</span>
      </div>
      <div class="board-col-cards">${cardHtml}</div>
    </div>`;
  }).join('');
  return `<div class="board-wrap">${cols}</div>`;
}

// ── Board drag (desktop) ──────────────────────────────────────────────────────
let _dragId = null;
function boardDragStart(e, id) { _dragId = id; e.target.style.opacity = '0.5'; }
function boardDragEnd(e) { e.target.style.opacity = '1'; _dragId = null; }
function boardDrop(e, status) {
  e.preventDefault();
  if (!_dragId) return;
  const a = apts.find(x => x.id === _dragId); if (!a) return;
  a.status = status;
  if (status !== 'scheduled') a.showDate = a.showDate; // keep existing date
  persist();
  render();
}
function initBoardDrag() {} // placeholder for future enhancements

// ── Move sheet (mobile) ───────────────────────────────────────────────────────
let _moveAptId = null;
function openMoveSheet(id) {
  _moveAptId = id;
  const a = apts.find(x => x.id === id); if (!a) return;
  const COLS = [
    { status: 'prospecting', label: 'Prospecting' },
    { status: 'scheduled',   label: 'Scheduled' },
    { status: 'shown-liked', label: 'Shown — Liked' },
    { status: 'shown-disliked', label: 'Shown — Disliked' },
    { status: 'applying',    label: 'Applying' },
  ];
  const options = COLS.map(col => `
    <label class="move-sheet-option" onclick="moveSheetSelect('${col.status}')">
      <input type="radio" name="move-status" value="${col.status}" ${a.status===col.status?'checked':''}>
      <span>${col.label}</span>
    </label>
    ${col.status==='scheduled'?`<div class="move-date-row" id="move-date-row" style="display:${a.status==='scheduled'?'block':'none'}"><input type="date" id="move-date-inp" value="${a.showDate||''}" style="width:auto;padding:6px 10px;font-size:13px"></div>`:''}
  `).join('');
  document.getElementById('move-sheet-inner').innerHTML = options;
  document.getElementById('move-overlay').classList.add('open');
}

function moveSheetSelect(status) {
  document.getElementById('move-date-row').style.display = status === 'scheduled' ? 'block' : 'none';
}

function confirmMove() {
  const a = apts.find(x => x.id === _moveAptId); if (!a) return;
  const sel = document.querySelector('input[name="move-status"]:checked');
  if (!sel) return;
  a.status = sel.value;
  if (sel.value === 'scheduled') {
    const d = document.getElementById('move-date-inp')?.value;
    if (d) a.showDate = d;
  }
  persist();
  document.getElementById('move-overlay').classList.remove('open');
  render();
}
```

- [ ] **Step 6: Add move sheet HTML**

Add before `<script>` tag:
```html
<!-- Move sheet (mobile kanban) -->
<div class="overlay" id="move-overlay" onclick="maybeClose(event,'move-overlay')">
  <div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title" style="font-size:17px">Move to…</div>
    <div id="move-sheet-inner"></div>
    <br>
    <button class="btn btn-primary" onclick="confirmMove()">Done</button>
    <button class="btn btn-outline" onclick="closeSheet('move-overlay')">Cancel</button>
    <div style="height:20px"></div>
  </div>
</div>
```

- [ ] **Step 7: Verify kanban**

Open app on desktop. Tap Board tab. 5 columns should appear horizontally scrollable. Drag a card from "Prospecting" to "Liked" — it should move. Open on mobile (or narrow browser window): tap a card — the "Move to…" sheet should appear with radio options.

- [ ] **Step 8: Commit**

```bash
git add index.js
git commit -m "feat: kanban board with drag (desktop) and tap-to-move (mobile)"
```

---

## Task 5: Excel Import

**Files:**
- Modify: `index.js`

- [ ] **Step 1: Add SheetJS CDN to `<head>`**

Find `</head>` in the HTML. Add before it:
```html
<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
```

- [ ] **Step 2: Add import button to header**

Find the header HTML (updated in Task 3):
```html
<div style="display:flex;align-items:center;gap:6px">
  <div class="header-count" id="hdr-count">0 units</div>
  <button class="tbl-toggle" id="tbl-tog" onclick="toggleTableView()">☰</button>
</div>
```

Replace with:
```html
<div style="display:flex;align-items:center;gap:6px">
  <div class="header-count" id="hdr-count">0 units</div>
  <button class="tbl-toggle" id="tbl-tog" onclick="toggleTableView()">☰</button>
  <button class="tbl-toggle" onclick="document.getElementById('import-inp').click()" title="Import Excel">↑ Import</button>
  <input type="file" id="import-inp" accept=".xlsx,.xls" style="display:none" onchange="handleImport(event)">
</div>
```

- [ ] **Step 3: Add import modal HTML**

Add before `<script>`:
```html
<!-- Import preview modal -->
<div class="overlay" id="import-overlay" onclick="maybeClose(event,'import-overlay')">
  <div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title" style="font-size:17px">Import Listings</div>
    <div id="import-preview-msg" style="font-size:14px;line-height:1.8;margin-bottom:16px;color:var(--muted)"></div>
    <br>
    <button class="btn btn-primary" id="import-confirm-btn" onclick="confirmImport()">Import</button>
    <button class="btn btn-outline" onclick="closeSheet('import-overlay')">Cancel</button>
    <div style="height:20px"></div>
  </div>
</div>
```

- [ ] **Step 4: Add `handleImport()` and `confirmImport()` functions**

Add before the `persist();render();` line at the bottom of `<script>`:

```js
// ── Excel import ──────────────────────────────────────────────────────────────
let _importPending = [];

function handleImport(e) {
  const file = e.target.files[0]; if (!file) return;
  e.target.value = '';
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      _importPending = [];
      const existing = new Set(apts.map(a => (a.name||'').toLowerCase().trim()));

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const addr = (r[3]||'').toString().trim();
        const unit = (r[4]||'').toString().trim();
        if (!addr) continue;
        const name = unit ? `${addr} ${unit}` : addr;
        if (existing.has(name.toLowerCase())) continue;

        // Extract hyperlink URL from SheetJS cell
        const cellRef = XLSX.utils.encode_cell({ r: i, c: 6 });
        const cell = ws[cellRef];
        const url = cell?.l?.Target || null;

        // Format price
        const rawPrice = r[8];
        const price = rawPrice ? '$' + Math.round(parseFloat(rawPrice)).toLocaleString() : null;

        // Format date
        let showDate = null;
        if (r[1]) {
          const d = new Date(r[1]);
          if (!isNaN(d.getTime())) showDate = d.toISOString().slice(0, 10);
        }

        _importPending.push({
          id: String(Date.now() + i),
          name,
          neighborhood: (r[2]||'').toString().trim() || null,
          price,
          maint: r[9] != null ? String(r[9]).trim() : null,
          retax: r[10] != null ? String(r[10]).trim() : null,
          totalMonthly: r[11] != null ? '$' + parseFloat(r[11]).toLocaleString() : null,
          btype: (r[12]||'').toString().trim() || null,
          notes: r[13] ? `Service: ${String(r[13]).trim()}` : null,
          bldg: (r[14]||'').toString().trim() || null,
          url,
          showDate,
          status: showDate ? 'scheduled' : 'prospecting',
          rating: 0,
          amenities: {doorman:false,elevator:false,laundry:false,outdoor:false,gym:false,parking:false,pets:false,storage:false,roof:false,bldry:false,fp:false,ac:false},
          reactions: [],
          photos: [],
          updatedAt: new Date().toISOString(),
        });
      }

      const skipped = rows.length - 1 - _importPending.length;
      document.getElementById('import-preview-msg').innerHTML =
        `Found <strong>${_importPending.length}</strong> new listing${_importPending.length !== 1 ? 's' : ''} to import.<br>` +
        (skipped > 0 ? `<span style="color:var(--muted)">${skipped} already exist or are empty — will be skipped.</span>` : '');
      document.getElementById('import-overlay').classList.add('open');
    } catch(err) {
      alert('Could not read file: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function confirmImport() {
  apts = [...apts, ..._importPending];
  _importPending = [];
  persist();
  closeSheet('import-overlay');
  showView('list');
}
```

- [ ] **Step 5: Verify import**

Run `npx wrangler dev`. Open the app. Tap "↑ Import". Select the `apartment_listings.xlsx` file. A modal should appear: "Found X new listings to import. Y already exist or are empty — will be skipped." Tap Import. The list view should now show the imported apartments, all with status Prospecting (or Scheduled if they had a date).

Verify one imported apartment's detail: price should be formatted like `$550,000`, StreetEasy URL should be a real `https://streeteasy.com/...` URL (not "View on StreetEasy").

- [ ] **Step 6: Commit**

```bash
git add index.js
git commit -m "feat: Excel import with SheetJS — extracts hyperlinks, deduplicates, shows preview"
```

---

## Task 6: Deploy + Final Check

- [ ] **Step 1: End-to-end test**

1. Import the Excel file — confirm 50 apartments load.
2. Switch to Board view — all in Prospecting column.
3. Drag (desktop) or tap-to-move (mobile) one to Scheduled — set a date.
4. Switch to List — the card shows the date badge.
5. Switch to table view (☰) — date column shows.
6. Sort by Price — rows reorder.
7. Open an imported apartment detail — StreetEasy URL is a real link.

- [ ] **Step 2: Deploy**

```bash
cd /Users/declanmcgranahan/Documents/GitHub/apt-app
npx wrangler deploy
git add index.js
git commit -m "feat: complete excel import, kanban, table view, show date"
git push
```
