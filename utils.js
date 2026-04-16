export const FALLBACK_REST_SECONDS = 90;

export function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleCase(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function todayLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function offsetDate(date, amount) {
  const base = new Date(`${date}T12:00:00`);
  base.setDate(base.getDate() + amount);
  const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function isoFromLocalDateTime(date, time = "12:00") {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function datePartFromIso(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return 0;
  const a = new Date(`${dateA}T12:00:00`);
  const b = new Date(`${dateB}T12:00:00`);
  return Math.round((b - a) / 86400000);
}

export function formatDate(date) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatShortDateTime(dateTime) {
  if (!dateTime) return "—";
  return new Date(dateTime).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function shortLabel(date) {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit"
  });
}

export function monthLabel(date) {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    month: "short",
    year: "2-digit"
  });
}

export function startOfWeek(date) {
  const base = new Date(`${date}T12:00:00`);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function weekLabel(date) {
  return shortLabel(startOfWeek(date));
}

export function formatDuration(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  const decimals = Number.isInteger(number) ? 0 : digits;
  return number.toFixed(decimals);
}

export function formatDelta(value, suffix = "") {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return `0${suffix}`;
  return `${number > 0 ? "+" : ""}${formatNumber(number)}${suffix}`;
}

export function formatCompactDelta(value, suffix = "") {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number > 0 ? "+" : ""}${formatNumber(number)}${suffix}`;
}

export function numOrBlank(value) {
  return value === "" || value == null ? "" : Number(value);
}

export function optionalNumber(value, { min = -Infinity, max = Infinity } = {}) {
  if (value === "" || value == null) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  if (parsed < min || parsed > max) return "";
  return parsed;
}

export function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeNameForMatch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}


export function includesNormalized(haystack, needle) {
  const normalizedNeedle = normalizeNameForMatch(needle);
  if (!normalizedNeedle) return true;
  return normalizeNameForMatch(haystack).includes(normalizedNeedle);
}

export function safeClone(value) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (error) {
      console.warn("structuredClone falló, se usa fallback JSON.", error);
    }
  }
  return JSON.parse(JSON.stringify(value));
}

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

export function roundToStep(value, step = 0.5) {
  return Math.round(Number(value || 0) / step) * step;
}

export function estimateE1RM(weight, reps) {
  return Number(weight || 0) * (1 + Number(reps || 0) / 30);
}

export function calcVolume(item) {
  return Number(item.weight || 0) * Number(item.reps || 0) * Number(item.sets || 0);
}

export function calcVolumeFromEntries(entries = []) {
  return entries.reduce((sum, item) => {
    if (item.isWarmup) return sum;
    return sum + Number(item.weight || 0) * Number(item.reps || 0);
  }, 0);
}

export function buildRepsLabel(repsList) {
  const unique = [...new Set(repsList.map((item) => Number(item || 0)).filter((item) => Number.isFinite(item) && item >= 0))];
  if (!unique.length) return "Reps —";
  if (unique.length === 1) return `${unique[0]} reps`;
  return `${Math.min(...unique)}-${Math.max(...unique)} reps`;
}

export function parseRepRange(value) {
  const text = String(value ?? "").trim();
  const matches = [...text.matchAll(/\d+/g)].map((match) => Number(match[0]));
  if (!matches.length) return { min: 0, max: 0, target: 0, label: text };
  if (matches.length === 1) return { min: matches[0], max: matches[0], target: matches[0], label: text };
  return {
    min: Math.min(...matches),
    max: Math.max(...matches),
    target: Math.max(...matches),
    label: text
  };
}

export function extractMainRep(value) {
  const range = parseRepRange(value);
  return range.max || range.min || "";
}

export function linearRegressionSlope(values = []) {
  const points = values.map((value, index) => ({ x: index + 1, y: Number(value || 0) })).filter((item) => Number.isFinite(item.y));
  if (points.length < 2) return 0;
  const avgX = points.reduce((sum, item) => sum + item.x, 0) / points.length;
  const avgY = points.reduce((sum, item) => sum + item.y, 0) / points.length;
  const numerator = points.reduce((sum, item) => sum + (item.x - avgX) * (item.y - avgY), 0);
  const denominator = points.reduce((sum, item) => sum + (item.x - avgX) ** 2, 0) || 1;
  return numerator / denominator;
}

export function groupBy(array, getKey) {
  return array.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function toCsv(rows, keys) {
  const header = keys.join(",");
  const body = rows.map((row) => keys.map((key) => csvCell(row[key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function csvCell(value) {
  const raw = value == null ? "" : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function mergeDeep(target, source) {
  for (const key of Object.keys(source || {})) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export function sortByDateDesc(a, b) {
  return String(b.date || "").localeCompare(String(a.date || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

export function sortByDateAsc(a, b) {
  return String(a.date || "").localeCompare(String(b.date || "")) || String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

export function byCreatedAtAsc(a, b) {
  return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

export function isStandaloneMode() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone;
}

export function uniq(array) {
  return [...new Set(array)];
}

export function sum(values = []) {
  return values.reduce((acc, value) => acc + Number(value || 0), 0);
}

export function average(values = []) {
  if (!values.length) return 0;
  return sum(values) / values.length;
}

export function percentage(part, total) {
  if (!total) return 0;
  return (Number(part || 0) / Number(total || 1)) * 100;
}

export function relativeDaysLabel(days) {
  if (days == null) return "—";
  const numericDays = Number(days);
  if (!Number.isFinite(numericDays)) return "—";
  const roundedDays = Math.round(numericDays);
  if (roundedDays === 0) return "Hoy";
  if (roundedDays === 1) return "Ayer";
  if (roundedDays === -1) return "Mañana";
  if (roundedDays < 0) return `En ${Math.abs(roundedDays)} días`;
  return `Hace ${roundedDays} días`;
}

export function moveItem(array, fromIndex, toIndex) {
  const clone = [...array];
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= clone.length || toIndex >= clone.length) return clone;
  const [item] = clone.splice(fromIndex, 1);
  clone.splice(toIndex, 0, item);
  return clone;
}
