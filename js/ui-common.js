import { escapeHtml, formatNumber } from "./utils.js";

export function emptyHtml(message) {
  return `<div class="chart-empty">${escapeHtml(message)}</div>`;
}

export function cardHtml({ title, subtitle, chips = [], extraClass = "" }) {
  return `
    <article class="list-item ${extraClass}">
      <div class="list-head">
        <div>
          <h3 class="list-title">${escapeHtml(title)}</h3>
          <p class="list-subtitle">${escapeHtml(subtitle)}</p>
        </div>
      </div>
      ${chips.length ? `<div class="chip-row">${chips.map((chip) => `<span class="chip ${chip.type || "ghost"}">${escapeHtml(chip.label)}</span>`).join("")}</div>` : ""}
    </article>
  `;
}

export function buildLineChart(points, suffix = "", label = "gráfico de evolución") {
  const width = 560;
  const height = 240;
  const padding = 28;
  const values = points.map((item) => Number(item.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / Math.max(points.length - 1, 1);

  const coords = points.map((point, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { ...point, x, y };
  });

  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = padding + ratio * (height - padding * 2);
    return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e7ebf2" stroke-width="1" />`;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}">
      ${gridLines}
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cdd5df" stroke-width="1" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#cdd5df" stroke-width="1" />
      <path d="${path}" fill="none" stroke="#6d5efc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
      ${coords.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#6d5efc"></circle>`).join("")}
      ${coords.map((point) => `<text x="${point.x}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#667085">${escapeHtml(point.label)}</text>`).join("")}
      <text x="${padding}" y="${padding - 8}" font-size="11" fill="#667085">Máx ${formatNumber(max)}${suffix}</text>
      <text x="${padding}" y="${height - padding + 16}" font-size="11" fill="#667085">Mín ${formatNumber(min)}${suffix}</text>
    </svg>
  `;
}

export function toast(els, message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  els.toastRegion.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export function setActiveTab(state, tabId) {
  state.ui.activeTab = tabId;
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === tabId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const active = panel.id === tabId;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}
