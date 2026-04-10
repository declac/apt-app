// ─── Apt. Tracker — Cloudflare Worker ───────────────────────────────────────
// Serves the HTML app at / and handles address search at /search
// ─────────────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── APP HTML ────────────────────────────────────────────────────────────────
const APP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Apt.">
<title>Apt.</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #f7f5f2; --surface: #ffffff; --surface2: #f0ede8; --border: #e2ddd8;
  --text: #1a1a1a; --muted: #8a8480; --accent: #b8860b; --accent2: #2563eb;
  --red: #dc2626; --green: #16a34a; --card-bg: #ffffff;
}
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
html, body { height: 100%; overflow: hidden; }
body { font-family: 'Outfit', sans-serif; background: var(--bg); color: var(--text); font-size: 15px; display: flex; flex-direction: column; height: 100dvh; }

.header { background: var(--bg); border-bottom: 1px solid var(--border); padding: 14px 18px 12px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; z-index: 10; }
.header-logo { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--text); }
.header-logo span { color: var(--accent); }
.header-count { font-size: 12px; color: var(--muted); background: var(--surface); padding: 4px 10px; border-radius: 20px; font-weight: 500; }

.nav { display: flex; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
.nav-btn { flex: 1; padding: 11px 4px; background: none; border: none; color: var(--muted); font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
.nav-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

.scroll-area { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 16px; padding-bottom: 90px; }

.fab { position: fixed; bottom: 24px; right: 20px; width: 54px; height: 54px; border-radius: 50%; background: var(--accent); color: #ffffff; border: none; font-size: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(184,134,11,0.25); cursor: pointer; z-index: 50; transition: transform 0.15s; }
.fab:active { transform: scale(0.92); }

.apt-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 12px; overflow: hidden; cursor: pointer; transition: border-color 0.2s, transform 0.15s; }
.apt-card:active { transform: scale(0.98); border-color: var(--accent); }
.card-photo { width: 100%; height: 150px; background: var(--surface2); display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 36px; }
.card-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-body { padding: 14px; }
.card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.card-name { font-family: 'Playfair Display', serif; font-size: 17px; line-height: 1.25; flex: 1; }
.card-price { font-size: 16px; font-weight: 600; color: var(--accent); white-space: nowrap; }
.card-meta { font-size: 12px; color: var(--muted); margin-top: 4px; }
.card-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
.stars { display: flex; gap: 1px; }
.star { font-size: 14px; color: var(--border); }
.star.on { color: var(--accent); }
.status-pill { font-size: 10px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; padding: 3px 9px; border-radius: 20px; }
.s-active { background: rgba(22,163,74,0.12); color: var(--green); }
.s-toured { background: rgba(37,99,235,0.12); color: var(--accent2); }
.s-applying { background: rgba(184,134,11,0.12); color: var(--accent); }
.s-pass { background: var(--surface2); color: var(--muted); }

.empty { text-align: center; padding: 60px 24px; color: var(--muted); }
.empty-icon { font-size: 44px; margin-bottom: 14px; }
.empty h3 { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--text); margin-bottom: 8px; }
.empty p { font-size: 13px; line-height: 1.7; }

.filter-row { display: flex; gap: 8px; margin-bottom: 14px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.filter-row::-webkit-scrollbar { display: none; }
.fpill { flex-shrink: 0; padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: none; font-family: 'Outfit', sans-serif; font-size: 12px; color: var(--muted); cursor: pointer; transition: all 0.15s; font-weight: 500; }
.fpill.on { background: var(--accent); color: #ffffff; border-color: var(--accent); font-weight: 600; }

.overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; align-items: flex-end; backdrop-filter: blur(4px); }
.overlay.open { display: flex; }
.sheet { background: var(--surface); border-radius: 20px 20px 0 0; width: 100%; max-height: 94dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 20px 40px; animation: slideUp 0.28s cubic-bezier(0.32,0.72,0,1); }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: 14px auto 20px; }
.sheet-title { font-family: 'Playfair Display', serif; font-size: 22px; margin-bottom: 20px; }

.fg { margin-bottom: 14px; }
.fg label { display: block; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }
input[type=text], input[type=number], textarea, select { width: 100%; padding: 11px 13px; background: var(--surface2); border: 1.5px solid var(--border); border-radius: 10px; color: var(--text); font-family: 'Outfit', sans-serif; font-size: 15px; outline: none; transition: border-color 0.15s; -webkit-appearance: none; }
input:focus, textarea:focus, select:focus { border-color: var(--accent); }
textarea { resize: vertical; min-height: 80px; }
select option { background: var(--surface2); }
.frow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.section-hd { font-family: 'Playfair Display', serif; font-size: 16px; margin: 22px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }

.star-pick { display: flex; gap: 10px; }
.sp-btn { background: none; border: none; font-size: 28px; cursor: pointer; color: var(--border); line-height: 1; transition: color 0.1s, transform 0.1s; }
.sp-btn.on { color: var(--accent); }
.sp-btn:active { transform: scale(1.25); }

.tog-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
.tog-row:last-child { border-bottom: none; }
.tog { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
.tog input { display: none; }
.tog-sl { position: absolute; inset: 0; background: var(--border); border-radius: 12px; cursor: pointer; transition: background 0.2s; }
.tog-sl::before { content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%; background: white; top: 3px; left: 3px; transition: transform 0.2s; }
.tog input:checked + .tog-sl { background: var(--green); }
.tog input:checked + .tog-sl::before { transform: translateX(18px); }

.photo-drop { border: 2px dashed var(--border); border-radius: 12px; padding: 22px; text-align: center; cursor: pointer; color: var(--muted); font-size: 13px; }
.photo-drop input { display: none; }
.photo-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 10px; }
.p-thumb { aspect-ratio: 1; border-radius: 8px; overflow: hidden; position: relative; border: 1px solid var(--border); }
.p-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.p-thumb-del { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.p-thumb-ann { position: absolute; bottom: 4px; right: 4px; background: var(--accent); color: #ffffff; border: none; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700; cursor: pointer; }

.btn { display: block; width: 100%; padding: 14px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
.btn:active { opacity: 0.8; }
.btn + .btn { margin-top: 10px; }
.btn-primary { background: var(--accent); color: #ffffff; }
.btn-outline { background: transparent; color: var(--text); border: 1.5px solid var(--border); }
.btn-danger { background: rgba(255,95,95,0.12); color: var(--red); border: 1.5px solid rgba(255,95,95,0.3); }

.ai-box { background: linear-gradient(135deg, rgba(184,134,11,0.06), rgba(37,99,235,0.06)); border: 1.5px solid rgba(184,134,11,0.2); border-radius: 16px; padding: 16px; margin-bottom: 22px; }
.ai-box-hd { font-size: 13px; font-weight: 600; color: var(--accent); margin-bottom: 6px; }
.ai-box-sub { font-size: 12px; color: var(--muted); margin-bottom: 12px; line-height: 1.5; }
.ai-row { display: flex; gap: 8px; }
.ai-row input { flex: 1; }
.ai-btn { flex-shrink: 0; padding: 11px 16px; background: var(--accent); color: #ffffff; border: none; border-radius: 10px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: opacity 0.15s; }
.ai-btn:disabled { opacity: 0.5; }
.ai-preview { margin-top: 12px; background: var(--surface2); border-radius: 10px; padding: 14px; border: 1px solid var(--border); }
.ai-preview-name { font-weight: 600; font-size: 14px; margin-bottom: 8px; }
.ai-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.ai-badge { font-size: 12px; font-weight: 500; padding: 3px 9px; border-radius: 20px; background: rgba(184,134,11,0.1); color: var(--accent); border: 1px solid rgba(184,134,11,0.2); }
.ai-apply-btn { width: 100%; padding: 10px; background: var(--accent); color: #ffffff; border: none; border-radius: 8px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; }
.ai-status { font-size: 12px; margin-top: 10px; min-height: 16px; color: var(--muted); }
.ai-status.loading { color: var(--accent2); }
.ai-status.ok { color: var(--green); }
.ai-status.err { color: var(--red); }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(74,158,255,0.3); border-top-color: var(--accent2); border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 5px; }

.back-btn { background: none; border: none; color: var(--accent2); font-family: 'Outfit', sans-serif; font-size: 14px; cursor: pointer; padding: 0; margin-bottom: 16px; }
.detail-photos { display: flex; gap: 10px; overflow-x: auto; margin: 0 -16px 16px; padding: 0 16px 8px; }
.detail-photos::-webkit-scrollbar { display: none; }
.d-photo { flex-shrink: 0; width: 200px; height: 148px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); position: relative; }
.d-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.d-photo-lbl { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 8px 8px 6px; font-size: 11px; color: white; }
.d-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.d-field .lbl { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.d-field .val { font-size: 15px; margin-top: 3px; }
.d-section { font-family: 'Playfair Display', serif; font-size: 17px; margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.pros-box { background: rgba(78,203,126,0.08); border: 1px solid rgba(78,203,126,0.2); border-radius: 10px; padding: 12px; }
.cons-box { background: rgba(255,95,95,0.08); border: 1px solid rgba(255,95,95,0.2); border-radius: 10px; padding: 12px; }
.pc-lbl { font-size: 11px; font-weight: 700; margin-bottom: 6px; }
.pros-box .pc-lbl { color: var(--green); }
.cons-box .pc-lbl { color: var(--red); }
.pc-item { font-size: 12px; line-height: 1.7; }
.am-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.am-chip { font-size: 12px; padding: 4px 10px; border-radius: 20px; background: rgba(78,203,126,0.12); color: var(--green); border: 1px solid rgba(78,203,126,0.2); }

.cmp-selects { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.cmp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.cmp-table th { text-align: left; padding: 8px 10px; background: var(--surface2); font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; }
.cmp-table td { padding: 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
.cmp-table tr:last-child td { border-bottom: none; }
.cmp-table td:first-child { color: var(--muted); font-size: 12px; width: 36%; }
.cmp-win { color: var(--green); font-weight: 600; }

.ann-overlay { display: none; position: fixed; inset: 0; background: #000; z-index: 300; flex-direction: column; }
.ann-overlay.open { display: flex; }
.ann-header { background: #111; padding: 10px 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.ann-tools { display: flex; gap: 6px; overflow-x: auto; flex: 1; }
.ann-tools::-webkit-scrollbar { display: none; }
.atb { flex-shrink: 0; background: var(--surface2); border: 1.5px solid var(--border); color: var(--text); border-radius: 8px; padding: 7px 11px; font-family: 'Outfit', sans-serif; font-size: 12px; cursor: pointer; white-space: nowrap; }
.atb.on { background: var(--accent); color: #ffffff; border-color: var(--accent); }
.ann-canvas-wrap { flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000; position: relative; }
#ann-canvas { touch-action: none; cursor: crosshair; }
.ann-footer { background: #111; padding: 10px 14px; display: flex; gap: 10px; align-items: center; flex-shrink: 0; border-top: 1px solid var(--border); }
.cswatch { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; flex-shrink: 0; }
.cswatch.on { border-color: white; }
.ann-text-inp { position: absolute; z-index: 10; background: rgba(0,0,0,0.85); color: white; border: 1.5px solid var(--accent); border-radius: 6px; padding: 6px 10px; font-size: 14px; font-family: 'Outfit', sans-serif; display: none; min-width: 160px; }
.size-row { display: flex; align-items: center; gap: 8px; flex: 1; }
.size-row span { font-size: 11px; color: var(--muted); }
.size-row input[type=range] { flex: 1; height: 4px; padding: 0; background: var(--border); border-radius: 2px; border: none; -webkit-appearance: auto; }

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
</style>
</head>
<body>

<div class="header">
  <div class="header-logo">Apt<span>.</span></div>
  <div class="header-count" id="hdr-count">0 units</div>
</div>
<nav class="nav">
  <button class="nav-btn active" onclick="showView('list')">All Units</button>
  <button class="nav-btn" onclick="showView('compare')">Compare</button>
  <button class="nav-btn" onclick="showView('shortlist')">Shortlist</button>
</nav>
<div class="scroll-area" id="scroll-area"></div>
<button class="fab" id="fab" onclick="openAdd()">+</button>

<div class="overlay" id="add-overlay" onclick="maybeClose(event,'add-overlay')">
<div class="sheet">
  <div class="sheet-handle"></div>
  <div class="sheet-title" id="sheet-title">Add Apartment</div>

  <div class="ai-box">
    <div class="ai-box-hd">✦ Look up any address</div>
    <div class="ai-box-sub">Type any address — searches live listings and fills everything in automatically.</div>
    <div class="ai-row">
      <input type="text" id="ai-addr" placeholder="55 E 65th St Apt 4C, NYC" onkeydown="if(event.key==='Enter')doSearch()">
      <button class="ai-btn" id="ai-btn" onclick="doSearch()">Search</button>
    </div>
    <div class="ai-preview" id="ai-preview" style="display:none">
      <div class="ai-preview-name" id="ai-preview-name"></div>
      <div class="ai-badges" id="ai-badges"></div>
      <button class="ai-apply-btn" onclick="applyData()">✓ Fill in all fields</button>
    </div>
    <div class="ai-status" id="ai-status"></div>
  </div>

  <p class="section-hd">Details</p>
  <div class="fg"><label>Address / Name *</label><input type="text" id="f-name" placeholder="55 E 65th St, Apt 4C"></div>
  <div class="frow">
    <div class="fg"><label>Price</label><input type="text" id="f-price" placeholder="$550,000"></div>
    <div class="fg"><label>Status</label>
      <select id="f-status"><option value="active">Active</option><option value="toured">Toured</option><option value="applying">Applying</option><option value="pass">Passed</option></select>
    </div>
  </div>
  <div class="frow">
    <div class="fg"><label>Beds</label><input type="text" id="f-beds" placeholder="1"></div>
    <div class="fg"><label>Baths</label><input type="text" id="f-baths" placeholder="1"></div>
  </div>
  <div class="frow">
    <div class="fg"><label>Sq Ft</label><input type="number" id="f-sqft" placeholder="750"></div>
    <div class="fg"><label>Floor</label><input type="text" id="f-floor" placeholder="4 of 7"></div>
  </div>
  <div class="fg"><label>Neighborhood</label><input type="text" id="f-hood" placeholder="Upper East Side"></div>
  <div class="fg"><label>Building Type</label>
    <select id="f-btype"><option value="">—</option><option value="Co-op">Co-op</option><option value="Condo">Condo</option><option value="Rental">Rental</option><option value="Townhouse">Townhouse</option></select>
  </div>
  <div class="fg"><label>Your Rating</label>
    <div class="star-pick">
      <button class="sp-btn" onclick="setRating(1)">★</button>
      <button class="sp-btn" onclick="setRating(2)">★</button>
      <button class="sp-btn" onclick="setRating(3)">★</button>
      <button class="sp-btn" onclick="setRating(4)">★</button>
      <button class="sp-btn" onclick="setRating(5)">★</button>
    </div>
  </div>

  <p class="section-hd">Co-op / Building Details</p>
  <div class="frow">
    <div class="fg"><label>Maintenance /mo</label><input type="text" id="f-maint" placeholder="$1,287"></div>
    <div class="fg"><label>Flip Tax</label><input type="text" id="f-flip" placeholder="2%"></div>
  </div>
  <div class="frow">
    <div class="fg"><label>Down Payment</label><input type="text" id="f-down" placeholder="30%"></div>
    <div class="fg"><label>Board Approval</label>
      <select id="f-board"><option value="">Unknown</option><option value="Easy">Easy</option><option value="Moderate">Moderate</option><option value="Strict">Strict</option><option value="N/A">N/A</option></select>
    </div>
  </div>
  <div class="fg"><label>Sublet Policy</label><input type="text" id="f-sublet" placeholder="After 2 yrs, max 3 yrs"></div>
  <div class="fg"><label>Year Built</label><input type="text" id="f-year" placeholder="1910"></div>
  <div class="fg"><label>Building Name</label><input type="text" id="f-bldg" placeholder="The Sussex"></div>

  <p class="section-hd">Amenities</p>
  <div>
    <div class="tog-row"><span>Doorman / Concierge</span><label class="tog"><input type="checkbox" id="a-doorman"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>Elevator</span><label class="tog"><input type="checkbox" id="a-elevator"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>In-Unit Washer/Dryer</span><label class="tog"><input type="checkbox" id="a-laundry"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>Outdoor Space</span><label class="tog"><input type="checkbox" id="a-outdoor"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>Gym</span><label class="tog"><input type="checkbox" id="a-gym"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>Parking</span><label class="tog"><input type="checkbox" id="a-parking"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>Pets Allowed</span><label class="tog"><input type="checkbox" id="a-pets"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>Storage Unit</span><label class="tog"><input type="checkbox" id="a-storage"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>Roof Deck</span><label class="tog"><input type="checkbox" id="a-roof"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>Laundry in Building</span><label class="tog"><input type="checkbox" id="a-bldry"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>Fireplace</span><label class="tog"><input type="checkbox" id="a-fp"><span class="tog-sl"></span></label></div>
    <div class="tog-row"><span>Central A/C</span><label class="tog"><input type="checkbox" id="a-ac"><span class="tog-sl"></span></label></div>
  </div>

  <p class="section-hd">Notes</p>
  <div class="fg">
    <label>Pros &amp; Cons</label>
    <div id="f-reactions-list"></div>
    <div class="add-reaction-btns">
      <button type="button" class="add-reaction-btn pro" onclick="addFormReaction('pro')">+ Pro</button>
      <button type="button" class="add-reaction-btn con" onclick="addFormReaction('con')">+ Con</button>
    </div>
  </div>
  <div class="fg"><label>Notes</label><textarea id="f-notes" placeholder="Broker name, open house, gut feeling..."></textarea></div>
  <div class="fg"><label>Listing URL</label><input type="text" id="f-url" placeholder="https://streeteasy.com/..."></div>

  <p class="section-hd">Photos</p>
  <div class="photo-drop" onclick="document.getElementById('photo-inp').click()">
    <div style="font-size:30px;margin-bottom:8px">📷</div>
    <div style="font-weight:500;margin-bottom:4px">Add photos from camera roll</div>
    <div style="font-size:12px;margin-top:4px;color:var(--muted)">Tap any photo to annotate with text + drawing</div>
    <input type="file" id="photo-inp" accept="image/*" multiple onchange="handlePhotos(event)">
  </div>
  <div class="photo-grid" id="photo-grid"></div>

  <br>
  <button class="btn btn-primary" onclick="saveApt()">Save Apartment</button>
  <button class="btn btn-outline" onclick="closeSheet('add-overlay')">Cancel</button>
  <div style="height:20px"></div>
</div>
</div>

<div class="ann-overlay" id="ann-overlay">
  <div class="ann-header">
    <button class="atb" onclick="closeAnnotator()">← Done</button>
    <div class="ann-tools">
      <button class="atb on" id="tool-draw" onclick="setTool('draw')">✏️ Draw</button>
      <button class="atb" id="tool-text" onclick="setTool('text')">T Text</button>
      <button class="atb" id="tool-arrow" onclick="setTool('arrow')">→ Arrow</button>
      <button class="atb" id="tool-erase" onclick="setTool('erase')">⌫ Erase</button>
      <button class="atb" onclick="undoAnn()">↩ Undo</button>
      <button class="atb" onclick="clearAnn()">Clear</button>
    </div>
    <button class="atb" onclick="saveAnnotation()" style="background:var(--accent);color:#ffffff;border-color:var(--accent)">Save</button>
  </div>
  <div class="ann-canvas-wrap" id="ann-wrap">
    <canvas id="ann-canvas"></canvas>
    <input type="text" id="ann-text-inp" class="ann-text-inp" placeholder="Type → Enter">
  </div>
  <div class="ann-footer">
    <div style="display:flex;gap:6px">
      <div class="cswatch on" style="background:#b8860b" onclick="setColor('#b8860b',this)"></div>
      <div class="cswatch" style="background:#ff5f5f" onclick="setColor('#ff5f5f',this)"></div>
      <div class="cswatch" style="background:#4ecb7e" onclick="setColor('#4ecb7e',this)"></div>
      <div class="cswatch" style="background:#4a9eff" onclick="setColor('#4a9eff',this)"></div>
      <div class="cswatch" style="background:#ffffff" onclick="setColor('#ffffff',this)"></div>
    </div>
    <div class="size-row">
      <span>Size</span>
      <input type="range" id="brush-sz" min="2" max="24" value="4">
    </div>
  </div>
</div>

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

<script>
let apts = [];
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
let view = 'list', editId = null, pendingPhotos = [], rating = 0, filterSt = 'all', lastParsed = null;

function persist() {
  document.getElementById('hdr-count').textContent = apts.length + ' unit' + (apts.length !== 1 ? 's' : '');
  fetch('/apts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(apts) });
}

function showView(v) {
  view = v;
  document.querySelectorAll('.nav-btn').forEach((b,i) => b.classList.toggle('active', ['list','compare','shortlist'][i] === v));
  document.getElementById('fab').style.display = v === 'list' ? 'flex' : 'none';
  render();
}

function render() {
  const el = document.getElementById('scroll-area');
  if (view === 'list') el.innerHTML = renderList();
  else if (view === 'compare') el.innerHTML = renderCompare();
  else if (view === 'shortlist') el.innerHTML = renderShortlist();
  else if (view === 'detail') el.innerHTML = renderDetail();
  persist();
}

function renderList() {
  const sts = ['all','active','toured','applying','pass'];
  const lbs = ['All','Active','Toured','Applying','Passed'];
  const filtered = filterSt === 'all' ? apts : apts.filter(a => a.status === filterSt);
  if (!apts.length) return \`<div class="empty"><div class="empty-icon">🏙️</div><h3>No apartments yet</h3><p>Tap + and type any address.<br>Live listing data fills in automatically.</p></div>\`;
  const pills = \`<div class="filter-row">\${sts.map((s,i) => \`<button class="fpill \${filterSt===s?'on':''}" onclick="setFilter('\${s}')">\${lbs[i]}</button>\`).join('')}</div>\`;
  const cards = filtered.map(a => {
    const photo = a.photos?.length ? (a.photos[0].annotation || a.photos[0].data) : null;
    const thumb = photo ? \`<div class="card-photo"><img src="\${photo}"></div>\` : \`<div class="card-photo">🏢</div>\`;
    const stars = [1,2,3,4,5].map(i => \`<span class="star \${i<=a.rating?'on':''}">★</span>\`).join('');
    const sc = {active:'s-active',toured:'s-toured',applying:'s-applying',pass:'s-pass'}[a.status]||'s-active';
    const meta = [a.neighborhood, a.bldg, a.beds?a.beds+'br':null, a.baths?a.baths+'ba':null, a.sqft?a.sqft+'sf':null].filter(Boolean).join(' · ');
    return \`<div class="apt-card" onclick="openDetail('\${a.id}')">
      \${thumb}
      <div class="card-body">
        <div class="card-top"><div><div class="card-name">\${a.name}</div><div class="card-meta">\${meta||'—'}</div></div><div class="card-price">\${a.price||'—'}</div></div>
        <div class="card-bottom"><div class="stars">\${stars}</div><span class="status-pill \${sc}">\${a.status}</span></div>
      </div>
    </div>\`;
  }).join('') || \`<div class="empty"><div class="empty-icon">🔍</div><p>No units with this status.</p></div>\`;
  return pills + cards;
}

function setFilter(s) { filterSt = s; render(); }

function openDetail(id) {
  view = 'detail'; window._did = id;
  document.getElementById('fab').style.display = 'none';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  render();
}

function renderDetail() {
  const a = apts.find(x => x.id === window._did); if (!a) return '';
  const stars = [1,2,3,4,5].map(i=>\`<span class="star \${i<=a.rating?'on':''}">★</span>\`).join('');
  const sc = {active:'s-active',toured:'s-toured',applying:'s-applying',pass:'s-pass'}[a.status]||'s-active';
  const photos = a.photos?.length
    ? \`<div class="detail-photos">\${a.photos.map((p,i)=>\`<div class="d-photo" onclick="openPhotoViewer('\${a.id}',\${i})" style="cursor:pointer"><img src="\${p.annotation||p.data}">\${p.note?\`<div class="d-photo-lbl">\${esc(p.note)}</div>\`:''}</div>\`).join('')}</div>\`
    : \`<div style="background:var(--surface2);border-radius:12px;height:80px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;margin-bottom:16px">No photos yet — add them via Edit</div>\`;
  const am = a.amenities||{};
  const amMap = {doorman:'Doorman',elevator:'Elevator',laundry:'W/D In-Unit',outdoor:'Outdoor',gym:'Gym',parking:'Parking',pets:'Pets OK',storage:'Storage',roof:'Roof Deck',bldry:'Laundry in Bldg',fp:'Fireplace',ac:'Central A/C'};
  const chips = Object.keys(amMap).filter(k=>am[k]).map(k=>\`<span class="am-chip">\${amMap[k]}</span>\`).join('');
  const coop = [a.maint,a.flip,a.down,a.board,a.sublet,a.year].some(Boolean);
  const reactions = a.reactions || [];
  const prosHtml = reactions.filter(r=>r.type==='pro').map(r=>\`
    <div class="reaction-item">
      <span class="reaction-badge pro">PRO</span>
      <span class="reaction-text">\${esc(r.text)}</span>
      \${r.photoIndex!=null && a.photos?.[r.photoIndex] ? \`<img class="reaction-thumb" src="\${a.photos[r.photoIndex].annotation||a.photos[r.photoIndex].data}" onclick="openPhotoViewer('\${a.id}',\${r.photoIndex})">\` : ''}
    </div>\`).join('') || \`<div class="reactions-empty">Tap a photo above to add pros</div>\`;
  const consHtml = reactions.filter(r=>r.type==='con').map(r=>\`
    <div class="reaction-item">
      <span class="reaction-badge con">CON</span>
      <span class="reaction-text">\${esc(r.text)}</span>
      \${r.photoIndex!=null && a.photos?.[r.photoIndex] ? \`<img class="reaction-thumb" src="\${a.photos[r.photoIndex].annotation||a.photos[r.photoIndex].data}" onclick="openPhotoViewer('\${a.id}',\${r.photoIndex})">\` : ''}
    </div>\`).join('') || \`<div class="reactions-empty">Tap a photo above to add cons</div>\`;
  return \`
    <button class="back-btn" onclick="showView('list')">← All Units</button>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:4px">
      <h2 style="font-family:'Playfair Display',serif;font-size:21px;line-height:1.2;flex:1">\${a.name}</h2>
      <span class="status-pill \${sc}">\${a.status}</span>
    </div>
    \${a.bldg?\`<div style="font-size:13px;color:var(--accent);font-weight:500;margin-bottom:4px">\${a.bldg}</div>\`:''}
    <div style="color:var(--muted);font-size:12px;margin-bottom:10px">\${[a.neighborhood,a.btype].filter(Boolean).join(' · ')}</div>
    <div class="stars" style="margin-bottom:16px">\${stars}</div>
    \${photos}
    <div class="d-grid">
      <div class="d-field"><div class="lbl">Price</div><div class="val" style="font-weight:600;color:var(--accent)">\${a.price||'—'}</div></div>
      <div class="d-field"><div class="lbl">Layout</div><div class="val">\${[a.beds?a.beds+' bd':null,a.baths?a.baths+' ba':null].filter(Boolean).join(', ')||'—'}</div></div>
      \${a.sqft?\`<div class="d-field"><div class="lbl">Sq Ft</div><div class="val">\${a.sqft} sf</div></div>\`:''}
      \${a.floor?\`<div class="d-field"><div class="lbl">Floor</div><div class="val">\${a.floor}</div></div>\`:''}
      \${a.year?\`<div class="d-field"><div class="lbl">Year Built</div><div class="val">\${a.year}</div></div>\`:''}
    </div>
    \${coop?\`<div class="d-section">Co-op Details</div><div class="d-grid">
      \${a.maint?\`<div class="d-field"><div class="lbl">Maintenance</div><div class="val">\${a.maint}</div></div>\`:''}
      \${a.flip?\`<div class="d-field"><div class="lbl">Flip Tax</div><div class="val">\${a.flip}</div></div>\`:''}
      \${a.down?\`<div class="d-field"><div class="lbl">Down Req.</div><div class="val">\${a.down}</div></div>\`:''}
      \${a.board?\`<div class="d-field"><div class="lbl">Board</div><div class="val">\${a.board}</div></div>\`:''}
      \${a.sublet?\`<div class="d-field"><div class="lbl">Sublet</div><div class="val">\${a.sublet}</div></div>\`:''}
    </div>\`:''}
    \${chips?\`<div class="d-section">Amenities</div><div class="am-chips">\${chips}</div>\`:''}
    <div class="d-section">Pros & Cons</div>
    <div class="reactions-list">\${prosHtml}\${consHtml}</div>
    \${a.notes?\`<div class="d-section">Notes</div><div style="font-size:14px;line-height:1.8;margin-bottom:16px;white-space:pre-wrap">\${a.notes}</div>\`:''}
    \${a.url?\`<div class="d-section">Listing</div><a href="\${a.url}" target="_blank" style="color:var(--accent2);font-size:13px;word-break:break-all;display:block;margin-bottom:16px">\${a.url}</a>\`:''}
    <br>
    <button class="btn btn-primary" onclick="openEdit('\${a.id}')">Edit</button>
    <button class="btn btn-danger" onclick="delApt('\${a.id}')">Delete</button>
    <button class="btn btn-outline" onclick="showView('list')">Back</button>
    <div style="height:20px"></div>\`;
}

function renderCompare() {
  if (apts.length < 2) return \`<div class="empty"><div class="empty-icon">⚖️</div><h3>Need 2+ apartments</h3><p>Add more units to compare.</p></div>\`;
  const c1=window._c1||apts[0].id, c2=window._c2||apts[1].id;
  const a=apts.find(x=>x.id===c1)||apts[0], b=apts.find(x=>x.id===c2)||apts[1];
  const o1=apts.map(x=>\`<option value="\${x.id}" \${x.id===c1?'selected':''}>\${x.name.slice(0,24)}</option>\`).join('');
  const o2=apts.map(x=>\`<option value="\${x.id}" \${x.id===c2?'selected':''}>\${x.name.slice(0,24)}</option>\`).join('');
  const ss=n=>[1,2,3,4,5].map(i=>\`<span class="star \${i<=n?'on':''}" style="font-size:12px">★</span>\`).join('');
  const am=(apt,k)=>apt.amenities?.[k]?\`<span style="color:var(--green)">✓</span>\`:\`<span style="color:var(--muted)">—</span>\`;
  const pp=s=>{const n=parseFloat((s||'').replace(/[^0-9.]/g,''));return isNaN(n)?null:n;};
  const pa=pp(a.price),pb=pp(b.price);
  const rxSummary = (apt, type) => {
    const items = (apt.reactions || []).filter(r => r.type === type).slice(0, 4);
    if (!items.length) return '—';
    return items.map(r => `<div style="font-size:12px;margin-bottom:3px">${type==='pro'?'✓':'✗'} ${esc(r.text)}${r.photoIndex!=null?' 🖼':''}</div>`).join('');
  };
  const rows=[
    ['Price',\`<span class="\${pa&&pb&&pa<pb?'cmp-win':''}">\${a.price||'—'}</span>\`,\`<span class="\${pa&&pb&&pb<pa?'cmp-win':''}">\${b.price||'—'}</span>\`],
    ['Beds',a.beds||'—',b.beds||'—'],['Baths',a.baths||'—',b.baths||'—'],
    ['Sq Ft',\`<span class="\${+a.sqft>+b.sqft?'cmp-win':''}">\${a.sqft?a.sqft+'sf':'—'}</span>\`,\`<span class="\${+b.sqft>+a.sqft?'cmp-win':''}">\${b.sqft?b.sqft+'sf':'—'}</span>\`],
    ['Type',a.btype||'—',b.btype||'—'],['Year',a.year||'—',b.year||'—'],
    ['Maintenance',a.maint||'—',b.maint||'—'],['Flip Tax',a.flip||'—',b.flip||'—'],
    ['Down',a.down||'—',b.down||'—'],['Board',a.board||'—',b.board||'—'],
    ['Doorman',am(a,'doorman'),am(b,'doorman')],['Elevator',am(a,'elevator'),am(b,'elevator')],
    ['W/D',am(a,'laundry'),am(b,'laundry')],['Fireplace',am(a,'fp'),am(b,'fp')],
    ['Outdoor',am(a,'outdoor'),am(b,'outdoor')],['Pets',am(a,'pets'),am(b,'pets')],
    ['Rating',ss(a.rating),ss(b.rating)],
    ['Pros', rxSummary(a,'pro'), rxSummary(b,'pro')],
    ['Cons', rxSummary(a,'con'), rxSummary(b,'con')],
  ].map(([l,va,vb])=>\`<tr><td>\${l}</td><td>\${va}</td><td>\${vb}</td></tr>\`).join('');
  return \`<div class="cmp-selects">
    <div><label style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;display:block;margin-bottom:4px">Unit A</label><select onchange="window._c1=this.value;render()" style="font-size:13px">\${o1}</select></div>
    <div><label style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;display:block;margin-bottom:4px">Unit B</label><select onchange="window._c2=this.value;render()" style="font-size:13px">\${o2}</select></div>
  </div>
  <table class="cmp-table"><thead><tr><th>Field</th><th>\${a.name.slice(0,16)}</th><th>\${b.name.slice(0,16)}</th></tr></thead><tbody>\${rows}</tbody></table>\`;
}

function renderShortlist() {
  const top=apts.filter(a=>a.rating>=4).sort((a,b)=>b.rating-a.rating);
  if (!top.length) return \`<div class="empty"><div class="empty-icon">⭐</div><h3>No favorites yet</h3><p>Rate apartments 4+ stars to see them here.</p></div>\`;
  return \`<div style="font-family:'Playfair Display',serif;font-size:18px;margin-bottom:16px">Your Top Picks</div>\`+
    top.map(a=>{
      const stars=[1,2,3,4,5].map(i=>\`<span class="star \${i<=a.rating?'on':''}">★</span>\`).join('');
      const pros=(a.reactions||[]).filter(r=>r.type==='pro').slice(0,2).map(r=>\`✓ \${r.text}\`).join(' · ')||'';
      return \`<div class="apt-card" onclick="openDetail('\${a.id}')"><div class="card-body">
        <div class="card-top"><div><div class="card-name">\${a.name}</div><div class="card-meta">\${[a.neighborhood,a.price].filter(Boolean).join(' · ')}</div></div><div class="stars">\${stars}</div></div>
        \${pros?\`<div style="font-size:12px;color:var(--green);margin-top:8px">\${pros}</div>\`:''}
      </div></div>\`;
    }).join('');
}

async function doSearch() {
  const addr = document.getElementById('ai-addr').value.trim();
  if (!addr) { alert('Enter an address.'); return; }
  const btn=document.getElementById('ai-btn'), status=document.getElementById('ai-status'), preview=document.getElementById('ai-preview');
  btn.disabled=true; btn.textContent='…';
  status.className='ai-status loading';
  status.innerHTML='<span class="spin"></span>Searching live listings…';
  preview.style.display='none';
  try {
    const res = await fetch('/search', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({address: addr})
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error||'Search failed');
    lastParsed = json.data;
    const badges = [
      lastParsed.price && \`<span class="ai-badge">\${lastParsed.price}</span>\`,
      lastParsed.beds && \`<span class="ai-badge">\${lastParsed.beds} bed</span>\`,
      lastParsed.baths && \`<span class="ai-badge">\${lastParsed.baths} bath</span>\`,
      lastParsed.sqft && \`<span class="ai-badge">\${lastParsed.sqft} sf</span>\`,
      lastParsed.btype && \`<span class="ai-badge">\${lastParsed.btype}</span>\`,
      lastParsed.neighborhood && \`<span class="ai-badge">\${lastParsed.neighborhood}</span>\`,
      lastParsed.year && \`<span class="ai-badge">Built \${lastParsed.year}</span>\`,
    ].filter(Boolean).join('');
    document.getElementById('ai-preview-name').textContent = lastParsed.bldg||lastParsed.name||addr;
    document.getElementById('ai-badges').innerHTML = badges;
    preview.style.display='block';
    status.className='ai-status ok';
    status.textContent='✓ Found — tap "Fill in all fields"';
  } catch(e) {
    status.className='ai-status err';
    status.textContent='✗ '+(e.message||'Search failed');
  }
  btn.disabled=false; btn.textContent='Search';
}

function applyData() {
  if (!lastParsed) return;
  const p=lastParsed;
  const sv=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null&&v!='')el.value=v;};
  sv('f-name',p.name);sv('f-price',p.price);sv('f-beds',p.beds);sv('f-baths',p.baths);
  sv('f-sqft',p.sqft);sv('f-floor',p.floor);sv('f-hood',p.neighborhood);
  sv('f-maint',p.maint);sv('f-flip',p.flip);sv('f-down',p.down);
  sv('f-sublet',p.sublet);sv('f-year',p.year);sv('f-bldg',p.bldg);
  if (p.pros) p.pros.split('\n').filter(Boolean).forEach(t => { _formReactions.push({id: Date.now().toString(36)+Math.random().toString(36).slice(2), text: t, type: 'pro', photoIndex: null}); });
  if (p.cons) p.cons.split('\n').filter(Boolean).forEach(t => { _formReactions.push({id: Date.now().toString(36)+Math.random().toString(36).slice(2), text: t, type: 'con', photoIndex: null}); });
  renderFormReactions();
  sv('f-notes',p.notes);sv('f-url',p.url);
  if(p.btype)document.getElementById('f-btype').value=p.btype;
  if(p.board)document.getElementById('f-board').value=p.board;
  if(p.amenities)Object.keys(p.amenities).forEach(k=>{const el=document.getElementById('a-'+k);if(el)el.checked=!!p.amenities[k];});
  document.getElementById('ai-status').textContent='✓ Done — scroll down to review';
  document.querySelector('.sheet').scrollBy({top:300,behavior:'smooth'});
}

function openAdd() {
  editId=null;pendingPhotos=[];rating=0;lastParsed=null;
  document.getElementById('sheet-title').textContent='Add Apartment';
  clearForm();
  document.getElementById('add-overlay').classList.add('open');
}

function openEdit(id) {
  const a=apts.find(x=>x.id===id);if(!a)return;
  editId=id;pendingPhotos=JSON.parse(JSON.stringify(a.photos||[]));rating=a.rating||0;lastParsed=null;
  document.getElementById('sheet-title').textContent='Edit Apartment';
  document.getElementById('ai-addr').value='';
  document.getElementById('ai-status').textContent='';
  document.getElementById('ai-preview').style.display='none';
  fillForm(a);
  document.getElementById('add-overlay').classList.add('open');
}

function clearForm() {
  ['f-name','f-price','f-beds','f-baths','f-sqft','f-floor','f-hood','f-maint','f-flip','f-down','f-sublet','f-year','f-bldg','f-notes','f-url'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['f-status','f-board','f-btype'].forEach(id=>{const el=document.getElementById(id);if(el)el.selectedIndex=0;});
  ['doorman','elevator','laundry','outdoor','gym','parking','pets','storage','roof','bldry','fp','ac'].forEach(k=>{const el=document.getElementById('a-'+k);if(el)el.checked=false;});
  document.getElementById('ai-addr').value='';
  document.getElementById('ai-status').textContent='';
  document.getElementById('ai-preview').style.display='none';
  setRating(0);renderPhotoGrid();
  _formReactions = [];
  renderFormReactions();
}

function fillForm(a) {
  const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  sv('f-name',a.name);sv('f-price',a.price);sv('f-beds',a.beds);sv('f-baths',a.baths);
  sv('f-sqft',a.sqft);sv('f-floor',a.floor);sv('f-hood',a.neighborhood);
  sv('f-maint',a.maint);sv('f-flip',a.flip);sv('f-down',a.down);
  sv('f-sublet',a.sublet);sv('f-year',a.year);sv('f-bldg',a.bldg);
  sv('f-notes',a.notes);sv('f-url',a.url);
  document.getElementById('f-status').value=a.status||'active';
  document.getElementById('f-board').value=a.board||'';
  document.getElementById('f-btype').value=a.btype||'';
  ['doorman','elevator','laundry','outdoor','gym','parking','pets','storage','roof','bldry','fp','ac'].forEach(k=>{const el=document.getElementById('a-'+k);if(el)el.checked=!!(a.amenities&&a.amenities[k]);});
  setRating(a.rating||0);renderPhotoGrid();
  _formReactions = JSON.parse(JSON.stringify(a.reactions || []));
  renderFormReactions();
}

function saveApt() {
  const name=document.getElementById('f-name').value.trim();
  if(!name){alert('Enter an address.');return;}
  const amenities={};
  ['doorman','elevator','laundry','outdoor','gym','parking','pets','storage','roof','bldry','fp','ac'].forEach(k=>{amenities[k]=document.getElementById('a-'+k).checked;});
  const apt={
    id:editId||Date.now().toString(),name,
    price:document.getElementById('f-price').value.trim(),
    beds:document.getElementById('f-beds').value.trim(),
    baths:document.getElementById('f-baths').value.trim(),
    sqft:document.getElementById('f-sqft').value.trim(),
    floor:document.getElementById('f-floor').value.trim(),
    neighborhood:document.getElementById('f-hood').value.trim(),
    status:document.getElementById('f-status').value,rating,
    maint:document.getElementById('f-maint').value.trim(),
    flip:document.getElementById('f-flip').value.trim(),
    down:document.getElementById('f-down').value.trim(),
    board:document.getElementById('f-board').value,
    btype:document.getElementById('f-btype').value,
    sublet:document.getElementById('f-sublet').value.trim(),
    year:document.getElementById('f-year').value.trim(),
    bldg:document.getElementById('f-bldg').value.trim(),
    amenities,
    reactions: _formReactions.filter(r => r.text.trim()),
    notes:document.getElementById('f-notes').value.trim(),
    url:document.getElementById('f-url').value.trim(),
    photos:JSON.parse(JSON.stringify(pendingPhotos)),
    updatedAt:new Date().toISOString(),
  };
  if(editId)apts=apts.map(a=>a.id===editId?apt:a);
  else apts.unshift(apt);
  persist();closeSheet('add-overlay');
  if(editId){view='detail';window._did=editId;document.getElementById('fab').style.display='none';document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));render();}
  else showView('list');
}

function delApt(id) {
  if(!confirm('Delete this apartment?'))return;
  apts=apts.filter(a=>a.id!==id);persist();showView('list');
}

function handlePhotos(e) {
  Array.from(e.target.files).forEach(file=>{
    const reader=new FileReader();
    reader.onload=ev=>{
      const img=new Image();
      img.onload=()=>{
        const c=document.createElement('canvas');
        const max=1400;let w=img.width,h=img.height;
        if(w>max){h=h*max/w;w=max;}if(h>max){w=w*max/h;h=max;}
        c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
        pendingPhotos.push({data:c.toDataURL('image/jpeg',0.8),annotation:null,note:''});
        renderPhotoGrid();
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  e.target.value='';
}

function renderPhotoGrid() {
  const grid=document.getElementById('photo-grid');if(!grid)return;
  grid.innerHTML=pendingPhotos.map((p,i)=>\`
    <div class="p-thumb" onclick="openAnnotator(\${i})">
      <img src="\${p.annotation||p.data}">
      <button class="p-thumb-del" onclick="event.stopPropagation();removePhoto(\${i})">✕</button>
      <button class="p-thumb-ann" onclick="event.stopPropagation();openAnnotator(\${i})">✏️</button>
    </div>\`).join('');
}

function removePhoto(i){pendingPhotos.splice(i,1);renderPhotoGrid();}

let annIdx=null,annTool='draw',annColor='#b8860b',annDrawing=false;
let annHistory=[],annCv,annCtx,annBg,_arrowStart;

function openAnnotator(idx) {
  annIdx=idx;
  document.getElementById('ann-overlay').classList.add('open');
  annCv=document.getElementById('ann-canvas');annCtx=annCv.getContext('2d');
  annHistory=[];annDrawing=false;setTool('draw');
  const img=new Image();
  img.onload=()=>{
    const wrap=document.getElementById('ann-wrap');
    const scale=Math.min(wrap.clientWidth/img.width,wrap.clientHeight/img.height,1);
    annCv.width=img.width*scale;annCv.height=img.height*scale;
    annBg=img;annCtx.drawImage(img,0,0,annCv.width,annCv.height);
    if(pendingPhotos[idx].annotation){const a=new Image();a.onload=()=>annCtx.drawImage(a,0,0,annCv.width,annCv.height);a.src=pendingPhotos[idx].annotation;}
    saveHist();
  };
  img.src=pendingPhotos[idx].data;
  annCv.addEventListener('mousedown',aStart);annCv.addEventListener('mousemove',aMove);annCv.addEventListener('mouseup',aEnd);
  annCv.addEventListener('touchstart',aTStart,{passive:false});annCv.addEventListener('touchmove',aTMove,{passive:false});annCv.addEventListener('touchend',aEnd);
}

function closeAnnotator() {
  document.getElementById('ann-overlay').classList.remove('open');
  annCv.removeEventListener('mousedown',aStart);annCv.removeEventListener('mousemove',aMove);annCv.removeEventListener('mouseup',aEnd);
  annCv.removeEventListener('touchstart',aTStart);annCv.removeEventListener('touchmove',aTMove);annCv.removeEventListener('touchend',aEnd);
}

function saveAnnotation() {
  if(annIdx===null)return;
  pendingPhotos[annIdx].annotation=annCv.toDataURL('image/jpeg',0.85);
  renderPhotoGrid();closeAnnotator();
}

function setTool(t) {
  annTool=t;
  document.querySelectorAll('[id^=tool-]').forEach(b=>b.classList.remove('on'));
  const el=document.getElementById('tool-'+t);if(el)el.classList.add('on');
  annCv.style.cursor=t==='text'?'text':t==='erase'?'cell':'crosshair';
}

function setColor(c,el){annColor=c;document.querySelectorAll('.cswatch').forEach(s=>s.classList.remove('on'));el.classList.add('on');}
function gp(e){const r=annCv.getBoundingClientRect();return{x:(e.clientX-r.left)*(annCv.width/r.width),y:(e.clientY-r.top)*(annCv.height/r.height)};}

function aStart(e){
  if(annTool==='text'){doText(e);return;}
  const p=gp(e);annDrawing=true;
  if(annTool==='arrow'){_arrowStart={x:p.x,y:p.y};saveHist();return;}
  annCtx.beginPath();annCtx.moveTo(p.x,p.y);
}
function aMove(e){
  if(!annDrawing)return;
  const p=gp(e),sz=parseInt(document.getElementById('brush-sz').value);
  if(annTool==='draw'){annCtx.strokeStyle=annColor;annCtx.lineWidth=sz;annCtx.lineCap='round';annCtx.lineJoin='round';annCtx.lineTo(p.x,p.y);annCtx.stroke();annCtx.beginPath();annCtx.moveTo(p.x,p.y);}
  else if(annTool==='erase'){const r=sz*3;annCtx.clearRect(p.x-r,p.y-r,r*2,r*2);annCtx.drawImage(annBg,p.x-r,p.y-r,r*2,r*2,p.x-r,p.y-r,r*2,r*2);}
  else if(annTool==='arrow'&&_arrowStart){const im=new Image();im.onload=()=>{annCtx.clearRect(0,0,annCv.width,annCv.height);annCtx.drawImage(im,0,0);drawArrow(_arrowStart.x,_arrowStart.y,p.x,p.y);};im.src=annHistory[annHistory.length-1];}
}
function aEnd(){if(!annDrawing)return;annDrawing=false;saveHist();}
function aTStart(e){e.preventDefault();const t=e.touches[0];aStart({clientX:t.clientX,clientY:t.clientY});}
function aTMove(e){e.preventDefault();const t=e.touches[0];aMove({clientX:t.clientX,clientY:t.clientY});}

function drawArrow(x1,y1,x2,y2){
  const sz=parseInt(document.getElementById('brush-sz').value);
  annCtx.strokeStyle=annColor;annCtx.fillStyle=annColor;annCtx.lineWidth=sz;annCtx.lineCap='round';
  annCtx.beginPath();annCtx.moveTo(x1,y1);annCtx.lineTo(x2,y2);annCtx.stroke();
  const ang=Math.atan2(y2-y1,x2-x1),hl=Math.max(14,sz*4);
  annCtx.beginPath();annCtx.moveTo(x2,y2);
  annCtx.lineTo(x2-hl*Math.cos(ang-Math.PI/6),y2-hl*Math.sin(ang-Math.PI/6));
  annCtx.lineTo(x2-hl*Math.cos(ang+Math.PI/6),y2-hl*Math.sin(ang+Math.PI/6));
  annCtx.closePath();annCtx.fill();
}

function doText(e){
  const p=gp(e);const inp=document.getElementById('ann-text-inp');
  const wr=document.getElementById('ann-wrap').getBoundingClientRect();
  inp.style.display='block';inp.style.left=(e.clientX-wr.left)+'px';inp.style.top=(e.clientY-wr.top)+'px';
  inp.value='';inp.focus();inp._p=p;
  inp.onkeydown=ev=>{
    if(ev.key==='Enter'){
      const txt=inp.value.trim();
      if(txt){const sz=parseInt(document.getElementById('brush-sz').value);annCtx.font=\`\${Math.max(16,sz*4)}px Outfit,sans-serif\`;annCtx.fillStyle=annColor;annCtx.strokeStyle='rgba(0,0,0,0.7)';annCtx.lineWidth=3;annCtx.strokeText(txt,inp._p.x,inp._p.y);annCtx.fillText(txt,inp._p.x,inp._p.y);saveHist();}
      inp.style.display='none';
    }
    if(ev.key==='Escape')inp.style.display='none';
  };
}

function saveHist(){annHistory.push(annCv.toDataURL());if(annHistory.length>30)annHistory.shift();}
function undoAnn(){if(annHistory.length<=1)return;annHistory.pop();const im=new Image();im.onload=()=>{annCtx.clearRect(0,0,annCv.width,annCv.height);annCtx.drawImage(im,0,0);};im.src=annHistory[annHistory.length-1];}
function clearAnn(){if(!confirm('Clear?'))return;annCtx.clearRect(0,0,annCv.width,annCv.height);annCtx.drawImage(annBg,0,0,annCv.width,annCv.height);saveHist();}

function setRating(n){rating=n;document.querySelectorAll('.sp-btn').forEach((b,i)=>b.classList.toggle('on',i<n));}
function closeSheet(id){document.getElementById(id).classList.remove('open');}
function maybeClose(e,id){if(e.target===document.getElementById(id))closeSheet(id);}

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
    .map(r => `<span class="viewer-reaction-chip ${r.type === 'pro' ? 'pro' : 'con'}">
      ${r.type === 'pro' ? '✓' : '✗'} ${esc(r.text)}
      <button onclick="deleteReaction('${esc(r.id)}')">×</button>
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
  a.reactions.push({ id: Date.now().toString(36)+Math.random().toString(36).slice(2), text, type: _pvTagType, photoIndex: _pvPhotoIndex });
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
  if (view === 'detail') render();
}

// ── Edit form reactions ───────────────────────────────────────────────────────
let _formReactions = [];

function renderFormReactions() {
  const el = document.getElementById('f-reactions-list'); if (!el) return;
  el.innerHTML = _formReactions.map((r, i) => `
    <div class="reaction-editor-item">
      <button type="button" class="reaction-type-tog ${r.type}" onclick="toggleFormReactionType(${i})">${r.type === 'pro' ? '✓ PRO' : '✗ CON'}</button>
      <input class="reaction-editor-text" value="${esc(r.text)}" placeholder="Note..." oninput="_formReactions[${i}].text=this.value">
      <button type="button" class="reaction-del" onclick="removeFormReaction(${i})">×</button>
    </div>`).join('') || '<div class="reactions-empty" style="padding:8px 0">No reactions yet — add a pro or con below</div>';
}

function addFormReaction(type) {
  _formReactions.push({ id: Date.now().toString(36)+Math.random().toString(36).slice(2), text: '', type, photoIndex: null });
  renderFormReactions();
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

fetch('/apts').then(r=>r.json()).then(data=>{
  apts = Array.isArray(data) ? data : [];
  // Migrate pros/cons strings → reactions array
  let migrated = false;
  apts = apts.map(a => {
    if (!a.reactions && (a.pros || a.cons)) {
      const r = [];
      if (a.pros) a.pros.split('\n').filter(Boolean).forEach(t => r.push({id: Date.now().toString(36)+Math.random().toString(36).slice(2), text: t, type: 'pro', photoIndex: null}));
      if (a.cons) a.cons.split('\n').filter(Boolean).forEach(t => r.push({id: Date.now().toString(36)+Math.random().toString(36).slice(2), text: t, type: 'con', photoIndex: null}));
      migrated = true;
      return {...a, reactions: r};
    }
    if (!a.reactions) return {...a, reactions: []};
    return a;
  });
  if (migrated) persist();
  render();
}).catch(()=>{ render(); });
</script>
</body>
</html>`;

// ─── SEARCH HANDLER ──────────────────────────────────────────────────────────
async function handleSearch(request, env) {
  let address;
  try {
    const body = await request.json();
    address = body.address?.trim();
    if (!address) throw new Error('No address provided');
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  const prompt = `You are a NYC real estate research assistant. Search the web and find the CURRENT active listing for: "${address}"

Find the listing on StreetEasy, Corcoran, Compass, Zillow, or any real estate site. Get the real current asking price — not historical sold prices.

Return ONLY a raw JSON object with no markdown, no backticks, no explanation. The response must be valid JSON matching exactly this shape:

{"name":"${address}","price":null,"beds":null,"baths":null,"sqft":null,"floor":null,"neighborhood":null,"btype":null,"bldg":null,"maint":null,"flip":null,"down":null,"board":null,"sublet":null,"year":null,"url":null,"amenities":{"doorman":false,"elevator":false,"laundry":false,"outdoor":false,"gym":false,"parking":false,"pets":false,"storage":false,"roof":false,"bldry":false,"fp":false,"ac":false},"pros":null,"cons":null,"notes":null}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Anthropic ${response.status}: ${errBody}`);
    }
    const data = await response.json();

    let raw = '';
    for (const block of (data.content || [])) {
      if (block.type === 'text') raw += block.text;
    }

    // Extract JSON by tracking brace depth
    let depth = 0, start = -1, end = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '{') { if (depth === 0) start = i; depth++; }
      else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (start === -1 || end === -1) throw new Error('Could not parse listing data');

    const parsed = JSON.parse(raw.slice(start, end + 1));
    return new Response(JSON.stringify({ ok: true, data: parsed }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });

  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
}

// ─── APARTMENTS KV HANDLERS ──────────────────────────────────────────────────
async function handleGetApts(env) {
  const data = await env.APTS_KV.get('apts_v5');
  return new Response(data || '[]', {
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

async function handleSaveApts(request, env) {
  const body = await request.text();
  await env.APTS_KV.put('apts_v5', body);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // GET /apts — load apartments from KV
    if (request.method === 'GET' && url.pathname === '/apts') {
      return handleGetApts(env);
    }

    // POST /apts — save apartments to KV
    if (request.method === 'POST' && url.pathname === '/apts') {
      return handleSaveApts(request, env);
    }

    // POST /search — address lookup
    if (request.method === 'POST' && url.pathname === '/search') {
      return handleSearch(request, env);
    }

    // GET / — serve the app
    return new Response(APP_HTML, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};
