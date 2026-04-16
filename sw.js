* { box-sizing: border-box; }

:root {
  --bg: #0b1120;
  --surface: #111827;
  --surface-soft: #1f2937;
  --card: #ffffff;
  --card-soft: #fafbff;
  --border: #e5e7eb;
  --text: #0f172a;
  --muted: #667085;
  --accent: #6d5efc;
  --accent-soft: #ece9ff;
  --accent-strong: #5b4df0;
  --success: #0f9f6e;
  --success-soft: #edfdf7;
  --warning: #ca8a04;
  --warning-soft: #fffaeb;
  --danger: #c63b3b;
  --danger-soft: #fef3f2;
  --shadow: 0 12px 30px rgba(15, 23, 42, .08);
  --radius-xl: 28px;
  --radius-lg: 22px;
  --radius-md: 18px;
  --radius-sm: 14px;
  --focus: 0 0 0 4px rgba(109, 94, 252, .16);
}

html, body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background: linear-gradient(180deg, #f5f7fb 0%, #eef2f7 100%);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

button, input, textarea, select, dialog, summary {
  font: inherit;
}

button {
  border: 0;
  border-radius: 16px;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  padding: .9rem 1.05rem;
  transition: transform .12s ease, opacity .12s ease, background .2s ease, box-shadow .2s ease;
  box-shadow: 0 8px 20px rgba(109, 94, 252, .18);
}
button:hover { transform: translateY(-1px); }
button:active { transform: translateY(0); }
button.ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: none;
}
.topbar button.ghost {
  color: rgba(255,255,255,.96);
  border-color: rgba(255,255,255,.38);
  background: rgba(255,255,255,.08);
}
.topbar button.ghost:hover {
  background: rgba(255,255,255,.16);
  border-color: rgba(255,255,255,.5);
}
.topbar button.ghost:focus-visible {
  box-shadow: 0 0 0 4px rgba(255,255,255,.18);
}
button.danger-ghost {
  color: #b42318;
  border-color: #f5b3ad;
  background: #fff5f4;
}
button.ghost.small { padding: .56rem .8rem; font-size: .9rem; }
button.danger { background: var(--danger); }
button.success { background: var(--success); }
button:disabled { opacity: .55; cursor: not-allowed; transform: none; }
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
summary:focus-visible,
a:focus-visible { outline: none; box-shadow: var(--focus); }

input, textarea, select {
  width: 100%;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  border-radius: 16px;
  padding: .9rem 1rem;
  outline: none;
}
input:focus, textarea:focus, select:focus { border-color: var(--accent); }
textarea { min-height: 96px; resize: vertical; }

.skip-link {
  position: absolute;
  left: 16px;
  top: -50px;
  padding: .75rem 1rem;
  background: #fff;
  color: var(--text);
  border-radius: 12px;
  z-index: 30;
  box-shadow: var(--shadow);
}
.skip-link:focus { top: 16px; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.file-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
}
#appShell {
  width: min(1280px, calc(100% - 24px));
  margin: 0 auto;
  padding: max(env(safe-area-inset-top), 16px) 0 calc(max(env(safe-area-inset-bottom), 16px) + 24px);
}
.topbar {
  display: flex;
  justify-content: space-between;
  gap: .85rem;
  align-items: flex-start;
  margin-bottom: .5rem;
  padding: .85rem 1rem;
  border-radius: var(--radius-xl);
  color: white;
  background: linear-gradient(145deg, var(--bg), #1e293b);
  box-shadow: var(--shadow);
}
.topbar h1 { margin: .05rem 0; font-size: clamp(1.3rem, 2.8vw, 1.95rem); }
.eyebrow, .subtitle { margin: 0; color: rgba(255,255,255,.78); }
.eyebrow-dark {
  margin: 0 0 .2rem;
  color: var(--muted);
  font-size: .82rem;
  text-transform: uppercase;
  letter-spacing: .03em;
}
.subtitle { max-width: 720px; }
.topbar-actions,
.hero-actions,
.session-actions-row,
.actions-row,
.toolbar-inline,
.settings-actions-row { display: flex; flex-wrap: wrap; gap: .75rem; }
.layout,
.stats-grid,
.panel-grid,
.form-grid,
.list,
.exercise-builder,
.session-summary-grid,
.session-shell,
.session-side-column { display: grid; gap: 1rem; }
.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  padding: 1.25rem;
}
.hero-card--highlight {
  background: linear-gradient(135deg, #ffffff, #f7f5ff);
  border-color: #ddd7ff;
}
.hero-copy h2, .hero-card h2 { margin: .55rem 0; }
.hero-card p { margin: 0; color: var(--muted); max-width: 760px; }
.hero-actions--stack-mobile { align-items: flex-start; }
.pill {
  display: inline-flex;
  padding: .35rem .7rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: .85rem;
  font-weight: 700;
}
.update-banner {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin: 1rem 0;
  background: #fff8e8;
  border: 1px solid #f7d68a;
  border-radius: var(--radius-lg);
  padding: 1rem 1.15rem;
}
.update-banner p, .update-banner strong { margin: 0; }
.update-banner p { color: #7a5d00; margin-top: .2rem; }
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: .48rem .8rem;
  border-radius: 999px;
  font-weight: 700;
  background: rgba(255,255,255,.12);
  color: #fff;
  border: 1px solid rgba(255,255,255,.18);
}
.status-badge.offline { background: rgba(198, 59, 59, .18); border-color: rgba(255, 120, 120, .25); }
.status-badge--save[data-state="dirty"],
.status-badge--save[data-state="saving"] { background: rgba(254, 223, 137, .18); border-color: rgba(254, 223, 137, .3); }
.status-badge--save[data-state="error"] { background: rgba(198, 59, 59, .18); border-color: rgba(255, 120, 120, .25); }
.status-badge--save[data-state="saved"],
.status-badge--save[data-state="degraded"] { background: rgba(15, 159, 110, .18); border-color: rgba(15, 159, 110, .3); }

.topbar-actions--compact { justify-content: flex-end; gap: .45rem; }
#networkBadge[data-online="true"] { opacity: .75; }
#networkBadge[data-online="true"][data-quiet="true"] { display: none; }
.log-filter-summary {
  padding: .6rem .8rem;
  border-radius: 12px;
  background: #f8faff;
  border: 1px dashed #c8d3ea;
  margin-bottom: .5rem;
}
.history-day-separator {
  margin: .35rem 0 .15rem;
  font-size: .78rem;
  letter-spacing: .05em;
  color: var(--muted);
  text-transform: uppercase;
}
.template-row { display:flex; flex-wrap:wrap; gap:.45rem; margin-bottom:.45rem; }
.session-exercise.is-completed-collapsed .session-exercise-body { opacity:.72; }
.session-flow-row { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:.5rem; margin-top:.75rem; }
.session-flow-pill { border:1px solid var(--border); border-radius:12px; padding:.55rem .6rem; background:#fff; }
.session-flow-pill strong { display:block; font-size: .95rem; }
.session-flow-pill span { color: var(--muted); font-size: .82rem; }
.stats-grid { grid-template-columns: repeat(4, 1fr); }
.stats-grid.four { grid-template-columns: repeat(5, 1fr); }
.panel-grid.two { grid-template-columns: 1fr 1fr; }
.panel-grid.three { grid-template-columns: repeat(3, 1fr); }
.logs-layout { align-items: start; }
.stat-card, .card {
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
.card--emphasis {
  background: linear-gradient(180deg, #ffffff, #faf9ff);
  border-color: #ddd7ff;
}
.stat-card { padding: 1rem 1.1rem; }
.stat-card p, .stat-card span { margin: 0; color: var(--muted); }
.stat-card strong {
  display: block;
  margin: .35rem 0;
  font-size: clamp(1.4rem, 3vw, 2.15rem);
}
.accent-card { background: linear-gradient(135deg, #fbfbff, #f3f1ff); border-color: #dcd7ff; }
.tabbar { margin: .85rem 0; }
.tabbar-inner { display: flex; gap: .65rem; overflow-x: auto; padding: .2rem 0 .1rem; }
.tabbar .tab { white-space: nowrap; background: #fff; color: var(--text); border: 1px solid var(--border); }
.tabbar .tab.active { background: var(--surface); color: #fff; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }
.card { padding: 1.15rem; }
.card-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.card-head h2, .card-head h3 { margin: 0 0 .2rem; font-size: 1.12rem; }
.card-head p,
.hint,
.list-subtitle,
.list-meta,
.empty,
.form-help,
.details-lead,
.helper-line { margin: 0; color: var(--muted); font-size: .94rem; }
.form-grid { gap: .9rem; }
.form-field { display: grid; gap: .4rem; }
.form-field label { font-size: .92rem; font-weight: 600; color: var(--text); }
.compact-field { gap: 0; }
.mini-grid { display: grid; gap: .75rem; grid-template-columns: repeat(4, 1fr); }
.mini-grid.two-columns { grid-template-columns: repeat(2, 1fr); }
.toolbar-grid {
  display: grid;
  gap: .75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 1rem;
}
.logs-toolbar--wide { grid-template-columns: 1.4fr repeat(5, minmax(0, 1fr)); }
.exercise-builder-head { display: flex; justify-content: space-between; align-items: center; }
.exercise-builder h3, .exercise-builder h4 { margin: 0; }
.exercise-row {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: #fbfcff;
  padding: .75rem;
  display: grid;
  gap: .75rem;
}
.exercise-row-grid {
  display: grid;
  grid-template-columns: .7fr 2fr .8fr .9fr .9fr 1.5fr;
  gap: .6rem;
}
.exercise-row-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.form-field--tiny input, .form-field--wide input { min-height: 46px; }
.list.compact { gap: .7rem; }
.list-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: .95rem;
  background: #fcfdff;
}
.list-item.highlight { background: linear-gradient(180deg, #ffffff, #f8f7ff); border-color: #ddd7ff; }
.list-head {
  display: flex;
  justify-content: space-between;
  gap: .75rem;
  align-items: flex-start;
}
.list-title { margin: 0; font-size: 1rem; }
.chip-row, .planned-sets {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: .75rem;
}
.chip, .planned-set {
  background: #f6f7fb;
  color: #344054;
  border-radius: 999px;
  padding: .4rem .65rem;
  font-size: .84rem;
  border: 1px solid var(--border);
}
.chip.success, .planned-set.done { background: var(--success-soft); color: #027a48; border-color: #abefc6; }
.chip.warning { background: var(--warning-soft); color: #b54708; border-color: #fedf89; }
.chip.ghost { background: #f8fafc; color: var(--muted); }
.chip.danger { background: var(--danger-soft); color: #b42318; border-color: #fda29b; }
.chart {
  min-height: 260px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, #fafbff, #f4f6fb);
  border: 1px solid var(--border);
  padding: .75rem;
}
.chart-wrapper { width: 100%; }
.chart-caption { margin: 0 0 .5rem; color: var(--muted); font-size: .9rem; }
.chart svg { width: 100%; height: auto; overflow: visible; }
.chart-line { stroke: var(--accent); stroke-width: 3; }
.chart circle { fill: var(--accent); }
.chart-grid-line { stroke: rgba(15, 23, 42, .08); stroke-dasharray: 4 4; }
.chart-label { fill: var(--muted); font-size: 12px; }
.chart-label--y { text-anchor: start; }
.bars-chart { width: 100%; display: grid; gap: .75rem; }
.bars-row {
  display: grid;
  grid-template-columns: minmax(90px, 140px) 1fr auto;
  gap: .75rem;
  align-items: center;
}
.bars-label { color: var(--muted); font-size: .9rem; }
.bars-track {
  height: 10px;
  border-radius: 999px;
  background: #eceff5;
  overflow: hidden;
}
.bars-track > span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-strong)); }
.chart-empty,
.empty-box { color: var(--muted); text-align: center; padding: 1.2rem; border-radius: var(--radius-md); border: 1px dashed var(--border); background: #fafbff; }
.kpi-row, .session-summary-grid { grid-template-columns: repeat(3, 1fr); }
.kpi {
  padding: .8rem;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: #fff;
}
.kpi p, .kpi strong { margin: 0; display: block; }
.kpi p { color: var(--muted); font-size: .84rem; }
.kpi strong { margin-top: .3rem; font-size: 1.05rem; }
.active-session { display: grid; gap: .85rem; margin-top: 1rem; }
.session-progress { display: flex; align-items: center; gap: .75rem; margin-top: .75rem; }
.progress-bar {
  height: 10px;
  flex: 1;
  border-radius: 999px;
  background: #eceff5;
  overflow: hidden;
}
.progress-bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-strong)); }
.session-shell { grid-template-columns: minmax(0, 1.5fr) minmax(320px, .8fr); align-items: start; }
.session-side-column { align-self: start; }
.session-main-card { min-width: 0; }
.session-header-controls { display: grid; gap: .9rem; }
.session-exercise {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: .95rem;
  background: #fcfdff;
}
.session-exercise.completed { background: #f0fdf4; border-color: #bbf7d0; }
.session-exercise.in-progress { border-color: #d6d0ff; background: #f8f7ff; }
.session-exercise.skipped { background: #fffbeb; border-color: #fedf89; opacity: .95; }
.session-header-card { margin-bottom: .25rem; }
.session-exercise-top {
  display: flex;
  justify-content: space-between;
  gap: .75rem;
  align-items: flex-start;
}
.exercise-title-row { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.actions-row--tight { gap: .5rem; }
.session-series-grid {
  display: grid;
  gap: .6rem;
  margin-top: .85rem;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  align-items: end;
}
.quick-input-group {
  display: grid;
  gap: .35rem;
}
.quick-input-group label { font-size: .82rem; color: var(--muted); font-weight: 600; }
.quick-switch { min-height: 54px; }
.compact-switch { padding: .75rem .85rem; border-radius: 14px; }
.session-quick-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .75rem; }
.session-table { width: 100%; border-collapse: collapse; margin-top: .8rem; font-size: .92rem; }
.session-table th, .session-table td { padding: .55rem .5rem; border-bottom: 1px solid var(--border); text-align: left; }
.session-table th { color: var(--muted); font-weight: 600; }
.session-table tr:last-child td { border-bottom: 0; }
.session-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 14px; background: #fff; margin-top: .8rem; }
.session-row-actions { display: flex; gap: .35rem; flex-wrap: wrap; }
.history-note-line { margin-top: .6rem; padding: .55rem .7rem; border-radius: 12px; background: #f8f5ff; border: 1px solid #e4dcff; }
.session-sticky-rail {
  position: sticky;
  top: .45rem;
  z-index: 6;
  border: 1px solid #dcd7ff;
  border-radius: 16px;
  padding: .7rem .8rem;
  background: rgba(255,255,255,.95);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .8rem;
}
.session-sticky-rail strong { font-size: 1rem; }
.rest-timer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: linear-gradient(180deg, #fafbff, #f4f6fb);
}
.rest-timer strong { font-size: 1.8rem; }
.switch-row {
  display: flex;
  gap: .75rem;
  align-items: center;
  border: 1px solid var(--border);
  background: #fff;
  padding: .9rem 1rem;
  border-radius: 16px;
}
.switch-row input { width: auto; }
.details-panel {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: #fbfcff;
  padding: .2rem .9rem .9rem;
}
.details-panel--large { padding-bottom: 0; }
.details-panel summary { cursor: pointer; font-weight: 700; padding: .8rem 0; }
.details-body { padding-top: .3rem; }
.goal-progress { margin-top: .85rem; display: grid; gap: .45rem; }
.goal-progress-bar { width: 100%; height: 10px; border-radius: 999px; overflow: hidden; background: #edf1f7; }
.goal-progress-bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-strong)); }
.goal-progress-meta { display: flex; justify-content: space-between; gap: .6rem; color: var(--muted); font-size: .86rem; }
.history-card--session { border-color: #ddd7ff; background: linear-gradient(180deg, #fff, #f9f8ff); }
.history-card--manual { border-color: #dbe6f7; background: linear-gradient(180deg, #fff, #f8fbff); }
.history-session-exercises,
.routine-preview-list { display: grid; gap: .45rem; margin-top: .75rem; }
.history-mini-row,
.routine-preview-row {
  display: flex;
  justify-content: space-between;
  gap: .75rem;
  padding: .55rem .65rem;
  border-radius: 14px;
  background: #fff;
  border: 1px solid var(--border);
}
.measurement-card { background: #fff; }
.settings-actions-block { margin-bottom: 1rem; }
.dialog-card {
  width: min(420px, calc(100vw - 32px));
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  box-shadow: var(--shadow);
}
.dialog-card--wide { width: min(840px, calc(100vw - 32px)); }
dialog { border: 0; background: transparent; padding: 0; }
dialog::backdrop { background: rgba(15, 23, 42, .45); }
.dialog-head { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 1rem; }
.dialog-actions { margin-top: 1rem; justify-content: flex-end; }
.editor-grid { display: grid; gap: .9rem; }
.editor-row { border: 1px solid var(--border); border-radius: 16px; padding: .85rem; background: #fbfcff; }
.editor-row-head { display: flex; justify-content: space-between; gap: .5rem; align-items: center; margin-bottom: .75rem; }
.editor-row-grid { display: grid; gap: .6rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.editor-row-grid label { display: grid; gap: .35rem; font-size: .86rem; color: var(--muted); }
.editor-row-grid textarea { min-height: 74px; }
.chart .mini-insight { margin-bottom: .6rem; color: var(--muted); }
.toast-region {
  position: fixed;
  inset-inline: 0;
  --tabbar-reserved: 0px;
  bottom: calc(env(safe-area-inset-bottom) + var(--tabbar-reserved) + 12px);
  display: grid;
  justify-items: center;
  gap: .5rem;
  z-index: 50;
  pointer-events: none;
}
.toast {
  display: inline-flex;
  align-items: center;
  gap: .75rem;
  pointer-events: auto;
  background: #101828;
  color: #fff;
  padding: .85rem 1rem;
  border-radius: 999px;
  box-shadow: 0 12px 25px rgba(16,24,40,.24);
  max-width: min(92vw, 620px);
}
.toast-action { background: rgba(255,255,255,.12); box-shadow: none; padding: .55rem .85rem; }
.helper-line--strong { color: var(--text); }
@media (max-width: 1180px) {
  .stats-grid.four { grid-template-columns: repeat(3, 1fr); }
  .panel-grid.three { grid-template-columns: repeat(2, 1fr); }
  .session-shell { grid-template-columns: 1fr; }
}
@media (max-width: 980px) {
  .stats-grid, .panel-grid.two, .panel-grid.three { grid-template-columns: 1fr 1fr; }
  .logs-toolbar--wide { grid-template-columns: 1fr 1fr 1fr; }
  .exercise-row-grid { grid-template-columns: 1fr 1fr 1fr; }
  .session-series-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 760px) {
  #appShell {
    width: min(100% - 16px, 1000px);
    padding-bottom: calc(max(env(safe-area-inset-bottom), 12px) + 96px);
  }
  .topbar,
  .hero-card,
  .card-head,
  .card-head-stack-mobile,
  .exercise-builder-head,
  .rest-timer,
  .session-exercise-top,
  .update-banner,
  .goal-progress-meta,
  .history-mini-row,
  .routine-preview-row,
  .dialog-head { flex-direction: column; align-items: stretch; }
  .stats-grid,
  .stats-grid.four,
  .panel-grid.two,
  .panel-grid.three,
  .mini-grid,
  .exercise-row-grid,
  .kpi-row,
  .session-summary-grid,
  .session-series-grid,
  .toolbar-grid,
  .logs-toolbar--wide,
  .editor-row-grid { grid-template-columns: 1fr; }
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    background: rgba(245,247,251,.96);
    backdrop-filter: blur(12px);
    border-top: 1px solid rgba(15,23,42,.08);
    padding: .45rem .5rem calc(max(env(safe-area-inset-bottom), 8px));
    margin: 0;
  }
  .tabbar-inner { gap: .45rem; padding: 0; }
  .tabbar .tab { min-width: max-content; font-size: .92rem; padding: .82rem .95rem; }
  .topbar-actions > *, .hero-actions > *, .session-actions-row > *, .toolbar-inline > *, .settings-actions-row > * { flex: 1; }
  .bars-row { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  * { scroll-behavior: auto !important; transition: none !important; }
}


.more-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; }
.more-link { min-height:56px; font-weight:700; justify-content:flex-start; }
.subtab-context { display:flex; align-items:center; gap:.65rem; margin-bottom:.9rem; }
.subtab-context span { color: var(--muted); font-weight:600; }

.session-exercise { border:1px solid var(--border); border-radius:18px; background:#fcfdff; margin-top:.75rem; }
.session-exercise summary { list-style:none; cursor:pointer; }
.session-exercise summary::-webkit-details-marker { display:none; }
.session-exercise-summary { display:flex; align-items:center; justify-content:space-between; padding:.8rem .95rem; }
.session-exercise-body { padding: 0 .95rem .95rem; }
.session-exercise.completed .session-exercise-summary { background: #f2fcf7; }
.session-exercise.skipped .session-exercise-summary { background: #fff8e8; }

@media (max-width: 860px) {
  .stats-grid.four { grid-template-columns: repeat(2, 1fr); }
  .more-grid { grid-template-columns:1fr; }
}


.today-insight { font-weight: 600; color: #4338ca !important; margin-bottom: .35rem !important; }
.more-grid--cards { grid-template-columns: repeat(2,minmax(0,1fr)); }
.more-link { min-height: 92px; text-align: left; display: grid; gap: .28rem; align-content: center; }
.more-link strong { font-size: 1rem; }
.more-link span { color: var(--muted); font-size: .88rem; font-weight: 500; }
.more-last { border: 1px solid var(--border); border-radius: 14px; padding: .85rem; background: #f8fafc; margin-bottom: .85rem; display: grid; gap: .55rem; }
.logs-toolbar-head { display: flex; gap: .7rem; align-items: center; margin-bottom: .75rem; }
.logs-toolbar-head .form-field { flex: 1; }
.routine-library-toolbar { margin-bottom: .45rem; grid-template-columns: 1.4fr 1fr; }
.logs-filters-panel { margin-bottom: 1rem; }
.danger-zone-inline { padding-top: .25rem; border-top: 1px dashed #f2b8b5; }
.danger-zone { border: 1px solid #f5b3ad; background: #fff5f4; padding: .85rem; border-radius: 14px; margin-top: .8rem; display: grid; gap: .6rem; }
.session-exercise.is-next { border-color: #8b7fff; box-shadow: inset 0 0 0 1px #8b7fff; }
.session-exercise.is-next .session-exercise-summary { background: #f2f0ff; }
.rest-card { position: sticky; top: .5rem; }
.rest-timer.active { border-color: #8b7fff; background: linear-gradient(180deg,#f3f0ff,#ece8ff); box-shadow: inset 0 0 0 1px rgba(109,94,252,.25); }
.rest-timer.active strong { color: #4338ca; }
.dialog-shell .form-grid {
  width: min(520px, calc(100vw - 26px));
  background: #fff;
  border-radius: 20px;
  padding: 1rem;
  box-shadow: var(--shadow);
}
.dialog-shell h3 { margin: 0 0 .3rem; }
.settings-actions-row .file-label { background: transparent; }
.card { padding: 1.1rem; }
.list-item { padding: .9rem; }
@media (max-width: 760px) {
  .topbar { padding: .85rem; border-radius: 20px; }
  .hero-card { padding: 1rem; }
  .session-series-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .session-series-grid > button { grid-column: span 2; }
  .session-sticky-rail { top: .3rem; flex-direction: column; align-items: stretch; }
  .more-grid--cards { grid-template-columns: 1fr; }
  .more-link { min-height: 84px; }
  .rest-card { position: static; }
}

@media (max-width: 760px) {
  .topbar .subtitle { display:none; }
  .session-flow-row { grid-template-columns: 1fr; }
}

.routine-card--active { border-color: #d7cffd; background: linear-gradient(180deg, #ffffff, #f7f4ff); }
.session-flow-pill--focus { border-color: #cfc8ff; background: linear-gradient(180deg, #f8f6ff, #f1eeff); }
.settings-inline-note { margin-top: -.2rem; }
.hero-actions > .ghost { background: rgba(255,255,255,.72); }
.list-item.routine-card .actions-row { margin-top: .9rem; }
