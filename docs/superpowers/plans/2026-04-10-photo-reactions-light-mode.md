# Photo Reactions & Light Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text pros/cons with structured photo-linked reactions and switch the UI to a light mode palette.

**Architecture:** All changes are in `index.js` (single Cloudflare Worker file). Light mode is a CSS variable swap. Reactions replace `pros`/`cons` string fields with a `reactions: [{id, text, type, photoIndex}]` array — migrated automatically on load. A new full-screen photo viewer overlay (separate from the annotation sheet) enables tagging from detail view.

**Tech Stack:** Vanilla JS, CSS custom properties, Cloudflare Workers KV

---

## File Map

- Modify: `index.js` — all changes in this one file
  - `:root` CSS block — light mode variables
  - Status pill CSS classes — color updates for light backgrounds
  - New CSS classes — reactions list, photo viewer overlay
  - Load callback — migration from `pros`/`cons` → `reactions`
  - `renderDetail()` — reactions section + clickable photos
  - `renderCompare()` — reactions columns replacing pros/cons row
  - Edit form HTML — replace textareas with reactions editor UI
  - `clearForm()`, `fillForm()`, `saveApt()` — handle reactions field
  - New functions: `renderReactions()`, `openPhotoViewer()`, `closePhotoViewer()`, `addReaction()`, `deleteReaction()`

---

## Task 1: Light Mode CSS Variables

**Files:**
- Modify: `index.js` lines 23–27 (`:root` block)

- [ ] **Step 1: Swap `:root` CSS variables**

Find this block (lines 23–27):
```css
:root {
  --bg: #0f0f0f; --surface: #1a1a1a; --surface2: #242424; --border: #2e2e2e;
  --text: #f0ece4; --muted: #6b6560; --accent: #e8c547; --accent2: #4a9eff;
  --red: #ff5f5f; --green: #4ecb7e; --card-bg: #181818;
}
```

Replace with:
```css
:root {
  --bg: #f7f5f2; --surface: #ffffff; --surface2: #f0ede8; --border: #e2ddd8;
  --text: #1a1a1a; --muted: #8a8480; --accent: #b8860b; --accent2: #2563eb;
  --red: #dc2626; --green: #16a34a; --card-bg: #ffffff;
}
```

- [ ] **Step 2: Update status pill CSS classes**

Find lines 60–63:
```css
.s-active { background: rgba(78,203,126,0.15); color: var(--green); }
.s-toured { background: rgba(74,158,255,0.15); color: var(--accent2); }
.s-applying { background: rgba(232,197,71,0.15); color: var(--accent); }
.s-pass { background: var(--surface2); color: var(--muted); }
```

Replace with:
```css
.s-active { background: rgba(22,163,74,0.12); color: var(--green); }
.s-toured { background: rgba(37,99,235,0.12); color: var(--accent2); }
.s-applying { background: rgba(184,134,11,0.12); color: var(--accent); }
.s-pass { background: var(--surface2); color: var(--muted); }
```

- [ ] **Step 3: Update filter pill active state**

Find line 73:
```css
.fpill.on { background: var(--accent); color: #0f0f0f; border-color: var(--accent); font-weight: 600; }
```

Replace with:
```css
.fpill.on { background: var(--accent); color: #ffffff; border-color: var(--accent); font-weight: 600; }
```

- [ ] **Step 4: Update FAB and other hard-coded dark colors**

Find line 43 (FAB):
```css
.fab { ... background: var(--accent); color: #0f0f0f; ... }
```

Change `color: #0f0f0f` to `color: #ffffff`.

Find line 116:
```css
.btn-primary { background: var(--accent); color: #0f0f0f; }
```
Change to `color: #ffffff`.

Find line 174 (annotation overlay — keep dark, it's a canvas overlay):
```css
.ann-overlay { ... background: #000; ... }
```
Leave the annotation overlay dark — it draws on black canvas background intentionally.

Find `.p-thumb-ann` (line 111):
```css
.p-thumb-ann { ... background: rgba(232,197,71,0.9); color: #0f0f0f; ... }
```
Change to `background: var(--accent); color: #ffffff`.

Find `.ai-btn` (line 125):
```css
.ai-btn { ... background: var(--accent); color: #0f0f0f; ... }
```
Change to `color: #ffffff`.

Find `.ai-apply-btn` (line 131):
```css
.ai-apply-btn { ... background: var(--accent); color: #0f0f0f; ... }
```
Change to `color: #ffffff`.

Find `.atb.on` (line 173):
```css
.atb.on { background: var(--accent); color: #0f0f0f; border-color: var(--accent); }
```
Change to `color: #ffffff`.

Find the annotation save button in HTML (line 313):
```html
<button class="atb" onclick="saveAnnotation()" style="background:var(--accent);color:#0f0f0f;border-color:var(--accent)">Save</button>
```
Change `color:#0f0f0f` to `color:#ffffff`.

- [ ] **Step 5: Verify visually**

Open the app in a browser (`npx wrangler dev` then visit `http://localhost:8787`). Confirm:
- Background is off-white `#f7f5f2`
- Cards are white with light borders
- Accent gold is darker (`#b8860b`) and readable on white
- No pure black backgrounds except annotation canvas

- [ ] **Step 6: Commit**

```bash
cd /Users/declanmcgranahan/Documents/GitHub/apt-app
git add index.js
git commit -m "feat: light mode CSS palette"
```

---

## Task 2: Reactions Data Migration

**Files:**
- Modify: `index.js` — load callback at line 748

- [ ] **Step 1: Add migration to the load callback**

Find the load callback at line 748 (bottom of `<script>`):
```js
fetch('/apts').then(r=>r.json()).then(data=>{ apts=Array.isArray(data)?data:[]; persist(); render(); }).catch(()=>{ render(); });
```

Replace with:
```js
fetch('/apts').then(r=>r.json()).then(data=>{
  apts = Array.isArray(data) ? data : [];
  // Migrate pros/cons strings → reactions array
  let migrated = false;
  apts = apts.map(a => {
    if (!a.reactions && (a.pros || a.cons)) {
      const r = [];
      if (a.pros) a.pros.split('\n').filter(Boolean).forEach(t => r.push({id: Date.now()+'_'+Math.random(), text: t, type: 'pro', photoIndex: null}));
      if (a.cons) a.cons.split('\n').filter(Boolean).forEach(t => r.push({id: Date.now()+'_'+Math.random(), text: t, type: 'con', photoIndex: null}));
      migrated = true;
      return {...a, reactions: r};
    }
    if (!a.reactions) return {...a, reactions: []};
    return a;
  });
  if (migrated) persist();
  render();
}).catch(()=>{ render(); });
```

- [ ] **Step 2: Verify migration**

In `npx wrangler dev`, open browser console and run:
```js
apts[0].reactions
```
Expected: array (may be empty `[]` if no pros/cons existed, or populated if they did).

- [ ] **Step 3: Commit**

```bash
git add index.js
git commit -m "feat: migrate pros/cons to reactions array on load"
```

---

## Task 3: Reactions CSS + Helper Functions

**Files:**
- Modify: `index.js` — add CSS after line 183 (`</style>`), add JS functions

- [ ] **Step 1: Add reactions CSS**

Find `</style>` (line 183) and add before it:
```css
/* Reactions */
.reactions-list { margin-bottom: 16px; }
.reaction-item { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--border); }
.reaction-item:last-child { border-bottom: none; }
.reaction-badge { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 10px; flex-shrink: 0; }
.reaction-badge.pro { background: rgba(22,163,74,0.12); color: var(--green); }
.reaction-badge.con { background: rgba(220,38,38,0.1); color: var(--red); }
.reaction-text { flex: 1; font-size: 14px; line-height: 1.4; }
.reaction-thumb { width: 28px; height: 28px; border-radius: 6px; object-fit: cover; flex-shrink: 0; cursor: pointer; border: 1px solid var(--border); }
.reaction-del { background: none; border: none; color: var(--muted); font-size: 16px; cursor: pointer; padding: 0 4px; flex-shrink: 0; }
.reactions-empty { color: var(--muted); font-size: 13px; font-style: italic; }

/* Photo viewer overlay */
.photo-viewer { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 200; flex-direction: column; }
.photo-viewer.open { display: flex; }
.photo-viewer-img { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.photo-viewer-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.photo-viewer-footer { background: var(--surface); padding: 14px 16px; }
.photo-viewer-close { background: none; border: none; color: var(--muted); font-size: 14px; cursor: pointer; margin-bottom: 10px; }
.viewer-reactions { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; min-height: 28px; }
.viewer-reaction-chip { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid; }
.viewer-reaction-chip.pro { background: rgba(22,163,74,0.1); color: var(--green); border-color: rgba(22,163,74,0.25); }
.viewer-reaction-chip.con { background: rgba(220,38,38,0.08); color: var(--red); border-color: rgba(220,38,38,0.2); }
.viewer-reaction-chip button { background: none; border: none; color: inherit; font-size: 13px; cursor: pointer; padding: 0; line-height: 1; }
.viewer-tag-row { display: flex; gap: 8px; }
.viewer-tag-btn { flex: 1; padding: 10px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--surface2); font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
.viewer-tag-btn.pro-btn { color: var(--green); border-color: rgba(22,163,74,0.3); }
.viewer-tag-btn.con-btn { color: var(--red); border-color: rgba(220,38,38,0.25); }
.viewer-input-row { display: flex; gap: 8px; margin-top: 10px; }
.viewer-input-row input { flex: 1; padding: 9px 12px; border-radius: 8px; border: 1.5px solid var(--accent); background: var(--surface2); color: var(--text); font-family: 'Outfit', sans-serif; font-size: 14px; outline: none; }
.viewer-input-row button { padding: 9px 14px; border-radius: 8px; border: none; background: var(--accent); color: #ffffff; font-family: 'Outfit', sans-serif; font-weight: 700; cursor: pointer; font-size: 13px; }

/* Edit form reactions */
.reaction-editor-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.reaction-editor-item:last-child { border-bottom: none; }
.reaction-type-tog { padding: 4px 10px; border-radius: 20px; border: 1.5px solid; font-size: 11px; font-weight: 700; cursor: pointer; background: none; }
.reaction-type-tog.pro { color: var(--green); border-color: rgba(22,163,74,0.35); }
.reaction-type-tog.con { color: var(--red); border-color: rgba(220,38,38,0.3); }
.reaction-editor-text { flex: 1; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--text); outline: none; padding: 0; }
.add-reaction-btns { display: flex; gap: 8px; margin-top: 12px; }
.add-reaction-btn { flex: 1; padding: 10px; border-radius: 10px; border: 1.5px dashed; background: none; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
.add-reaction-btn.pro { color: var(--green); border-color: rgba(22,163,74,0.35); }
.add-reaction-btn.con { color: var(--red); border-color: rgba(220,38,38,0.3); }
```

- [ ] **Step 2: Add photo viewer HTML**

Find the closing `</div>` of the `ann-overlay` div (after line ~340). Add this new overlay right after it, before `<script>`:

```html
<!-- Photo viewer overlay -->
<div class="photo-viewer" id="photo-viewer">
  <div class="photo-viewer-img" id="pv-img-wrap">
    <img id="pv-img" src="">
  </div>
  <div class="photo-viewer-footer">
    <button class="photo-viewer-close" onclick="closePhotoViewer()">← Back</button>
    <div class="viewer-reactions" id="pv-reactions"></div>
    <div class="viewer-tag-row">
      <button class="viewer-tag-btn pro-btn" onclick="startTag('pro')">👍 Pro</button>
      <button class="viewer-tag-btn con-btn" onclick="startTag('con')">👎 Con</button>
    </div>
    <div class="viewer-input-row" id="pv-input-row" style="display:none">
      <input type="text" id="pv-input" placeholder="What did you notice?" onkeydown="if(event.key==='Enter')submitTag()">
      <button onclick="submitTag()">Add</button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add photo viewer JS functions**

Add these functions before the `persist();render();` line at the bottom of `<script>`:

```js
// ── Photo viewer ──────────────────────────────────────────────────────────────
let _pvAptId = null, _pvPhotoIndex = null, _pvTagType = null;

function openPhotoViewer(aptId, photoIndex) {
  const a = apts.find(x => x.id === aptId); if (!a) return;
  const p = a.photos[photoIndex]; if (!p) return;
  _pvAptId = aptId; _pvPhotoIndex = photoIndex; _pvTagType = null;
  document.getElementById('pv-img').src = p.annotation || p.data;
  document.getElementById('pv-input-row').style.display = 'none';
  document.getElementById('pv-input').value = '';
  renderViewerReactions();
  document.getElementById('photo-viewer').classList.add('open');
}

function closePhotoViewer() {
  document.getElementById('photo-viewer').classList.remove('open');
  _pvAptId = null; _pvPhotoIndex = null; _pvTagType = null;
}

function renderViewerReactions() {
  const a = apts.find(x => x.id === _pvAptId); if (!a) return;
  const chips = (a.reactions || [])
    .filter(r => r.photoIndex === _pvPhotoIndex)
    .map(r => `<span class="viewer-reaction-chip ${r.type}">
      ${r.type === 'pro' ? '✓' : '✗'} ${r.text}
      <button onclick="deleteReaction('${r.id}')">×</button>
    </span>`).join('');
  document.getElementById('pv-reactions').innerHTML = chips || '';
}

function startTag(type) {
  _pvTagType = type;
  const row = document.getElementById('pv-input-row');
  row.style.display = 'flex';
  document.getElementById('pv-input').focus();
}

function submitTag() {
  const text = document.getElementById('pv-input').value.trim();
  if (!text || !_pvTagType) return;
  const a = apts.find(x => x.id === _pvAptId); if (!a) return;
  if (!a.reactions) a.reactions = [];
  a.reactions.push({ id: Date.now().toString(), text, type: _pvTagType, photoIndex: _pvPhotoIndex });
  persist();
  document.getElementById('pv-input').value = '';
  document.getElementById('pv-input-row').style.display = 'none';
  _pvTagType = null;
  renderViewerReactions();
}

function deleteReaction(reactionId) {
  const a = apts.find(x => x.id === _pvAptId); if (!a) return;
  a.reactions = (a.reactions || []).filter(r => r.id !== reactionId);
  persist();
  renderViewerReactions();
  // Also refresh detail view if open
  if (view === 'detail') render();
}
```

- [ ] **Step 4: Verify photo viewer HTML is in place**

Run `npx wrangler dev`. Open the app. Tap a photo in detail view — nothing should happen yet (we wire up the click in Task 4). Confirm there are no JS errors in the console.

- [ ] **Step 5: Commit**

```bash
git add index.js
git commit -m "feat: add reactions CSS, photo viewer overlay, and viewer JS functions"
```

---

## Task 4: Wire Photos in Detail View to Photo Viewer

**Files:**
- Modify: `index.js` — `renderDetail()` function

- [ ] **Step 1: Make detail photos clickable**

In `renderDetail()`, find this line (around line 396):
```js
const photos = a.photos?.length
  ? `<div class="detail-photos">${a.photos.map(p=>`<div class="d-photo"><img src="${p.annotation||p.data}">${p.note?`<div class="d-photo-lbl">${p.note}</div>`:''}</div>`).join('')}</div>`
  : `<div style="...">No photos yet</div>`;
```

Replace with:
```js
const photos = a.photos?.length
  ? `<div class="detail-photos">${a.photos.map((p,i)=>`<div class="d-photo" onclick="openPhotoViewer('${a.id}',${i})" style="cursor:pointer"><img src="${p.annotation||p.data}">${p.note?`<div class="d-photo-lbl">${p.note}</div>`:''}</div>`).join('')}</div>`
  : `<div style="background:var(--surface2);border-radius:12px;height:80px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;margin-bottom:16px">No photos yet — add them via Edit</div>`;
```

- [ ] **Step 2: Replace pros/cons section in renderDetail() with reactions**

Find lines 429–431 in `renderDetail()`:
```js
<div class="d-section">Pros & Cons</div>
<div class="pros-cons"><div class="pros-box"><div class="pc-lbl">✓ PROS</div>${pros}</div><div class="cons-box"><div class="pc-lbl">✗ CONS</div>${cons}</div></div>
```

And the `pros`/`cons` variable definitions just above it (around lines 402–403):
```js
const pros = a.pros ? a.pros.split('\n').filter(Boolean).map(p=>`<div class="pc-item">✓ ${p}</div>`).join('') : `<div class="pc-item" style="color:var(--muted)">—</div>`;
const cons = a.cons ? a.cons.split('\n').filter(Boolean).map(p=>`<div class="pc-item">✗ ${p}</div>`).join('') : `<div class="pc-item" style="color:var(--muted)">—</div>`;
```

Remove the `pros` and `cons` variable definitions. Replace the pros/cons section HTML with:
```js
const reactions = a.reactions || [];
const prosHtml = reactions.filter(r=>r.type==='pro').map(r=>`
  <div class="reaction-item">
    <span class="reaction-badge pro">PRO</span>
    <span class="reaction-text">${r.text}</span>
    ${r.photoIndex!=null && a.photos?.[r.photoIndex] ? `<img class="reaction-thumb" src="${a.photos[r.photoIndex].annotation||a.photos[r.photoIndex].data}" onclick="openPhotoViewer('${a.id}',${r.photoIndex})">` : ''}
  </div>`).join('') || `<div class="reactions-empty">Tap a photo above to add pros</div>`;
const consHtml = reactions.filter(r=>r.type==='con').map(r=>`
  <div class="reaction-item">
    <span class="reaction-badge con">CON</span>
    <span class="reaction-text">${r.text}</span>
    ${r.photoIndex!=null && a.photos?.[r.photoIndex] ? `<img class="reaction-thumb" src="${a.photos[r.photoIndex].annotation||a.photos[r.photoIndex].data}" onclick="openPhotoViewer('${a.id}',${r.photoIndex})">` : ''}
  </div>`).join('') || `<div class="reactions-empty">Tap a photo above to add cons</div>`;
```

And in the returned HTML, replace the pros/cons section with:
```js
<div class="d-section">Pros & Cons</div>
<div class="reactions-list">${prosHtml}${consHtml}</div>
```

- [ ] **Step 3: Verify**

Open the app, navigate to a detail view. Tap a photo — the photo viewer should open with the image full-screen. Tap 👍 Pro → type "Nice light" → Add. The chip should appear. Tap × to delete it. Confirm the reactions-list section shows below.

- [ ] **Step 4: Commit**

```bash
git add index.js
git commit -m "feat: clickable photos in detail view open photo viewer with reaction tagging"
```

---

## Task 5: Edit Form — Replace Pros/Cons Textareas with Reactions Editor

**Files:**
- Modify: `index.js` — edit form HTML, `clearForm()`, `fillForm()`, `saveApt()`

- [ ] **Step 1: Replace textareas in edit form HTML**

Find lines 281–282:
```html
<div class="fg"><label>Pros (one per line)</label><textarea id="f-pros" placeholder="..."></textarea></div>
<div class="fg"><label>Cons (one per line)</label><textarea id="f-cons" placeholder="..."></textarea></div>
```

Replace with:
```html
<div class="fg">
  <label>Pros &amp; Cons</label>
  <div id="f-reactions-list"></div>
  <div class="add-reaction-btns">
    <button type="button" class="add-reaction-btn pro" onclick="addFormReaction('pro')">+ Pro</button>
    <button type="button" class="add-reaction-btn con" onclick="addFormReaction('con')">+ Con</button>
  </div>
</div>
```

- [ ] **Step 2: Add `renderFormReactions()` and `addFormReaction()` JS functions**

Add before the `persist();render();` line:

```js
// ── Edit form reactions ───────────────────────────────────────────────────────
let _formReactions = [];

function renderFormReactions() {
  const el = document.getElementById('f-reactions-list'); if (!el) return;
  el.innerHTML = _formReactions.map((r, i) => `
    <div class="reaction-editor-item">
      <button type="button" class="reaction-type-tog ${r.type}" onclick="toggleFormReactionType(${i})">${r.type === 'pro' ? '✓ PRO' : '✗ CON'}</button>
      <input class="reaction-editor-text" value="${r.text.replace(/"/g,'&quot;')}" placeholder="Note..." oninput="_formReactions[${i}].text=this.value">
      <button type="button" class="reaction-del" onclick="removeFormReaction(${i})">×</button>
    </div>`).join('') || '<div class="reactions-empty" style="padding:8px 0">No reactions yet — add a pro or con below</div>';
}

function addFormReaction(type) {
  _formReactions.push({ id: Date.now().toString(), text: '', type, photoIndex: null });
  renderFormReactions();
  // Focus the new input
  const inputs = document.querySelectorAll('.reaction-editor-text');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function toggleFormReactionType(i) {
  _formReactions[i].type = _formReactions[i].type === 'pro' ? 'con' : 'pro';
  renderFormReactions();
}

function removeFormReaction(i) {
  _formReactions.splice(i, 1);
  renderFormReactions();
}
```

- [ ] **Step 3: Update `clearForm()` to reset reactions**

Find `clearForm()`. It has:
```js
['f-name','f-price','f-beds','f-baths','f-sqft','f-floor','f-hood','f-maint','f-flip','f-down','f-sublet','f-year','f-bldg','f-pros','f-cons','f-notes','f-url'].forEach(...)
```

Remove `'f-pros','f-cons'` from that array. Then add at the end of `clearForm()`:
```js
_formReactions = [];
renderFormReactions();
```

- [ ] **Step 4: Update `fillForm()` to load reactions**

Find `fillForm(a)`. It has:
```js
sv('f-pros',a.pros);sv('f-cons',a.cons);
```

Remove those two lines. Add at the end of `fillForm()`:
```js
_formReactions = JSON.parse(JSON.stringify(a.reactions || []));
renderFormReactions();
```

- [ ] **Step 5: Update `saveApt()` to save reactions**

Find in `saveApt()`:
```js
pros:document.getElementById('f-pros').value.trim(),
cons:document.getElementById('f-cons').value.trim(),
```

Replace with:
```js
reactions: _formReactions.filter(r => r.text.trim()),
```

- [ ] **Step 6: Verify**

Open the app. Tap + to add a new apartment. The "Pros & Cons" section should show two buttons ("+ Pro", "+ Con") instead of textareas. Tap "+ Pro" → type "Prewar charm" → save. Open the apartment detail — "Prewar charm" should appear under Pros. Open edit again — it should pre-fill.

- [ ] **Step 7: Commit**

```bash
git add index.js
git commit -m "feat: replace pros/cons textareas with structured reactions editor in edit form"
```

---

## Task 6: Compare View — Reactions Columns

**Files:**
- Modify: `index.js` — `renderCompare()`

- [ ] **Step 1: Replace pros/cons row in compare table**

In `renderCompare()`, find the `rows` array definition. Find the last two entries:
```js
['Rating',ss(a.rating),ss(b.rating)],
```

Just before `['Rating',...]`, find any existing pros/cons rows and remove them. (They were not in the original compare — confirm by searching for `pros` in `renderCompare()`. If none, skip removal.)

Add a reaction summary helper just before the `rows` definition:
```js
const rxSummary = (apt, type) => {
  const items = (apt.reactions || []).filter(r => r.type === type).slice(0, 4);
  if (!items.length) return '—';
  const cls = type === 'pro' ? 'cmp-win' : '';
  return items.map(r => `<div style="font-size:12px;margin-bottom:3px">${type==='pro'?'✓':'✗'} ${r.text}${r.photoIndex!=null?` 🖼`:''}</div>`).join('');
};
```

Then add two rows to the `rows` array after `['Rating',...]`:
```js
['Pros', rxSummary(a,'pro'), rxSummary(b,'pro')],
['Cons', rxSummary(a,'con'), rxSummary(b,'con')],
```

- [ ] **Step 2: Verify**

Open the app with 2+ apartments that have reactions. Go to Compare tab. Select two apartments. Scroll to bottom of the comparison table — Pros and Cons rows should appear with bullet-style reaction items.

- [ ] **Step 3: Commit**

```bash
git add index.js
git commit -m "feat: show reactions in compare view"
```

---

## Task 7: Final Polish + Deploy

- [ ] **Step 1: Check applyData() still works**

`applyData()` (around line 521) sets `f-pros` and `f-cons` via `sv()`. Find those lines:
```js
sv('f-pros',p.pros);sv('f-cons',p.cons);
```

Replace with: (convert the returned string fields to reaction objects if the AI search returns them)
```js
if (p.pros) p.pros.split('\n').filter(Boolean).forEach(t => { _formReactions.push({id: Date.now()+'_'+Math.random(), text: t, type: 'pro', photoIndex: null}); });
if (p.cons) p.cons.split('\n').filter(Boolean).forEach(t => { _formReactions.push({id: Date.now()+'_'+Math.random(), text: t, type: 'con', photoIndex: null}); });
renderFormReactions();
```

- [ ] **Step 2: Full end-to-end test**

1. Open app. Add a new apartment via the + button.
2. Search an address via the AI box — confirm pros/cons from search result appear as reaction items in the form.
3. Save. Open detail — reactions appear with correct PRO/CON badges.
4. Add a photo via Edit. Save. Open detail. Tap the photo — viewer opens.
5. Tap 👍 Pro, type "Great light", press Add. Chip appears. Back.
6. In detail, the "Great light" reaction shows with a photo thumbnail.
7. Open Compare. Both apartments show their reactions.

- [ ] **Step 3: Deploy**

```bash
cd /Users/declanmcgranahan/Documents/GitHub/apt-app
npx wrangler deploy
git add index.js
git commit -m "feat: wire applyData to reactions; complete photo reactions + light mode"
git push
```
