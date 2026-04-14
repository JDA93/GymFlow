const STORAGE_KEY = "gymflow-pro-v4";
const APP_SCHEMA_VERSION = 4;
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const demoData = {
  schemaVersion: APP_SCHEMA_VERSION,
  routines: [
    {
      id: uid(),
      name: "Push A",
      day: "Lunes",
      focus: "Pecho, hombro y tríceps",
      notes: "Busca una progresión sólida en básicos y controla la técnica.",
      exercises: [
        { id: uid(), name: "Press banca", sets: 4, reps: "6-8", rest: 120 },
        { id: uid(), name: "Press inclinado mancuernas", sets: 3, reps: "8-10", rest: 90 },
        { id: uid(), name: "Press militar", sets: 3, reps: "6-8", rest: 120 },
        { id: uid(), name: "Elevaciones laterales", sets: 4, reps: "12-15", rest: 60 }
      ]
    },
    {
      id: uid(),
      name: "Pull A",
      day: "Miércoles",
      focus: "Espalda y bíceps",
      notes: "Prioriza dominadas y remos con técnica limpia.",
      exercises: [
        { id: uid(), name: "Dominadas", sets: 4, reps: "6-10", rest: 120 },
        { id: uid(), name: "Remo con barra", sets: 4, reps: "6-8", rest: 120 },
        { id: uid(), name: "Jalón al pecho", sets: 3, reps: "10-12", rest: 90 },
        { id: uid(), name: "Curl bíceps barra", sets: 3, reps: "10-12", rest: 75 }
      ]
    },
    {
      id: uid(),
      name: "Legs A",
      day: "Viernes",
      focus: "Tren inferior",
      notes: "Bloque principal de fuerza.",
      exercises: [
        { id: uid(), name: "Sentadilla", sets: 4, reps: "5-6", rest: 150 },
        { id: uid(), name: "Peso muerto rumano", sets: 3, reps: "8-10", rest: 120 },
        { id: uid(), name: "Prensa", sets: 3, reps: "10-12", rest: 90 },
        { id: uid(), name: "Curl femoral", sets: 3, reps: "10-12", rest: 75 }
      ]
    }
  ],
  workoutLogs: [
    { id: uid(), date: "2026-04-03", routineId: "", exercise: "Press banca", weight: 82.5, sets: 4, reps: 7, rpe: 8.5, rest: 120, tempo: "", notes: "Buena velocidad." },
    { id: uid(), date: "2026-04-05", routineId: "", exercise: "Remo con barra", weight: 72.5, sets: 4, reps: 8, rpe: 8, rest: 120, tempo: "", notes: "" },
    { id: uid(), date: "2026-04-07", routineId: "", exercise: "Sentadilla", weight: 110, sets: 4, reps: 5, rpe: 8.5, rest: 150, tempo: "", notes: "Profundidad sólida." },
    { id: uid(), date: "2026-04-09", routineId: "", exercise: "Press banca", weight: 85, sets: 4, reps: 6, rpe: 9, rest: 120, tempo: "", notes: "Top set." },
    { id: uid(), date: "2026-04-12", routineId: "", exercise: "Dominadas", weight: 10, sets: 4, reps: 8, rpe: 8, rest: 120, tempo: "", notes: "Lastre." }
  ],
  measurements: [
    { id: uid(), date: "2026-04-01", bodyWeight: 82.1, bodyFat: 15.1, waist: 85.8, chest: 104, arm: 38.2, thigh: 59.1, hips: 98.4, neck: 39.5, sleepHours: 7.2, notes: "" },
    { id: uid(), date: "2026-04-08", bodyWeight: 81.7, bodyFat: 14.8, waist: 85.2, chest: 104.3, arm: 38.5, thigh: 59.3, hips: 98, neck: 39.6, sleepHours: 7.5, notes: "" },
    { id: uid(), date: "2026-04-13", bodyWeight: 81.3, bodyFat: 14.5, waist: 84.7, chest: 104.6, arm: 38.7, thigh: 59.6, hips: 97.8, neck: 39.7, sleepHours: 7.8, notes: "Mejor descanso." }
  ],
  goals: {
    athleteName: "Javier",
    weightGoal: 80,
    waistGoal: 82,
    bodyFatGoal: 12,
    benchGoal: 100,
    squatGoal: 140,
    deadliftGoal: 170,
    focusGoal: "Bajar grasa manteniendo rendimiento en básicos."
  },
  preferences: {
    defaultRestSeconds: 90,
    autoStartRest: true,
    keepScreenAwake: false,
    unitSystem: "metric"
  },
  session: null
};

function getDefaultState() {
  return {
    schemaVersion: APP_SCHEMA_VERSION,
    routines: [],
    workoutLogs: [],
    measurements: [],
    goals: {
      athleteName: "",
      weightGoal: "",
      waistGoal: "",
      bodyFatGoal: "",
      benchGoal: "",
      squatGoal: "",
      deadliftGoal: "",
      focusGoal: ""
    },
    preferences: {
      defaultRestSeconds: 90,
      autoStartRest: true,
      keepScreenAwake: false,
      unitSystem: "metric"
    },
    session: null
  };
}

function migrateState(rawState) {
  const base = getDefaultState();
  const input = rawState && typeof rawState === "object" ? rawState : {};
  const migrated = {
    ...base,
    ...input,
    schemaVersion: APP_SCHEMA_VERSION,
    goals: { ...base.goals, ...(input.goals || {}) },
    preferences: { ...base.preferences, ...(input.preferences || {}) }
  };

  migrated.routines = Array.isArray(input.routines)
    ? input.routines.map((routine) => ({
      id: routine?.id || uid(),
      name: routine?.name || "",
      day: routine?.day || "",
      focus: routine?.focus || "",
      notes: routine?.notes || "",
      exercises: Array.isArray(routine?.exercises)
        ? routine.exercises.map((exercise) => ({
          id: exercise?.id || uid(),
          name: exercise?.name || "",
          sets: exercise?.sets ?? "",
          reps: exercise?.reps ?? "",
          rest: exercise?.rest ?? ""
        }))
        : []
    }))
    : [];

  migrated.workoutLogs = Array.isArray(input.workoutLogs)
    ? input.workoutLogs.map((entry) => ({
      id: entry?.id || uid(),
      date: entry?.date || today(),
      routineId: entry?.routineId || "",
      exercise: entry?.exercise || "",
      weight: coerceNumber(entry?.weight),
      sets: coerceNumber(entry?.sets),
      reps: coerceNumber(entry?.reps),
      rpe: coerceNumber(entry?.rpe),
      rest: coerceNumber(entry?.rest),
      tempo: entry?.tempo || "",
      notes: entry?.notes || "",
      sessionId: entry?.sessionId || "",
      sessionEntryId: entry?.sessionEntryId || ""
    }))
    : [];

  migrated.measurements = Array.isArray(input.measurements)
    ? input.measurements.map((entry) => ({
      id: entry?.id || uid(),
      date: entry?.date || today(),
      bodyWeight: coerceNumber(entry?.bodyWeight),
      bodyFat: coerceNumber(entry?.bodyFat),
      waist: coerceNumber(entry?.waist),
      chest: coerceNumber(entry?.chest),
      arm: coerceNumber(entry?.arm),
      thigh: coerceNumber(entry?.thigh),
      hips: coerceNumber(entry?.hips),
      neck: coerceNumber(entry?.neck),
      sleepHours: coerceNumber(entry?.sleepHours),
      notes: entry?.notes || ""
    }))
    : [];

  if (input.session?.routineId) {
    migrated.session = {
      id: input.session.id || uid(),
      routineId: input.session.routineId,
      date: input.session.date || today(),
      entries: Array.isArray(input.session.entries)
        ? input.session.entries.map((entry) => ({
          id: entry?.id || uid(),
          exercise: entry?.exercise || "",
          targetSets: entry?.targetSets ?? "",
          targetReps: entry?.targetReps ?? "",
          targetRest: coerceNumber(entry?.targetRest) || migrated.preferences.defaultRestSeconds,
          weight: entry?.weight ?? "",
          sets: entry?.sets ?? "",
          reps: entry?.reps ?? "",
          rpe: entry?.rpe ?? "",
          completed: Boolean(entry?.completed),
          savedLogId: entry?.savedLogId || ""
        }))
        : []
    };
  } else {
    migrated.session = null;
  }

  return migrated;
}

let state = loadState();
let ui = {
  editingRoutineId: null,
  editingWorkoutId: null,
  editingMeasurementId: null,
  restTimerSeconds: 0,
  restTimerHandle: null,
  wakeLock: null,
  deferredInstallPrompt: null
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return migrateState(parsed);
  } catch {
    return getDefaultState();
  }
}

function saveState() {
  state.schemaVersion = APP_SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-ES");
}

function formatNumber(value, decimals = 1) {
  if (value === "" || value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function coerceNumber(value) {
  if (value === "" || value === null || value === undefined) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2200);
}

function setTodayDefaults() {
  ["#workoutForm [name=date]", "#measurementForm [name=date]"].forEach((sel) => {
    const input = qs(sel);
    if (input && !input.value) input.value = today();
  });
}

function persistAndRender(message) {
  saveState();
  renderAll();
  if (message) showToast(message);
}

function getAllExerciseNames() {
  const names = new Set();
  state.routines.forEach((routine) => routine.exercises.forEach((ex) => ex.name && names.add(ex.name)));
  state.workoutLogs.forEach((entry) => entry.exercise && names.add(entry.exercise));
  return [...names].sort((a, b) => a.localeCompare(b, "es"));
}

function getLatestMeasurement() {
  return [...state.measurements].sort((a, b) => a.date.localeCompare(b.date)).at(-1) || null;
}

function getSessionsThisMonth() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return new Set(state.workoutLogs.filter((entry) => entry.date.startsWith(ym)).map((entry) => entry.date)).size;
}

function getWorkoutDaysSorted() {
  return [...new Set(state.workoutLogs.map((entry) => entry.date))].sort();
}

function getWorkoutDayCount(entries) {
  return new Set(entries.map((entry) => entry.date)).size;
}

function getDateDiffInDays(a, b) {
  const aa = new Date(`${a}T12:00:00`);
  const bb = new Date(`${b}T12:00:00`);
  return Math.round((aa - bb) / (1000 * 60 * 60 * 24));
}

function getCurrentStreak() {
  const days = getWorkoutDaysSorted();
  if (!days.length) return 0;
  const last = days.at(-1);
  const todayStr = today();
  const lastDiff = getDateDiffInDays(todayStr, last);
  if (lastDiff > 1) return 0;

  let streak = 1;
  for (let i = days.length - 1; i > 0; i -= 1) {
    const diff = getDateDiffInDays(days[i], days[i - 1]);
    if (diff === 1) streak += 1;
    else break;
  }
  return streak;
}

function getPRs() {
  const map = new Map();
  state.workoutLogs.forEach((entry) => {
    const current = map.get(entry.exercise);
    if (!current || Number(entry.weight) > Number(current.weight)) map.set(entry.exercise, entry);
  });
  return [...map.values()].sort((a, b) => Number(b.weight) - Number(a.weight));
}

function estimateE1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || !w || !r) return null;
  return w * (1 + (Math.min(r, 12) / 30));
}

function getBestLift() {
  return getPRs()[0] || null;
}

function getBestE1RMEntry() {
  return [...state.workoutLogs]
    .map((entry) => ({ ...entry, e1rm: estimateE1RM(entry.weight, entry.reps) }))
    .filter((entry) => entry.e1rm)
    .sort((a, b) => b.e1rm - a.e1rm)[0] || null;
}

function getExerciseSeries(exerciseName) {
  if (!exerciseName) return [];
  return [...state.workoutLogs]
    .filter((entry) => entry.exercise === exerciseName)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      label: formatDate(entry.date),
      value: Number(entry.weight),
      secondary: Number(entry.weight) * Number(entry.reps) * Number(entry.sets),
      raw: entry
    }));
}

function getBodySeries(metric) {
  return [...state.measurements]
    .filter((entry) => entry[metric] !== "" && entry[metric] !== null && entry[metric] !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ label: formatDate(entry.date), value: Number(entry[metric]), raw: entry }));
}

function buildLineChart(container, points, options = {}) {
  const node = typeof container === "string" ? qs(container) : container;
  if (!node) return;
  node.innerHTML = "";

  if (!points.length) {
    node.innerHTML = `<div class="chart-empty">Todavía no hay datos suficientes para mostrar esta gráfica.</div>`;
    return;
  }

  const width = 760;
  const height = 240;
  const padding = { top: 18, right: 18, bottom: 40, left: 46 };
  const values = points.map((p) => Number(p.value));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const xStep = points.length === 1 ? 0 : (width - padding.left - padding.right) / (points.length - 1);
  const x = (index) => padding.left + index * xStep;
  const y = (value) => padding.top + ((maxValue - value) / range) * (height - padding.top - padding.bottom);
  const polyline = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");

  let guides = "";
  for (let i = 0; i <= 4; i += 1) {
    const value = minValue + (range / 4) * i;
    const yPos = y(value);
    guides += `
      <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#e6e8ef" stroke-dasharray="4 4" />
      <text x="${padding.left - 8}" y="${yPos + 4}" font-size="11" fill="#667085" text-anchor="end">${value.toFixed(1)}</text>
    `;
  }

  const labels = points.map((point, index) => `<text x="${x(index)}" y="${height - 14}" font-size="11" fill="#667085" text-anchor="middle">${point.label}</text>`).join("");
  const circles = points.map((point, index) => `<circle cx="${x(index)}" cy="${y(point.value)}" r="4.5" fill="#6d5efc"><title>${point.label}: ${point.value}</title></circle>`).join("");
  const delta = points.length > 1 ? (points.at(-1).value - points[0].value) : 0;
  const deltaLabel = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${options.suffix || ""}`;

  node.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.title || "Gráfico"}">
      ${guides}
      <polyline fill="none" stroke="#6d5efc" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />
      ${circles}
      ${labels}
    </svg>
    <div class="kpi-row">
      <div class="kpi"><p>Inicio</p><strong>${points[0].value}${options.suffix || ""}</strong></div>
      <div class="kpi"><p>Actual</p><strong>${points.at(-1).value}${options.suffix || ""}</strong></div>
      <div class="kpi"><p>Cambio</p><strong>${deltaLabel}</strong></div>
    </div>
  `;
}

function routineNameById(id) {
  return state.routines.find((routine) => routine.id === id)?.name || "Sin rutina";
}

function getRoutineById(id) {
  return state.routines.find((routine) => routine.id === id) || null;
}

function getLastLogForExercise(exercise) {
  return [...state.workoutLogs]
    .filter((entry) => entry.exercise === exercise)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function renderStats() {
  qs("#statSessionsMonth").textContent = getSessionsThisMonth();
  qs("#statStreak").textContent = getCurrentStreak();
  const latest = getLatestMeasurement();
  qs("#statWeight").textContent = latest?.bodyWeight !== "" && latest?.bodyWeight !== undefined ? `${formatNumber(latest.bodyWeight)} kg` : "—";
  const bestLift = getBestLift();
  qs("#statBestLift").textContent = bestLift ? `${formatNumber(bestLift.weight)} kg` : "—";
  qs("#statBestLiftLabel").textContent = bestLift ? bestLift.exercise : "Sin datos";
  const bestE1rm = getBestE1RMEntry();
  const e1rmNode = qs("#statBestE1rm");
  const e1rmLabelNode = qs("#statBestE1rmLabel");
  if (e1rmNode) e1rmNode.textContent = bestE1rm ? `${formatNumber(bestE1rm.e1rm)} kg` : "—";
  if (e1rmLabelNode) e1rmLabelNode.textContent = bestE1rm ? bestE1rm.exercise : "Estimado";
}

function renderExerciseSelects() {
  const names = getAllExerciseNames();
  const dashSelect = qs("#dashboardExerciseSelect");
  const sessionSelect = qs("#sessionRoutineSelect");
  const workoutRoutineSelect = qs("#workoutRoutineSelect");
  const datalist = qs("#exerciseSuggestions");
  const routineFilter = qs("#logRoutineFilter");

  dashSelect.innerHTML = names.length ? names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("") : `<option value="">Sin ejercicios</option>`;
  if (!names.includes(dashSelect.value)) dashSelect.value = names[0] || "";

  const routineOptions = state.routines.map((routine) => `<option value="${routine.id}">${escapeHtml(routine.name)}${routine.day ? ` · ${escapeHtml(routine.day)}` : ""}</option>`).join("");
  sessionSelect.innerHTML = `<option value="">Selecciona una rutina</option>${routineOptions}`;
  workoutRoutineSelect.innerHTML = `<option value="">Sin asociar</option>${routineOptions}`;
  routineFilter.innerHTML = `<option value="">Todas las rutinas</option><option value="__none__">Sin rutina</option>${routineOptions}`;
  datalist.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");

  if (state.session?.routineId) sessionSelect.value = state.session.routineId;
}

function renderDashboard() {
  renderExerciseSelects();
  const exerciseName = qs("#dashboardExerciseSelect").value;
  const metric = qs("#dashboardMetricSelect").value;
  buildLineChart("#exerciseChart", getExerciseSeries(exerciseName), { title: "Progresión ejercicio", suffix: " kg" });
  buildLineChart("#bodyChart", getBodySeries(metric), { title: "Evolución corporal", suffix: metric === "bodyFat" ? "%" : metric === "sleepHours" ? "h" : metric === "bodyWeight" ? " kg" : " cm" });

  const recent = [...state.workoutLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  qs("#recentLogs").innerHTML = recent.length
    ? recent.map((entry) => {
      const volume = Number(entry.weight) * Number(entry.sets) * Number(entry.reps);
      const e1rm = estimateE1RM(entry.weight, entry.reps);
      return `
        <div class="list-item">
          <div class="list-head">
            <div>
              <p class="list-title">${escapeHtml(entry.exercise)}</p>
              <p class="list-subtitle">${formatDate(entry.date)} · ${entry.sets}×${entry.reps} · RPE ${entry.rpe || "—"}</p>
            </div>
            <strong>${formatNumber(entry.weight)} kg</strong>
          </div>
          <div class="chip-row">
            <span class="chip">Volumen ${formatNumber(volume)}</span>
            ${e1rm ? `<span class="chip">e1RM ${formatNumber(e1rm)} kg</span>` : ""}
            ${entry.routineId ? `<span class="chip">${escapeHtml(routineNameById(entry.routineId))}</span>` : ""}
          </div>
        </div>
      `;
    }).join("")
    : `<p class="empty">Añade tu primer entrenamiento para empezar a ver actividad.</p>`;

  renderTodayFocus();
}

function getSuggestedNextWeight(exercise) {
  const logs = [...state.workoutLogs].filter((entry) => entry.exercise === exercise).sort((a, b) => b.date.localeCompare(a.date));
  const last = logs[0];
  if (!last) return null;
  const increment = Number(last.weight) >= 100 ? 5 : 2.5;
  if (Number(last.rpe) && Number(last.rpe) >= 9) return { text: `Mantén ${formatNumber(last.weight)} kg y busca más reps`, badge: 'Ajuste' };
  return { text: `Prueba ${formatNumber(Number(last.weight) + increment)} kg`, badge: 'Sugerencia' };
}

function renderTodayFocus() {
  const list = qs("#todayFocus");
  const latestMeasurement = getLatestMeasurement();
  const latestWeightLog = getLastLogForExercise(qs("#dashboardExerciseSelect").value);
  const streak = getCurrentStreak();
  const focus = [];

  if (state.session) {
    focus.push({ title: "Sesión activa", subtitle: `${routineNameById(state.session.routineId)} · ${state.session.entries.filter((x) => x.completed).length}/${state.session.entries.length} completados`, badge: "Ahora" });
  } else if (state.routines[0]) {
    focus.push({ title: "Siguiente paso", subtitle: `Lanza una sesión con ${state.routines[0].name}`, badge: "Listo" });
  }

  if (latestWeightLog) {
    focus.push({ title: `Último ${latestWeightLog.exercise}`, subtitle: `${formatDate(latestWeightLog.date)} · ${formatNumber(latestWeightLog.weight)} kg`, badge: "Referencia" });
    const suggested = getSuggestedNextWeight(latestWeightLog.exercise);
    if (suggested) focus.push({ title: `Siguiente carga ${latestWeightLog.exercise}`, subtitle: suggested.text, badge: suggested.badge });
  }
  if (latestMeasurement?.bodyWeight !== "") focus.push({ title: "Peso actual", subtitle: `${formatNumber(latestMeasurement.bodyWeight)} kg · cintura ${formatNumber(latestMeasurement.waist)} cm`, badge: "Medición" });
  focus.push({ title: "Racha real", subtitle: streak ? `${streak} días activos consecutivos` : "La racha está parada, toca volver", badge: streak ? "On" : "Off" });

  list.innerHTML = focus.map((item) => `
    <div class="list-item">
      <div class="list-head">
        <div>
          <p class="list-title">${escapeHtml(item.title)}</p>
          <p class="list-subtitle">${escapeHtml(item.subtitle)}</p>
        </div>
        <strong>${escapeHtml(item.badge)}</strong>
      </div>
    </div>
  `).join("");
}

function renderRoutineBuilderRows(defaultExercises = []) {
  const rows = qs("#exerciseRows");
  rows.innerHTML = "";
  if (!defaultExercises.length) addExerciseRow();
  else defaultExercises.forEach((exercise) => addExerciseRow(exercise));
}

function addExerciseRow(defaultValues = {}) {
  const template = qs("#exerciseRowTemplate");
  const clone = template.content.firstElementChild.cloneNode(true);
  clone.querySelectorAll("[data-field]").forEach((input) => {
    input.value = defaultValues[input.dataset.field] ?? "";
  });
  clone.querySelector(".remove-row").addEventListener("click", () => {
    clone.remove();
    if (!qs("#exerciseRows").children.length) addExerciseRow();
  });
  qs("#exerciseRows").appendChild(clone);
}

function clearRoutineForm() {
  ui.editingRoutineId = null;
  qs("#routineForm").reset();
  renderRoutineBuilderRows();
  qs("#cancelRoutineEditBtn").hidden = true;
}

function clearWorkoutForm() {
  ui.editingWorkoutId = null;
  qs("#workoutForm").reset();
  setTodayDefaults();
  qs("#cancelWorkoutEditBtn").hidden = true;
}

function clearMeasurementForm() {
  ui.editingMeasurementId = null;
  qs("#measurementForm").reset();
  setTodayDefaults();
  qs("#cancelMeasurementEditBtn").hidden = true;
}

function renderRoutines() {
  const list = qs("#routineList");
  list.innerHTML = state.routines.length ? "" : `<p class="empty">No tienes rutinas todavía. Crea la primera en el formulario de la izquierda.</p>`;
  state.routines.forEach((routine) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="list-head">
        <div>
          <p class="list-title">${escapeHtml(routine.name)}</p>
          <p class="list-subtitle">${escapeHtml(routine.day || "Sin día")} · ${escapeHtml(routine.focus || "Sin enfoque")}</p>
        </div>
      </div>
      ${routine.notes ? `<p class="list-meta">${escapeHtml(routine.notes)}</p>` : ""}
      <div class="chip-row">
        ${routine.exercises.map((ex) => `<span class="chip">${escapeHtml(ex.name)} · ${escapeHtml(String(ex.sets))}x${escapeHtml(String(ex.reps))}${ex.rest ? ` · ${escapeHtml(String(ex.rest))}s` : ""}</span>`).join("")}
      </div>
      <div class="actions-row">
        <button class="ghost small" data-action="start">Entrenar</button>
        <button class="ghost small" data-action="edit">Editar</button>
        <button class="ghost small" data-action="duplicate">Duplicar</button>
        <button class="ghost small" data-action="delete">Eliminar</button>
      </div>
    `;

    div.querySelector('[data-action="start"]').addEventListener("click", () => {
      qs("#sessionRoutineSelect").value = routine.id;
      startSession(routine.id);
      activateTab("session");
    });
    div.querySelector('[data-action="edit"]').addEventListener("click", () => editRoutine(routine.id));
    div.querySelector('[data-action="duplicate"]').addEventListener("click", () => {
      const duplicated = structuredCloneSafe(routine);
      duplicated.id = uid();
      duplicated.name = `${routine.name} copia`;
      duplicated.exercises = duplicated.exercises.map((ex) => ({ ...ex, id: uid() }));
      state.routines.unshift(duplicated);
      persistAndRender("Rutina duplicada.");
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      const confirmed = window.confirm(`Se eliminará la rutina "${routine.name}" y no podrás recuperarla desde la app salvo por backup. ¿Continuar?`);
      if (!confirmed) return;
      state.routines = state.routines.filter((r) => r.id !== routine.id);
      if (state.session?.routineId === routine.id) endSession(false);
      persistAndRender("Rutina eliminada.");
    });
    list.appendChild(div);
  });
}

function editRoutine(id) {
  const routine = getRoutineById(id);
  if (!routine) return;
  ui.editingRoutineId = id;
  const form = qs("#routineForm");
  form.name.value = routine.name || "";
  form.day.value = routine.day || "";
  form.focus.value = routine.focus || "";
  form.notes.value = routine.notes || "";
  renderRoutineBuilderRows(routine.exercises);
  qs("#cancelRoutineEditBtn").hidden = false;
  activateTab("routines");
}

function renderWorkoutLogs() {
  const search = qs("#logSearchInput").value.trim().toLowerCase();
  const routineFilter = qs("#logRoutineFilter").value;
  const entries = [...state.workoutLogs]
    .filter((entry) => !search || entry.exercise.toLowerCase().includes(search))
    .filter((entry) => {
      if (!routineFilter) return true;
      if (routineFilter === "__none__") return !entry.routineId;
      return entry.routineId === routineFilter;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const list = qs("#workoutList");
  list.innerHTML = entries.length ? "" : `<p class="empty">No hay registros que coincidan con el filtro.</p>`;

  const sortMode = qs("#logSortSelect")?.value || "date_desc";
  entries.sort((a, b) => {
    if (sortMode === "date_asc") return a.date.localeCompare(b.date);
    if (sortMode === "weight_desc") return Number(b.weight) - Number(a.weight);
    if (sortMode === "exercise_asc") return a.exercise.localeCompare(b.exercise, "es");
    return b.date.localeCompare(a.date);
  });

  entries.forEach((entry) => {
    const volume = Number(entry.weight) * Number(entry.sets) * Number(entry.reps);
    const e1rm = estimateE1RM(entry.weight, entry.reps);
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="list-head">
        <div>
          <p class="list-title">${escapeHtml(entry.exercise)}</p>
          <p class="list-subtitle">${formatDate(entry.date)} · ${escapeHtml(routineNameById(entry.routineId))}</p>
        </div>
        <strong>${formatNumber(entry.weight)} kg</strong>
      </div>
      <div class="chip-row">
        <span class="chip">${entry.sets} series</span>
        <span class="chip">${entry.reps} reps</span>
        <span class="chip">Volumen ${formatNumber(volume)}</span>
        ${e1rm ? `<span class="chip">e1RM ${formatNumber(e1rm)} kg</span>` : ""}
        <span class="chip">RPE ${entry.rpe || "—"}</span>
        ${entry.rest ? `<span class="chip">Descanso ${entry.rest}s</span>` : ""}
        ${entry.tempo ? `<span class="chip">Tempo ${escapeHtml(entry.tempo)}</span>` : ""}
      </div>
      ${entry.notes ? `<p class="list-meta">${escapeHtml(entry.notes)}</p>` : ""}
      <div class="actions-row">
        <button class="ghost small" data-action="copy">Duplicar</button>
        <button class="ghost small" data-action="edit">Editar</button>
        <button class="ghost small" data-action="delete">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="copy"]').addEventListener("click", () => duplicateWorkout(entry.id));
    div.querySelector('[data-action="edit"]').addEventListener("click", () => editWorkout(entry.id));
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      const confirmed = window.confirm(`Se eliminará el registro de ${entry.exercise} del ${formatDate(entry.date)}. ¿Continuar?`);
      if (!confirmed) return;
      state.workoutLogs = state.workoutLogs.filter((log) => log.id !== entry.id);
      if (state.session?.entries) {
        state.session.entries.forEach((sessionEntry) => {
          if (sessionEntry.savedLogId === entry.id) {
            sessionEntry.savedLogId = "";
            sessionEntry.completed = false;
          }
        });
      }
      persistAndRender("Registro eliminado.");
    });
    list.appendChild(div);
  });

  const prList = qs("#prList");
  const prs = getPRs();
  prList.innerHTML = prs.length
    ? prs.map((entry) => `
      <div class="list-item">
        <div class="list-head">
          <div>
            <p class="list-title">${escapeHtml(entry.exercise)}</p>
            <p class="list-subtitle">${formatDate(entry.date)} · ${entry.sets}×${entry.reps} · e1RM ${formatNumber(estimateE1RM(entry.weight, entry.reps) || 0)} kg</p>
          </div>
          <strong>${formatNumber(entry.weight)} kg</strong>
        </div>
      </div>
    `).join("")
    : `<p class="empty">Todavía no hay récords porque no has registrado sesiones.</p>`;
}

function duplicateWorkout(id) {
  const entry = state.workoutLogs.find((item) => item.id === id);
  if (!entry) return;
  const duplicate = { ...structuredCloneSafe(entry), id: uid(), date: today() };
  state.workoutLogs.unshift(duplicate);
  persistAndRender("Registro duplicado con fecha de hoy.");
}

function editWorkout(id) {
  const entry = state.workoutLogs.find((item) => item.id === id);
  if (!entry) return;
  ui.editingWorkoutId = id;
  const form = qs("#workoutForm");
  form.date.value = entry.date || today();
  form.routineId.value = entry.routineId || "";
  form.exercise.value = entry.exercise || "";
  form.weight.value = entry.weight;
  form.sets.value = entry.sets;
  form.reps.value = entry.reps;
  form.rpe.value = entry.rpe;
  form.rest.value = entry.rest;
  form.tempo.value = entry.tempo || "";
  form.notes.value = entry.notes || "";
  qs("#cancelWorkoutEditBtn").hidden = false;
  activateTab("session");
}

function renderMeasurements() {
  const entries = [...state.measurements].sort((a, b) => b.date.localeCompare(a.date));
  const list = qs("#measurementList");
  list.innerHTML = entries.length ? "" : `<p class="empty">Sin mediciones todavía. Guarda una para arrancar el seguimiento.</p>`;

  entries.forEach((entry) => {
    const chips = [
      entry.bodyWeight !== "" ? `Peso ${formatNumber(entry.bodyWeight)} kg` : "",
      entry.bodyFat !== "" ? `Grasa ${formatNumber(entry.bodyFat)} %` : "",
      entry.waist !== "" ? `Cintura ${formatNumber(entry.waist)} cm` : "",
      entry.chest !== "" ? `Pecho ${formatNumber(entry.chest)} cm` : "",
      entry.arm !== "" ? `Brazo ${formatNumber(entry.arm)} cm` : "",
      entry.thigh !== "" ? `Pierna ${formatNumber(entry.thigh)} cm` : "",
      entry.hips !== "" ? `Cadera ${formatNumber(entry.hips)} cm` : "",
      entry.sleepHours !== "" ? `Sueño ${formatNumber(entry.sleepHours)} h` : ""
    ].filter(Boolean);

    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="list-head">
        <div>
          <p class="list-title">${formatDate(entry.date)}</p>
          <p class="list-subtitle">Control corporal</p>
        </div>
      </div>
      <div class="chip-row">${chips.map((text) => `<span class="chip">${text}</span>`).join("")}</div>
      ${entry.notes ? `<p class="list-meta">${escapeHtml(entry.notes)}</p>` : ""}
      <div class="actions-row">
        <button class="ghost small" data-action="edit">Editar</button>
        <button class="ghost small" data-action="delete">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => editMeasurement(entry.id));
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      const confirmed = window.confirm(`Se eliminará la medición del ${formatDate(entry.date)}. ¿Continuar?`);
      if (!confirmed) return;
      state.measurements = state.measurements.filter((m) => m.id !== entry.id);
      persistAndRender("Medición eliminada.");
    });
    list.appendChild(div);
  });
}

function editMeasurement(id) {
  const entry = state.measurements.find((item) => item.id === id);
  if (!entry) return;
  ui.editingMeasurementId = id;
  const form = qs("#measurementForm");
  Object.entries(entry).forEach(([key, value]) => {
    if (key === "id") return;
    if (form[key]) form[key].value = value ?? "";
  });
  qs("#cancelMeasurementEditBtn").hidden = false;
  activateTab("measurements");
}

function renderAnalytics() {
  const volumeByExercise = new Map();
  state.workoutLogs.forEach((entry) => {
    const total = Number(entry.weight) * Number(entry.sets) * Number(entry.reps);
    volumeByExercise.set(entry.exercise, (volumeByExercise.get(entry.exercise) || 0) + total);
  });

  const volumeItems = [...volumeByExercise.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  qs("#volumeSummary").innerHTML = volumeItems.length
    ? volumeItems.map(([exercise, total]) => `
      <div class="list-item">
        <div class="list-head">
          <div>
            <p class="list-title">${escapeHtml(exercise)}</p>
            <p class="list-subtitle">Volumen acumulado</p>
          </div>
          <strong>${formatNumber(total)}</strong>
        </div>
      </div>
    `).join("")
    : `<p class="empty">Aquí verás el volumen total por ejercicio cuando añadas entrenos.</p>`;

  const trends = buildTrendCards();
  qs("#trendSummary").innerHTML = trends.length
    ? trends.map((item) => `
      <div class="list-item">
        <div class="list-head">
          <div>
            <p class="list-title">${escapeHtml(item.title)}</p>
            <p class="list-subtitle">${escapeHtml(item.subtitle)}</p>
          </div>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      </div>
    `).join("")
    : `<p class="empty">Cuando haya más datos verás comparativas rápidas aquí.</p>`;
}

function buildTrendCards() {
  const latest = getLatestMeasurement();
  const previous = [...state.measurements].sort((a, b) => a.date.localeCompare(b.date)).at(-2);
  const cards = [];

  if (latest && previous && latest.bodyWeight !== "" && previous.bodyWeight !== "") {
    const delta = latest.bodyWeight - previous.bodyWeight;
    cards.push({ title: "Cambio de peso", subtitle: "Últimas dos mediciones", value: `${delta > 0 ? "+" : ""}${formatNumber(delta)} kg` });
  }
  if (latest && previous && latest.waist !== "" && previous.waist !== "") {
    const delta = latest.waist - previous.waist;
    cards.push({ title: "Cambio de cintura", subtitle: "Últimas dos mediciones", value: `${delta > 0 ? "+" : ""}${formatNumber(delta)} cm` });
  }

  const streak = getCurrentStreak();
  cards.push({ title: "Racha activa", subtitle: "Se reinicia si dejas más de 1 día", value: `${streak} días` });

  const recentExercise = [...state.workoutLogs].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (recentExercise) {
    const e1rm = estimateE1RM(recentExercise.weight, recentExercise.reps);
    if (e1rm) cards.push({ title: "e1RM reciente", subtitle: recentExercise.exercise, value: `${formatNumber(e1rm)} kg` });
  }

  const stagnation = getStagnantExercises();
  if (stagnation.length) {
    cards.push({ title: "Posible estancamiento", subtitle: stagnation[0].exercise, value: `${stagnation[0].sessions} sesiones` });
  }

  const thisWeek = getWorkoutDayCount(getLogsForLastNDays(7));
  const prevWeek = getWorkoutDayCount(getLogsForRange(8, 14));
  cards.push({ title: "Días entrenados últimos 7 días", subtitle: `Semana previa: ${prevWeek}`, value: String(thisWeek) });

  return cards;
}

function getLogsForLastNDays(days) {
  const now = new Date(`${today()}T12:00:00`);
  return state.workoutLogs.filter((entry) => {
    const entryDate = new Date(`${entry.date}T12:00:00`);
    const diff = Math.round((now - entryDate) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff < days;
  });
}

function getLogsForRange(fromDaysAgo, toDaysAgo) {
  const now = new Date(`${today()}T12:00:00`);
  return state.workoutLogs.filter((entry) => {
    const entryDate = new Date(`${entry.date}T12:00:00`);
    const diff = Math.round((now - entryDate) / (1000 * 60 * 60 * 24));
    return diff >= fromDaysAgo && diff <= toDaysAgo;
  });
}

function getStagnantExercises() {
  const byExercise = new Map();
  state.workoutLogs.forEach((entry) => {
    if (!byExercise.has(entry.exercise)) byExercise.set(entry.exercise, []);
    byExercise.get(entry.exercise).push(entry);
  });

  const result = [];
  byExercise.forEach((entries, exercise) => {
    const sorted = entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    if (sorted.length < 3) return;
    const sameOrLower = sorted.every((item) => Number(item.weight) <= Number(sorted[0].weight));
    if (sameOrLower) result.push({ exercise, sessions: sorted.length, topWeight: sorted[0].weight });
  });

  return result.sort((a, b) => b.sessions - a.sessions);
}

function renderGoals() {
  const form = qs("#goalForm");
  Object.entries(state.goals).forEach(([key, value]) => {
    if (form[key]) form[key].value = value ?? "";
  });

  const latest = getLatestMeasurement();
  const prs = getPRs();
  const bench = prs.find((entry) => entry.exercise.toLowerCase().includes("press banca"));
  const squat = prs.find((entry) => entry.exercise.toLowerCase().includes("sentadilla"));
  const deadlift = prs.find((entry) => entry.exercise.toLowerCase().includes("peso muerto"));

  const summary = [
    latest && state.goals.weightGoal ? progressLine("Peso", latest.bodyWeight, state.goals.weightGoal, "kg") : null,
    latest && state.goals.waistGoal ? progressLine("Cintura", latest.waist, state.goals.waistGoal, "cm") : null,
    latest && state.goals.bodyFatGoal ? progressLine("Grasa", latest.bodyFat, state.goals.bodyFatGoal, "%") : null,
    bench && state.goals.benchGoal ? progressLine("Press banca", bench.weight, state.goals.benchGoal, "kg") : null,
    squat && state.goals.squatGoal ? progressLine("Sentadilla", squat.weight, state.goals.squatGoal, "kg") : null,
    deadlift && state.goals.deadliftGoal ? progressLine("Peso muerto", deadlift.weight, state.goals.deadliftGoal, "kg") : null,
    state.goals.focusGoal ? { title: "Meta principal", subtitle: state.goals.focusGoal, current: "", goal: "", badge: "Bloque" } : null
  ].filter(Boolean);

  qs("#goalSummary").innerHTML = summary.length
    ? summary.map((item) => `
      <div class="list-item">
        <div class="list-head">
          <div>
            <p class="list-title">${escapeHtml(item.title)}</p>
            <p class="list-subtitle">${escapeHtml(item.subtitle)}</p>
          </div>
          ${item.badge ? `<strong>${escapeHtml(item.badge)}</strong>` : ""}
        </div>
        ${item.current !== "" ? `<p class="list-meta">Actual: ${escapeHtml(item.current)} · Objetivo: ${escapeHtml(item.goal)}</p>` : ""}
      </div>
    `).join("")
    : `<p class="empty">Guarda tus metas para ver aquí una comparativa directa.</p>`;
}

function progressLine(title, current, goal, suffix) {
  if (current === "" || current === undefined || current === null || goal === "") return null;
  const delta = Number(goal) - Number(current);
  const nearer = delta === 0 ? "Objetivo alcanzado" : delta > 0 ? `Faltan ${formatNumber(delta)} ${suffix}` : `Superado por ${formatNumber(Math.abs(delta))} ${suffix}`;
  const progress = goal ? `${Math.round((Number(current) / Number(goal)) * 100)}%` : "";
  return {
    title,
    subtitle: nearer,
    current: `${formatNumber(current)} ${suffix}`,
    goal: `${formatNumber(goal)} ${suffix}`,
    badge: progress
  };
}

function renderSession() {
  renderExerciseSelects();
const card = qs("#activeSessionCard");
  if (!state.session) {
    card.className = "active-session empty-box";
    card.innerHTML = `<p class="empty">Selecciona una rutina e inicia la sesión para ver tus ejercicios aquí.</p>`;
    return;
  }

  const routine = getRoutineById(state.session.routineId);
  if (!routine) {
    endSession(false);
    return;
  }

  card.className = "active-session";
  card.innerHTML = `
    <div class="list-item">
      <div class="list-head">
        <div>
          <p class="list-title">${escapeHtml(routine.name)}</p>
          <p class="list-subtitle">${escapeHtml(routine.focus || "Sesión en curso")} · ${formatDate(state.session.date)}</p>
        </div>
        <strong>${state.session.entries.filter((entry) => entry.completed).length}/${state.session.entries.length}</strong>
      </div>
    </div>
    ${state.session.entries.map((entry) => renderSessionExercise(entry)).join("")}
  `;

  card.querySelectorAll("[data-session-action='save-set']").forEach((button) => {
    button.addEventListener("click", () => saveSessionEntry(button.dataset.entryId));
  });
  card.querySelectorAll("[data-session-action='toggle-complete']").forEach((button) => {
    button.addEventListener("click", () => toggleSessionComplete(button.dataset.entryId));
  });
  card.querySelectorAll("[data-session-action='prefill-last']").forEach((button) => {
    button.addEventListener("click", () => prefillLastSessionData(button.dataset.entryId));
  });
}

function renderSessionExercise(entry) {
  const lastLog = getLastLogForExercise(entry.exercise);
  const lastLabel = lastLog ? `${formatNumber(lastLog.weight)} kg · ${lastLog.sets}x${lastLog.reps}` : "Sin referencia previa";
  const completedClass = entry.completed ? "completed" : "";
  const saveLabel = entry.savedLogId ? "Actualizar" : "Guardar";
  const suggestion = getSuggestedNextWeight(entry.exercise);
  return `
    <div class="session-exercise ${completedClass}">
      <div class="session-exercise-top">
        <div>
          <p class="list-title">${escapeHtml(entry.exercise)}</p>
          <p class="list-subtitle">Objetivo ${escapeHtml(String(entry.targetSets || ""))}×${escapeHtml(String(entry.targetReps || ""))}${entry.targetRest ? ` · descanso ${escapeHtml(String(entry.targetRest))}s` : ""}</p>
        </div>
        <div class="chip-row">
          <span class="chip">Último: ${lastLabel}</span>
          ${suggestion ? `<span class="chip ghost">${escapeHtml(suggestion.text)}</span>` : ""}
          ${entry.savedLogId ? `<span class="chip success">Guardado</span>` : ""}
          ${entry.completed ? `<span class="chip success">Completado</span>` : `<span class="chip warning">Pendiente</span>`}
        </div>
      </div>
      <div class="session-series-row">
        <input data-entry-field="weight" data-entry-id="${entry.id}" type="number" step="0.5" placeholder="Kg" value="${escapeHtml(entry.weight || "")}" />
        <input data-entry-field="sets" data-entry-id="${entry.id}" type="number" step="1" placeholder="Series" value="${escapeHtml(entry.sets || entry.targetSets || "")}" />
        <input data-entry-field="reps" data-entry-id="${entry.id}" type="number" step="1" placeholder="Reps" value="${escapeHtml(entry.reps || "")}" />
        <input data-entry-field="rpe" data-entry-id="${entry.id}" type="number" min="1" max="10" step="0.5" placeholder="RPE" value="${escapeHtml(entry.rpe || "")}" />
        <button data-session-action="save-set" data-entry-id="${entry.id}">${saveLabel}</button>
      </div>
      <div class="actions-row">
        <button class="ghost small" data-session-action="prefill-last" data-entry-id="${entry.id}">Usar último peso</button>
        <button class="ghost small" data-session-action="toggle-complete" data-entry-id="${entry.id}">${entry.completed ? "Marcar pendiente" : "Marcar completado"}</button>
      </div>
    </div>
  `;
}

function startSession(routineId) {
  const routine = getRoutineById(routineId || qs("#sessionRoutineSelect").value);
  if (!routine) {
    showToast("Selecciona una rutina.");
    return;
  }

  if (state.session && state.session.routineId !== routine.id) {
    const confirmed = window.confirm("Ya tienes una sesión activa. Si continúas, se reemplazará por la nueva rutina.");
    if (!confirmed) return;
  }

  state.session = {
    id: uid(),
    routineId: routine.id,
    date: today(),
    entries: routine.exercises.map((exercise) => {
      const last = getLastLogForExercise(exercise.name);
      return {
        id: uid(),
        exercise: exercise.name,
        targetSets: exercise.sets || "",
        targetReps: exercise.reps || "",
        targetRest: coerceNumber(exercise.rest) || state.preferences.defaultRestSeconds,
        weight: last?.weight ?? "",
        sets: exercise.sets || "",
        reps: "",
        rpe: "",
        completed: false,
        savedLogId: ""
      };
    })
  };

  maybeRequestWakeLock();
  persistAndRender("Sesión iniciada.");
}

function endSession(showMessage = true) {
  state.session = null;
  releaseWakeLock();
  persistAndRender(showMessage ? "Sesión cerrada." : "");
}

function getSessionEntry(entryId) {
  return state.session?.entries.find((entry) => entry.id === entryId) || null;
}

function findSessionLog(entry) {
  if (!entry || !state.session) return null;
  if (entry.savedLogId) return state.workoutLogs.find((log) => log.id === entry.savedLogId) || null;
  return state.workoutLogs.find((log) =>
    log.sessionId === state.session.id
    && log.sessionEntryId === entry.id
  ) || null;
}

function prefillLastSessionData(entryId) {
  const entry = getSessionEntry(entryId);
  if (!entry) return;
  const last = getLastLogForExercise(entry.exercise);
  if (!last) {
    showToast("No hay referencia previa para este ejercicio.");
    return;
  }
  entry.weight = last.weight;
  entry.sets = last.sets;
  entry.reps = last.reps;
  entry.rpe = last.rpe;
  persistAndRender("Último registro aplicado.");
}

function toggleSessionComplete(entryId) {
  const entry = getSessionEntry(entryId);
  if (!entry) return;
  entry.completed = !entry.completed;
  persistAndRender(entry.completed ? "Ejercicio completado." : "Ejercicio marcado como pendiente.");
}

function saveSessionEntry(entryId) {
  const entry = getSessionEntry(entryId);
  if (!entry || !state.session) return;

  const fields = qsa(`[data-entry-field][data-entry-id="${entryId}"]`);
  const map = {};
  fields.forEach((field) => {
    map[field.dataset.entryField] = field.value;
  });

  if (!map.weight || !map.sets || !map.reps) {
    showToast("Rellena kg, series y reps.");
    return;
  }

  entry.weight = coerceNumber(map.weight);
  entry.sets = coerceNumber(map.sets);
  entry.reps = coerceNumber(map.reps);
  entry.rpe = coerceNumber(map.rpe);
  entry.completed = true;

  const existingLog = findSessionLog(entry);
  const payload = {
    id: existingLog?.id || uid(),
    date: state.session.date,
    routineId: state.session.routineId,
    exercise: entry.exercise,
    weight: coerceNumber(map.weight),
    sets: coerceNumber(map.sets),
    reps: coerceNumber(map.reps),
    rpe: coerceNumber(map.rpe),
    rest: coerceNumber(entry.targetRest),
    tempo: "",
    notes: `Sesión activa · ${routineNameById(state.session.routineId)}`,
    sessionId: state.session.id,
    sessionEntryId: entry.id
  };

  entry.savedLogId = payload.id;

  if (existingLog) {
    state.workoutLogs = state.workoutLogs.map((log) => log.id === existingLog.id ? payload : log);
  } else {
    state.workoutLogs.unshift(payload);
  }

  if (state.preferences.autoStartRest) startRestTimer(Number(entry.targetRest || state.preferences.defaultRestSeconds || 90));
  persistAndRender(existingLog ? "Registro de la sesión actualizado." : "Serie guardada.");
}

function updateRestButtonLabel() {
  const button = qs("#startRestBtn");
  if (!button) return;
  button.textContent = `Iniciar ${Number(state.preferences.defaultRestSeconds || 90)} s`;
}

function updateNetworkBadge() {
  const badge = qs("#networkBadge");
  if (!badge) return;
  const online = navigator.onLine;
  badge.textContent = online ? "Online" : "Offline";
  badge.classList.toggle("offline", !online);
}

function renderPreferences() {
  const form = qs("#preferencesForm");
  form.defaultRestSeconds.value = state.preferences.defaultRestSeconds;
  form.autoStartRest.checked = Boolean(state.preferences.autoStartRest);
  form.keepScreenAwake.checked = Boolean(state.preferences.keepScreenAwake);
  form.unitSystem.value = state.preferences.unitSystem;
  updateRestButtonLabel();

  const status = qs("#pwaStatusBox");
  const checks = [];
  checks.push({ title: "HTTPS o localhost", subtitle: location.protocol === "https:" || location.hostname === "localhost" ? "Correcto" : "Necesario para instalar" });
  checks.push({ title: "Manifest", subtitle: "Incluido y apuntando a icons/icon-192.png e icon-512.png" });
  checks.push({ title: "Service worker", subtitle: location.protocol === "file:" ? "No se registra en file://" : "Se registra automáticamente" });
  checks.push({ title: "Conexión", subtitle: navigator.onLine ? "Hay conexión" : "Estás offline, la caché debería seguir funcionando" });
  checks.push({ title: "iPhone / Safari", subtitle: "Usa compartir → Añadir a pantalla de inicio" });

  status.innerHTML = checks.map((item) => `
    <div class="list-item">
      <p class="list-title">${escapeHtml(item.title)}</p>
      <p class="list-subtitle">${escapeHtml(item.subtitle)}</p>
    </div>
  `).join("");
}

function bindTabs() {
  qsa(".tab").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
}

function activateTab(id) {
  qsa(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === id));
  qsa(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === id));
}

function bindForms() {
  qs("#addExerciseRowBtn").addEventListener("click", () => addExerciseRow());
  qs("#cancelRoutineEditBtn").addEventListener("click", clearRoutineForm);
  qs("#cancelWorkoutEditBtn").addEventListener("click", clearWorkoutForm);
  qs("#cancelMeasurementEditBtn").addEventListener("click", clearMeasurementForm);

  qs("#routineForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const exercises = qsa("#exerciseRows .exercise-row").map((row) => {
      const values = {};
      row.querySelectorAll("[data-field]").forEach((input) => {
        values[input.dataset.field] = input.value.trim();
      });
      return values;
    }).filter((item) => item.name);

    if (!formData.get("name") || !exercises.length) {
      showToast("Añade un nombre y al menos un ejercicio.");
      return;
    }

    const payload = {
      id: ui.editingRoutineId || uid(),
      name: String(formData.get("name")).trim(),
      day: String(formData.get("day")).trim(),
      focus: String(formData.get("focus")).trim(),
      notes: String(formData.get("notes")).trim(),
      exercises: exercises.map((exercise) => ({
        id: uid(),
        name: exercise.name,
        sets: exercise.sets || "",
        reps: exercise.reps || "",
        rest: exercise.rest || ""
      }))
    };

    if (ui.editingRoutineId) {
      state.routines = state.routines.map((routine) => routine.id === ui.editingRoutineId ? payload : routine);
      clearRoutineForm();
      persistAndRender("Rutina actualizada.");
    } else {
      state.routines.unshift(payload);
      clearRoutineForm();
      persistAndRender("Rutina guardada.");
    }
  });

  qs("#workoutForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      id: ui.editingWorkoutId || uid(),
      date: String(form.get("date")),
      routineId: String(form.get("routineId")),
      exercise: String(form.get("exercise")).trim(),
      weight: coerceNumber(form.get("weight")),
      sets: coerceNumber(form.get("sets")),
      reps: coerceNumber(form.get("reps")),
      rpe: coerceNumber(form.get("rpe")),
      rest: coerceNumber(form.get("rest")),
      tempo: String(form.get("tempo")).trim(),
      notes: String(form.get("notes")).trim()
    };

    if (!payload.exercise || payload.weight === "" || payload.sets === "" || payload.reps === "") {
      showToast("Completa ejercicio, kg, series y reps.");
      return;
    }

    if (ui.editingWorkoutId) {
      state.workoutLogs = state.workoutLogs.map((entry) => entry.id === ui.editingWorkoutId ? payload : entry);
      clearWorkoutForm();
      persistAndRender("Registro actualizado.");
    } else {
      state.workoutLogs.unshift(payload);
      clearWorkoutForm();
      persistAndRender("Entrenamiento registrado.");
    }
  });

  qs("#measurementForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      id: ui.editingMeasurementId || uid(),
      date: String(form.get("date")),
      bodyWeight: coerceNumber(form.get("bodyWeight")),
      bodyFat: coerceNumber(form.get("bodyFat")),
      waist: coerceNumber(form.get("waist")),
      chest: coerceNumber(form.get("chest")),
      arm: coerceNumber(form.get("arm")),
      thigh: coerceNumber(form.get("thigh")),
      hips: coerceNumber(form.get("hips")),
      neck: coerceNumber(form.get("neck")),
      sleepHours: coerceNumber(form.get("sleepHours")),
      notes: String(form.get("notes")).trim()
    };

    if (ui.editingMeasurementId) {
      state.measurements = state.measurements.map((entry) => entry.id === ui.editingMeasurementId ? payload : entry);
      clearMeasurementForm();
      persistAndRender("Medición actualizada.");
    } else {
      state.measurements.unshift(payload);
      clearMeasurementForm();
      persistAndRender("Medición guardada.");
    }
  });

  qs("#goalForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.goals = {
      athleteName: String(form.get("athleteName")).trim(),
      weightGoal: coerceNumber(form.get("weightGoal")),
      waistGoal: coerceNumber(form.get("waistGoal")),
      bodyFatGoal: coerceNumber(form.get("bodyFatGoal")),
      benchGoal: coerceNumber(form.get("benchGoal")),
      squatGoal: coerceNumber(form.get("squatGoal")),
      deadliftGoal: coerceNumber(form.get("deadliftGoal")),
      focusGoal: String(form.get("focusGoal")).trim()
    };
    persistAndRender("Objetivos guardados.");
  });

  qs("#preferencesForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.preferences = {
      defaultRestSeconds: coerceNumber(form.get("defaultRestSeconds")) || 90,
      autoStartRest: form.get("autoStartRest") === "on",
      keepScreenAwake: form.get("keepScreenAwake") === "on",
      unitSystem: String(form.get("unitSystem") || "metric")
    };
    if (state.preferences.keepScreenAwake && state.session) await maybeRequestWakeLock();
    if (!state.preferences.keepScreenAwake) releaseWakeLock();
    persistAndRender("Preferencias guardadas.");
  });
}

function bindControls() {
  qs("#dashboardExerciseSelect").addEventListener("change", renderDashboard);
  qs("#dashboardMetricSelect").addEventListener("change", renderDashboard);
  qs("#logSearchInput").addEventListener("input", renderWorkoutLogs);
  qs("#logRoutineFilter").addEventListener("change", renderWorkoutLogs);
  qs("#logSortSelect")?.addEventListener("change", renderWorkoutLogs);

  qs("#loadDemoBtn").addEventListener("click", () => {
    state = migrateState(structuredCloneSafe(demoData));
    clearRoutineForm();
    clearWorkoutForm();
    clearMeasurementForm();
    persistAndRender("Datos de demo cargados.");
  });

  qs("#resetBtn").addEventListener("click", () => {
    const confirmed = window.confirm("Se borrarán todos los datos guardados en este dispositivo. ¿Quieres continuar?");
    if (!confirmed) return;
    state = getDefaultState();
    clearRoutineForm();
    clearWorkoutForm();
    clearMeasurementForm();
    stopRestTimer();
    persistAndRender("Datos reiniciados.");
  });

  qs("#exportBtn").addEventListener("click", exportBackup);
  qs("#exportCsvBtn")?.addEventListener("click", exportCsvBundle);
  qs("#importInput").addEventListener("change", importBackup);
  qs("#startSessionBtn").addEventListener("click", () => startSession(qs("#sessionRoutineSelect").value));
  qs("#endSessionBtn").addEventListener("click", () => endSession(true));
  qs("#startTodayBtn").addEventListener("click", () => {
    activateTab("session");
    if (state.session) return;
    if (!state.routines[0]) {
      showToast("Crea una rutina antes de iniciar el entreno.");
      return;
    }
    qs("#sessionRoutineSelect").value = state.routines[0].id;
    startSession(state.routines[0].id);
  });

  qs("#startRestBtn").addEventListener("click", () => startRestTimer(Number(state.preferences.defaultRestSeconds || 90)));
  qs("#stopRestBtn").addEventListener("click", stopRestTimer);

  qs("#iosInstallBtn").addEventListener("click", () => qs("#iosInstallDialog").showModal());
  qs("#closeIosDialogBtn").addEventListener("click", () => qs("#iosInstallDialog").close());
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

function toCsv(rows) {
  return rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
}

function exportCsvBundle() {
  const workoutRows = [["date", "routine", "exercise", "weight", "sets", "reps", "rpe", "rest", "tempo", "notes"]];
  state.workoutLogs.forEach((entry) => workoutRows.push([entry.date, routineNameById(entry.routineId), entry.exercise, entry.weight, entry.sets, entry.reps, entry.rpe, entry.rest, entry.tempo, entry.notes]));
  const measurementRows = [["date", "bodyWeight", "bodyFat", "waist", "chest", "arm", "thigh", "hips", "neck", "sleepHours", "notes"]];
  state.measurements.forEach((entry) => measurementRows.push([entry.date, entry.bodyWeight, entry.bodyFat, entry.waist, entry.chest, entry.arm, entry.thigh, entry.hips, entry.neck, entry.sleepHours, entry.notes]));
  downloadTextFile(`gymflow-workouts-${today()}.csv`, toCsv(workoutRows), "text/csv;charset=utf-8");
  setTimeout(() => downloadTextFile(`gymflow-measurements-${today()}.csv`, toCsv(measurementRows), "text/csv;charset=utf-8"), 150);
  showToast("CSV exportado.");
}

function exportBackup() {
downloadTextFile(`gymflow-pro-backup-${today()}.json`, JSON.stringify(state, null, 2), "application/json");
  showToast("Backup exportado.");
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      state = migrateState(parsed);
      clearRoutineForm();
      clearWorkoutForm();
      clearMeasurementForm();
      persistAndRender("Backup importado.");
    } catch {
      showToast("No se pudo importar el archivo.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function bindInstallPrompt() {
  const installBtn = qs("#installBtn");
  const iosBtn = qs("#iosInstallBtn");
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) iosBtn.hidden = false;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    ui.deferredInstallPrompt = event;
    installBtn.hidden = false;
  });

  installBtn.addEventListener("click", async () => {
    if (!ui.deferredInstallPrompt) return;
    ui.deferredInstallPrompt.prompt();
    await ui.deferredInstallPrompt.userChoice;
    ui.deferredInstallPrompt = null;
    installBtn.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    installBtn.hidden = true;
    showToast("App instalada.");
  });
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            qs("#updateBanner")?.removeAttribute("hidden");
          }
        });
      });
      qs("#refreshAppBtn")?.addEventListener("click", () => window.location.reload());
    } catch (error) {
      console.error("No se pudo registrar el service worker", error);
    }
  }
}

function startRestTimer(seconds) {
  stopRestTimer(false);
  ui.restTimerSeconds = seconds;
  updateRestTimerLabel();
  ui.restTimerHandle = window.setInterval(() => {
    ui.restTimerSeconds -= 1;
    updateRestTimerLabel();
    if (ui.restTimerSeconds <= 0) {
      stopRestTimer(false);
      showToast("Descanso terminado.");
      try { navigator.vibrate?.(180); } catch {}
    }
  }, 1000);
}

function stopRestTimer(showToastMessage = true) {
  if (ui.restTimerHandle) clearInterval(ui.restTimerHandle);
  ui.restTimerHandle = null;
  ui.restTimerSeconds = 0;
  updateRestTimerLabel();
  if (showToastMessage) showToast("Temporizador parado.");
}

function updateRestTimerLabel() {
  const mins = String(Math.floor(ui.restTimerSeconds / 60)).padStart(2, "0");
  const secs = String(ui.restTimerSeconds % 60).padStart(2, "0");
  qs("#restTimerLabel").textContent = `${mins}:${secs}`;
}

async function maybeRequestWakeLock() {
  if (!state.preferences.keepScreenAwake || !state.session || !("wakeLock" in navigator)) return;
  try {
    ui.wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    ui.wakeLock = null;
  }
}

function releaseWakeLock() {
  if (ui.wakeLock) {
    ui.wakeLock.release().catch(() => {});
    ui.wakeLock = null;
  }
}

function renderAll() {
  renderStats();
  renderDashboard();
  renderRoutines();
  renderWorkoutLogs();
  renderMeasurements();
  renderAnalytics();
  renderGoals();
  renderSession();
  renderPreferences();
}

function bindSystemEvents() {
  updateNetworkBadge();
  window.addEventListener("online", () => { updateNetworkBadge(); renderPreferences(); });
  window.addEventListener("offline", () => { updateNetworkBadge(); renderPreferences(); });
}

function init() {
  renderRoutineBuilderRows();
  bindTabs();
  bindForms();
  bindControls();
  bindInstallPrompt();
  bindSystemEvents();
  setTodayDefaults();
  renderAll();
  registerServiceWorker();
  updateRestTimerLabel();
  updateNetworkBadge();
  updateRestButtonLabel();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.session && state.preferences.keepScreenAwake) maybeRequestWakeLock();
  });
}

document.addEventListener("DOMContentLoaded", init);
