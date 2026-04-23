import { escapeHtml, formatNumber } from "./utils.js";

export function emptyHtml(message) {
  return `<div class="empty-box"><p class="empty">${escapeHtml(message)}</p></div>`;
}

export function cardHtml({ title = "", subtitle = "", chips = [], extraClass = "", body = "", footer = "" }) {
  return `
    <article class="list-item ${extraClass}">
      <div class="list-head">
        <div>
          <h3 class="list-title">${escapeHtml(title)}</h3>
          ${subtitle ? `<p class="list-subtitle">${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      ${chips?.length ? `<div class="chip-row">${chips.map((chip) => `<span class="chip ${chip.type || "ghost"}">${escapeHtml(chip.label)}</span>`).join("")}</div>` : ""}
      ${body ? `<div class="card-body-inline">${body}</div>` : ""}
      ${footer ? `<div class="card-footer-inline">${footer}</div>` : ""}
    </article>
  `;
}

const MORE_TABS = new Set(["routines", "measurements", "analytics", "goals", "settings"]);

export function setActiveTab(state, tabId) {
  const resolvedTab = MORE_TABS.has(tabId) ? tabId : (tabId || "home");
  state.ui.activeTab = resolvedTab;
  const primaryTab = MORE_TABS.has(resolvedTab) ? "more" : resolvedTab;

  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === primaryTab;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.tabIndex = active ? 0 : -1;
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const active = panel.id === resolvedTab;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

let toastTimer = null;
export function toast(elsOrRegion, message, options = {}) {
  const region = elsOrRegion.toastRegion || elsOrRegion;
  if (!region) return;
  clearTimeout(toastTimer);
  const toastEl = document.createElement("div");
  toastEl.className = `toast ${options.type ? `toast--${options.type}` : ""}`;
  toastEl.innerHTML = `<span>${escapeHtml(message)}</span>${options.actionLabel ? `<button type="button" class="toast-action">${escapeHtml(options.actionLabel)}</button>` : ""}`;
  region.innerHTML = "";
  region.appendChild(toastEl);
  const actionButton = toastEl.querySelector(".toast-action");
  if (actionButton && typeof options.onAction === "function") {
    actionButton.addEventListener("click", () => {
      options.onAction();
      region.innerHTML = "";
    }, { once: true });
  }
  toastTimer = window.setTimeout(() => {
    if (region.contains(toastEl)) region.innerHTML = "";
  }, options.duration ?? 4200);
}

export function buildLineChart(points, suffix = "", label = "") {
  if (!points?.length) return emptyHtml("Sin datos para dibujar esta curva.");
  const width = 640;
  const height = 220;
  const padding = 24;
  const values = points.map((point) => Number(point.value || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const getX = (index) => padding + (index * ((width - padding * 2) / Math.max(points.length - 1, 1)));
  const getY = (value) => height - padding - (((value - min) / range) * (height - padding * 2));
  const polyline = points.map((point, index) => `${getX(index)},${getY(point.value)}`).join(" ");
  const dots = points.map((point, index) => `
    <g>
      <circle cx="${getX(index)}" cy="${getY(point.value)}" r="4"></circle>
      <title>${escapeHtml(`${point.label}: ${formatNumber(point.value)}${suffix}`)}</title>
    </g>
  `).join("");
  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const value = min + ((range / 3) * index);
    const y = getY(value);
    return `
      <g>
        <line x1="${padding}" x2="${width - padding}" y1="${y}" y2="${y}" class="chart-grid-line"></line>
        <text x="${padding}" y="${y - 6}" class="chart-label chart-label--y">${escapeHtml(formatNumber(value))}${escapeHtml(suffix)}</text>
      </g>
    `;
  }).join("");
  const xLabels = points.map((point, index) => `<text x="${getX(index)}" y="${height - 4}" text-anchor="middle" class="chart-label">${escapeHtml(point.label)}</text>`).join("");
  return `
    <div class="chart-wrapper">
      <p class="chart-caption">${escapeHtml(label)}</p>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}">
        ${yTicks}
        <polyline points="${polyline}" fill="none" class="chart-line"></polyline>
        ${dots}
        ${xLabels}
      </svg>
    </div>
  `;
}

export function buildBarChart(points, suffix = "", label = "") {
  if (!points?.length) return emptyHtml("Sin datos para dibujar esta barra.");
  const max = Math.max(...points.map((point) => Number(point.value || 0)), 1);
  return `
    <div class="bars-chart" aria-label="${escapeHtml(label)}">
      <p class="chart-caption">${escapeHtml(label)}</p>
      ${points.map((point) => `
        <div class="bars-row">
          <span class="bars-label">${escapeHtml(point.label)}</span>
          <div class="bars-track"><span style="width:${(Number(point.value || 0) / max) * 100}%"></span></div>
          <strong>${escapeHtml(formatNumber(point.value))}${escapeHtml(suffix)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}
