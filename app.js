const STORAGE_KEY = "gymflow-pwa-v1";
const CACHE_VERSION = "2026-04";
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const demoData = {
  routines: [
    {
      id: uid(),
      name: "Push A",
      day: "Lunes",
      focus: "Hipertrofia torso",
      notes: "Prioriza técnica y control excéntrico.",
      exercises: [
        { id: uid(), name: "Press banca", sets: 4, reps: "6-8", rest: 120 },
        { id: uid(), name: "Press inclinado mancuernas", sets: 3, reps: "8-10", rest: 90 },
        { id: uid(), name: "Elevaciones laterales", sets: 4, reps: "12-15", rest: 60 }
      ]
    },
    {
      id: uid(),
      name: "Pull A",
      day: "Miércoles",
      focus: "Espalda y bíceps",
      notes: "Busca progresión de kilos en remos y dominadas.",
      exercises: [
        { id: uid(), name: "Dominadas", sets: 4, reps: "6-10", rest: 120 },
        { id: uid(), name: "Remo con barra", sets: 4, reps: "6-8", rest: 120 },
        { id: uid(), name: "Curl bíceps barra", sets: 3, reps: "10-12", rest: 75 }
      ]
    },
    {
      id: uid(),
      name: "Legs A",
      day: "Viernes",
      focus: "Fuerza y base",
      notes: "Bloque principal de tren inferior.",
      exercises: [
        { id: uid(), name: "Sentadilla", sets: 4, reps: "5-6", rest: 150 },
        { id: uid(), name: "Peso muerto rumano", sets: 3, reps: "8-10", rest: 120 },
        { id: uid(), name: "Prensa", sets: 3, reps: "10-12", rest: 90 }
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
  }
};

function getDefaultState() {
  return {
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
    }
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return { ...getDefaultState(), ...parsed, goals: { ...getDefaultState().goals, ...(parsed.goals || {}) } };
  } catch {
    return getDefaultState();
  }
}

function saveState() {
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
  return Number(value).toLocaleString("es-ES", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function coerceNumber(value) {
  if (value === "" || value === null || value === undefined) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function showToast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2200);
}

function setTodayDefaults() {
  const dateInputs = ["#workoutForm [name=date]", "#measurementForm [name=date]"];
  dateInputs.forEach((sel) => {
    const el = qs(sel);
    if (el && !el.value) el.value = today();
  });
}

function getAllExerciseNames() {
  const names = new Set();
  state.routines.forEach((routine) => routine.exercises.forEach((ex) => ex.name && names.add(ex.name)));
  state.workoutLogs.forEach((log) => log.exercise && names.add(log.exercise));
  return [...names].sort((a, b) => a.localeCompare(b));
}

function getLatestMeasurement() {
  return [...state.measurements].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

function getSessionsThisMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return state.workoutLogs.filter((entry) => entry.date.startsWith(`${year}-${month}`)).length;
}

function getWorkoutDaysSorted() {
  return [...new Set(state.workoutLogs.map((entry) => entry.date))].sort();
}

function getCurrentStreak() {
  const days = getWorkoutDaysSorted();
  if (!days.length) return 0;
  let streak = 1;
  for (let i = days.length - 1; i > 0; i -= 1) {
    const curr = new Date(`${days[i]}T12:00:00`);
    const prev = new Date(`${days[i - 1]}T12:00:00`);
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) streak += 1;
    else break;
  }
  return streak;
}

function getPRs() {
  const map = new Map();
  state.workoutLogs.forEach((entry) => {
    const current = map.get(entry.exercise);
    if (!current || Number(entry.weight) > Number(current.weight)) {
      map.set(entry.exercise, entry);
    }
  });
  return [...map.values()].sort((a, b) => Number(b.weight) - Number(a.weight));
}

function getBestLift() {
  return getPRs()[0] || null;
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
    .map((entry) => ({
      label: formatDate(entry.date),
      value: Number(entry[metric]),
      raw: entry
    }));
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
  const ticks = 4;
  let guides = "";
  for (let i = 0; i <= ticks; i += 1) {
    const value = minValue + (range / ticks) * i;
    const yPos = y(value);
    guides += `
      <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#e6e8ef" stroke-dasharray="4 4" />
      <text x="${padding.left - 8}" y="${yPos + 4}" font-size="11" fill="#667085" text-anchor="end">${value.toFixed(1)}</text>
    `;
  }

  const labels = points.map((point, index) => {
    const px = x(index);
    return `<text x="${px}" y="${height - 14}" font-size="11" fill="#667085" text-anchor="middle">${point.label}</text>`;
  }).join("");

  const circles = points.map((point, index) => `
    <circle cx="${x(index)}" cy="${y(point.value)}" r="4.5" fill="#6d5efc" />
    <title>${point.label}: ${point.value}</title>
  `).join("");

  const delta = points.length > 1 ? (points.at(-1).value - points[0].value) : 0;
  const deltaLabel = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${options.suffix || ""}`;

  node.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.title || 'Gráfico'}">
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
  return state.routines.find((r) => r.id === id)?.name || "Sin rutina";
}

function renderStats() {
  qs("#statRoutines").textContent = state.routines.length;
  qs("#statSessionsMonth").textContent = getSessionsThisMonth();
  qs("#statStreak").textContent = getCurrentStreak();
  const latest = getLatestMeasurement();
  qs("#statWeight").textContent = latest?.bodyWeight ? `${formatNumber(latest.bodyWeight)} kg` : "—";
}

function renderExerciseSelects() {
  const names = getAllExerciseNames();
  const dashSelect = qs("#dashboardExerciseSelect");
  const routineSelect = qs("#workoutRoutineSelect");
  const datalist = qs("#exerciseSuggestions");

  dashSelect.innerHTML = names.length
    ? names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")
    : `<option value="">Sin ejercicios</option>`;

  const currentVal = dashSelect.value || names[0] || "";
  dashSelect.value = currentVal;

  routineSelect.innerHTML = `<option value="">Sin asociar</option>` + state.routines.map((routine) =>
    `<option value="${routine.id}">${escapeHtml(routine.name)}${routine.day ? ` · ${escapeHtml(routine.day)}` : ""}</option>`
  ).join("");

  datalist.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function renderDashboard() {
  renderExerciseSelects();
  const exerciseName = qs("#dashboardExerciseSelect").value;
  const metric = qs("#dashboardMetricSelect").value;

  buildLineChart("#exerciseChart", getExerciseSeries(exerciseName), { title: "Progresión ejercicio", suffix: " kg" });
  buildLineChart("#bodyChart", getBodySeries(metric), { title: "Evolución corporal", suffix: metric === "bodyFat" ? "%" : metric === "sleepHours" ? "h" : metric === "bodyWeight" ? " kg" : " cm" });

  const prList = qs("#prList");
  const prs = getPRs().slice(0, 8);
  prList.innerHTML = prs.length
    ? prs.map((entry) => `
      <div class="list-item">
        <div class="list-head">
          <div>
            <p class="list-title">${escapeHtml(entry.exercise)}</p>
            <p class="list-subtitle">${formatDate(entry.date)} · ${entry.sets}×${entry.reps}</p>
          </div>
          <strong>${formatNumber(entry.weight)} kg</strong>
        </div>
      </div>
    `).join("")
    : `<p class="empty">Todavía no hay récords porque no has registrado sesiones.</p>`;

  const recent = [...state.workoutLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  qs("#recentLogs").innerHTML = recent.length
    ? recent.map((entry) => `
      <div class="list-item">
        <div class="list-head">
          <div>
            <p class="list-title">${escapeHtml(entry.exercise)}</p>
            <p class="list-subtitle">${formatDate(entry.date)} · ${entry.sets}×${entry.reps} · RPE ${entry.rpe || "—"}</p>
          </div>
          <strong>${formatNumber(entry.weight)} kg</strong>
        </div>
      </div>
    `).join("")
    : `<p class="empty">Añade tu primer entrenamiento para empezar a ver actividad.</p>`;
}

function renderRoutineBuilderRows() {
  const rowsContainer = qs("#exerciseRows");
  if (!rowsContainer.children.length) addExerciseRow();
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

function renderRoutines() {
  const list = qs("#routineList");
  list.innerHTML = "";
  if (!state.routines.length) {
    list.innerHTML = `<p class="empty">No tienes rutinas todavía. Crea la primera en el formulario de la izquierda.</p>`;
    return;
  }

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
        <button class="ghost small" data-action="duplicate">Duplicar</button>
        <button class="ghost small" data-action="delete">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="duplicate"]').addEventListener("click", () => {
      const duplicated = structuredCloneSafe(routine);
      duplicated.id = uid();
      duplicated.name = `${routine.name} copia`;
      duplicated.exercises = duplicated.exercises.map((ex) => ({ ...ex, id: uid() }));
      state.routines.unshift(duplicated);
      persistAndRender("Rutina duplicada.");
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      state.routines = state.routines.filter((r) => r.id !== routine.id);
      persistAndRender("Rutina eliminada.");
    });
    list.appendChild(div);
  });
}

function renderWorkoutLogs() {
  const list = qs("#workoutList");
  const entries = [...state.workoutLogs].sort((a, b) => b.date.localeCompare(a.date));
  list.innerHTML = entries.length ? "" : `<p class="empty">Sin registros aún. Guarda tu primer entrenamiento.</p>`;

  entries.forEach((entry) => {
    const volume = Number(entry.weight) * Number(entry.sets) * Number(entry.reps);
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
        <span class="chip">RPE ${entry.rpe || "—"}</span>
        ${entry.rest ? `<span class="chip">Descanso ${entry.rest}s</span>` : ""}
        ${entry.tempo ? `<span class="chip">Tempo ${escapeHtml(entry.tempo)}</span>` : ""}
      </div>
      ${entry.notes ? `<p class="list-meta">${escapeHtml(entry.notes)}</p>` : ""}
      <div class="actions-row">
        <button class="ghost small" data-action="delete">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      state.workoutLogs = state.workoutLogs.filter((log) => log.id !== entry.id);
      persistAndRender("Registro eliminado.");
    });
    list.appendChild(div);
  });
}

function renderMeasurements() {
  const list = qs("#measurementList");
  const entries = [...state.measurements].sort((a, b) => b.date.localeCompare(a.date));
  list.innerHTML = entries.length ? "" : `<p class="empty">Sin mediciones todavía. Guarda una para arrancar el seguimiento.</p>`;

  entries.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "list-item";
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
        <button class="ghost small" data-action="delete">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      state.measurements = state.measurements.filter((m) => m.id !== entry.id);
      persistAndRender("Medición eliminada.");
    });
    list.appendChild(div);
  });
}

function renderAnalytics() {
  const volumeByExercise = new Map();
  state.workoutLogs.forEach((entry) => {
    const total = Number(entry.weight) * Number(entry.sets) * Number(entry.reps);
    volumeByExercise.set(entry.exercise, (volumeByExercise.get(entry.exercise) || 0) + total);
  });

  const volumeItems = [...volumeByExercise.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

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

  const latest = getLatestMeasurement();
  const previous = [...state.measurements].sort((a, b) => a.date.localeCompare(b.date)).at(-2);
  const benchPR = getPRs().find((entry) => entry.exercise.toLowerCase().includes("press banca"));
  const squatPR = getPRs().find((entry) => entry.exercise.toLowerCase().includes("sentadilla"));
  const deadliftPR = getPRs().find((entry) => entry.exercise.toLowerCase().includes("peso muerto"));

  const trendCards = [
    latest && previous && latest.bodyWeight !== "" && previous.bodyWeight !== "" ? {
      title: "Cambio de peso",
      subtitle: "Últimas dos mediciones",
      value: `${(latest.bodyWeight - previous.bodyWeight > 0 ? "+" : "")}${formatNumber(latest.bodyWeight - previous.bodyWeight)} kg`
    } : null,
    latest && previous && latest.waist !== "" && previous.waist !== "" ? {
      title: "Cambio de cintura",
      subtitle: "Últimas dos mediciones",
      value: `${(latest.waist - previous.waist > 0 ? "+" : "")}${formatNumber(latest.waist - previous.waist)} cm`
    } : null,
    benchPR ? { title: "Mejor press banca", subtitle: formatDate(benchPR.date), value: `${formatNumber(benchPR.weight)} kg` } : null,
    squatPR ? { title: "Mejor sentadilla", subtitle: formatDate(squatPR.date), value: `${formatNumber(squatPR.weight)} kg` } : null,
    deadliftPR ? { title: "Mejor peso muerto", subtitle: formatDate(deadliftPR.date), value: `${formatNumber(deadliftPR.weight)} kg` } : null,
    state.workoutLogs.length ? { title: "Entrenos totales", subtitle: "Registros acumulados", value: state.workoutLogs.length } : null
  ].filter(Boolean);

  qs("#trendSummary").innerHTML = trendCards.length
    ? trendCards.map((item) => `
      <div class="list-item">
        <div class="list-head">
          <div>
            <p class="list-title">${escapeHtml(item.title)}</p>
            <p class="list-subtitle">${escapeHtml(item.subtitle)}</p>
          </div>
          <strong>${escapeHtml(String(item.value))}</strong>
        </div>
      </div>
    `).join("")
    : `<p class="empty">Cuando haya más datos verás comparativas rápidas aquí.</p>`;
}

function renderGoals() {
  const form = qs("#goalForm");
  Object.entries(state.goals).forEach(([key, value]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) input.value = value ?? "";
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
    state.goals.focusGoal ? { title: "Meta principal", subtitle: state.goals.focusGoal, current: "", goal: "" } : null
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
  return {
    title,
    subtitle: nearer,
    current: `${formatNumber(current)} ${suffix}`,
    goal: `${formatNumber(goal)} ${suffix}`,
    badge: `${Math.round((Number(current) / Number(goal)) * 100)}%`
  };
}

function persistAndRender(message) {
  saveState();
  renderAll();
  if (message) showToast(message);
}

function renderAll() {
  renderStats();
  renderDashboard();
  renderRoutines();
  renderWorkoutLogs();
  renderMeasurements();
  renderAnalytics();
  renderGoals();
}

function bindTabs() {
  qsa(".tab").forEach((btn) => btn.addEventListener("click", () => {
    qsa(".tab").forEach((tab) => tab.classList.remove("active"));
    qsa(".tab-panel").forEach((panel) => panel.classList.remove("active"));
    btn.classList.add("active");
    qs(`#${btn.dataset.tab}`).classList.add("active");
  }));
}

function bindForms() {
  qs("#addExerciseRowBtn").addEventListener("click", () => addExerciseRow());

  qs("#routineForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const exercises = qsa("#exerciseRows .exercise-row").map((row) => {
      const values = {};
      row.querySelectorAll("[data-field]").forEach((input) => values[input.dataset.field] = input.value.trim());
      return values;
    }).filter((item) => item.name);

    if (!form.get("name") || !exercises.length) {
      showToast("Añade un nombre y al menos un ejercicio.");
      return;
    }

    state.routines.unshift({
      id: uid(),
      name: String(form.get("name")).trim(),
      day: String(form.get("day")).trim(),
      focus: String(form.get("focus")).trim(),
      notes: String(form.get("notes")).trim(),
      exercises: exercises.map((exercise) => ({
        id: uid(),
        name: exercise.name,
        sets: exercise.sets || "",
        reps: exercise.reps || "",
        rest: exercise.rest || ""
      }))
    });

    event.currentTarget.reset();
    qs("#exerciseRows").innerHTML = "";
    addExerciseRow();
    persistAndRender("Rutina guardada.");
  });

  qs("#workoutForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    state.workoutLogs.unshift({
      id: uid(),
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
    });

    event.currentTarget.reset();
    setTodayDefaults();
    persistAndRender("Entrenamiento registrado.");
  });

  qs("#measurementForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.measurements.unshift({
      id: uid(),
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
    });
    event.currentTarget.reset();
    setTodayDefaults();
    persistAndRender("Medición guardada.");
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
}

function bindControls() {
  qs("#dashboardExerciseSelect").addEventListener("change", renderDashboard);
  qs("#dashboardMetricSelect").addEventListener("change", renderDashboard);

  qs("#loadDemoBtn").addEventListener("click", () => {
    state = structuredCloneSafe(demoData);
    persistAndRender("Datos de demo cargados.");
  });

  qs("#resetBtn").addEventListener("click", () => {
    state = getDefaultState();
    persistAndRender("Datos reiniciados.");
  });

  qs("#exportBtn").addEventListener("click", exportBackup);
  qs("#importInput").addEventListener("change", importBackup);
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `gymflow-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(href);
  showToast("Backup exportado.");
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      state = { ...getDefaultState(), ...parsed, goals: { ...getDefaultState().goals, ...(parsed.goals || {}) } };
      persistAndRender("Backup importado.");
    } catch {
      showToast("No se pudo importar el archivo.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

let deferredInstallPrompt = null;
function bindInstallPrompt() {
  const btn = qs("#installBtn");
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    btn.hidden = false;
  });

  btn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    btn.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    btn.hidden = true;
    showToast("App instalada.");
  });
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (error) {
      console.error("No se pudo registrar el service worker", error);
    }
  }
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

function init() {
  renderRoutineBuilderRows();
  bindTabs();
  bindForms();
  bindControls();
  bindInstallPrompt();
  setTodayDefaults();
  renderAll();
  registerServiceWorker();
}

document.addEventListener("DOMContentLoaded", init);
