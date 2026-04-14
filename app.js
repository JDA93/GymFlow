const STORAGE_KEY = "gymflow-pro-v3-data";
const TODAY = new Date().toISOString().slice(0, 10);

const defaultState = {
  version: 3,
  workouts: [],
  measurements: [],
  routines: [],
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
    unitSystem: "metric",
    autoStartRest: true,
    keepScreenAwake: false
  },
  session: {
    active: false,
    routineId: "",
    startedAt: "",
    completedExerciseIds: [],
    entries: []
  },
  ui: {
    activeTab: "dashboard",
    editingWorkoutId: "",
    editingRoutineId: "",
    editingMeasurementId: "",
    dashboardExercise: "",
    dashboardMetric: "bodyWeight",
    logSearch: "",
    logRoutine: "all",
    logSort: "date_desc"
  }
};

let state = loadState();
let deferredPrompt = null;
let restTimerInterval = null;
let restRemaining = 0;
let wakeLock = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
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
  exerciseSuggestions: $("#exerciseSuggestions")
};

init();

function init() {
  bindEvents();
  ensureMinimumData();
  setDefaultDates();
  setupPwa();
  restoreTab();
  renderAll();
  updateNetworkStatus();
}

function bindEvents() {
  $$(".tab").forEach((tab) => tab.addEventListener("click", () => setActiveTab(tab.dataset.tab)));

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
    persistAndRender(false);
  });
  els.dashboardMetricSelect.addEventListener("change", (event) => {
    state.ui.dashboardMetric = event.target.value;
    persistAndRender(false);
  });

  els.startSessionBtn.addEventListener("click", startSession);
  els.endSessionBtn.addEventListener("click", endSession);
  els.startRestBtn.addEventListener("click", () => startRestTimer(Number(state.preferences.defaultRestSeconds || 90)));
  els.stopRestBtn.addEventListener("click", stopRestTimer);

  els.workoutForm.addEventListener("submit", saveWorkoutFromForm);
  els.cancelWorkoutEditBtn.addEventListener("click", cancelWorkoutEdit);

  els.routineForm.addEventListener("submit", saveRoutineFromForm);
  els.addExerciseRowBtn.addEventListener("click", () => addExerciseRow());
  els.cancelRoutineEditBtn.addEventListener("click", cancelRoutineEdit);

  els.logSearchInput.addEventListener("input", (event) => {
    state.ui.logSearch = event.target.value;
    persistAndRender(false);
  });
  els.logRoutineFilter.addEventListener("change", (event) => {
    state.ui.logRoutine = event.target.value;
    persistAndRender(false);
  });
  els.logSortSelect.addEventListener("change", (event) => {
    state.ui.logSort = event.target.value;
    persistAndRender(false);
  });

  els.measurementForm.addEventListener("submit", saveMeasurementFromForm);
  els.cancelMeasurementEditBtn.addEventListener("click", cancelMeasurementEdit);
  els.goalForm.addEventListener("submit", saveGoals);
  els.preferencesForm.addEventListener("submit", savePreferences);

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && state.preferences.keepScreenAwake && state.session.active) {
      await requestWakeLock();
    }
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return mergeDeep(structuredClone(defaultState), JSON.parse(raw));
  } catch {
    return structuredClone(defaultState);
  }
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

function persistAndRender(render = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (render) renderAll();
}

function ensureMinimumData() {
  if (!state.routines.length) {
    state.routines = [
      {
        id: uid(),
        name: "Torso",
        day: "Día A",
        focus: "Hipertrofia",
        notes: "Base inicial",
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
    persistAndRender(false);
  }
}

function setDefaultDates() {
  if (els.workoutForm.date) els.workoutForm.date.value = TODAY;
  if (els.measurementForm.date) els.measurementForm.date.value = TODAY;
}

function restoreTab() {
  setActiveTab(state.ui.activeTab || "dashboard", false);
}

function setActiveTab(tabId, save = true) {
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
  state.ui.activeTab = tabId;
  if (save) persistAndRender(false);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function populateRoutineSelects() {
  const options = [`<option value="">Selecciona rutina</option>`]
    .concat(state.routines.map((routine) => `<option value="${routine.id}">${escapeHtml(routine.name)}</option>`))
    .join("");

  els.sessionRoutineSelect.innerHTML = options;
  els.workoutRoutineSelect.innerHTML = `<option value="">Sin rutina</option>${state.routines.map((routine) => `<option value="${routine.id}">${escapeHtml(routine.name)}</option>`).join("")}`;
  els.logRoutineFilter.innerHTML = `<option value="all">Todas las rutinas</option>${state.routines.map((routine) => `<option value="${routine.id}">${escapeHtml(routine.name)}</option>`).join("")}`;

  els.sessionRoutineSelect.value = state.session.routineId || "";
  els.logRoutineFilter.value = state.ui.logRoutine || "all";
}

function populateExerciseSuggestions() {
  const names = [...new Set(state.workouts.map((item) => item.exercise).concat(state.routines.flatMap((routine) => routine.exercises.map((exercise) => exercise.name))))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));

  els.exerciseSuggestions.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");

  const exerciseSelect = els.dashboardExerciseSelect;
  if (!names.length) {
    exerciseSelect.innerHTML = `<option value="">Sin ejercicios</option>`;
    state.ui.dashboardExercise = "";
    return;
  }
  if (!state.ui.dashboardExercise || !names.includes(state.ui.dashboardExercise)) {
    state.ui.dashboardExercise = names[0];
  }
  exerciseSelect.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  exerciseSelect.value = state.ui.dashboardExercise;
  els.dashboardMetricSelect.value = state.ui.dashboardMetric;
}

function renderStats() {
  const workouts = [...state.workouts].sort(sortByDateDesc);
  const measurements = [...state.measurements].sort(sortByDateDesc);
  const monthPrefix = TODAY.slice(0, 7);
  const uniqueDays = new Set(workouts.filter((item) => item.date.startsWith(monthPrefix)).map((item) => item.date));
  const latestMeasurement = measurements[0];
  const bestLift = workouts.reduce((best, item) => !best || Number(item.weight) > Number(best.weight) ? item : best, null);
  const bestE1rm = workouts.reduce((best, item) => {
    const value = estimateE1RM(item.weight, item.reps);
    if (!best || value > best.value) return { value, item };
    return best;
  }, null);

  els.statSessionsMonth.textContent = uniqueDays.size;
  els.statStreak.textContent = String(computeStreak(workouts));
  els.statWeight.textContent = latestMeasurement?.bodyWeight ? `${formatNumber(latestMeasurement.bodyWeight)} kg` : "—";
  els.statBestLift.textContent = bestLift ? `${formatNumber(bestLift.weight)} kg` : "—";
  els.statBestLiftLabel.textContent = bestLift ? bestLift.exercise : "Sin datos";
  els.statBestE1rm.textContent = bestE1rm ? `${formatNumber(bestE1rm.value)} kg` : "—";
  els.statBestE1rmLabel.textContent = bestE1rm ? bestE1rm.item.exercise : "Estimado";
}

function renderTodayFocus() {
  const container = els.todayFocus;
  const latestWorkout = [...state.workouts].sort(sortByDateDesc)[0];
  const latestMeasurement = [...state.measurements].sort(sortByDateDesc)[0];
  const routine = state.routines.find((item) => item.id === state.session.routineId) || state.routines[0];
  const cards = [];

  if (state.session.active && routine) {
    const completed = state.session.completedExerciseIds.length;
    cards.push(cardHtml({
      title: `Sesión abierta: ${routine.name}`,
      subtitle: `Llevas ${completed} de ${routine.exercises.length} ejercicios marcados.`,
      chips: [
        { label: `Empezó ${formatShortDateTime(state.session.startedAt)}`, type: "success" },
        { label: "Ve a Sesión para seguir", type: "ghost" }
      ],
      extraClass: "highlight"
    }));
  } else if (routine) {
    cards.push(cardHtml({
      title: `Siguiente mejor acción: ${routine.name}`,
      subtitle: `Tu rutina sugerida para hoy tiene ${routine.exercises.length} ejercicios y enfoque ${routine.focus || "general"}.`,
      chips: [
        { label: routine.day || "Sin bloque", type: "ghost" },
        { label: "Pulsa Entrenar ahora", type: "success" }
      ],
      extraClass: "highlight"
    }));
  }

  if (latestWorkout) {
    cards.push(cardHtml({
      title: `Último entreno: ${latestWorkout.exercise}`,
      subtitle: `${formatDate(latestWorkout.date)} · ${formatNumber(latestWorkout.weight)} kg × ${latestWorkout.reps} reps × ${latestWorkout.sets} series`,
      chips: [
        { label: `e1RM ${formatNumber(estimateE1RM(latestWorkout.weight, latestWorkout.reps))} kg`, type: "warning" },
        { label: `Volumen ${formatNumber(calcVolume(latestWorkout))}`, type: "ghost" }
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

  if (!cards.length) {
    container.innerHTML = emptyHtml("Todavía no hay datos. Carga la demo o crea tu primer registro.");
    return;
  }
  container.innerHTML = cards.join("");
}

function renderQuickStart() {
  const container = els.quickStartList;
  if (!state.routines.length) {
    container.innerHTML = emptyHtml("Crea una rutina para ver accesos rápidos.");
    return;
  }
  container.innerHTML = state.routines.slice(0, 4).map((routine) => `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h4 class="list-title">${escapeHtml(routine.name)}</h4>
          <p class="list-subtitle">${escapeHtml(routine.focus || "Sin foco")}</p>
        </div>
        <span class="chip ghost">${routine.exercises.length} ejercicios</span>
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
  const recent = [...state.workouts].sort(sortByDateDesc).slice(0, 5);
  els.recentLogs.innerHTML = recent.length ? recent.map((item) => cardHtml({
    title: item.exercise,
    subtitle: `${formatDate(item.date)} · ${formatNumber(item.weight)} kg × ${item.reps} × ${item.sets}`,
    chips: [
      { label: `e1RM ${formatNumber(estimateE1RM(item.weight, item.reps))} kg`, type: "warning" },
      { label: `Volumen ${formatNumber(calcVolume(item))}`, type: "ghost" },
      ...(item.notes ? [{ label: item.notes.slice(0, 40), type: "ghost" }] : [])
    ]
  })).join("") : emptyHtml("Aún no hay registros.");
}

function renderExerciseChart() {
  const exercise = state.ui.dashboardExercise;
  const logs = state.workouts.filter((item) => item.exercise === exercise).sort(sortByDateAsc).slice(-10);
  els.exerciseChart.innerHTML = logs.length >= 2 ? buildLineChart(logs.map((item) => ({ label: shortLabel(item.date), value: Number(item.weight) })), "kg") : emptyHtml("Necesitas al menos 2 registros del mismo ejercicio.");
}

function renderBodyChart() {
  const metric = state.ui.dashboardMetric;
  const logs = state.measurements
    .filter((item) => item[metric] !== "" && item[metric] != null)
    .sort(sortByDateAsc)
    .slice(-10)
    .map((item) => ({ label: shortLabel(item.date), value: Number(item[metric]) }));
  const suffix = metric === "bodyFat" ? "%" : metric === "sleepHours" ? "h" : metric === "bodyWeight" ? "kg" : "cm";
  els.bodyChart.innerHTML = logs.length >= 2 ? buildLineChart(logs, suffix) : emptyHtml("Necesitas al menos 2 mediciones para esta métrica.");
}

function renderSession() {
  const routine = state.routines.find((item) => item.id === state.session.routineId);
  if (!state.session.active || !routine) {
    els.activeSessionCard.innerHTML = `<p class="empty">Selecciona una rutina e inicia la sesión para ver tus ejercicios aquí.</p>`;
    return;
  }

  const completed = state.session.completedExerciseIds.length;
  const progress = routine.exercises.length ? Math.round((completed / routine.exercises.length) * 100) : 0;
  const header = `
    <div class="list-item highlight">
      <div class="list-head">
        <div>
          <h4 class="list-title">${escapeHtml(routine.name)}</h4>
          <p class="list-subtitle">${escapeHtml(routine.focus || "Sin foco")}</p>
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
    const last = getLastWorkoutByExercise(exercise.name);
    const completedItem = state.session.completedExerciseIds.includes(exercise.id);
    const suggestion = last ? nextLoadSuggestion(last.weight, last.reps) : null;
    return `
      <article class="session-exercise ${completedItem ? "completed" : ""}">
        <div class="session-exercise-top">
          <div>
            <h4 class="list-title">${index + 1}. ${escapeHtml(exercise.name)}</h4>
            <p class="list-subtitle">${exercise.sets || "—"} series · ${escapeHtml(String(exercise.reps || "—"))} reps · descanso ${exercise.rest || state.preferences.defaultRestSeconds}s</p>
          </div>
          <button class="ghost small" data-action="toggle-complete-exercise" data-id="${exercise.id}">${completedItem ? "Desmarcar" : "Completar"}</button>
        </div>
        <div class="chip-row">
          <span class="chip ghost">Último peso: ${last ? `${formatNumber(last.weight)} kg` : "—"}</span>
          <span class="chip warning">Siguiente carga: ${suggestion ? `${formatNumber(suggestion)} kg` : "Empieza cómodo"}</span>
          <span class="chip ghost">e1RM top: ${last ? `${formatNumber(estimateE1RM(last.weight, last.reps))} kg` : "—"}</span>
        </div>
        <div class="session-series-row">
          <input type="number" step="0.5" placeholder="Kg" id="session-weight-${exercise.id}" value="${last?.weight || ""}" />
          <input type="number" step="1" placeholder="Series" id="session-sets-${exercise.id}" value="${exercise.sets || ""}" />
          <input type="number" step="1" placeholder="Reps" id="session-reps-${exercise.id}" value="${extractMainRep(exercise.reps)}" />
          <input type="number" min="0" step="15" placeholder="Descanso" id="session-rest-${exercise.id}" value="${exercise.rest || state.preferences.defaultRestSeconds}" />
          <button data-action="save-session-set" data-id="${exercise.id}">Guardar</button>
        </div>
      </article>
    `;
  }).join("");

  els.activeSessionCard.innerHTML = header + cards;
  bindActionButtons();
}

function renderRoutines() {
  if (!state.routines.length) {
    els.routineList.innerHTML = emptyHtml("No hay rutinas todavía.");
    return;
  }
  els.routineList.innerHTML = state.routines.map((routine) => `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h4 class="list-title">${escapeHtml(routine.name)}</h4>
          <p class="list-subtitle">${escapeHtml(routine.day || "Sin bloque")} · ${escapeHtml(routine.focus || "Sin foco")}</p>
        </div>
        <span class="chip ghost">${routine.exercises.length} ejercicios</span>
      </div>
      <div class="chip-row">
        ${routine.exercises.slice(0, 5).map((exercise) => `<span class="chip ghost">${escapeHtml(exercise.name)}</span>`).join("")}
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
  const filtered = state.workouts.filter((item) => {
    const matchExercise = !query || item.exercise.toLowerCase().includes(query);
    const matchRoutine = state.ui.logRoutine === "all" || item.routineId === state.ui.logRoutine;
    return matchExercise && matchRoutine;
  }).sort(getWorkoutSorter(state.ui.logSort));

  if (!filtered.length) {
    els.workoutList.innerHTML = emptyHtml("No hay registros con esos filtros.");
    return;
  }

  els.workoutList.innerHTML = filtered.map((item) => {
    const routine = state.routines.find((routineItem) => routineItem.id === item.routineId);
    return `
      <article class="list-item">
        <div class="list-head">
          <div>
            <h4 class="list-title">${escapeHtml(item.exercise)}</h4>
            <p class="list-subtitle">${formatDate(item.date)}${routine ? ` · ${escapeHtml(routine.name)}` : ""}</p>
          </div>
          <span class="chip ghost">${formatNumber(item.weight)} kg</span>
        </div>
        <div class="chip-row">
          <span class="chip ghost">${item.sets} series</span>
          <span class="chip ghost">${item.reps} reps</span>
          <span class="chip warning">e1RM ${formatNumber(estimateE1RM(item.weight, item.reps))} kg</span>
          <span class="chip ghost">Volumen ${formatNumber(calcVolume(item))}</span>
        </div>
        <div class="actions-row">
          <button class="ghost small" data-action="edit-workout" data-id="${item.id}">Editar</button>
          <button class="ghost small" data-action="delete-workout" data-id="${item.id}">Borrar</button>
        </div>
      </article>
    `;
  }).join("");
  bindActionButtons();
}

function renderPrList() {
  const grouped = groupBy(state.workouts, (item) => item.exercise);
  const exercises = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "es"));
  if (!exercises.length) {
    els.prList.innerHTML = emptyHtml("Sin datos todavía.");
    return;
  }
  els.prList.innerHTML = exercises.map((exercise) => {
    const logs = grouped[exercise];
    const bestWeight = logs.reduce((best, item) => Number(item.weight) > Number(best.weight) ? item : best, logs[0]);
    const bestE1rm = logs.reduce((best, item) => estimateE1RM(item.weight, item.reps) > estimateE1RM(best.weight, best.reps) ? item : best, logs[0]);
    return cardHtml({
      title: exercise,
      subtitle: `PR carga ${formatNumber(bestWeight.weight)} kg · PR e1RM ${formatNumber(estimateE1RM(bestE1rm.weight, bestE1rm.reps))} kg`,
      chips: [
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
          <h4 class="list-title">${formatDate(item.date)}</h4>
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
  const grouped = groupBy(state.workouts, (item) => item.exercise);
  const volumeCards = Object.entries(grouped)
    .map(([exercise, logs]) => ({ exercise, volume: logs.reduce((sum, item) => sum + calcVolume(item), 0), sessions: logs.length }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8)
    .map((item) => cardHtml({
      title: item.exercise,
      subtitle: `Volumen total ${formatNumber(item.volume)} · ${item.sessions} registros`,
      chips: [{ label: "Carga acumulada", type: "ghost" }]
    }));
  els.volumeSummary.innerHTML = volumeCards.length ? volumeCards.join("") : emptyHtml("Sin datos de volumen todavía.");

  const trendItems = buildTrendItems();
  els.trendSummary.innerHTML = trendItems.map((item) => cardHtml(item)).join("");
  els.trendSummaryTop.innerHTML = trendItems.slice(0, 3).map((item) => cardHtml(item)).join("");
}

function buildTrendItems() {
  const workouts = [...state.workouts].sort(sortByDateDesc);
  const measurements = [...state.measurements].sort(sortByDateDesc);
  const uniqueDays = [...new Set(workouts.map((item) => item.date))];
  const last7 = uniqueDays.filter((date) => daysBetween(date, TODAY) <= 6).length;
  const last30 = uniqueDays.filter((date) => daysBetween(date, TODAY) <= 29).length;
  const latestWeight = measurements[0]?.bodyWeight;
  const oldestWeight = [...measurements].sort(sortByDateAsc)[0]?.bodyWeight;
  const weightDelta = latestWeight && oldestWeight ? Number(latestWeight) - Number(oldestWeight) : null;
  const mostFrequentExercise = Object.entries(groupBy(workouts, (item) => item.exercise)).sort((a, b) => b[1].length - a[1].length)[0];

  return [
    {
      title: "Frecuencia reciente",
      subtitle: `${last7} días entrenados en los últimos 7 días · ${last30} en 30 días.`,
      chips: [{ label: last7 >= 3 ? "Buen ritmo" : "Se puede apretar", type: last7 >= 3 ? "success" : "warning" }]
    },
    {
      title: "Racha actual",
      subtitle: `Tu racha real es de ${computeStreak(workouts)} días con continuidad activa.`,
      chips: [{ label: workouts.length ? `Último entreno ${formatDate(workouts[0].date)}` : "Sin entrenos", type: "ghost" }]
    },
    {
      title: "Peso corporal",
      subtitle: weightDelta == null ? "Aún no hay suficiente histórico para medir tendencia." : `Cambio acumulado ${weightDelta >= 0 ? "+" : ""}${formatNumber(weightDelta)} kg desde tu primera medición guardada.`,
      chips: [{ label: latestWeight ? `Actual ${formatNumber(latestWeight)} kg` : "Sin peso actual", type: "ghost" }]
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
  const bestMap = computeBestLiftMap();
  const cards = [];

  if (goals.focusGoal) {
    cards.push(cardHtml({ title: "Meta principal del bloque", subtitle: goals.focusGoal, chips: [{ label: goals.athleteName || "Atleta", type: "ghost" }] }));
  }
  if (goals.weightGoal) {
    cards.push(goalCard("Peso", latestMeasurement?.bodyWeight, goals.weightGoal, "kg"));
  }
  if (goals.waistGoal) {
    cards.push(goalCard("Cintura", latestMeasurement?.waist, goals.waistGoal, "cm"));
  }
  if (goals.bodyFatGoal) {
    cards.push(goalCard("Grasa corporal", latestMeasurement?.bodyFat, goals.bodyFatGoal, "%"));
  }
  if (goals.benchGoal) {
    cards.push(goalCard("Press banca", bestMap["Press banca"], goals.benchGoal, "kg"));
  }
  if (goals.squatGoal) {
    cards.push(goalCard("Sentadilla", bestMap["Sentadilla"], goals.squatGoal, "kg"));
  }
  if (goals.deadliftGoal) {
    cards.push(goalCard("Peso muerto", bestMap["Peso muerto"] || bestMap["Peso muerto rumano"], goals.deadliftGoal, "kg"));
  }
  els.goalSummary.innerHTML = cards.length ? cards.join("") : emptyHtml("Todavía no has definido objetivos.");
}

function goalCard(label, currentValue, targetValue, suffix) {
  const current = currentValue ? Number(currentValue) : null;
  const target = Number(targetValue);
  const delta = current == null ? null : target - current;
  return cardHtml({
    title: label,
    subtitle: current == null ? `Objetivo ${formatNumber(target)} ${suffix}. Aún no hay valor actual.` : `Actual ${formatNumber(current)} ${suffix} · Objetivo ${formatNumber(target)} ${suffix}`,
    chips: [
      { label: delta == null ? "Sin referencia actual" : `Te faltan ${formatNumber(Math.abs(delta))} ${suffix}`, type: delta == null ? "ghost" : Math.abs(delta) < 2 ? "success" : "warning" }
    ]
  });
}

function renderGoalForm() {
  Object.entries(state.goals).forEach(([key, value]) => {
    if (els.goalForm[key]) els.goalForm[key].value = value ?? "";
  });
}

function renderPreferencesForm() {
  const pref = state.preferences;
  Object.entries(pref).forEach(([key, value]) => {
    if (!els.preferencesForm[key]) return;
    if (typeof value === "boolean") {
      els.preferencesForm[key].checked = value;
    } else {
      els.preferencesForm[key].value = value;
    }
  });
}

function renderPwaStatus() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  const swReady = "serviceWorker" in navigator;
  const items = [
    { title: "Manifest", subtitle: "Detectado y cargado desde la app.", chips: [{ label: "OK", type: "success" }] },
    { title: "Service worker", subtitle: swReady ? "Disponible en este navegador." : "No soportado en este navegador.", chips: [{ label: swReady ? "Activo" : "No soportado", type: swReady ? "success" : "warning" }] },
    { title: "Modo instalación", subtitle: standalone ? "La app ya parece instalada." : ios ? "En iPhone se instala desde Compartir > Añadir a pantalla de inicio." : "En Android/Chrome puede aparecer el botón Instalar app o en el menú del navegador.", chips: [{ label: standalone ? "Instalada" : "Pendiente", type: standalone ? "success" : "ghost" }] }
  ];
  els.pwaStatusBox.innerHTML = items.map((item) => cardHtml(item)).join("");
}

function saveWorkoutFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.workoutForm);
  const record = {
    id: state.ui.editingWorkoutId || uid(),
    date: form.get("date") || TODAY,
    routineId: form.get("routineId") || "",
    exercise: String(form.get("exercise") || "").trim(),
    weight: Number(form.get("weight") || 0),
    sets: Number(form.get("sets") || 0),
    reps: Number(form.get("reps") || 0),
    rpe: form.get("rpe") ? Number(form.get("rpe")) : "",
    rest: form.get("rest") ? Number(form.get("rest")) : "",
    tempo: String(form.get("tempo") || "").trim(),
    notes: String(form.get("notes") || "").trim(),
    createdAt: new Date().toISOString()
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
  persistAndRender();
  toast(index >= 0 ? "Registro actualizado." : "Registro guardado.");
}

function saveRoutineFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.routineForm);
  const exercises = [...els.exerciseRows.querySelectorAll(".exercise-row")].map((row) => ({
    id: row.dataset.id || uid(),
    name: row.querySelector('[data-field="name"]').value.trim(),
    sets: Number(row.querySelector('[data-field="sets"]').value || 0),
    reps: row.querySelector('[data-field="reps"]').value.trim(),
    rest: Number(row.querySelector('[data-field="rest"]').value || 0)
  })).filter((item) => item.name);

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
  persistAndRender();
  toast(index >= 0 ? "Rutina actualizada." : "Rutina guardada.");
}

function saveMeasurementFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.measurementForm);
  const record = {
    id: state.ui.editingMeasurementId || uid(),
    date: form.get("date") || TODAY,
    bodyWeight: numOrBlank(form.get("bodyWeight")),
    bodyFat: numOrBlank(form.get("bodyFat")),
    waist: numOrBlank(form.get("waist")),
    chest: numOrBlank(form.get("chest")),
    arm: numOrBlank(form.get("arm")),
    thigh: numOrBlank(form.get("thigh")),
    hips: numOrBlank(form.get("hips")),
    neck: numOrBlank(form.get("neck")),
    sleepHours: numOrBlank(form.get("sleepHours")),
    notes: String(form.get("notes") || "").trim()
  };

  const hasMetric = Object.entries(record).some(([key, value]) => !["id", "date", "notes"].includes(key) && value !== "");
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
  persistAndRender();
  toast(index >= 0 ? "Medición actualizada." : "Medición guardada.");
}

function saveGoals(event) {
  event.preventDefault();
  const form = new FormData(els.goalForm);
  Object.keys(state.goals).forEach((key) => {
    state.goals[key] = form.get(key) || "";
  });
  persistAndRender();
  toast("Objetivos guardados.");
}

function savePreferences(event) {
  event.preventDefault();
  state.preferences.defaultRestSeconds = Number(els.preferencesForm.defaultRestSeconds.value || 90);
  state.preferences.unitSystem = els.preferencesForm.unitSystem.value;
  state.preferences.autoStartRest = els.preferencesForm.autoStartRest.checked;
  state.preferences.keepScreenAwake = els.preferencesForm.keepScreenAwake.checked;
  persistAndRender();
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
  row.querySelector('[data-field="rest"]').value = data.rest || state.preferences.defaultRestSeconds;
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
  $$('[data-action]').forEach((button) => {
    button.onclick = () => handleAction(button.dataset.action, button.dataset.id);
  });
}

function handleAction(action, id) {
  switch (action) {
    case "start-routine": {
      state.session.routineId = id;
      state.session.active = true;
      state.session.startedAt = new Date().toISOString();
      state.session.completedExerciseIds = [];
      state.session.entries = [];
      persistAndRender();
      setActiveTab("session");
      requestWakeLock();
      toast("Sesión iniciada.");
      break;
    }
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
      persistAndRender();
      toast("Rutina duplicada.");
      break;
    }
    case "delete-routine": {
      if (!confirm("¿Borrar esta rutina?")) return;
      state.routines = state.routines.filter((item) => item.id !== id);
      if (state.session.routineId === id) endSession(false);
      persistAndRender();
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
    case "delete-workout": {
      if (!confirm("¿Borrar este registro?")) return;
      state.workouts = state.workouts.filter((item) => item.id !== id);
      persistAndRender();
      toast("Registro borrado.");
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
      persistAndRender();
      toast("Medición borrada.");
      break;
    }
    case "toggle-complete-exercise": {
      const list = new Set(state.session.completedExerciseIds);
      if (list.has(id)) list.delete(id); else list.add(id);
      state.session.completedExerciseIds = [...list];
      persistAndRender();
      break;
    }
    case "save-session-set": {
      saveSessionSet(id);
      break;
    }
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
  state.session = {
    active: true,
    routineId,
    startedAt: new Date().toISOString(),
    completedExerciseIds: [],
    entries: []
  };
  persistAndRender();
  requestWakeLock();
  toast("Sesión iniciada.");
}

function endSession(showToast = true) {
  state.session = {
    active: false,
    routineId: "",
    startedAt: "",
    completedExerciseIds: [],
    entries: []
  };
  releaseWakeLock();
  stopRestTimer();
  persistAndRender();
  if (showToast) toast("Sesión cerrada.");
}

function saveSessionSet(exerciseId) {
  const routine = state.routines.find((item) => item.id === state.session.routineId);
  const exercise = routine?.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return;

  const weight = Number($("#session-weight-" + CSS.escape(exerciseId)).value || 0);
  const sets = Number($("#session-sets-" + CSS.escape(exerciseId)).value || 0);
  const reps = Number($("#session-reps-" + CSS.escape(exerciseId)).value || 0);
  const rest = Number($("#session-rest-" + CSS.escape(exerciseId)).value || state.preferences.defaultRestSeconds);
  if (!weight || !sets || !reps) {
    toast("Completa peso, series y reps.");
    return;
  }

  state.workouts.push({
    id: uid(),
    date: TODAY,
    routineId: state.session.routineId,
    exercise: exercise.name,
    weight,
    sets,
    reps,
    rpe: "",
    rest,
    tempo: "",
    notes: "Guardado desde sesión activa",
    createdAt: new Date().toISOString()
  });

  if (!state.session.completedExerciseIds.includes(exerciseId)) {
    state.session.completedExerciseIds.push(exerciseId);
  }
  state.session.entries.push({ exerciseId, weight, sets, reps, rest, at: new Date().toISOString() });

  persistAndRender();
  toast(`${exercise.name} guardado.`);
  if (state.preferences.autoStartRest) startRestTimer(rest);
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

function loadDemoData() {
  if (state.workouts.length || state.measurements.length) {
    if (!confirm("Ya hay datos. ¿Quieres reemplazarlos con la demo?")) return;
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

  state = structuredClone(defaultState);
  state.routines = [routineA, routineB];
  state.workouts = [
    workoutDemo(TODAY, routineA.id, "Press banca", 80, 4, 6),
    workoutDemo(offsetDate(TODAY, -3), routineA.id, "Press banca", 77.5, 4, 6),
    workoutDemo(offsetDate(TODAY, -7), routineA.id, "Press banca", 75, 4, 6),
    workoutDemo(offsetDate(TODAY, -10), routineA.id, "Press militar", 45, 3, 8),
    workoutDemo(offsetDate(TODAY, -13), routineB.id, "Sentadilla", 110, 4, 5),
    workoutDemo(offsetDate(TODAY, -17), routineB.id, "Sentadilla", 105, 4, 5),
    workoutDemo(offsetDate(TODAY, -20), routineB.id, "Prensa", 180, 3, 10),
    workoutDemo(offsetDate(TODAY, -24), routineA.id, "Dominadas lastradas", 15, 4, 6)
  ];
  state.measurements = [
    measurementDemo(TODAY, 81.2, 14.4, 82.5, 104, 39.2, 59.5, 97.5, 38.2, 7.2),
    measurementDemo(offsetDate(TODAY, -14), 81.9, 14.9, 83.1, 103.6, 39.0, 59.2, 97.9, 38.1, 7.0),
    measurementDemo(offsetDate(TODAY, -30), 82.8, 15.6, 84.0, 103.0, 38.4, 58.8, 98.5, 38.0, 6.7)
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
  persistAndRender();
  cancelRoutineEdit();
  cancelWorkoutEdit();
  cancelMeasurementEdit();
  toast("Demo cargada.");
}

function workoutDemo(date, routineId, exercise, weight, sets, reps) {
  return { id: uid(), date, routineId, exercise, weight, sets, reps, rpe: "", rest: 90, tempo: "", notes: "Demo", createdAt: new Date().toISOString() };
}
function measurementDemo(date, bodyWeight, bodyFat, waist, chest, arm, thigh, hips, neck, sleepHours) {
  return { id: uid(), date, bodyWeight, bodyFat, waist, chest, arm, thigh, hips, neck, sleepHours, notes: "Demo" };
}

function resetAllData() {
  if (!confirm("¿Seguro que quieres borrar todos los datos?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(defaultState);
  ensureMinimumData();
  cancelRoutineEdit();
  cancelWorkoutEdit();
  cancelMeasurementEdit();
  persistAndRender();
  toast("Datos reiniciados.");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, `gymflow-backup-${TODAY}.json`);
}

function exportCsv() {
  const workoutsCsv = toCsv(state.workouts, ["date", "routineId", "exercise", "weight", "sets", "reps", "rpe", "rest", "tempo", "notes"]);
  const measurementsCsv = toCsv(state.measurements, ["date", "bodyWeight", "bodyFat", "waist", "chest", "arm", "thigh", "hips", "neck", "sleepHours", "notes"]);
  const blob = new Blob([`WORKOUTS\n${workoutsCsv}\n\nMEASUREMENTS\n${measurementsCsv}`], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `gymflow-export-${TODAY}.csv`);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result));
      state = mergeDeep(structuredClone(defaultState), imported);
      persistAndRender();
      toast("Datos importados.");
    } catch {
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
      if (registration.waiting) {
        els.updateBanner.hidden = false;
      }
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            els.updateBanner.hidden = false;
          }
        });
      });
    }).catch(() => {});

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    els.installBtn.hidden = false;
  });

  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches) {
    els.iosInstallBtn.hidden = false;
  }
}

async function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBtn.hidden = true;
}

function refreshApp() {
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration?.waiting) registration.waiting.postMessage("SKIP_WAITING");
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
  } catch {}
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

function getLastWorkoutByExercise(exercise) {
  return state.workouts.filter((item) => item.exercise === exercise).sort(sortByDateDesc)[0] || null;
}

function computeBestLiftMap() {
  return state.workouts.reduce((acc, item) => {
    if (!acc[item.exercise] || Number(item.weight) > Number(acc[item.exercise])) {
      acc[item.exercise] = Number(item.weight);
    }
    return acc;
  }, {});
}

function computeStreak(workouts) {
  const uniqueDates = [...new Set(workouts.map((item) => item.date))].sort().reverse();
  if (!uniqueDates.length) return 0;
  if (daysBetween(uniqueDates[0], TODAY) > 2) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i += 1) {
    const diff = daysBetween(uniqueDates[i], uniqueDates[i - 1]);
    if (diff <= 2) streak += 1;
    else break;
  }
  return streak;
}

function estimateE1RM(weight, reps) {
  return Number(weight || 0) * (1 + Number(reps || 0) / 30);
}

function nextLoadSuggestion(weight, reps) {
  const base = Number(weight || 0);
  if (!base) return 0;
  return reps >= 8 ? base + 2.5 : base + 1.25;
}

function calcVolume(item) {
  return Number(item.weight || 0) * Number(item.reps || 0) * Number(item.sets || 0);
}

function getWorkoutSorter(sortBy) {
  switch (sortBy) {
    case "date_asc": return sortByDateAsc;
    case "weight_desc": return (a, b) => Number(b.weight) - Number(a.weight);
    case "exercise_asc": return (a, b) => a.exercise.localeCompare(b.exercise, "es");
    default: return sortByDateDesc;
  }
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

function extractMainRep(value) {
  if (typeof value === "number") return value;
  const text = String(value || "");
  const match = text.match(/\d+/);
  return match ? match[0] : "";
}

function buildLineChart(points, suffix = "") {
  const width = 520;
  const height = 230;
  const padding = 26;
  const values = points.map((item) => item.value);
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
  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="gráfico de evolución">
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
          <h4 class="list-title">${escapeHtml(title)}</h4>
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
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  return Math.random().toString(36).slice(2, 10);
}

function formatNumber(value) {
  return Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1);
}

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatShortDateTime(dateTime) {
  if (!dateTime) return "";
  return new Date(dateTime).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function shortLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function offsetDate(date, amount) {
  const base = new Date(`${date}T12:00:00`);
  base.setDate(base.getDate() + amount);
  return base.toISOString().slice(0, 10);
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
