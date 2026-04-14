const DB_NAME = "gymflow-pro-v4-db";
const DB_VERSION = 1;
const DB_STORE = "app_state";
const DB_KEY = "state";
const LEGACY_STORAGE_KEYS = ["gymflow-pro-v4-data", "gymflow-pro-v3-data"];
const APP_VERSION = "v4";
const FALLBACK_REST_SECONDS = 90;

let db = null;
let state = null;
let saveTimeout = null;
let saveInFlight = Promise.resolve();
let deferredPrompt = null;
let restTimerInterval = null;
let restRemaining = 0;
let wakeLock = null;
let sessionDurationInterval = null;
let pwaRegistration = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  appShell: $("#appShell"),
  networkBadge: $("#networkBadge"),
  installBtn: $("#installBtn"),
  iosInstallBtn: $("#iosInstallBtn"),
  exportBtn: $("#exportBtn"),
  exportCsvBtn: $("#exportCsvBtn"),
  importInput: $("#importInput"),
  startTodayBtn: $("#startTodayBtn"),
  goToSessionBtn: $("#goToSessionBtn"),
  loadDemoBtn: $("#loadDemoBtn"),
  resetBtn: $("#resetBtn"),
  refreshAppBtn: $("#refreshAppBtn"),
  updateBanner: $("#updateBanner"),
  dashboardExerciseSelect: $("#dashboardExerciseSelect"),
  dashboardExerciseMetricSelect: $("#dashboardExerciseMetricSelect"),
  dashboardMetricSelect: $("#dashboardMetricSelect"),
  todayFocus: $("#todayFocus"),
  quickStartList: $("#quickStartList"),
  trendSummaryTop: $("#trendSummaryTop"),
  recentLogs: $("#recentLogs"),
  exerciseChart: $("#exerciseChart"),
  bodyChart: $("#bodyChart"),
  statSessionsMonth: $("#statSessionsMonth"),
  statStreak: $("#statStreak"),
  statWeight: $("#statWeight"),
  statBestLift: $("#statBestLift"),
  statBestLiftLabel: $("#statBestLiftLabel"),
  statBestE1rm: $("#statBestE1rm"),
  statBestE1rmLabel: $("#statBestE1rmLabel"),
  sessionRoutineSelect: $("#sessionRoutineSelect"),
  workoutRoutineSelect: $("#workoutRoutineSelect"),
  workoutForm: $("#workoutForm"),
  cancelWorkoutEditBtn: $("#cancelWorkoutEditBtn"),
  activeSessionCard: $("#activeSessionCard"),
  sessionStatusLabel: $("#sessionStatusLabel"),
  sessionDurationLabel: $("#sessionDurationLabel"),
  sessionVolumeLabel: $("#sessionVolumeLabel"),
  startSessionBtn: $("#startSessionBtn"),
  endSessionBtn: $("#endSessionBtn"),
  startRestBtn: $("#startRestBtn"),
  stopRestBtn: $("#stopRestBtn"),
  restTimerLabel: $("#restTimerLabel"),
  routineForm: $("#routineForm"),
  addExerciseRowBtn: $("#addExerciseRowBtn"),
  exerciseRows: $("#exerciseRows"),
  exerciseRowTemplate: $("#exerciseRowTemplate"),
  routineList: $("#routineList"),
  cancelRoutineEditBtn: $("#cancelRoutineEditBtn"),
  workoutList: $("#workoutList"),
  prList: $("#prList"),
  logSearchInput: $("#logSearchInput"),
  logRoutineFilter: $("#logRoutineFilter"),
  logSortSelect: $("#logSortSelect"),
  measurementForm: $("#measurementForm"),
  measurementList: $("#measurementList"),
  cancelMeasurementEditBtn: $("#cancelMeasurementEditBtn"),
  volumeSummary: $("#volumeSummary"),
  trendSummary: $("#trendSummary"),
  goalForm: $("#goalForm"),
  goalSummary: $("#goalSummary"),
  preferencesForm: $("#preferencesForm"),
  pwaStatusBox: $("#pwaStatusBox"),
  iosInstallDialog: $("#iosInstallDialog"),
  closeIosDialogBtn: $("#closeIosDialogBtn"),
  exerciseSuggestions: $("#exerciseSuggestions"),
  toastRegion: $("#toastRegion")
};

const defaultState = () => ({
  version: 4,
  workouts: [],
  measurements: [],
  routines: [],
  sessionHistory: [],
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
    suggestionIncrement: 2.5,
    autoStartRest: true,
    keepScreenAwake: false,
    showWarmupsInLogs: true
  },
  session: {
    active: false,
    sessionId: "",
    routineId: "",
    startedAt: "",
    endedAt: "",
    completedExerciseIds: [],
    currentExerciseId: "",
    notes: "",
    setEntries: []
  },
  ui: {
    activeTab: "dashboard",
    editingWorkoutId: "",
    editingRoutineId: "",
    editingMeasurementId: "",
    dashboardExercise: "",
    dashboardExerciseMetric: "weight",
    dashboardMetric: "bodyWeight",
    logSearch: "",
    logRoutine: "all",
    logSort: "date_desc"
  }
});

boot();

async function boot() {
  bindEvents();
  setupPwa();
  state = await loadState();
  ensureMinimumData();
  setDefaultDates();
  restoreTab();
  renderAll();
  updateNetworkStatus();
  startSessionDurationTicker();
}

function bindEvents() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
    tab.addEventListener("keydown", handleTabKeydown);
  });

  els.startTodayBtn.addEventListener("click", () => {
    setActiveTab("session");
    els.sessionRoutineSelect.focus();
  });

  els.goToSessionBtn.addEventListener("click", () => setActiveTab("session"));
  els.loadDemoBtn.addEventListener("click", loadDemoData);
  els.resetBtn.addEventListener("click", resetAllData);

  els.exportBtn.addEventListener("click", exportJson);
  els.exportCsvBtn.addEventListener("click", exportCsv);
  els.importInput.addEventListener("change", importJson);

  els.installBtn.addEventListener("click", installApp);
  els.iosInstallBtn.addEventListener("click", () => els.iosInstallDialog.showModal());
  els.closeIosDialogBtn.addEventListener("click", () => els.iosInstallDialog.close());
  els.refreshAppBtn.addEventListener("click", refreshApp);

  els.dashboardExerciseSelect.addEventListener("change", (event) => {
    state.ui.dashboardExercise = event.target.value;
    persistState({ render: true });
  });

  els.dashboardExerciseMetricSelect.addEventListener("change", (event) => {
    state.ui.dashboardExerciseMetric = event.target.value;
    persistState({ render: true });
  });

  els.dashboardMetricSelect.addEventListener("change", (event) => {
    state.ui.dashboardMetric = event.target.value;
    persistState({ render: true });
  });

  els.startSessionBtn.addEventListener("click", startSession);
  els.endSessionBtn.addEventListener("click", endSession);
  els.startRestBtn.addEventListener("click", () => startRestTimer(Number(state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS)));
  els.stopRestBtn.addEventListener("click", stopRestTimer);

  els.workoutForm.addEventListener("submit", saveWorkoutFromForm);
  els.cancelWorkoutEditBtn.addEventListener("click", cancelWorkoutEdit);

  els.routineForm.addEventListener("submit", saveRoutineFromForm);
  els.addExerciseRowBtn.addEventListener("click", () => addExerciseRow());
  els.cancelRoutineEditBtn.addEventListener("click", cancelRoutineEdit);

  els.logSearchInput.addEventListener("input", (event) => {
    state.ui.logSearch = event.target.value;
    persistState({ render: true, save: false });
  });

  els.logRoutineFilter.addEventListener("change", (event) => {
    state.ui.logRoutine = event.target.value;
    persistState({ render: true, save: false });
  });

  els.logSortSelect.addEventListener("change", (event) => {
    state.ui.logSort = event.target.value;
    persistState({ render: true, save: false });
  });

  els.measurementForm.addEventListener("submit", saveMeasurementFromForm);
  els.cancelMeasurementEditBtn.addEventListener("click", cancelMeasurementEdit);
  els.goalForm.addEventListener("submit", saveGoals);
  els.preferencesForm.addEventListener("submit", savePreferences);

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && state?.preferences.keepScreenAwake && state?.session.active) {
      await requestWakeLock();
    }
  });
}

async function loadState() {
  try {
    db = await openDb();
    const saved = await idbGet(DB_KEY);
    if (saved) return migrateState(saved);
  } catch (error) {
    console.error("No se pudo abrir IndexedDB", error);
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return migrateState(JSON.parse(raw));
    } catch (error) {
      console.warn("No se pudo leer almacenamiento legado", key, error);
    }
  }

  return defaultState();
}

function migrateState(rawState) {
  const base = mergeDeep(defaultState(), rawState || {});
  base.version = 4;
  base.sessionHistory = Array.isArray(base.sessionHistory) ? base.sessionHistory : [];
  base.workouts = Array.isArray(base.workouts) ? base.workouts : [];
  base.measurements = Array.isArray(base.measurements) ? base.measurements : [];
  base.routines = Array.isArray(base.routines) ? base.routines : [];

  base.workouts = base.workouts.map((item) => ({
    id: item.id || uid(),
    date: item.date || todayLocal(),
    routineId: item.routineId || "",
    sessionId: item.sessionId || "",
    exercise: String(item.exercise || "").trim(),
    weight: Number(item.weight || 0),
    sets: Number(item.sets || 1),
    reps: Number(item.reps || 0),
    rpe: item.rpe === "" || item.rpe == null ? "" : Number(item.rpe),
    rest: item.rest === "" || item.rest == null ? "" : Number(item.rest),
    tempo: String(item.tempo || "").trim(),
    notes: String(item.notes || "").trim(),
    isWarmup: Boolean(item.isWarmup),
    source: item.source || "manual",
    createdAt: item.createdAt || item.loggedAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || item.loggedAt || new Date().toISOString()
  }));

  base.measurements = base.measurements.map((item) => ({
    id: item.id || uid(),
    date: item.date || todayLocal(),
    bodyWeight: numOrBlank(item.bodyWeight),
    bodyFat: numOrBlank(item.bodyFat),
    waist: numOrBlank(item.waist),
    chest: numOrBlank(item.chest),
    arm: numOrBlank(item.arm),
    thigh: numOrBlank(item.thigh),
    hips: numOrBlank(item.hips),
    neck: numOrBlank(item.neck),
    sleepHours: numOrBlank(item.sleepHours),
    notes: String(item.notes || "").trim(),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
  }));

  base.routines = base.routines.map((routine) => ({
    id: routine.id || uid(),
    name: String(routine.name || "").trim(),
    day: String(routine.day || "").trim(),
    focus: String(routine.focus || "").trim(),
    notes: String(routine.notes || "").trim(),
    exercises: (routine.exercises || []).map((exercise) => ({
      id: exercise.id || uid(),
      name: String(exercise.name || "").trim(),
      sets: Number(exercise.sets || 0),
      reps: String(exercise.reps || "").trim(),
      rest: Number(exercise.rest || base.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS)
    }))
  }));

  base.session = {
    active: Boolean(base.session?.active),
    sessionId: base.session?.sessionId || uid(),
    routineId: base.session?.routineId || "",
    startedAt: base.session?.startedAt || "",
    endedAt: base.session?.endedAt || "",
    completedExerciseIds: Array.isArray(base.session?.completedExerciseIds) ? [...new Set(base.session.completedExerciseIds)] : [],
    currentExerciseId: base.session?.currentExerciseId || "",
    notes: String(base.session?.notes || ""),
    setEntries: Array.isArray(base.session?.setEntries) ? base.session.setEntries.map((entry) => ({
      id: entry.id || uid(),
      exerciseId: entry.exerciseId || "",
      exerciseName: entry.exerciseName || "",
      weight: Number(entry.weight || 0),
      reps: Number(entry.reps || 0),
      rpe: entry.rpe === "" || entry.rpe == null ? "" : Number(entry.rpe),
      rest: entry.rest === "" || entry.rest == null ? "" : Number(entry.rest),
      isWarmup: Boolean(entry.isWarmup),
      createdAt: entry.createdAt || new Date().toISOString()
    })) : []
  };

  base.ui.dashboardExerciseMetric = base.ui.dashboardExerciseMetric || "weight";
  base.ui.dashboardMetric = base.ui.dashboardMetric || "bodyWeight";
  base.ui.logRoutine = base.ui.logRoutine || "all";
  base.ui.logSort = base.ui.logSort || "date_desc";

  return base;
}

function mergeDeep(target, source) {
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

function ensureMinimumData() {
  if (!state.routines.length) {
    state.routines = starterRoutines();
    queueSave();
  }
}

function starterRoutines() {
  return [
    {
      id: uid(),
      name: "Torso",
      day: "Día A",
      focus: "Hipertrofia",
      notes: "Base inicial del bloque",
      exercises: [
        { id: uid(), name: "Press banca", sets: 4, reps: "6-8", rest: 120 },
        { id: uid(), name: "Remo con barra", sets: 4, reps: "8-10", rest: 90 },
        { id: uid(), name: "Press militar", sets: 3, reps: "8-10", rest: 90 }
      ]
    },
    {
      id: uid(),
      name: "Pierna",
      day: "Día B",
      focus: "Fuerza + hipertrofia",
      notes: "Prioridad en básicos",
      exercises: [
        { id: uid(), name: "Sentadilla", sets: 4, reps: "5-6", rest: 150 },
        { id: uid(), name: "Peso muerto rumano", sets: 3, reps: "8-10", rest: 120 },
        { id: uid(), name: "Prensa", sets: 3, reps: "10-12", rest: 90 }
      ]
    }
  ];
}

function setDefaultDates() {
  if (els.workoutForm.date) els.workoutForm.date.value = todayLocal();
  if (els.measurementForm.date) els.measurementForm.date.value = todayLocal();
}

function restoreTab() {
  setActiveTab(state.ui.activeTab || "dashboard", false);
}

function setActiveTab(tabId, save = true) {
  $$(".tab").forEach((tab) => {
    const active = tab.dataset.tab === tabId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  $$(".tab-panel").forEach((panel) => {
    const active = panel.id === tabId;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });

  state.ui.activeTab = tabId;
  if (save) persistState({ render: false });
}

function handleTabKeydown(event) {
  const tabs = $$(".tab");
  const currentIndex = tabs.indexOf(event.currentTarget);
  if (currentIndex < 0) return;

  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    const nextIndex = event.key === "ArrowRight"
      ? (currentIndex + 1) % tabs.length
      : (currentIndex - 1 + tabs.length) % tabs.length;
    tabs[nextIndex].focus();
    setActiveTab(tabs[nextIndex].dataset.tab);
  }
}

function renderAll() {
  populateRoutineSelects();
  populateExerciseSuggestions();
  renderStats();
  renderTodayFocus();
  renderQuickStart();
  renderRecentLogs();
  renderExerciseChart();
  renderBodyChart();
  renderSession();
  renderRoutines();
  renderWorkoutList();
  renderPrList();
  renderMeasurements();
  renderAnalytics();
  renderGoalSummary();
  renderGoalForm();
  renderPreferencesForm();
  renderPwaStatus();
}

function populateRoutineSelects() {
  const routineOptions = state.routines.map((routine) => `<option value="${escapeHtml(routine.id)}">${escapeHtml(routine.name)}</option>`).join("");
  els.sessionRoutineSelect.innerHTML = `<option value="">Selecciona rutina</option>${routineOptions}`;
  els.workoutRoutineSelect.innerHTML = `<option value="">Sin rutina</option>${routineOptions}`;
  els.logRoutineFilter.innerHTML = `<option value="all">Todas las rutinas</option>${routineOptions}`;

  els.sessionRoutineSelect.value = state.session.routineId || "";
  els.logRoutineFilter.value = state.ui.logRoutine || "all";
}

function populateExerciseSuggestions() {
  const names = [...new Set(
    state.workouts.map((item) => item.exercise)
      .concat(state.routines.flatMap((routine) => routine.exercises.map((exercise) => exercise.name)))
  )]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));

  els.exerciseSuggestions.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");

  if (!names.length) {
    els.dashboardExerciseSelect.innerHTML = `<option value="">Sin ejercicios</option>`;
    state.ui.dashboardExercise = "";
    return;
  }

  if (!state.ui.dashboardExercise || !names.includes(state.ui.dashboardExercise)) {
    state.ui.dashboardExercise = names[0];
  }

  els.dashboardExerciseSelect.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  els.dashboardExerciseSelect.value = state.ui.dashboardExercise;
  els.dashboardExerciseMetricSelect.value = state.ui.dashboardExerciseMetric || "weight";
  els.dashboardMetricSelect.value = state.ui.dashboardMetric || "bodyWeight";
}

function renderStats() {
  const workoutDates = getUniqueWorkoutDates();
  const measurements = [...state.measurements].sort(sortByDateDesc);
  const monthPrefix = todayLocal().slice(0, 7);
  const sessionsThisMonth = workoutDates.filter((date) => date.startsWith(monthPrefix)).length;
  const latestMeasurement = measurements[0];
  const bestLift = state.workouts.reduce((best, item) => !best || Number(item.weight) > Number(best.weight) ? item : best, null);
  const bestE1rm = state.workouts
    .filter((item) => !item.isWarmup)
    .reduce((best, item) => {
      const value = estimateE1RM(item.weight, item.reps);
      if (!best || value > best.value) return { value, item };
      return best;
    }, null);

  els.statSessionsMonth.textContent = sessionsThisMonth;
  els.statStreak.textContent = String(computeStreak(workoutDates));
  els.statWeight.textContent = latestMeasurement?.bodyWeight ? `${formatNumber(latestMeasurement.bodyWeight)} kg` : "—";
  els.statBestLift.textContent = bestLift ? `${formatNumber(bestLift.weight)} kg` : "—";
  els.statBestLiftLabel.textContent = bestLift ? bestLift.exercise : "Sin datos";
  els.statBestE1rm.textContent = bestE1rm ? `${formatNumber(bestE1rm.value)} kg` : "—";
  els.statBestE1rmLabel.textContent = bestE1rm ? bestE1rm.item.exercise : "Estimado";
}

function renderTodayFocus() {
  const cards = [];
  const suggestion = getSuggestedRoutine();
  const latestMeasurement = [...state.measurements].sort(sortByDateDesc)[0];
  const latestActivity = buildRecentActivityCards().slice(0, 1)[0];
  const stalledExercise = detectPotentialStall();

  if (state.session.active) {
    const routine = getActiveRoutine();
    const workingSets = state.session.setEntries.filter((item) => !item.isWarmup);
    cards.push(cardHtml({
      title: `Sigue con ${routine?.name || "tu sesión"}`,
      subtitle: `${workingSets.length} series efectivas guardadas · ${formatDuration(getSessionDurationSeconds())} de duración.`,
      chips: [
        { label: `${state.session.completedExerciseIds.length}/${routine?.exercises.length || 0} ejercicios completos`, type: "success" },
        { label: `Volumen ${formatNumber(calcVolumeFromEntries(state.session.setEntries))} kg`, type: "ghost" }
      ],
      extraClass: "highlight"
    }));
  } else if (suggestion.routine) {
    cards.push(cardHtml({
      title: `Te conviene hacer ${suggestion.routine.name}`,
      subtitle: suggestion.reason,
      chips: [
        { label: suggestion.routine.day || "Sin bloque", type: "ghost" },
        { label: suggestion.daysSince == null ? "Aún no la has usado" : `${suggestion.daysSince} días desde la última vez`, type: suggestion.daysSince != null && suggestion.daysSince >= 4 ? "warning" : "success" }
      ],
      extraClass: "highlight"
    }));
  }

  if (stalledExercise) {
    cards.push(cardHtml({
      title: `Vigila ${stalledExercise.exercise}`,
      subtitle: `La progresión reciente parece plana en las últimas ${stalledExercise.points} referencias.`,
      chips: [
        { label: `Último e1RM ${formatNumber(stalledExercise.latest)} kg`, type: "warning" },
        { label: "Prueba variar reps o descanso", type: "ghost" }
      ]
    }));
  }

  if (latestMeasurement) {
    cards.push(cardHtml({
      title: "Última medición corporal",
      subtitle: `${formatDate(latestMeasurement.date)} · Peso ${latestMeasurement.bodyWeight ? `${formatNumber(latestMeasurement.bodyWeight)} kg` : "—"} · Cintura ${latestMeasurement.waist ? `${formatNumber(latestMeasurement.waist)} cm` : "—"}`,
      chips: [
        { label: latestMeasurement.sleepHours ? `Sueño ${formatNumber(latestMeasurement.sleepHours)} h` : "Sueño sin dato", type: "ghost" }
      ]
    }));
  }

  if (latestActivity) {
    cards.push(latestActivity);
  }

  if (!cards.length) {
    els.todayFocus.innerHTML = emptyHtml("Todavía no hay datos. Carga la demo o crea tu primer registro.");
    return;
  }

  els.todayFocus.innerHTML = cards.join("");
}

function renderQuickStart() {
  if (!state.routines.length) {
    els.quickStartList.innerHTML = emptyHtml("Crea una rutina para ver accesos rápidos.");
    return;
  }

  const lastDateByRoutine = computeLastDateByRoutine();
  els.quickStartList.innerHTML = state.routines.slice(0, 4).map((routine) => `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${escapeHtml(routine.name)}</h3>
          <p class="list-subtitle">${escapeHtml(routine.focus || "Sin foco")} · ${routine.exercises.length} ejercicios</p>
        </div>
        <span class="chip ghost">${lastDateByRoutine[routine.id] ? `Último ${formatDate(lastDateByRoutine[routine.id])}` : "Aún sin usar"}</span>
      </div>
      <div class="actions-row">
        <button class="ghost small" data-action="start-routine" data-id="${routine.id}">Iniciar</button>
        <button class="ghost small" data-action="edit-routine" data-id="${routine.id}">Editar</button>
      </div>
    </article>
  `).join("");

  bindActionButtons();
}

function renderRecentLogs() {
  const cards = buildRecentActivityCards();
  els.recentLogs.innerHTML = cards.length ? cards.join("") : emptyHtml("Aún no hay actividad reciente.");
}

function buildRecentActivityCards() {
  const grouped = buildWorkoutGroups({ includeWarmups: false }).slice(0, 5);
  const items = grouped.map((group) => cardHtml({
    title: group.exercise,
    subtitle: `${formatDate(group.date)} · ${group.sourceLabel} · ${group.setCount} series · ${formatNumber(group.maxWeight)} kg top`,
    chips: [
      { label: `Volumen ${formatNumber(group.volume)} kg`, type: "ghost" },
      { label: `e1RM ${formatNumber(group.bestE1rm)} kg`, type: "warning" },
      ...(group.routineName ? [{ label: group.routineName, type: "ghost" }] : [])
    ]
  }));

  const sessions = [...state.sessionHistory]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 2)
    .map((item) => cardHtml({
      title: item.routineName || "Sesión finalizada",
      subtitle: `${formatDate(item.date)} · ${item.exercisesCompleted} ejercicios · ${item.totalSets} series`,
      chips: [
        { label: `Duración ${formatDuration(item.durationSeconds || 0)}`, type: "ghost" },
        { label: `Volumen ${formatNumber(item.volume)} kg`, type: "success" }
      ]
    }));

  return [...sessions, ...items].slice(0, 5);
}

function renderExerciseChart() {
  const exercise = state.ui.dashboardExercise;
  const metric = state.ui.dashboardExerciseMetric || "weight";
  const points = buildExerciseChartPoints(exercise, metric);
  const suffix = metric === "volume" ? "kg" : metric === "reps" ? "reps" : "kg";
  const metricLabel = {
    weight: "Carga máxima",
    e1rm: "e1RM",
    volume: "Volumen",
    reps: "Repeticiones"
  }[metric] || "Carga";

  els.exerciseChart.innerHTML = points.length >= 2
    ? buildLineChart(points, suffix, `${metricLabel} · ${exercise}`)
    : emptyHtml("Necesitas al menos 2 referencias del ejercicio para ver evolución.");
}

function buildExerciseChartPoints(exercise, metric) {
  if (!exercise) return [];
  const groups = groupBy(
    state.workouts.filter((item) => item.exercise === exercise && !item.isWarmup),
    (item) => item.date
  );

  return Object.entries(groups)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .slice(-12)
    .map(([date, logs]) => {
      let value = 0;
      if (metric === "weight") value = Math.max(...logs.map((item) => Number(item.weight || 0)));
      if (metric === "e1rm") value = Math.max(...logs.map((item) => estimateE1RM(item.weight, item.reps)));
      if (metric === "volume") value = logs.reduce((sum, item) => sum + calcVolume(item), 0);
      if (metric === "reps") value = Math.max(...logs.map((item) => Number(item.reps || 0)));
      return { label: shortLabel(date), value };
    })
    .filter((point) => Number.isFinite(point.value));
}

function renderBodyChart() {
  const metric = state.ui.dashboardMetric || "bodyWeight";
  const logs = state.measurements
    .filter((item) => item[metric] !== "" && item[metric] != null)
    .sort(sortByDateAsc)
    .slice(-12)
    .map((item) => ({ label: shortLabel(item.date), value: Number(item[metric]) }));

  const suffix = metric === "bodyFat" ? "%" : metric === "sleepHours" ? "h" : metric === "bodyWeight" ? "kg" : "cm";

  els.bodyChart.innerHTML = logs.length >= 2
    ? buildLineChart(logs, suffix, `Evolución de ${metric}`)
    : emptyHtml("Necesitas al menos 2 mediciones para esta métrica.");
}

function renderSession() {
  const routine = getActiveRoutine();
  const active = state.session.active && routine;
  const durationSeconds = getSessionDurationSeconds();

  els.sessionStatusLabel.textContent = active ? routine.name : "Sin sesión";
  els.sessionDurationLabel.textContent = formatDuration(durationSeconds);
  els.sessionVolumeLabel.textContent = `${formatNumber(calcVolumeFromEntries(state.session.setEntries))} kg`;

  if (!active) {
    els.activeSessionCard.innerHTML = `<p class="empty">Selecciona una rutina e inicia la sesión para ver tus ejercicios aquí.</p>`;
    return;
  }

  const completed = state.session.completedExerciseIds.length;
  const progress = routine.exercises.length ? Math.round((completed / routine.exercises.length) * 100) : 0;

  const header = `
    <div class="list-item highlight">
      <div class="list-head">
        <div>
          <h3 class="list-title">${escapeHtml(routine.name)}</h3>
          <p class="list-subtitle">${escapeHtml(routine.focus || "Sin foco")} · Empezó ${formatShortDateTime(state.session.startedAt)}</p>
        </div>
        <span class="chip success">${completed}/${routine.exercises.length} completados</span>
      </div>
      <div class="session-progress">
        <div class="progress-bar"><span style="width:${progress}%"></span></div>
        <strong>${progress}%</strong>
      </div>
    </div>
  `;

  const cards = routine.exercises.map((exercise, index) => {
    const previous = getExerciseReference(exercise.name);
    const entries = getSessionEntriesByExercise(exercise.id);
    const isCompleted = state.session.completedExerciseIds.includes(exercise.id) || entries.filter((item) => !item.isWarmup).length >= Number(exercise.sets || 0);
    const suggestion = nextLoadSuggestionForExercise(exercise.name);
    const workingEntries = entries.filter((item) => !item.isWarmup);
    const restDefault = exercise.rest || state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS;

    return `
      <article class="session-exercise ${isCompleted ? "completed" : ""}">
        <div class="session-exercise-top">
          <div>
            <h3 class="list-title">${index + 1}. ${escapeHtml(exercise.name)}</h3>
            <p class="list-subtitle">${exercise.sets || "—"} series objetivo · ${escapeHtml(String(exercise.reps || "—"))} reps · descanso ${restDefault}s</p>
          </div>
          <button class="ghost small" data-action="toggle-complete-exercise" data-id="${exercise.id}">
            ${isCompleted ? "Desmarcar" : "Completar"}
          </button>
        </div>

        <div class="chip-row">
          <span class="chip ghost">Último top set: ${previous ? `${formatNumber(previous.weight)} kg × ${previous.reps}` : "—"}</span>
          <span class="chip warning">Siguiente carga: ${suggestion ? `${formatNumber(suggestion)} kg` : "Empieza cómodo"}</span>
          <span class="chip ghost">e1RM top: ${previous ? `${formatNumber(estimateE1RM(previous.weight, previous.reps))} kg` : "—"}</span>
          <span class="chip ghost">Series guardadas: ${workingEntries.length}</span>
        </div>

        <div class="session-series-row">
          <input type="number" step="0.5" min="0" placeholder="Kg" id="session-weight-${exercise.id}" value="${previous?.weight ?? ""}" />
          <input type="number" step="1" min="1" placeholder="Reps" id="session-reps-${exercise.id}" value="${extractMainRep(exercise.reps)}" />
          <input type="number" step="0.5" min="1" max="10" placeholder="RPE" id="session-rpe-${exercise.id}" value="" />
          <input type="number" min="0" step="15" placeholder="Descanso" id="session-rest-${exercise.id}" value="${restDefault}" />
          <label class="switch-row">
            <input type="checkbox" id="session-warmup-${exercise.id}" />
            <span>Warm-up</span>
          </label>
          <button data-action="add-session-set" data-id="${exercise.id}">Guardar serie</button>
        </div>

        ${entries.length ? buildSessionTable(entries) : `<p class="helper-line">Todavía no has guardado series para este ejercicio en esta sesión.</p>`}
      </article>
    `;
  }).join("");

  els.activeSessionCard.innerHTML = header + cards;
  bindActionButtons();
}

function buildSessionTable(entries) {
  return `
    <div class="session-table-wrap">
      <table class="session-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tipo</th>
            <th>Peso</th>
            <th>Reps</th>
            <th>RPE</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map((entry, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${entry.isWarmup ? "Warm-up" : "Efectiva"}</td>
              <td>${formatNumber(entry.weight)} kg</td>
              <td>${entry.reps}</td>
              <td>${entry.rpe === "" ? "—" : entry.rpe}</td>
              <td><button class="ghost small" data-action="delete-session-set" data-id="${entry.id}">Quitar</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRoutines() {
  if (!state.routines.length) {
    els.routineList.innerHTML = emptyHtml("No hay rutinas todavía.");
    return;
  }

  const lastDateByRoutine = computeLastDateByRoutine();
  els.routineList.innerHTML = state.routines.map((routine) => `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${escapeHtml(routine.name)}</h3>
          <p class="list-subtitle">${escapeHtml(routine.day || "Sin bloque")} · ${escapeHtml(routine.focus || "Sin foco")}</p>
        </div>
        <span class="chip ghost">${lastDateByRoutine[routine.id] ? `Último ${formatDate(lastDateByRoutine[routine.id])}` : "Aún sin usar"}</span>
      </div>
      <div class="chip-row">
        ${routine.exercises.slice(0, 6).map((exercise) => `<span class="chip ghost">${escapeHtml(exercise.name)}</span>`).join("")}
      </div>
      <div class="actions-row">
        <button class="ghost small" data-action="start-routine" data-id="${routine.id}">Iniciar sesión</button>
        <button class="ghost small" data-action="duplicate-routine" data-id="${routine.id}">Duplicar</button>
        <button class="ghost small" data-action="edit-routine" data-id="${routine.id}">Editar</button>
        <button class="ghost small" data-action="delete-routine" data-id="${routine.id}">Borrar</button>
      </div>
    </article>
  `).join("");

  bindActionButtons();
}

function renderWorkoutList() {
  const query = (state.ui.logSearch || "").trim().toLowerCase();
  const groups = buildWorkoutGroups({ includeWarmups: state.preferences.showWarmupsInLogs })
    .filter((group) => {
      const matchExercise = !query || group.exercise.toLowerCase().includes(query);
      const matchRoutine = state.ui.logRoutine === "all" || group.routineId === state.ui.logRoutine;
      return matchExercise && matchRoutine;
    })
    .sort(getWorkoutGroupSorter(state.ui.logSort));

  if (!groups.length) {
    els.workoutList.innerHTML = emptyHtml("No hay registros con esos filtros.");
    return;
  }

  els.workoutList.innerHTML = groups.map((group) => `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${escapeHtml(group.exercise)}</h3>
          <p class="list-subtitle">${formatDate(group.date)}${group.routineName ? ` · ${escapeHtml(group.routineName)}` : ""} · ${group.sourceLabel}</p>
        </div>
        <span class="chip ghost">${formatNumber(group.maxWeight)} kg top</span>
      </div>
      <div class="chip-row">
        <span class="chip ghost">${group.setCount} series</span>
        <span class="chip ghost">${group.repsLabel}</span>
        <span class="chip warning">e1RM ${formatNumber(group.bestE1rm)} kg</span>
        <span class="chip ghost">Volumen ${formatNumber(group.volume)} kg</span>
        ${group.containsWarmup ? `<span class="chip ghost">Incluye warm-up</span>` : ""}
      </div>
      <div class="actions-row">
        ${group.isEditable ? `<button class="ghost small" data-action="edit-workout" data-id="${group.primaryId}">Editar</button>` : ""}
        <button class="ghost small" data-action="delete-workout-group" data-id="${group.groupId}">Borrar bloque</button>
      </div>
    </article>
  `).join("");

  bindActionButtons();
}

function buildWorkoutGroups({ includeWarmups = true } = {}) {
  const routineMap = Object.fromEntries(state.routines.map((routine) => [routine.id, routine]));
  const filtered = state.workouts.filter((item) => includeWarmups || !item.isWarmup);

  const groups = new Map();

  filtered.forEach((item) => {
    const groupKey = item.sessionId
      ? `session|${item.sessionId}|${item.exercise}`
      : `manual|${item.id}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupId: groupKey,
        primaryId: item.id,
        exercise: item.exercise,
        date: item.date,
        routineId: item.routineId || "",
        routineName: routineMap[item.routineId]?.name || "",
        source: item.source || "manual",
        sourceLabel: item.sessionId ? "Desde sesión" : "Registro manual",
        setCount: 0,
        repsList: [],
        maxWeight: 0,
        volume: 0,
        bestE1rm: 0,
        entries: [],
        containsWarmup: false,
        isEditable: !item.sessionId
      });
    }

    const group = groups.get(groupKey);
    group.entries.push(item);
    group.setCount += Number(item.sets || 1);
    group.repsList.push(Number(item.reps || 0));
    group.maxWeight = Math.max(group.maxWeight, Number(item.weight || 0));
    group.volume += calcVolume(item);
    group.bestE1rm = Math.max(group.bestE1rm, estimateE1RM(item.weight, item.reps));
    group.containsWarmup = group.containsWarmup || item.isWarmup;
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      repsLabel: buildRepsLabel(group.repsList)
    }))
    .sort(sortWorkoutGroupsByDateDesc);
}

function renderPrList() {
  const grouped = groupBy(state.workouts.filter((item) => !item.isWarmup), (item) => item.exercise);
  const exercises = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "es"));

  if (!exercises.length) {
    els.prList.innerHTML = emptyHtml("Sin datos todavía.");
    return;
  }

  els.prList.innerHTML = exercises.map((exercise) => {
    const logs = grouped[exercise];
    const bestWeight = logs.reduce((best, item) => Number(item.weight) > Number(best.weight) ? item : best, logs[0]);
    const bestE1rm = logs.reduce((best, item) => estimateE1RM(item.weight, item.reps) > estimateE1RM(best.weight, best.reps) ? item : best, logs[0]);
    const bestVolume = logs.reduce((best, item) => calcVolume(item) > calcVolume(best) ? item : best, logs[0]);

    return cardHtml({
      title: exercise,
      subtitle: `Carga ${formatNumber(bestWeight.weight)} kg · e1RM ${formatNumber(estimateE1RM(bestE1rm.weight, bestE1rm.reps))} kg`,
      chips: [
        { label: `Top volumen ${formatNumber(calcVolume(bestVolume))} kg`, type: "ghost" },
        { label: `Último ${formatDate(logs.sort(sortByDateDesc)[0].date)}`, type: "ghost" }
      ]
    });
  }).join("");
}

function renderMeasurements() {
  const measurements = [...state.measurements].sort(sortByDateDesc);

  els.measurementList.innerHTML = measurements.length ? measurements.map((item) => `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${formatDate(item.date)}</h3>
          <p class="list-subtitle">Peso ${item.bodyWeight ? `${formatNumber(item.bodyWeight)} kg` : "—"} · Grasa ${item.bodyFat ? `${formatNumber(item.bodyFat)} %` : "—"}</p>
        </div>
      </div>
      <div class="chip-row">
        <span class="chip ghost">Cintura ${item.waist ? `${formatNumber(item.waist)} cm` : "—"}</span>
        <span class="chip ghost">Pecho ${item.chest ? `${formatNumber(item.chest)} cm` : "—"}</span>
        <span class="chip ghost">Brazo ${item.arm ? `${formatNumber(item.arm)} cm` : "—"}</span>
        <span class="chip ghost">Pierna ${item.thigh ? `${formatNumber(item.thigh)} cm` : "—"}</span>
        <span class="chip ghost">Sueño ${item.sleepHours ? `${formatNumber(item.sleepHours)} h` : "—"}</span>
      </div>
      <div class="actions-row">
        <button class="ghost small" data-action="edit-measurement" data-id="${item.id}">Editar</button>
        <button class="ghost small" data-action="delete-measurement" data-id="${item.id}">Borrar</button>
      </div>
    </article>
  `).join("") : emptyHtml("Todavía no hay mediciones.");

  bindActionButtons();
}

function renderAnalytics() {
  const grouped = groupBy(state.workouts.filter((item) => !item.isWarmup), (item) => item.exercise);

  const volumeCards = Object.entries(grouped)
    .map(([exercise, logs]) => {
      const totalVolume = logs.reduce((sum, item) => sum + calcVolume(item), 0);
      const averageWeight = logs.reduce((sum, item) => sum + Number(item.weight || 0), 0) / Math.max(logs.length, 1);
      const last30Volume = logs.filter((item) => daysBetween(item.date, todayLocal()) <= 29).reduce((sum, item) => sum + calcVolume(item), 0);
      return { exercise, totalVolume, averageWeight, last30Volume, sessions: logs.length };
    })
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 8)
    .map((item) => cardHtml({
      title: item.exercise,
      subtitle: `Volumen total ${formatNumber(item.totalVolume)} kg · peso medio ${formatNumber(item.averageWeight)} kg`,
      chips: [
        { label: `Últimos 30 días ${formatNumber(item.last30Volume)} kg`, type: "ghost" },
        { label: `${item.sessions} registros`, type: "ghost" }
      ]
    }));

  els.volumeSummary.innerHTML = volumeCards.length ? volumeCards.join("") : emptyHtml("Sin datos de volumen todavía.");

  const trendItems = buildTrendItems();
  els.trendSummary.innerHTML = trendItems.map((item) => cardHtml(item)).join("");
  els.trendSummaryTop.innerHTML = trendItems.slice(0, 3).map((item) => cardHtml(item)).join("");
}

function buildTrendItems() {
  const workoutDates = getUniqueWorkoutDates();
  const last7 = workoutDates.filter((date) => daysBetween(date, todayLocal()) <= 6).length;
  const last30 = workoutDates.filter((date) => daysBetween(date, todayLocal()) <= 29).length;
  const weeklyVolume = state.workouts
    .filter((item) => !item.isWarmup && daysBetween(item.date, todayLocal()) <= 6)
    .reduce((sum, item) => sum + calcVolume(item), 0);
  const previousWeeklyVolume = state.workouts
    .filter((item) => !item.isWarmup && daysBetween(item.date, todayLocal()) > 6 && daysBetween(item.date, todayLocal()) <= 13)
    .reduce((sum, item) => sum + calcVolume(item), 0);
  const volumeDelta = weeklyVolume - previousWeeklyVolume;

  const latestMeasurement = [...state.measurements].sort(sortByDateDesc)[0];
  const firstMeasurement = [...state.measurements].sort(sortByDateAsc)[0];
  const weightDelta = latestMeasurement?.bodyWeight !== "" && firstMeasurement?.bodyWeight !== ""
    ? Number(latestMeasurement?.bodyWeight || 0) - Number(firstMeasurement?.bodyWeight || 0)
    : null;

  const mostFrequentExercise = Object.entries(groupBy(state.workouts.filter((item) => !item.isWarmup), (item) => item.exercise))
    .sort((a, b) => b[1].length - a[1].length)[0];

  return [
    {
      title: "Frecuencia reciente",
      subtitle: `${last7} días entrenados en los últimos 7 días · ${last30} en 30 días.`,
      chips: [{ label: last7 >= 3 ? "Buen ritmo" : "Se puede apretar", type: last7 >= 3 ? "success" : "warning" }]
    },
    {
      title: "Volumen semanal",
      subtitle: `Llevas ${formatNumber(weeklyVolume)} kg en 7 días. Diferencia vs semana previa: ${volumeDelta >= 0 ? "+" : ""}${formatNumber(volumeDelta)} kg.`,
      chips: [{ label: volumeDelta >= 0 ? "Subiendo carga total" : "Semana más ligera", type: volumeDelta >= 0 ? "success" : "ghost" }]
    },
    {
      title: "Racha actual",
      subtitle: `Tu racha real es de ${computeStreak(workoutDates)} días con continuidad activa.`,
      chips: [{ label: workoutDates[0] ? `Último entreno ${formatDate(workoutDates[0])}` : "Sin entrenos", type: "ghost" }]
    },
    {
      title: "Peso corporal",
      subtitle: weightDelta == null ? "Aún no hay suficiente histórico para medir tendencia." : `Cambio acumulado ${weightDelta >= 0 ? "+" : ""}${formatNumber(weightDelta)} kg desde tu primera medición.`,
      chips: [{ label: latestMeasurement?.bodyWeight ? `Actual ${formatNumber(latestMeasurement.bodyWeight)} kg` : "Sin peso actual", type: "ghost" }]
    },
    {
      title: "Ejercicio más trabajado",
      subtitle: mostFrequentExercise ? `${mostFrequentExercise[0]} con ${mostFrequentExercise[1].length} registros.` : "Sin suficiente histórico.",
      chips: [{ label: "Útil para revisar estancamiento", type: "ghost" }]
    }
  ];
}

function renderGoalSummary() {
  const goals = state.goals;
  const latestMeasurement = [...state.measurements].sort(sortByDateDesc)[0];
  const oldestMeasurement = [...state.measurements].sort(sortByDateAsc)[0];
  const bestMap = computeBestLiftMap();
  const firstLiftMap = computeFirstLiftMap();

  const cards = [];

  if (goals.focusGoal) {
    cards.push(cardHtml({
      title: "Meta principal del bloque",
      subtitle: goals.focusGoal,
      chips: [{ label: goals.athleteName || "Atleta", type: "ghost" }]
    }));
  }

  if (goals.weightGoal) {
    cards.push(goalCard({
      label: "Peso",
      currentValue: latestMeasurement?.bodyWeight,
      targetValue: goals.weightGoal,
      baselineValue: oldestMeasurement?.bodyWeight,
      suffix: "kg"
    }));
  }

  if (goals.waistGoal) {
    cards.push(goalCard({
      label: "Cintura",
      currentValue: latestMeasurement?.waist,
      targetValue: goals.waistGoal,
      baselineValue: oldestMeasurement?.waist,
      suffix: "cm"
    }));
  }

  if (goals.bodyFatGoal) {
    cards.push(goalCard({
      label: "Grasa corporal",
      currentValue: latestMeasurement?.bodyFat,
      targetValue: goals.bodyFatGoal,
      baselineValue: oldestMeasurement?.bodyFat,
      suffix: "%"
    }));
  }

  if (goals.benchGoal) {
    cards.push(goalCard({
      label: "Press banca",
      currentValue: bestMap["Press banca"],
      targetValue: goals.benchGoal,
      baselineValue: firstLiftMap["Press banca"],
      suffix: "kg"
    }));
  }

  if (goals.squatGoal) {
    cards.push(goalCard({
      label: "Sentadilla",
      currentValue: bestMap["Sentadilla"],
      targetValue: goals.squatGoal,
      baselineValue: firstLiftMap["Sentadilla"],
      suffix: "kg"
    }));
  }

  if (goals.deadliftGoal) {
    cards.push(goalCard({
      label: "Peso muerto",
      currentValue: bestMap["Peso muerto"] || bestMap["Peso muerto rumano"],
      targetValue: goals.deadliftGoal,
      baselineValue: firstLiftMap["Peso muerto"] || firstLiftMap["Peso muerto rumano"],
      suffix: "kg"
    }));
  }

  els.goalSummary.innerHTML = cards.length ? cards.join("") : emptyHtml("Todavía no has definido objetivos.");
}

function goalCard({ label, currentValue, targetValue, baselineValue, suffix }) {
  const current = currentValue === "" || currentValue == null ? null : Number(currentValue);
  const target = Number(targetValue);
  const baseline = baselineValue === "" || baselineValue == null ? null : Number(baselineValue);

  const delta = current == null ? null : target - current;
  const progress = computeGoalProgress({ baseline, current, target });

  return `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${escapeHtml(label)}</h3>
          <p class="list-subtitle">${current == null ? `Objetivo ${formatNumber(target)} ${suffix}. Aún no hay valor actual.` : `Actual ${formatNumber(current)} ${suffix} · Objetivo ${formatNumber(target)} ${suffix}`}</p>
        </div>
        <span class="chip ${progress >= 100 ? "success" : progress >= 70 ? "warning" : "ghost"}">${formatNumber(progress)}%</span>
      </div>
      <div class="goal-progress">
        <div class="goal-progress-bar"><span style="width:${Math.min(progress, 100)}%"></span></div>
        <div class="goal-progress-meta">
          <span>${baseline == null ? "Sin referencia inicial" : `Inicio ${formatNumber(baseline)} ${suffix}`}</span>
          <span>${delta == null ? "Sin valor actual" : `${delta > 0 ? "Te faltan" : "Ya superado por"} ${formatNumber(Math.abs(delta))} ${suffix}`}</span>
        </div>
      </div>
    </article>
  `;
}

function renderGoalForm() {
  Object.entries(state.goals).forEach(([key, value]) => {
    if (els.goalForm[key]) els.goalForm[key].value = value ?? "";
  });
}

function renderPreferencesForm() {
  Object.entries(state.preferences).forEach(([key, value]) => {
    if (!els.preferencesForm[key]) return;
    if (typeof value === "boolean") els.preferencesForm[key].checked = value;
    else els.preferencesForm[key].value = value;
  });
}

async function renderPwaStatus() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = isStandaloneMode();
  const swSupported = "serviceWorker" in navigator;
  const registration = swSupported ? (pwaRegistration || await navigator.serviceWorker.getRegistration()) : null;
  const controlled = Boolean(navigator.serviceWorker?.controller);
  const updateReady = Boolean(registration?.waiting);
  const manifestPresent = Boolean(document.querySelector('link[rel="manifest"]'));

  const items = [
    {
      title: "Manifest",
      subtitle: manifestPresent ? "Enlazado en el documento y listo para instalación." : "No se ha encontrado el manifest.",
      chips: [{ label: manifestPresent ? "OK" : "Falta", type: manifestPresent ? "success" : "danger" }]
    },
    {
      title: "Service worker",
      subtitle: !swSupported
        ? "Este navegador no soporta service worker."
        : registration
          ? controlled ? "Registrado y controlando la página." : "Registrado, pero aún no controla esta pestaña."
          : "Aún no hay registro activo.",
      chips: [{ label: !swSupported ? "No soportado" : registration ? (controlled ? "Activo" : "Registrado") : "Pendiente", type: !swSupported ? "warning" : registration ? (controlled ? "success" : "warning") : "danger" }]
    },
    {
      title: "Estado de instalación",
      subtitle: standalone
        ? "La app ya está ejecutándose como instalada."
        : ios
          ? "En iPhone debes usar Compartir > Añadir a pantalla de inicio."
          : deferredPrompt
            ? "El navegador ya permite lanzar la instalación desde el botón."
            : "Publica la app y abre desde navegador compatible para ver la instalación.",
      chips: [{ label: standalone ? "Instalada" : deferredPrompt ? "Lista para instalar" : "Pendiente", type: standalone ? "success" : deferredPrompt ? "warning" : "ghost" }]
    },
    {
      title: "Actualización disponible",
      subtitle: updateReady ? "Hay una versión nueva esperando activación." : "No se detectan actualizaciones pendientes.",
      chips: [{ label: updateReady ? "Actualizar" : "Al día", type: updateReady ? "warning" : "success" }]
    }
  ];

  els.pwaStatusBox.innerHTML = items.map((item) => cardHtml(item)).join("");
}

function saveWorkoutFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.workoutForm);
  const editingId = state.ui.editingWorkoutId;
  const previous = editingId ? state.workouts.find((item) => item.id === editingId) : null;

  const record = {
    id: editingId || uid(),
    date: form.get("date") || todayLocal(),
    routineId: form.get("routineId") || "",
    sessionId: "",
    exercise: String(form.get("exercise") || "").trim(),
    weight: Number(form.get("weight") || 0),
    sets: Number(form.get("sets") || 0),
    reps: Number(form.get("reps") || 0),
    rpe: form.get("rpe") ? Number(form.get("rpe")) : "",
    rest: form.get("rest") ? Number(form.get("rest")) : "",
    tempo: String(form.get("tempo") || "").trim(),
    notes: String(form.get("notes") || "").trim(),
    isWarmup: false,
    source: "manual",
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!record.exercise || !record.weight || !record.sets || !record.reps) {
    toast("Completa ejercicio, peso, series y reps.");
    return;
  }

  const index = state.workouts.findIndex((item) => item.id === record.id);
  if (index >= 0) state.workouts[index] = record;
  else state.workouts.push(record);

  els.workoutForm.reset();
  setDefaultDates();
  cancelWorkoutEdit();
  persistState({ render: true });
  toast(index >= 0 ? "Registro actualizado." : "Registro guardado.");
}

function saveRoutineFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.routineForm);
  const exercises = [...els.exerciseRows.querySelectorAll(".exercise-row")]
    .map((row) => ({
      id: row.dataset.id || uid(),
      name: row.querySelector('[data-field="name"]').value.trim(),
      sets: Number(row.querySelector('[data-field="sets"]').value || 0),
      reps: row.querySelector('[data-field="reps"]').value.trim(),
      rest: Number(row.querySelector('[data-field="rest"]').value || state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS)
    }))
    .filter((item) => item.name);

  if (!form.get("name") || !exercises.length) {
    toast("Pon nombre a la rutina y al menos un ejercicio.");
    return;
  }

  const routine = {
    id: state.ui.editingRoutineId || uid(),
    name: String(form.get("name") || "").trim(),
    day: String(form.get("day") || "").trim(),
    focus: String(form.get("focus") || "").trim(),
    notes: String(form.get("notes") || "").trim(),
    exercises
  };

  const index = state.routines.findIndex((item) => item.id === routine.id);
  if (index >= 0) state.routines[index] = routine;
  else state.routines.push(routine);

  els.routineForm.reset();
  els.exerciseRows.innerHTML = "";
  addExerciseRow();
  cancelRoutineEdit();
  persistState({ render: true });
  toast(index >= 0 ? "Rutina actualizada." : "Rutina guardada.");
}

function saveMeasurementFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.measurementForm);
  const editingId = state.ui.editingMeasurementId;
  const previous = editingId ? state.measurements.find((item) => item.id === editingId) : null;

  const record = {
    id: editingId || uid(),
    date: form.get("date") || todayLocal(),
    bodyWeight: numOrBlank(form.get("bodyWeight")),
    bodyFat: numOrBlank(form.get("bodyFat")),
    waist: numOrBlank(form.get("waist")),
    chest: numOrBlank(form.get("chest")),
    arm: numOrBlank(form.get("arm")),
    thigh: numOrBlank(form.get("thigh")),
    hips: numOrBlank(form.get("hips")),
    neck: numOrBlank(form.get("neck")),
    sleepHours: numOrBlank(form.get("sleepHours")),
    notes: String(form.get("notes") || "").trim(),
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const hasMetric = Object.entries(record).some(([key, value]) => !["id", "date", "notes", "createdAt", "updatedAt"].includes(key) && value !== "");
  if (!hasMetric) {
    toast("Añade al menos una métrica corporal.");
    return;
  }

  const index = state.measurements.findIndex((item) => item.id === record.id);
  if (index >= 0) state.measurements[index] = record;
  else state.measurements.push(record);

  els.measurementForm.reset();
  setDefaultDates();
  cancelMeasurementEdit();
  persistState({ render: true });
  toast(index >= 0 ? "Medición actualizada." : "Medición guardada.");
}

function saveGoals(event) {
  event.preventDefault();
  const form = new FormData(els.goalForm);
  Object.keys(state.goals).forEach((key) => {
    state.goals[key] = form.get(key) || "";
  });
  persistState({ render: true });
  toast("Objetivos guardados.");
}

function savePreferences(event) {
  event.preventDefault();
  state.preferences.defaultRestSeconds = Number(els.preferencesForm.defaultRestSeconds.value || FALLBACK_REST_SECONDS);
  state.preferences.suggestionIncrement = Number(els.preferencesForm.suggestionIncrement.value || 2.5);
  state.preferences.autoStartRest = els.preferencesForm.autoStartRest.checked;
  state.preferences.keepScreenAwake = els.preferencesForm.keepScreenAwake.checked;
  state.preferences.showWarmupsInLogs = els.preferencesForm.showWarmupsInLogs.checked;
  persistState({ render: true });
  toast("Preferencias guardadas.");
  if (!state.preferences.keepScreenAwake) releaseWakeLock();
}

function addExerciseRow(data = {}) {
  const fragment = els.exerciseRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".exercise-row");
  row.dataset.id = data.id || uid();
  row.querySelector('[data-field="name"]').value = data.name || "";
  row.querySelector('[data-field="sets"]').value = data.sets || "";
  row.querySelector('[data-field="reps"]').value = data.reps || "";
  row.querySelector('[data-field="rest"]').value = data.rest || state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS;
  row.querySelector(".remove-row").addEventListener("click", () => row.remove());
  els.exerciseRows.appendChild(fragment);
}

function cancelWorkoutEdit() {
  state.ui.editingWorkoutId = "";
  els.cancelWorkoutEditBtn.hidden = true;
  els.workoutForm.reset();
  setDefaultDates();
}

function cancelRoutineEdit() {
  state.ui.editingRoutineId = "";
  els.cancelRoutineEditBtn.hidden = true;
  els.routineForm.reset();
  els.exerciseRows.innerHTML = "";
  addExerciseRow();
}

function cancelMeasurementEdit() {
  state.ui.editingMeasurementId = "";
  els.cancelMeasurementEditBtn.hidden = true;
  els.measurementForm.reset();
  setDefaultDates();
}

function bindActionButtons() {
  $$("[data-action]").forEach((button) => {
    button.onclick = () => handleAction(button.dataset.action, button.dataset.id);
  });
}

function handleAction(action, id) {
  switch (action) {
    case "start-routine":
      beginSessionFromRoutine(id);
      break;

    case "edit-routine": {
      const routine = state.routines.find((item) => item.id === id);
      if (!routine) return;
      state.ui.editingRoutineId = id;
      els.cancelRoutineEditBtn.hidden = false;
      els.routineForm.name.value = routine.name;
      els.routineForm.day.value = routine.day || "";
      els.routineForm.focus.value = routine.focus || "";
      els.routineForm.notes.value = routine.notes || "";
      els.exerciseRows.innerHTML = "";
      routine.exercises.forEach((exercise) => addExerciseRow(exercise));
      setActiveTab("routines");
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    }

    case "duplicate-routine": {
      const routine = state.routines.find((item) => item.id === id);
      if (!routine) return;
      const clone = JSON.parse(JSON.stringify(routine));
      clone.id = uid();
      clone.name = `${routine.name} copia`;
      clone.exercises = clone.exercises.map((exercise) => ({ ...exercise, id: uid() }));
      state.routines.push(clone);
      persistState({ render: true });
      toast("Rutina duplicada.");
      break;
    }

    case "delete-routine": {
      if (!confirm("¿Borrar esta rutina?")) return;
      state.routines = state.routines.filter((item) => item.id !== id);
      if (state.session.routineId === id) cancelActiveSession(true);
      persistState({ render: true });
      toast("Rutina borrada.");
      break;
    }

    case "edit-workout": {
      const item = state.workouts.find((workout) => workout.id === id);
      if (!item) return;
      state.ui.editingWorkoutId = id;
      els.cancelWorkoutEditBtn.hidden = false;
      Object.entries(item).forEach(([key, value]) => {
        if (els.workoutForm[key]) els.workoutForm[key].value = value ?? "";
      });
      setActiveTab("session");
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    }

    case "delete-workout-group": {
      if (!confirm("¿Borrar este bloque de entrenamiento?")) return;
      const toDelete = resolveGroupEntries(id);
      state.workouts = state.workouts.filter((item) => !toDelete.includes(item.id));
      persistState({ render: true });
      toast("Bloque borrado.");
      break;
    }

    case "edit-measurement": {
      const item = state.measurements.find((measurement) => measurement.id === id);
      if (!item) return;
      state.ui.editingMeasurementId = id;
      els.cancelMeasurementEditBtn.hidden = false;
      Object.entries(item).forEach(([key, value]) => {
        if (els.measurementForm[key]) els.measurementForm[key].value = value ?? "";
      });
      setActiveTab("measurements");
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    }

    case "delete-measurement": {
      if (!confirm("¿Borrar esta medición?")) return;
      state.measurements = state.measurements.filter((item) => item.id !== id);
      persistState({ render: true });
      toast("Medición borrada.");
      break;
    }

    case "toggle-complete-exercise": {
      const list = new Set(state.session.completedExerciseIds);
      if (list.has(id)) list.delete(id); else list.add(id);
      state.session.completedExerciseIds = [...list];
      persistState({ render: true });
      break;
    }

    case "add-session-set":
      addSessionSet(id);
      break;

    case "delete-session-set":
      deleteSessionSet(id);
      break;

    default:
      break;
  }
}

function startSession() {
  const routineId = els.sessionRoutineSelect.value;
  if (!routineId) {
    toast("Selecciona una rutina.");
    return;
  }
  beginSessionFromRoutine(routineId);
}

function beginSessionFromRoutine(routineId) {
  if (!routineId) return;
  if (state.session.active && state.session.routineId !== routineId && !confirm("Ya hay una sesión activa. ¿Quieres reemplazarla?")) return;

  state.session = {
    active: true,
    sessionId: uid(),
    routineId,
    startedAt: new Date().toISOString(),
    endedAt: "",
    completedExerciseIds: [],
    currentExerciseId: "",
    notes: "",
    setEntries: []
  };

  persistState({ render: true });
  requestWakeLock();
  startSessionDurationTicker();
  setActiveTab("session");
  toast("Sesión iniciada.");
}

function endSession() {
  if (!state.session.active) {
    toast("No hay sesión activa.");
    return;
  }

  const routine = getActiveRoutine();
  const entries = [...state.session.setEntries];
  const workoutRecords = entries.map((entry) => ({
    id: uid(),
    date: datePartFromIso(entry.createdAt) || todayLocal(),
    routineId: state.session.routineId,
    sessionId: state.session.sessionId,
    exercise: entry.exerciseName || routine?.exercises.find((item) => item.id === entry.exerciseId)?.name || "Ejercicio",
    weight: Number(entry.weight || 0),
    sets: 1,
    reps: Number(entry.reps || 0),
    rpe: entry.rpe === "" ? "" : Number(entry.rpe),
    rest: entry.rest === "" ? "" : Number(entry.rest),
    tempo: "",
    notes: entry.isWarmup ? "Serie de calentamiento" : "Serie guardada desde sesión",
    isWarmup: Boolean(entry.isWarmup),
    source: "session",
    createdAt: entry.createdAt,
    updatedAt: entry.createdAt
  }));

  state.workouts.push(...workoutRecords);

  state.sessionHistory.push({
    id: uid(),
    sessionId: state.session.sessionId,
    routineId: state.session.routineId,
    routineName: routine?.name || "",
    date: datePartFromIso(state.session.startedAt) || todayLocal(),
    startedAt: state.session.startedAt,
    endedAt: new Date().toISOString(),
    durationSeconds: getSessionDurationSeconds(),
    totalSets: entries.length,
    exercisesCompleted: state.session.completedExerciseIds.length,
    volume: calcVolumeFromEntries(entries),
    notes: state.session.notes || ""
  });

  cancelActiveSession(false);
  persistState({ render: true });
  toast("Sesión guardada y cerrada.");
}

function cancelActiveSession(showToast = true) {
  state.session = {
    active: false,
    sessionId: "",
    routineId: "",
    startedAt: "",
    endedAt: "",
    completedExerciseIds: [],
    currentExerciseId: "",
    notes: "",
    setEntries: []
  };
  releaseWakeLock();
  stopRestTimer();
  startSessionDurationTicker();
  if (showToast) toast("Sesión cancelada.");
}

function addSessionSet(exerciseId) {
  const routine = getActiveRoutine();
  const exercise = routine?.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return;

  const weight = Number($("#session-weight-" + CSS.escape(exerciseId)).value || 0);
  const reps = Number($("#session-reps-" + CSS.escape(exerciseId)).value || 0);
  const rpeRaw = $("#session-rpe-" + CSS.escape(exerciseId)).value;
  const rest = Number($("#session-rest-" + CSS.escape(exerciseId)).value || state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS);
  const isWarmup = $("#session-warmup-" + CSS.escape(exerciseId)).checked;

  if (!weight || !reps) {
    toast("Completa peso y reps.");
    return;
  }

  state.session.setEntries.push({
    id: uid(),
    exerciseId,
    exerciseName: exercise.name,
    weight,
    reps,
    rpe: rpeRaw ? Number(rpeRaw) : "",
    rest,
    isWarmup,
    createdAt: new Date().toISOString()
  });

  if (!isWarmup) {
    const effectiveCount = getSessionEntriesByExercise(exerciseId).filter((item) => !item.isWarmup).length;
    if (effectiveCount >= Number(exercise.sets || 0)) {
      const list = new Set(state.session.completedExerciseIds);
      list.add(exerciseId);
      state.session.completedExerciseIds = [...list];
    }
  }

  $("#session-rpe-" + CSS.escape(exerciseId)).value = "";
  $("#session-warmup-" + CSS.escape(exerciseId)).checked = false;

  persistState({ render: true });
  toast(`${exercise.name}: serie guardada.`);
  if (state.preferences.autoStartRest) startRestTimer(rest);
}

function deleteSessionSet(entryId) {
  const entry = state.session.setEntries.find((item) => item.id === entryId);
  if (!entry) return;
  state.session.setEntries = state.session.setEntries.filter((item) => item.id !== entryId);

  const routine = getActiveRoutine();
  const exercise = routine?.exercises.find((item) => item.id === entry.exerciseId);
  const effectiveCount = getSessionEntriesByExercise(entry.exerciseId).filter((item) => !item.isWarmup).length;
  if (exercise && effectiveCount < Number(exercise.sets || 0)) {
    state.session.completedExerciseIds = state.session.completedExerciseIds.filter((id) => id !== entry.exerciseId);
  }

  persistState({ render: true });
  toast("Serie eliminada.");
}

function getSessionEntriesByExercise(exerciseId) {
  return state.session.setEntries
    .filter((item) => item.exerciseId === exerciseId)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function startRestTimer(seconds) {
  stopRestTimer();
  restRemaining = Number(seconds || 0);
  updateRestTimerLabel();
  if (restRemaining <= 0) return;

  restTimerInterval = setInterval(() => {
    restRemaining -= 1;
    updateRestTimerLabel();
    if (restRemaining <= 0) {
      stopRestTimer();
      toast("Descanso terminado.");
    }
  }, 1000);
}

function stopRestTimer() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  restRemaining = 0;
  updateRestTimerLabel();
}

function updateRestTimerLabel() {
  const minutes = String(Math.floor(restRemaining / 60)).padStart(2, "0");
  const seconds = String(restRemaining % 60).padStart(2, "0");
  els.restTimerLabel.textContent = `${minutes}:${seconds}`;
}

function startSessionDurationTicker() {
  clearInterval(sessionDurationInterval);
  sessionDurationInterval = setInterval(() => {
    if (state?.session.active) {
      els.sessionDurationLabel.textContent = formatDuration(getSessionDurationSeconds());
      els.sessionVolumeLabel.textContent = `${formatNumber(calcVolumeFromEntries(state.session.setEntries))} kg`;
    }
  }, 1000);
}

function getSessionDurationSeconds() {
  if (!state?.session.active || !state.session.startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(state.session.startedAt).getTime()) / 1000));
}

function loadDemoData() {
  if ((state.workouts.length || state.measurements.length || state.sessionHistory.length) && !confirm("Ya hay datos. ¿Quieres reemplazarlos con la demo?")) {
    return;
  }

  const routineA = {
    id: uid(),
    name: "Upper Strength",
    day: "Lunes",
    focus: "Fuerza torso",
    notes: "Bloque principal",
    exercises: [
      { id: uid(), name: "Press banca", sets: 4, reps: "5", rest: 150 },
      { id: uid(), name: "Dominadas lastradas", sets: 4, reps: "6", rest: 120 },
      { id: uid(), name: "Press militar", sets: 3, reps: "6-8", rest: 90 }
    ]
  };

  const routineB = {
    id: uid(),
    name: "Lower Power",
    day: "Jueves",
    focus: "Pierna",
    notes: "Foco en básicos",
    exercises: [
      { id: uid(), name: "Sentadilla", sets: 4, reps: "5", rest: 150 },
      { id: uid(), name: "Peso muerto rumano", sets: 3, reps: "8", rest: 120 },
      { id: uid(), name: "Prensa", sets: 3, reps: "10", rest: 90 }
    ]
  };

  state = defaultState();
  state.routines = [routineA, routineB];

  const session1 = uid();
  const session2 = uid();

  state.workouts = [
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, "Press banca", 80, 1, 5),
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, "Press banca", 80, 1, 5),
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, "Press banca", 77.5, 1, 6),
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, "Dominadas lastradas", 15, 1, 6),
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, "Dominadas lastradas", 15, 1, 6),
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, "Press militar", 45, 1, 8),
    workoutDemo(offsetDate(todayLocal(), -5), routineB.id, session2, "Sentadilla", 110, 1, 5),
    workoutDemo(offsetDate(todayLocal(), -5), routineB.id, session2, "Sentadilla", 110, 1, 5),
    workoutDemo(offsetDate(todayLocal(), -5), routineB.id, session2, "Prensa", 180, 1, 10),
    workoutDemo(offsetDate(todayLocal(), -8), routineA.id, "", "Press banca", 75, 4, 6, "manual")
  ];

  state.measurements = [
    measurementDemo(todayLocal(), 81.2, 14.4, 82.5, 104, 39.2, 59.5, 97.5, 38.2, 7.2),
    measurementDemo(offsetDate(todayLocal(), -14), 81.9, 14.9, 83.1, 103.6, 39.0, 59.2, 97.9, 38.1, 7.0),
    measurementDemo(offsetDate(todayLocal(), -30), 82.8, 15.6, 84.0, 103.0, 38.4, 58.8, 98.5, 38.0, 6.7)
  ];

  state.sessionHistory = [
    {
      id: uid(),
      sessionId: session1,
      routineId: routineA.id,
      routineName: routineA.name,
      date: offsetDate(todayLocal(), -1),
      startedAt: isoFromLocalDateTime(offsetDate(todayLocal(), -1), "18:00"),
      endedAt: isoFromLocalDateTime(offsetDate(todayLocal(), -1), "19:08"),
      durationSeconds: 68 * 60,
      totalSets: 6,
      exercisesCompleted: 3,
      volume: 1375,
      notes: ""
    },
    {
      id: uid(),
      sessionId: session2,
      routineId: routineB.id,
      routineName: routineB.name,
      date: offsetDate(todayLocal(), -5),
      startedAt: isoFromLocalDateTime(offsetDate(todayLocal(), -5), "19:00"),
      endedAt: isoFromLocalDateTime(offsetDate(todayLocal(), -5), "20:04"),
      durationSeconds: 64 * 60,
      totalSets: 3,
      exercisesCompleted: 2,
      volume: 2000,
      notes: ""
    }
  ];

  state.goals = {
    athleteName: "Javier",
    weightGoal: 79,
    waistGoal: 80,
    bodyFatGoal: 12,
    benchGoal: 100,
    squatGoal: 140,
    deadliftGoal: 160,
    focusGoal: "Subir fuerza manteniendo cintura controlada"
  };

  cancelRoutineEdit();
  cancelWorkoutEdit();
  cancelMeasurementEdit();
  persistState({ render: true });
  toast("Demo cargada.");
}

function workoutDemo(date, routineId, sessionId, exercise, weight, sets, reps, source = "session") {
  const createdAt = isoFromLocalDateTime(date, "19:00");
  return {
    id: uid(),
    date,
    routineId,
    sessionId,
    exercise,
    weight,
    sets,
    reps,
    rpe: "",
    rest: 90,
    tempo: "",
    notes: "Demo",
    isWarmup: false,
    source,
    createdAt,
    updatedAt: createdAt
  };
}

function measurementDemo(date, bodyWeight, bodyFat, waist, chest, arm, thigh, hips, neck, sleepHours) {
  const createdAt = isoFromLocalDateTime(date, "08:00");
  return {
    id: uid(),
    date,
    bodyWeight,
    bodyFat,
    waist,
    chest,
    arm,
    thigh,
    hips,
    neck,
    sleepHours,
    notes: "Demo",
    createdAt,
    updatedAt: createdAt
  };
}

function resetAllData() {
  if (!confirm("¿Seguro que quieres borrar todos los datos?")) return;
  state = defaultState();
  ensureMinimumData();
  cancelRoutineEdit();
  cancelWorkoutEdit();
  cancelMeasurementEdit();
  persistState({ render: true });
  toast("Datos reiniciados.");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, `gymflow-pro-v4-backup-${todayLocal()}.json`);
}

function exportCsv() {
  const workoutsCsv = toCsv(
    state.workouts,
    ["date", "routineId", "sessionId", "exercise", "weight", "sets", "reps", "rpe", "rest", "isWarmup", "source", "notes"]
  );
  const measurementsCsv = toCsv(
    state.measurements,
    ["date", "bodyWeight", "bodyFat", "waist", "chest", "arm", "thigh", "hips", "neck", "sleepHours", "notes"]
  );
  const sessionsCsv = toCsv(
    state.sessionHistory,
    ["date", "routineName", "durationSeconds", "totalSets", "exercisesCompleted", "volume", "notes"]
  );

  downloadBlob(new Blob([workoutsCsv], { type: "text/csv;charset=utf-8" }), `gymflow-workouts-${todayLocal()}.csv`);
  downloadBlob(new Blob([measurementsCsv], { type: "text/csv;charset=utf-8" }), `gymflow-measurements-${todayLocal()}.csv`);
  downloadBlob(new Blob([sessionsCsv], { type: "text/csv;charset=utf-8" }), `gymflow-sessions-${todayLocal()}.csv`);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result));
      state = migrateState(imported);
      ensureMinimumData();
      cancelRoutineEdit();
      cancelWorkoutEdit();
      cancelMeasurementEdit();
      persistState({ render: true });
      toast("Datos importados.");
    } catch (error) {
      console.error(error);
      toast("El archivo no es válido.");
    } finally {
      els.importInput.value = "";
    }
  };
  reader.readAsText(file);
}

function setupPwa() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").then((registration) => {
      pwaRegistration = registration;

      if (registration.waiting) {
        els.updateBanner.hidden = false;
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            els.updateBanner.hidden = false;
            renderPwaStatus();
          }
        });
      });

      renderPwaStatus();
    }).catch((error) => {
      console.error("No se pudo registrar el service worker", error);
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    els.installBtn.hidden = false;
    renderPwaStatus();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    els.installBtn.hidden = true;
    toast("App instalada.");
    renderPwaStatus();
  });

  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandaloneMode()) {
    els.iosInstallBtn.hidden = false;
  }
}

async function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBtn.hidden = true;
  renderPwaStatus();
}

function refreshApp() {
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration?.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
    else window.location.reload();
  });
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  els.networkBadge.textContent = online ? "Online" : "Offline";
  els.networkBadge.classList.toggle("offline", !online);
}

async function requestWakeLock() {
  try {
    if (!("wakeLock" in navigator) || !state.preferences.keepScreenAwake) return;
    wakeLock = await navigator.wakeLock.request("screen");
  } catch (error) {
    console.warn("Wake Lock no disponible", error);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

function getActiveRoutine() {
  return state.routines.find((item) => item.id === state.session.routineId) || null;
}

function getSuggestedRoutine() {
  const lastDateByRoutine = computeLastDateByRoutine();
  const ordered = [...state.routines].sort((a, b) => {
    const dateA = lastDateByRoutine[a.id];
    const dateB = lastDateByRoutine[b.id];
    if (!dateA && !dateB) return 0;
    if (!dateA) return -1;
    if (!dateB) return 1;
    return String(dateA).localeCompare(String(dateB));
  });

  const routine = ordered[0] || null;
  if (!routine) return { routine: null, reason: "", daysSince: null };

  const lastDate = lastDateByRoutine[routine.id] || null;
  const daysSince = lastDate ? daysBetween(lastDate, todayLocal()) : null;

  return {
    routine,
    daysSince,
    reason: lastDate
      ? `Es la rutina que llevas más tiempo sin tocar, así que tiene sentido retomarla ahora.`
      : `Todavía no la has usado, así que es buena candidata para arrancar el bloque.`
  };
}

function detectPotentialStall() {
  const grouped = groupBy(state.workouts.filter((item) => !item.isWarmup), (item) => item.exercise);
  for (const [exercise, logs] of Object.entries(grouped)) {
    const points = logs
      .sort(sortByDateAsc)
      .slice(-4)
      .map((item) => estimateE1RM(item.weight, item.reps));

    if (points.length >= 4 && Math.max(...points) - Math.min(...points) <= 2) {
      return {
        exercise,
        points: points.length,
        latest: points[points.length - 1]
      };
    }
  }
  return null;
}

function computeLastDateByRoutine() {
  return state.workouts.reduce((acc, item) => {
    if (!item.routineId) return acc;
    if (!acc[item.routineId] || String(item.date).localeCompare(String(acc[item.routineId])) > 0) {
      acc[item.routineId] = item.date;
    }
    return acc;
  }, {});
}

function getExerciseReference(exerciseName) {
  return state.workouts
    .filter((item) => item.exercise === exerciseName && !item.isWarmup)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
}

function nextLoadSuggestionForExercise(exerciseName) {
  const logs = state.workouts
    .filter((item) => item.exercise === exerciseName && !item.isWarmup)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 3);

  if (!logs.length) return 0;

  const top = logs[0];
  const increment = Number(state.preferences.suggestionIncrement || 2.5);

  if (top.reps >= extractMainRepFromLogs(logs) || top.reps >= 8) {
    return roundToStep(Number(top.weight) + increment, 0.5);
  }

  return Number(top.weight);
}

function extractMainRepFromLogs(logs) {
  const reps = logs.map((item) => Number(item.reps || 0)).filter(Boolean);
  return reps.length ? Math.max(...reps) : 0;
}

function computeBestLiftMap() {
  return state.workouts.reduce((acc, item) => {
    if (item.isWarmup) return acc;
    if (!acc[item.exercise] || Number(item.weight) > Number(acc[item.exercise])) {
      acc[item.exercise] = Number(item.weight);
    }
    return acc;
  }, {});
}

function computeFirstLiftMap() {
  const map = {};
  state.workouts.forEach((item) => {
    if (item.isWarmup) return;
    const current = map[item.exercise];
    if (!current || String(item.date).localeCompare(String(current.date)) < 0) {
      map[item.exercise] = { value: Number(item.weight), date: item.date };
    }
  });

  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, value.value]));
}

function computeStreak(workoutDates) {
  const uniqueDates = [...workoutDates].sort().reverse();
  if (!uniqueDates.length) return 0;
  if (daysBetween(uniqueDates[0], todayLocal()) > 2) return 0;

  let streak = 1;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const diff = daysBetween(uniqueDates[index], uniqueDates[index - 1]);
    if (diff <= 2) streak += 1;
    else break;
  }
  return streak;
}

function getUniqueWorkoutDates() {
  return [...new Set(state.workouts.filter((item) => !item.isWarmup).map((item) => item.date))].sort().reverse();
}

function estimateE1RM(weight, reps) {
  return Number(weight || 0) * (1 + Number(reps || 0) / 30);
}

function calcVolume(item) {
  return Number(item.weight || 0) * Number(item.reps || 0) * Number(item.sets || 0);
}

function calcVolumeFromEntries(entries) {
  return entries.reduce((sum, item) => sum + (item.isWarmup ? 0 : Number(item.weight || 0) * Number(item.reps || 0)), 0);
}

function getWorkoutGroupSorter(sortBy) {
  switch (sortBy) {
    case "date_asc":
      return (a, b) => String(a.date).localeCompare(String(b.date));
    case "weight_desc":
      return (a, b) => Number(b.maxWeight) - Number(a.maxWeight);
    case "exercise_asc":
      return (a, b) => a.exercise.localeCompare(b.exercise, "es");
    default:
      return sortWorkoutGroupsByDateDesc;
  }
}

function sortWorkoutGroupsByDateDesc(a, b) {
  const dateCompare = String(b.date).localeCompare(String(a.date));
  if (dateCompare !== 0) return dateCompare;
  return String(b.primaryId).localeCompare(String(a.primaryId));
}

function sortByDateDesc(a, b) {
  return String(b.date).localeCompare(String(a.date));
}

function sortByDateAsc(a, b) {
  return String(a.date).localeCompare(String(b.date));
}

function groupBy(array, getKey) {
  return array.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function numOrBlank(value) {
  return value === "" || value == null ? "" : Number(value);
}

function buildRepsLabel(repsList) {
  const unique = [...new Set(repsList.filter(Boolean))];
  if (!unique.length) return "Reps —";
  if (unique.length === 1) return `${unique[0]} reps`;
  return `${Math.min(...unique)}-${Math.max(...unique)} reps`;
}

function extractMainRep(value) {
  if (typeof value === "number") return value;
  const text = String(value || "");
  const match = text.match(/\d+/);
  return match ? match[0] : "";
}

function buildLineChart(points, suffix = "", label = "gráfico de evolución") {
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

  const gridLines = [0, .25, .5, .75, 1].map((ratio) => {
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

function cardHtml({ title, subtitle, chips = [], extraClass = "" }) {
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

function emptyHtml(message) {
  return `<div class="chart-empty">${escapeHtml(message)}</div>`;
}

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  els.toastRegion.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function toCsv(rows, keys) {
  const header = keys.join(",");
  const body = rows.map((row) => keys.map((key) => csvCell(row[key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

function csvCell(value) {
  const raw = value == null ? "" : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toFixed(number % 1 === 0 ? 0 : 1);
}

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatShortDateTime(dateTime) {
  if (!dateTime) return "";
  return new Date(dateTime).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(Number(totalSeconds || 0) / 60);
  const seconds = Number(totalSeconds || 0) % 60;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function shortLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function todayLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function offsetDate(date, amount) {
  const base = new Date(`${date}T12:00:00`);
  base.setDate(base.getDate() + amount);
  const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function daysBetween(dateA, dateB) {
  const a = new Date(`${dateA}T12:00:00`);
  const b = new Date(`${dateB}T12:00:00`);
  return Math.round((b - a) / 86400000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function datePartFromIso(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isoFromLocalDateTime(date, time = "12:00") {
  return new Date(`${date}T${time}:00`).toISOString();
}

function computeGoalProgress({ baseline, current, target }) {
  if (current == null) return 0;
  if (baseline == null || baseline === target) {
    const simple = (current / Math.max(target, 1)) * 100;
    return clamp(simple, 0, 100);
  }

  const totalDistance = target - baseline;
  const currentDistance = current - baseline;
  if (totalDistance === 0) return 100;
  return clamp((currentDistance / totalDistance) * 100, 0, 100);
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

function roundToStep(value, step = 0.5) {
  return Math.round(Number(value || 0) / step) * step;
}

function resolveGroupEntries(groupId) {
  if (groupId.startsWith("manual|")) {
    return [groupId.split("|")[1]];
  }

  if (groupId.startsWith("session|")) {
    const [, sessionId, exercise] = groupId.split("|");
    return state.workouts
      .filter((item) => item.sessionId === sessionId && item.exercise === exercise)
      .map((item) => item.id);
  }

  return [];
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
}

function persistState({ render = true, save = true } = {}) {
  if (save) queueSave();
  if (render) renderAll();
}

function queueSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveInFlight = saveInFlight.then(() => idbSet(DB_KEY, state)).catch((error) => {
      console.error("No se pudo guardar el estado", error);
    });
  }, 120);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DB_STORE)) {
        database.createObjectStore(DB_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

function idbGet(key) {
  return new Promise((resolve, reject) => {
    if (!db) return resolve(null);
    const transaction = db.transaction(DB_STORE, "readonly");
    const store = transaction.objectStore(DB_STORE);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

function idbSet(key, value) {
  return new Promise((resolve, reject) => {
    if (!db) return resolve();
    const transaction = db.transaction(DB_STORE, "readwrite");
    const store = transaction.objectStore(DB_STORE);
    const request = store.put(structuredClone(value), key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
