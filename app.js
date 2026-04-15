import { collectExerciseOptions, getExerciseMeta, getMuscleGroupOptions, normalizeRoutineExercise, normalizeWorkoutRecord } from "./js/catalog.js";
import { buildWorkoutGroups, computeStats, getExerciseReference, getSuggestedRoutine, resolveGroupEntries, syncAllSessionHistory, syncSessionHistoryEntry } from "./js/analytics.js";
import { createPwaManager } from "./js/pwa.js";
import {
  addSessionSet,
  beginSessionFromRoutine,
  copyLastSessionIntoActive,
  deleteSessionSet,
  discardActiveSession,
  endSession,
  getSessionDurationSeconds,
  getSessionEntriesByExercise,
  getWorkingEntriesByExercise,
  hasActiveSessionRisk,
  restoreLastDeletedSessionSet,
  setSessionNotes,
  toggleSkipExercise
} from "./js/session.js";
import { createStore, defaultState, migrateState } from "./js/store.js";
import { setActiveTab, toast } from "./js/ui-common.js";
import { renderDashboard, renderStats } from "./js/ui-dashboard.js";
import { renderAnalytics, renderGoalForm, renderGoalSummary, renderPreferencesForm, renderPwaStatus } from "./js/ui-meta.js";
import { renderMeasurements, renderPrList, renderRoutines, renderWorkoutList } from "./js/ui-records.js";
import { renderSession } from "./js/ui-session.js";
import { downloadBlob, FALLBACK_REST_SECONDS, formatDuration, formatNumber, isoFromLocalDateTime, moveItem, numOrBlank, offsetDate, optionalNumber, safeClone, todayLocal, toCsv, uid, roundToStep } from "./js/utils.js";

const els = {
  networkBadge: document.querySelector("#networkBadge"),
  saveStatusBadge: document.querySelector("#saveStatusBadge"),
  installBtn: document.querySelector("#installBtn"),
  iosInstallBtn: document.querySelector("#iosInstallBtn"),
  loadDemoBtn: document.querySelector("#loadDemoBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  importInput: document.querySelector("#importInput"),
  resetBtn: document.querySelector("#resetBtn"),
  refreshAppBtn: document.querySelector("#refreshAppBtn"),
  updateBanner: document.querySelector("#updateBanner"),
  dashboardPrimaryCard: document.querySelector("#dashboardPrimaryCard"),
  recommendedRoutine: document.querySelector("#recommendedRoutine"),
  quickSignals: document.querySelector("#quickSignals"),
  recentStory: document.querySelector("#recentStory"),
  dashboardExerciseSelect: document.querySelector("#dashboardExerciseSelect"),
  dashboardExerciseMetricSelect: document.querySelector("#dashboardExerciseMetricSelect"),
  chartAggregationSelect: document.querySelector("#chartAggregationSelect"),
  dashboardMetricSelect: document.querySelector("#dashboardMetricSelect"),
  exerciseChart: document.querySelector("#exerciseChart"),
  bodyChart: document.querySelector("#bodyChart"),
  statSessionsMonth: document.querySelector("#statSessionsMonth"),
  statStreak: document.querySelector("#statStreak"),
  statWeight: document.querySelector("#statWeight"),
  statBestLift: document.querySelector("#statBestLift"),
  statBestLiftLabel: document.querySelector("#statBestLiftLabel"),
  statBestE1rm: document.querySelector("#statBestE1rm"),
  statBestE1rmLabel: document.querySelector("#statBestE1rmLabel"),
  sessionRoutineSelect: document.querySelector("#sessionRoutineSelect"),
  startSessionBtn: document.querySelector("#startSessionBtn"),
  endSessionBtn: document.querySelector("#endSessionBtn"),
  discardSessionBtn: document.querySelector("#discardSessionBtn"),
  copyLastSessionBtn: document.querySelector("#copyLastSessionBtn"),
  sessionStatusLabel: document.querySelector("#sessionStatusLabel"),
  sessionDurationLabel: document.querySelector("#sessionDurationLabel"),
  sessionVolumeLabel: document.querySelector("#sessionVolumeLabel"),
  sessionNotes: document.querySelector("#sessionNotes"),
  activeSessionCard: document.querySelector("#activeSessionCard"),
  startRestBtn: document.querySelector("#startRestBtn"),
  stopRestBtn: document.querySelector("#stopRestBtn"),
  restTimerLabel: document.querySelector("#restTimerLabel"),
  manualWorkoutDetails: document.querySelector("#manualWorkoutDetails"),
  workoutForm: document.querySelector("#workoutForm"),
  cancelWorkoutEditBtn: document.querySelector("#cancelWorkoutEditBtn"),
  workoutRoutineSelect: document.querySelector("#workoutRoutineSelect"),
  routineForm: document.querySelector("#routineForm"),
  addExerciseRowBtn: document.querySelector("#addExerciseRowBtn"),
  exerciseRows: document.querySelector("#exerciseRows"),
  exerciseRowTemplate: document.querySelector("#exerciseRowTemplate"),
  routineList: document.querySelector("#routineList"),
  cancelRoutineEditBtn: document.querySelector("#cancelRoutineEditBtn"),
  logFilterSummary: document.querySelector("#logFilterSummary"),
  workoutList: document.querySelector("#workoutList"),
  prList: document.querySelector("#prList"),
  logSearchInput: document.querySelector("#logSearchInput"),
  logRoutineFilter: document.querySelector("#logRoutineFilter"),
  logSortSelect: document.querySelector("#logSortSelect"),
  logSourceFilter: document.querySelector("#logSourceFilter"),
  logMuscleFilter: document.querySelector("#logMuscleFilter"),
  logDatePresetFilter: document.querySelector("#logDatePresetFilter"),
  toggleLogFiltersBtn: document.querySelector("#toggleLogFiltersBtn"),
  logFiltersPanel: document.querySelector("#logFiltersPanel"),
  moreLastSection: document.querySelector("#moreLastSection"),
  moreLastSectionBtn: document.querySelector("#moreLastSectionBtn"),
  measurementForm: document.querySelector("#measurementForm"),
  measurementList: document.querySelector("#measurementList"),
  cancelMeasurementEditBtn: document.querySelector("#cancelMeasurementEditBtn"),
  analyticsHighlights: document.querySelector("#analyticsHighlights"),
  analyticsLiftSelect: document.querySelector("#analyticsLiftSelect"),
  analyticsLiftChart: document.querySelector("#analyticsLiftChart"),
  analyticsFrequencyChart: document.querySelector("#analyticsFrequencyChart"),
  analyticsVolumeChart: document.querySelector("#analyticsVolumeChart"),
  analyticsMonthlyChart: document.querySelector("#analyticsMonthlyChart"),
  analyticsStalls: document.querySelector("#analyticsStalls"),
  analyticsMuscles: document.querySelector("#analyticsMuscles"),
  analyticsHabits: document.querySelector("#analyticsHabits"),
  goalForm: document.querySelector("#goalForm"),
  goalSummary: document.querySelector("#goalSummary"),
  preferencesForm: document.querySelector("#preferencesForm"),
  pwaStatusBox: document.querySelector("#pwaStatusBox"),
  iosInstallDialog: document.querySelector("#iosInstallDialog"),
  closeIosDialogBtn: document.querySelector("#closeIosDialogBtn"),
  groupEditorDialog: document.querySelector("#groupEditorDialog"),
  groupEditorForm: document.querySelector("#groupEditorForm"),
  groupEditorTitle: document.querySelector("#groupEditorTitle"),
  groupEditorContent: document.querySelector("#groupEditorContent"),
  closeGroupEditorBtn: document.querySelector("#closeGroupEditorBtn"),
  exerciseSuggestions: document.querySelector("#exerciseSuggestions"),
  toastRegion: document.querySelector("#toastRegion")
};

let store;
let pwa;
let exerciseOptions = [];
let muscleOptions = [];
let wakeLock = null;
let tickInterval = null;
let editingEntriesContext = null;

boot();

async function boot() {
  store = await createStore(els.saveStatusBadge);
  ensureMinimumData();
  syncAllSessionHistory(store.state);
  pwa = createPwaManager(els, () => renderSettingsArea());
  await pwa.init();
  bindEvents();
  setDefaultDates();
  cancelRoutineEdit();
  cancelWorkoutEdit();
  cancelMeasurementEdit();
  setActiveTab(store.state, store.state.ui.activeTab || "dashboard");
  refreshAll();
  updateNetworkStatus();
  startTickers();
  store.queueSave();
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveTab(store.state, tab.dataset.tab);
      store.queueSave();
    });
    tab.addEventListener("keydown", handleTabKeydown);
  });

  document.addEventListener("click", handleDelegatedClick);

  els.loadDemoBtn.addEventListener("click", loadDemoData);
  els.exportBtn.addEventListener("click", exportJson);
  els.exportCsvBtn.addEventListener("click", exportCsv);
  els.importInput.addEventListener("change", importJson);
  els.resetBtn.addEventListener("click", resetAllData);

  els.installBtn.addEventListener("click", async () => {
    await pwa.promptInstall();
    renderSettingsArea();
  });
  els.iosInstallBtn.addEventListener("click", () => els.iosInstallDialog.showModal());
  els.closeIosDialogBtn.addEventListener("click", () => els.iosInstallDialog.close());
  els.refreshAppBtn.addEventListener("click", () => pwa.refreshApp());

  els.dashboardExerciseSelect.addEventListener("change", (event) => {
    store.state.ui.dashboardExerciseId = event.target.value;
    renderDashboardArea();
    store.queueSave();
  });
  els.dashboardExerciseMetricSelect.addEventListener("change", (event) => {
    store.state.ui.dashboardExerciseMetric = event.target.value;
    renderDashboardArea();
    store.queueSave();
  });
  els.dashboardMetricSelect.addEventListener("change", (event) => {
    store.state.ui.dashboardMetric = event.target.value;
    renderDashboardArea();
    store.queueSave();
  });
  els.chartAggregationSelect?.addEventListener("change", (event) => {
    store.state.ui.chartAggregation = event.target.value;
    renderDashboardArea();
    renderAnalyticsArea();
    store.queueSave();
  });
  els.analyticsLiftSelect.addEventListener("change", (event) => {
    store.state.ui.analyticsLiftId = event.target.value;
    renderAnalyticsArea();
    store.queueSave();
  });

  els.startSessionBtn.addEventListener("click", startSessionFromSelect);
  els.endSessionBtn.addEventListener("click", handleEndSession);
  els.discardSessionBtn.addEventListener("click", handleDiscardSession);
  els.copyLastSessionBtn.addEventListener("click", handleCopyLastSession);
  els.sessionNotes.addEventListener("input", (event) => {
    setSessionNotes(store.state, event.target.value);
    store.queueSave();
  });
  els.startRestBtn.addEventListener("click", () => startRestTimer(Number(store.state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS)));
  els.stopRestBtn.addEventListener("click", stopRestTimer);
  els.manualWorkoutDetails.addEventListener("toggle", () => {
    store.state.ui.sessionManualOpen = els.manualWorkoutDetails.open;
    store.queueSave();
  });

  els.workoutForm.addEventListener("submit", saveWorkoutFromForm);
  els.cancelWorkoutEditBtn.addEventListener("click", cancelWorkoutEdit);
  els.routineForm.addEventListener("submit", saveRoutineFromForm);
  els.addExerciseRowBtn.addEventListener("click", () => addExerciseRow());
  els.cancelRoutineEditBtn.addEventListener("click", cancelRoutineEdit);
  els.measurementForm.addEventListener("submit", saveMeasurementFromForm);
  els.cancelMeasurementEditBtn.addEventListener("click", cancelMeasurementEdit);
  els.goalForm.addEventListener("submit", saveGoals);
  els.preferencesForm.addEventListener("submit", savePreferences);
  els.groupEditorForm.addEventListener("submit", saveEditedHistoryEntries);
  els.closeGroupEditorBtn.addEventListener("click", () => els.groupEditorDialog.close());

  els.logSearchInput.addEventListener("input", (event) => {
    store.state.ui.logSearch = event.target.value;
    renderLogsArea();
    store.queueSave();
  });
  els.logRoutineFilter.addEventListener("change", (event) => {
    store.state.ui.logRoutine = event.target.value;
    renderLogsArea();
    store.queueSave();
  });
  els.logSortSelect.addEventListener("change", (event) => {
    store.state.ui.logSort = event.target.value;
    renderLogsArea();
    store.queueSave();
  });
  els.logSourceFilter.addEventListener("change", (event) => {
    store.state.ui.logSource = event.target.value;
    renderLogsArea();
    store.queueSave();
  });
  els.logMuscleFilter.addEventListener("change", (event) => {
    store.state.ui.logMuscle = event.target.value;
    renderLogsArea();
    store.queueSave();
  });
  els.logDatePresetFilter.addEventListener("change", (event) => {
    store.state.ui.logDatePreset = event.target.value;
    renderLogsArea();
    store.queueSave();
  });
  els.toggleLogFiltersBtn?.addEventListener("click", () => {
    const open = !els.logFiltersPanel.open;
    els.logFiltersPanel.open = open;
    els.toggleLogFiltersBtn.setAttribute("aria-expanded", open ? "true" : "false");
    store.state.ui.logFiltersOpen = open;
    store.queueSave();
  });
  els.logFiltersPanel?.addEventListener("toggle", () => {
    const open = els.logFiltersPanel.open;
    if (els.toggleLogFiltersBtn) els.toggleLogFiltersBtn.setAttribute("aria-expanded", open ? "true" : "false");
    store.state.ui.logFiltersOpen = open;
    store.queueSave();
  });

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  window.addEventListener("resize", syncToastOffsetFromBottomNav);
  window.addEventListener("orientationchange", syncToastOffsetFromBottomNav);
  window.addEventListener("pagehide", () => {
    releaseWakeLock();
    store.flushSave().catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      store.flushSave().catch(() => {});
    } else if (document.visibilityState === "visible" && store.state.preferences.keepScreenAwake && store.state.session.active) {
      requestWakeLock();
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (hasActiveSessionRisk(store.state)) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}

function handleTabKeydown(event) {
  const tabs = [...document.querySelectorAll(".tab")];
  const currentIndex = tabs.indexOf(event.currentTarget);
  if (currentIndex < 0) return;
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    const nextIndex = event.key === "ArrowRight" ? (currentIndex + 1) % tabs.length : (currentIndex - 1 + tabs.length) % tabs.length;
    tabs[nextIndex].focus();
    setActiveTab(store.state, tabs[nextIndex].dataset.tab);
    store.queueSave();
  }
}

function handleDelegatedClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  handleAction(button.dataset.action, button.dataset.id, button);
}

function handleAction(action, id, trigger) {
  switch (action) {
    case "open-tab":
      if (["routines", "measurements", "analytics", "goals", "settings"].includes(id)) {
        store.state.ui.moreSection = id;
      }
      if (id === "more" && ["routines", "measurements", "analytics", "goals", "settings"].includes(store.state.ui.activeTab)) {
        store.state.ui.moreSection = store.state.ui.activeTab;
      }
      setActiveTab(store.state, id);
      if (id === "more") renderMoreArea();
      store.queueSave();
      break;
    case "open-last-more-section":
      setActiveTab(store.state, store.state.ui.moreSection || "routines");
      store.queueSave();
      break;
    case "load-demo":
      loadDemoData();
      break;
    case "continue-session":
      setActiveTab(store.state, "session");
      break;
    case "start-routine":
      startRoutineById(id);
      break;
    case "edit-routine":
      editRoutine(id);
      break;
    case "duplicate-routine":
      duplicateRoutine(id);
      break;
    case "delete-routine":
      deleteRoutine(id);
      break;
    case "apply-routine-template":
      applyRoutineTemplate(id);
      break;
    case "edit-history-group":
      openHistoryGroupEditor(id);
      break;
    case "edit-session-history":
      openSessionHistoryEditor(id);
      break;
    case "delete-workout-group":
      deleteWorkoutGroup(id);
      break;
    case "delete-session-history":
      deleteSessionHistory(id);
      break;
    case "edit-measurement":
      editMeasurement(id);
      break;
    case "delete-measurement":
      deleteMeasurement(id);
      break;
    case "toggle-skip-exercise":
      handleToggleSkipExercise(id);
      break;
    case "add-session-set":
      handleAddSessionSet(id);
      break;
    case "delete-session-set":
      handleDeleteSessionSet(id);
      break;
    case "fill-last-session-values":
      fillLastReferenceValues(id);
      break;
    case "repeat-last-session-set":
      repeatLastSessionSet(id);
      break;
    case "save-last-session-set-again":
      saveLastSessionSetAgain(id);
      break;
    case "remove-routine-row":
      trigger.closest(".exercise-row")?.remove();
      break;
    case "add-below-routine-row":
      addExerciseRow({}, trigger.closest(".exercise-row"));
      break;
    case "duplicate-routine-row":
      duplicateRoutineRow(trigger.closest(".exercise-row"));
      break;
    case "move-routine-row-up":
      moveRoutineRow(trigger.closest(".exercise-row"), -1);
      break;
    case "move-routine-row-down":
      moveRoutineRow(trigger.closest(".exercise-row"), 1);
      break;
    default:
      break;
  }
}

function refreshAll() {
  syncToastOffsetFromBottomNav();
  refreshExerciseOptions();
  populateRoutineSelects();
  populateLogFilters();
  renderStats(store.state, els);
  renderDashboardArea();
  renderMoreArea();
  renderSessionArea();
  renderRoutinesArea();
  renderLogsArea();
  renderMeasurementsArea();
  renderAnalyticsArea();
  renderGoalsArea();
  renderSettingsArea();
}

function refreshExerciseOptions() {
  exerciseOptions = collectExerciseOptions({ workouts: store.state.workouts, routines: store.state.routines });
  muscleOptions = getMuscleGroupOptions({ workouts: store.state.workouts, routines: store.state.routines });
  els.exerciseSuggestions.innerHTML = exerciseOptions.map((item) => `<option value="${item.name}"></option>`).join("");
}

function populateRoutineSelects() {
  const routineOptions = store.state.routines.map((routine) => `<option value="${routine.id}">${routine.name}</option>`).join("");
  els.sessionRoutineSelect.innerHTML = `<option value="">Selecciona rutina</option>${routineOptions}`;
  els.workoutRoutineSelect.innerHTML = `<option value="">Sin rutina</option>${routineOptions}`;
  els.logRoutineFilter.innerHTML = `<option value="all">Todas las rutinas</option>${routineOptions}`;
  els.sessionRoutineSelect.value = store.state.session.routineId || "";
  els.logRoutineFilter.value = store.state.ui.logRoutine || "all";
}

function populateLogFilters() {
  els.logSourceFilter.value = store.state.ui.logSource || "all";
  els.logDatePresetFilter.value = store.state.ui.logDatePreset || "all";
  const options = muscleOptions.map((item) => `<option value="${item}">${item}</option>`).join("");
  els.logMuscleFilter.innerHTML = `<option value="all">Todos los grupos</option>${options}`;
  els.logMuscleFilter.value = store.state.ui.logMuscle || "all";
  els.logSearchInput.value = store.state.ui.logSearch || "";
  els.logSortSelect.value = store.state.ui.logSort || "date_desc";
}

function renderDashboardArea() {
  renderStats(store.state, els);
  renderDashboard(store.state, els, exerciseOptions);
}

function renderSessionArea() {
  populateRoutineSelects();
  els.manualWorkoutDetails.open = store.state.ui.sessionManualOpen || !store.state.preferences.collapseManualLog;
  renderSession(store.state, els);
}

function renderRoutinesArea() {
  renderRoutines(store.state, els);
}

function renderLogsArea() {
  populateRoutineSelects();
  populateLogFilters();
  if (els.logFiltersPanel) els.logFiltersPanel.open = Boolean(store.state.ui.logFiltersOpen);
  if (els.toggleLogFiltersBtn) els.toggleLogFiltersBtn.setAttribute("aria-expanded", store.state.ui.logFiltersOpen ? "true" : "false");
  renderWorkoutList(store.state, els);
  renderPrList(store.state, els);
}

function renderMoreArea() {
  const map = { routines: "Rutinas", measurements: "Medidas", analytics: "Evolución", goals: "Objetivos", settings: "Ajustes" };
  const section = store.state.ui.moreSection;
  if (!section || !map[section]) {
    if (els.moreLastSection) els.moreLastSection.hidden = true;
    return;
  }
  if (els.moreLastSection) els.moreLastSection.hidden = false;
  if (els.moreLastSectionBtn) els.moreLastSectionBtn.textContent = `Volver a ${map[section]}`;
}

function renderMeasurementsArea() {
  renderMeasurements(store.state, els);
}

function renderAnalyticsArea() {
  renderAnalytics(store.state, els, exerciseOptions);
}

function renderGoalsArea() {
  renderGoalSummary(store.state, els);
  renderGoalForm(store.state, els);
}

function renderSettingsArea() {
  renderPreferencesForm(store.state, els);
  renderPwaStatus(els, pwa.getStatus(), { mode: store.state.meta.storageMode || "indexeddb" });
}

function refreshWorkoutDependentAreas() {
  refreshExerciseOptions();
  populateRoutineSelects();
  populateLogFilters();
  renderDashboardArea();
  renderMoreArea();
  renderSessionArea();
  renderRoutinesArea();
  renderLogsArea();
  renderAnalyticsArea();
  renderGoalsArea();
}

function refreshMeasurementDependentAreas() {
  renderDashboardArea();
  renderMeasurementsArea();
  renderAnalyticsArea();
  renderGoalsArea();
}

function refreshRoutineDependentAreas() {
  refreshExerciseOptions();
  populateRoutineSelects();
  populateLogFilters();
  renderDashboardArea();
  renderMoreArea();
  renderSessionArea();
  renderRoutinesArea();
  renderLogsArea();
  renderAnalyticsArea();
}

function ensureMinimumData() {
  if (!store.state.routines.length) {
    store.state.routines = starterRoutines();
  }
}

function starterRoutines() {
  return [
    {
      id: uid(),
      name: "Torso A",
      day: "Día A",
      focus: "Hipertrofia controlada",
      notes: "Bloque base",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: [
        normalizeRoutineExercise({ id: uid(), block: "A1", name: "Press banca", sets: 4, reps: "6-8", rest: 120, notes: "Pausa 1s en pecho" }),
        normalizeRoutineExercise({ id: uid(), block: "A2", name: "Remo con barra", sets: 4, reps: "8-10", rest: 90 }),
        normalizeRoutineExercise({ id: uid(), block: "B", name: "Press militar", sets: 3, reps: "8-10", rest: 90 }),
        normalizeRoutineExercise({ id: uid(), block: "C", name: "Fondos", sets: 3, reps: "8-12", rest: 75 })
      ]
    },
    {
      id: uid(),
      name: "Pierna B",
      day: "Día B",
      focus: "Fuerza + cadena posterior",
      notes: "Prioridad básicos",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: [
        normalizeRoutineExercise({ id: uid(), block: "A", name: "Sentadilla", sets: 4, reps: "5-6", rest: 150 }),
        normalizeRoutineExercise({ id: uid(), block: "B", name: "Peso muerto rumano", sets: 3, reps: "8-10", rest: 120 }),
        normalizeRoutineExercise({ id: uid(), block: "C1", name: "Prensa", sets: 3, reps: "10-12", rest: 90 }),
        normalizeRoutineExercise({ id: uid(), block: "C2", name: "Plancha", sets: 3, reps: "30", rest: 45 })
      ]
    }
  ];
}

function setDefaultDates() {
  if (els.workoutForm.date) els.workoutForm.date.value = todayLocal();
  if (els.measurementForm.date) els.measurementForm.date.value = todayLocal();
}

function startSessionFromSelect() {
  startRoutineById(els.sessionRoutineSelect.value);
}

function startRoutineById(routineId) {
  const result = beginSessionFromRoutine(store.state, routineId, window.confirm);
  if (result.status === "started") {
    stopRestTimer();
    store.queueSave();
    setActiveTab(store.state, "session");
    requestWakeLock();
    refreshWorkoutDependentAreas();
  }
  if (result.status === "existing") {
    setActiveTab(store.state, "session");
  }
  if (result.message) toast(els, result.message);
}

async function handleEndSession() {
  if (!store.state.session.active) {
    toast(els, "No hay sesión activa.");
    return;
  }

  if (!store.state.session.setEntries.length) {
    const accepted = window.confirm("La sesión está vacía. ¿Quieres descartarla en lugar de cerrarla?");
    if (accepted) handleDiscardSession(true);
    return;
  }

  const summary = `${store.state.session.setEntries.length} series · ${formatDuration(getSessionDurationSeconds(store.state))}`;
  if (!window.confirm(`Se va a guardar y cerrar la sesión (${summary}). ¿Continuar?`)) return;

  const result = endSession(store.state);
  if (!result.ok) {
    toast(els, result.message);
    return;
  }
  releaseWakeLock();
  stopRestTimer();
  refreshWorkoutDependentAreas();
  renderMeasurementsArea();
  renderSettingsArea();
  toast(els, result.message);
  await store.flushSave();
}

function handleDiscardSession(force = false) {
  if (!store.state.session.active) {
    toast(els, "No hay sesión activa.");
    return;
  }
  const hasData = hasActiveSessionRisk(store.state);
  if (!force) {
    const message = hasData
      ? "Vas a descartar la sesión activa y sus series temporales. Esta acción es destructiva. ¿Quieres continuar?"
      : "La sesión está vacía. ¿Quieres descartarla?";
    if (!window.confirm(message)) return;
  }
  discardActiveSession(store.state);
  releaseWakeLock();
  stopRestTimer();
  store.queueSave();
  renderSessionArea();
  renderDashboardArea();
  toast(els, hasData ? "Sesión descartada." : "Sesión vacía descartada.");
}

function handleCopyLastSession() {
  const result = copyLastSessionIntoActive(store.state, window.confirm);
  if (!result.ok) {
    toast(els, result.message);
    return;
  }
  store.queueSave();
  renderSessionArea();
  renderDashboardArea();
  toast(els, result.message);
}

function handleAddSessionSet(exerciseId) {
  const weightInput = document.querySelector(`#session-weight-${CSS.escape(exerciseId)}`);
  const repsInput = document.querySelector(`#session-reps-${CSS.escape(exerciseId)}`);
  const rpeInput = document.querySelector(`#session-rpe-${CSS.escape(exerciseId)}`);
  const restInput = document.querySelector(`#session-rest-${CSS.escape(exerciseId)}`);
  const warmupInput = document.querySelector(`#session-warmup-${CSS.escape(exerciseId)}`);

  const result = addSessionSet(store.state, exerciseId, {
    weight: Number(weightInput?.value),
    reps: Number(repsInput?.value),
    rpe: rpeInput?.value || "",
    rest: Number(restInput?.value || store.state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS),
    isWarmup: warmupInput?.checked || false
  });
  if (!result.ok) {
    toast(els, result.message);
    return;
  }

  if (rpeInput) rpeInput.value = "";
  if (warmupInput) warmupInput.checked = false;

  store.queueSave();
  renderSessionArea();
  renderDashboardArea();
  renderAnalyticsArea();
  toast(els, result.message);
  if (store.state.preferences.autoStartRest) startRestTimer(result.rest);

  window.requestAnimationFrame(() => {
    const focusTargetId = result.currentExerciseCompleted && result.nextExerciseId && result.nextExerciseId !== exerciseId ? result.nextExerciseId : exerciseId;
    document.querySelector(`#exercise-card-${CSS.escape(focusTargetId)}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    document.querySelector(`#session-weight-${CSS.escape(focusTargetId)}`)?.focus();
    document.querySelector(`#session-weight-${CSS.escape(focusTargetId)}`)?.select();
  });
}

function handleDeleteSessionSet(entryId) {
  const result = deleteSessionSet(store.state, entryId);
  if (!result.ok) {
    toast(els, result.message);
    return;
  }
  store.queueSave();
  renderSessionArea();
  renderDashboardArea();
  renderAnalyticsArea();
  toast(els, result.message, {
    actionLabel: "Deshacer",
    onAction: () => {
      restoreLastDeletedSessionSet(store.state);
      store.queueSave();
      renderSessionArea();
      renderDashboardArea();
      renderAnalyticsArea();
      toast(els, "Serie recuperada.");
    }
  });
}

function handleToggleSkipExercise(exerciseId) {
  const result = toggleSkipExercise(store.state, exerciseId);
  store.queueSave();
  renderSessionArea();
  renderDashboardArea();
  toast(els, result.message);
}

function fillLastReferenceValues(exerciseId) {
  const routine = store.state.routines.find((item) => item.id === store.state.session.routineId);
  const exercise = routine?.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return;
  const ref = getExerciseReference(store.state, exercise.catalogId || exercise.exerciseKey || exercise.name, store.state.session.routineId)
    || getExerciseReference(store.state, exercise.catalogId || exercise.exerciseKey || exercise.name);
  if (!ref) {
    toast(els, "No hay referencia previa para este ejercicio.");
    return;
  }
  document.querySelector(`#session-weight-${CSS.escape(exerciseId)}`).value = ref.weight;
  document.querySelector(`#session-reps-${CSS.escape(exerciseId)}`).value = ref.reps;
  document.querySelector(`#session-rest-${CSS.escape(exerciseId)}`).value = ref.rest || exercise.rest || store.state.preferences.defaultRestSeconds;
  toast(els, "Se han rellenado los valores de la última referencia.");
}

function repeatLastSessionSet(exerciseId) {
  const last = getSessionEntriesByExercise(store.state, exerciseId).slice(-1)[0];
  if (!last) {
    toast(els, "Aún no hay una serie previa en esta sesión.");
    return;
  }
  document.querySelector(`#session-weight-${CSS.escape(exerciseId)}`).value = last.weight;
  document.querySelector(`#session-reps-${CSS.escape(exerciseId)}`).value = last.reps;
  document.querySelector(`#session-rest-${CSS.escape(exerciseId)}`).value = last.rest || store.state.preferences.defaultRestSeconds;
  document.querySelector(`#session-rpe-${CSS.escape(exerciseId)}`).value = last.rpe === "" ? "" : last.rpe;
  toast(els, "Se han copiado los valores de la última serie.");
}

function saveLastSessionSetAgain(exerciseId) {
  const last = getSessionEntriesByExercise(store.state, exerciseId).slice(-1)[0];
  if (!last) {
    toast(els, "No hay una serie previa para duplicar.");
    return;
  }
  const result = addSessionSet(store.state, exerciseId, {
    weight: Number(last.weight),
    reps: Number(last.reps),
    rpe: last.rpe,
    rest: Number(last.rest || store.state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS),
    isWarmup: Boolean(last.isWarmup)
  });
  if (!result.ok) {
    toast(els, result.message);
    return;
  }
  store.queueSave();
  renderSessionArea();
  renderDashboardArea();
  renderAnalyticsArea();
  toast(els, "Serie duplicada y guardada.");
  if (store.state.preferences.autoStartRest) startRestTimer(result.rest);
}

function saveWorkoutFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.workoutForm);
  const editingId = store.state.ui.editingWorkoutId;
  const previous = editingId ? store.state.workouts.find((item) => item.id === editingId) : null;
  const meta = getExerciseMeta(form.get("exercise") || "");
  const weight = Number(form.get("weight"));
  const sets = Number(form.get("sets"));
  const reps = Number(form.get("reps"));

  if (!meta.name || !Number.isFinite(weight) || weight < 0 || !Number.isFinite(sets) || sets <= 0 || !Number.isFinite(reps) || reps <= 0) {
    toast(els, "Completa ejercicio, peso válido (puede ser 0), series y reps.");
    return;
  }

  const record = normalizeWorkoutRecord({
    id: editingId || uid(),
    date: form.get("date") || todayLocal(),
    routineId: form.get("routineId") || "",
    sessionId: "",
    exercise: meta.name,
    exerciseId: meta.id,
    exerciseKey: meta.key,
    muscleGroup: meta.muscleGroup,
    movementPattern: meta.pattern,
    weight,
    sets,
    reps,
    rpe: optionalNumber(form.get("rpe"), { min: 1, max: 10 }),
    rest: optionalNumber(form.get("rest"), { min: 0 }),
    tempo: String(form.get("tempo") || "").trim(),
    notes: String(form.get("notes") || "").trim(),
    isWarmup: false,
    source: "manual",
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const index = store.state.workouts.findIndex((item) => item.id === record.id);
  if (index >= 0) store.state.workouts[index] = record;
  else store.state.workouts.push(record);

  cancelWorkoutEdit();
  store.queueSave();
  refreshWorkoutDependentAreas();
  toast(els, index >= 0 ? "Registro actualizado." : "Registro guardado.");
}

function editWorkout(id) {
  const item = store.state.workouts.find((workout) => workout.id === id);
  if (!item) return;
  store.state.ui.editingWorkoutId = id;
  els.cancelWorkoutEditBtn.hidden = false;
  els.manualWorkoutDetails.open = true;
  els.workoutForm.date.value = item.date || todayLocal();
  els.workoutForm.routineId.value = item.routineId || "";
  els.workoutForm.exercise.value = item.exercise || "";
  els.workoutForm.weight.value = item.weight ?? "";
  els.workoutForm.sets.value = item.sets ?? "";
  els.workoutForm.reps.value = item.reps ?? "";
  els.workoutForm.rpe.value = item.rpe ?? "";
  els.workoutForm.rest.value = item.rest ?? "";
  els.workoutForm.tempo.value = item.tempo || "";
  els.workoutForm.notes.value = item.notes || "";
  setActiveTab(store.state, "session");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelWorkoutEdit() {
  store.state.ui.editingWorkoutId = "";
  els.cancelWorkoutEditBtn.hidden = true;
  els.workoutForm.reset();
  setDefaultDates();
}

function saveRoutineFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.routineForm);
  const exercises = [...els.exerciseRows.querySelectorAll(".exercise-row")]
    .map((row) => normalizeRoutineExercise({
      id: row.dataset.id || uid(),
      name: row.querySelector('[data-field="name"]').value.trim(),
      sets: Number(row.querySelector('[data-field="sets"]').value || 0),
      reps: row.querySelector('[data-field="reps"]').value.trim(),
      rest: Number(row.querySelector('[data-field="rest"]').value || store.state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS),
      block: row.querySelector('[data-field="block"]').value.trim(),
      notes: row.querySelector('[data-field="notes"]').value.trim()
    }))
    .filter((item) => item.name);

  const routineName = String(form.get("name") || "").trim();
  if (!routineName || !exercises.length) {
    toast(els, "Pon nombre a la rutina y al menos un ejercicio.");
    return;
  }
  const invalidExercise = exercises.find((item) => Number(item.sets) <= 0 || !String(item.reps || "").trim());
  if (invalidExercise) {
    toast(els, "Revisa la rutina: cada ejercicio necesita series válidas y repeticiones.");
    return;
  }
  const duplicateNames = exercises.map((item) => item.name.toLowerCase()).filter((name, idx, arr) => arr.indexOf(name) !== idx);
  if (duplicateNames.length && !window.confirm("Hay ejercicios duplicados con el mismo nombre. ¿Quieres guardarla igualmente?")) {
    return;
  }

  const editingRoutineId = store.state.ui.editingRoutineId || "";
  const editingActiveSessionRoutine = Boolean(store.state.session.active && store.state.session.routineId && store.state.session.routineId === editingRoutineId);
  const shouldForkActiveRoutine = editingActiveSessionRoutine;
  const routine = {
    id: shouldForkActiveRoutine ? uid() : (editingRoutineId || uid()),
    name: routineName,
    day: String(form.get("day") || "").trim(),
    focus: String(form.get("focus") || "").trim(),
    notes: String(form.get("notes") || "").trim(),
    createdAt: store.state.routines.find((item) => item.id === editingRoutineId)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises
  };

  const index = shouldForkActiveRoutine ? -1 : store.state.routines.findIndex((item) => item.id === routine.id);
  if (index >= 0) store.state.routines[index] = routine;
  else store.state.routines.push(routine);

  cancelRoutineEdit();
  store.queueSave();
  refreshRoutineDependentAreas();
  const complexity = exercises.reduce((sum, item) => sum + Number(item.sets || 0), 0);
  toast(els, shouldForkActiveRoutine
    ? "Había una sesión activa con esta rutina. Se guardó como copia para proteger tu sesión actual."
    : (index >= 0 ? `Rutina actualizada · ${complexity} series planificadas.` : `Rutina guardada · ${complexity} series planificadas.`));
}

function addExerciseRow(data = {}, afterRow = null) {
  const fragment = els.exerciseRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".exercise-row");
  row.dataset.id = data.id || uid();
  row.querySelector('[data-field="block"]').value = data.block || "";
  row.querySelector('[data-field="name"]').value = data.name || "";
  row.querySelector('[data-field="sets"]').value = data.sets || "";
  row.querySelector('[data-field="reps"]').value = data.reps || "";
  row.querySelector('[data-field="rest"]').value = data.rest || store.state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS;
  row.querySelector('[data-field="notes"]').value = data.notes || "";
  if (afterRow && afterRow.parentNode) {
    afterRow.insertAdjacentElement("afterend", row);
  } else {
    els.exerciseRows.appendChild(row);
  }
}

function duplicateRoutineRow(row) {
  if (!row) return;
  addExerciseRow({
    block: row.querySelector('[data-field="block"]').value,
    name: row.querySelector('[data-field="name"]').value,
    sets: row.querySelector('[data-field="sets"]').value,
    reps: row.querySelector('[data-field="reps"]').value,
    rest: row.querySelector('[data-field="rest"]').value,
    notes: row.querySelector('[data-field="notes"]').value
  }, row);
}

function moveRoutineRow(row, direction) {
  if (!row) return;
  const rows = [...els.exerciseRows.querySelectorAll('.exercise-row')];
  const index = rows.indexOf(row);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= rows.length) return;
  const moved = moveItem(rows, index, targetIndex);
  els.exerciseRows.innerHTML = '';
  moved.forEach((item) => els.exerciseRows.appendChild(item));
}

function editRoutine(id) {
  const routine = store.state.routines.find((item) => item.id === id);
  if (!routine) return;
  store.state.ui.editingRoutineId = id;
  els.cancelRoutineEditBtn.hidden = false;
  els.routineForm.name.value = routine.name;
  els.routineForm.day.value = routine.day || "";
  els.routineForm.focus.value = routine.focus || "";
  els.routineForm.notes.value = routine.notes || "";
  els.exerciseRows.innerHTML = "";
  routine.exercises.forEach((exercise) => addExerciseRow(exercise));
  setActiveTab(store.state, "routines");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelRoutineEdit() {
  store.state.ui.editingRoutineId = "";
  els.cancelRoutineEditBtn.hidden = true;
  els.routineForm.reset();
  els.exerciseRows.innerHTML = "";
  addExerciseRow();
}

function applyRoutineTemplate(templateId) {
  const templates = {
    push: { name: 'Push', focus: 'Pecho, hombro, tríceps', exercises: [
      { block: 'A', name: 'Press banca', sets: 4, reps: '6-8', rest: 120 },
      { block: 'B', name: 'Press inclinado mancuernas', sets: 3, reps: '8-10', rest: 90 },
      { block: 'C', name: 'Press militar', sets: 3, reps: '6-10', rest: 90 },
      { block: 'D', name: 'Extensión de tríceps polea', sets: 3, reps: '10-15', rest: 60 }
    ]},
    pull: { name: 'Pull', focus: 'Espalda y bíceps', exercises: [
      { block: 'A', name: 'Dominadas', sets: 4, reps: '6-10', rest: 120 },
      { block: 'B', name: 'Remo con barra', sets: 4, reps: '6-10', rest: 90 },
      { block: 'C', name: 'Jalón al pecho', sets: 3, reps: '10-12', rest: 75 },
      { block: 'D', name: 'Curl bíceps mancuernas', sets: 3, reps: '10-12', rest: 60 }
    ]},
    legs: { name: 'Legs', focus: 'Pierna completa', exercises: [
      { block: 'A', name: 'Sentadilla', sets: 4, reps: '5-8', rest: 150 },
      { block: 'B', name: 'Peso muerto rumano', sets: 3, reps: '8-10', rest: 120 },
      { block: 'C', name: 'Prensa', sets: 3, reps: '10-12', rest: 90 },
      { block: 'D', name: 'Curl femoral', sets: 3, reps: '10-15', rest: 75 }
    ]},
    upper: { name: 'Upper', focus: 'Torso equilibrado', exercises: [
      { block: 'A1', name: 'Press banca', sets: 4, reps: '6-8', rest: 120 },
      { block: 'A2', name: 'Remo con barra', sets: 4, reps: '6-8', rest: 120 },
      { block: 'B1', name: 'Press militar', sets: 3, reps: '8-10', rest: 90 },
      { block: 'B2', name: 'Jalón al pecho', sets: 3, reps: '8-12', rest: 90 }
    ]},
    lower: { name: 'Lower', focus: 'Pierna y core', exercises: [
      { block: 'A', name: 'Sentadilla frontal', sets: 4, reps: '5-8', rest: 150 },
      { block: 'B', name: 'Zancadas', sets: 3, reps: '10-12', rest: 90 },
      { block: 'C', name: 'Hip thrust', sets: 4, reps: '8-12', rest: 90 },
      { block: 'D', name: 'Plancha', sets: 3, reps: '30-45', rest: 45 }
    ]},
    full: { name: 'Full Body', focus: 'Compuestos base', exercises: [
      { block: 'A', name: 'Sentadilla', sets: 3, reps: '5-8', rest: 150 },
      { block: 'B', name: 'Press banca', sets: 3, reps: '6-10', rest: 120 },
      { block: 'C', name: 'Remo con barra', sets: 3, reps: '8-10', rest: 90 },
      { block: 'D', name: 'Peso muerto rumano', sets: 3, reps: '8-10', rest: 120 }
    ]}
  };
  const template = templates[templateId];
  if (!template) return;
  if (els.exerciseRows.querySelector('.exercise-row [data-field="name"]')?.value.trim() && !window.confirm('Se reemplazarán los ejercicios del formulario actual. ¿Continuar?')) {
    return;
  }
  els.exerciseRows.innerHTML = '';
  template.exercises.forEach((exercise) => addExerciseRow(exercise));
  if (!els.routineForm.name.value.trim()) els.routineForm.name.value = template.name;
  if (!els.routineForm.focus.value.trim()) els.routineForm.focus.value = template.focus;
  toast(els, `Plantilla ${template.name} aplicada.`);
}

function duplicateRoutine(id) {
  const routine = store.state.routines.find((item) => item.id === id);
  if (!routine) return;
  const clone = safeClone(routine);
  clone.id = uid();
  clone.name = `${routine.name} copia`;
  clone.createdAt = new Date().toISOString();
  clone.updatedAt = new Date().toISOString();
  clone.exercises = clone.exercises.map((exercise) => ({ ...exercise, id: uid() }));
  store.state.routines.push(clone);
  store.queueSave();
  refreshRoutineDependentAreas();
  toast(els, "Rutina duplicada.");
}

function deleteRoutine(id) {
  if (store.state.session.active && store.state.session.routineId === id && (store.state.session.setEntries.length || store.state.session.notes.trim())) {
    toast(els, "No puedes borrar esta rutina mientras su sesión activa tenga datos. Cierra o descarta la sesión primero.");
    return;
  }
  if (!window.confirm("¿Borrar esta rutina?")) return;
  store.state.routines = store.state.routines.filter((item) => item.id !== id);
  if (store.state.session.routineId === id) {
    discardActiveSession(store.state);
    releaseWakeLock();
    stopRestTimer();
  }
  store.queueSave();
  refreshRoutineDependentAreas();
  renderSessionArea();
  toast(els, "Rutina borrada.");
}

function openHistoryGroupEditor(groupId) {
  const { entryIds, sessionId } = resolveGroupEntries(store.state, groupId);
  const entries = store.state.workouts.filter((item) => entryIds.includes(item.id)).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  if (!entries.length) return;
  editingEntriesContext = { entryIds, sessionId, mode: 'group', allowSetEditing: true };
  els.groupEditorTitle.textContent = `Corregir bloque: ${entries[0].exercise}`;
  els.groupEditorContent.innerHTML = buildEditorRows(entries);
  els.groupEditorDialog.showModal();
}

function openSessionHistoryEditor(sessionId) {
  const entries = store.state.workouts.filter((item) => item.sessionId === sessionId).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  if (!entries.length) return;
  editingEntriesContext = { entryIds: entries.map((item) => item.id), sessionId, mode: 'session', allowSetEditing: false };
  els.groupEditorTitle.textContent = `Corregir sesión completa`;
  els.groupEditorContent.innerHTML = buildEditorRows(entries, true);
  els.groupEditorDialog.showModal();
}

function buildEditorRows(entries, includeExercise = false) {
  const allowSetEditing = Boolean(editingEntriesContext?.allowSetEditing);
  return `
    <div class="editor-grid">
      ${entries.map((entry, index) => `
        <section class="editor-row" data-entry-id="${entry.id}">
          <div class="editor-row-head">
            <strong>Serie ${index + 1}</strong>
            ${includeExercise ? `<span class="chip ghost">${entry.exercise}</span>` : ''}
          </div>
          <div class="editor-row-grid">
            <label>Kg<input name="weight" type="number" min="0" step="0.5" value="${entry.weight}"></label>
            ${allowSetEditing
              ? `<label>Series<input name="sets" type="number" min="1" step="1" value="${entry.sets}"></label>`
              : `<label>Series<input name="sets" type="number" min="1" step="1" value="1" disabled></label>`}
            <label>Reps<input name="reps" type="number" min="1" step="1" value="${entry.reps}"></label>
            <label>RPE<input name="rpe" type="number" min="1" max="10" step="0.5" value="${entry.rpe === '' ? '' : entry.rpe}"></label>
            <label>Descanso<input name="rest" type="number" min="0" step="15" value="${entry.rest === '' ? '' : entry.rest}"></label>
            <label>Notas<textarea name="notes">${entry.notes || ''}</textarea></label>
          </div>
        </section>
      `).join('')}
    </div>
  `;
}

function saveEditedHistoryEntries(event) {
  event.preventDefault();
  if (!editingEntriesContext) return;
  const blocks = [...els.groupEditorContent.querySelectorAll('.editor-row')];
  for (const block of blocks) {
    const entryId = block.dataset.entryId;
    const entry = store.state.workouts.find((item) => item.id === entryId);
    if (!entry) continue;
    const weight = Number(block.querySelector('[name="weight"]').value);
    const sets = editingEntriesContext.allowSetEditing ? Number(block.querySelector('[name="sets"]').value) : 1;
    const reps = Number(block.querySelector('[name="reps"]').value);
    if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(sets) || sets <= 0 || !Number.isFinite(reps) || reps <= 0) {
      toast(els, 'Revisa peso, series y repeticiones.');
      return;
    }
    entry.weight = weight;
    entry.sets = sets;
    entry.reps = reps;
    entry.rpe = optionalNumber(block.querySelector('[name="rpe"]').value, { min: 1, max: 10 });
    entry.rest = optionalNumber(block.querySelector('[name="rest"]').value, { min: 0 });
    entry.notes = block.querySelector('[name="notes"]').value.trim();
    entry.updatedAt = new Date().toISOString();
  }
  if (editingEntriesContext.sessionId) syncSessionHistoryEntry(store.state, editingEntriesContext.sessionId);
  els.groupEditorDialog.close();
  editingEntriesContext = null;
  store.queueSave();
  refreshWorkoutDependentAreas();
  toast(els, 'Histórico corregido.');
}

function deleteWorkoutGroup(groupId) {
  if (!window.confirm('¿Borrar este bloque de entrenamiento?')) return;
  const { entryIds, sessionId } = resolveGroupEntries(store.state, groupId);
  const removed = store.state.workouts.filter((item) => entryIds.includes(item.id));
  store.state.workouts = store.state.workouts.filter((item) => !entryIds.includes(item.id));
  if (sessionId) syncSessionHistoryEntry(store.state, sessionId);
  store.queueSave();
  refreshWorkoutDependentAreas();
  toast(els, 'Bloque borrado.', {
    actionLabel: 'Deshacer',
    onAction: () => {
      store.state.workouts.push(...removed);
      if (sessionId) syncSessionHistoryEntry(store.state, sessionId);
      store.queueSave();
      refreshWorkoutDependentAreas();
      toast(els, 'Bloque recuperado.');
    }
  });
}

function deleteSessionHistory(sessionId) {
  if (!window.confirm('¿Borrar toda esta sesión del histórico?')) return;
  const removedWorkouts = store.state.workouts.filter((item) => item.sessionId === sessionId);
  const removedSession = store.state.sessionHistory.find((item) => item.sessionId === sessionId);
  store.state.workouts = store.state.workouts.filter((item) => item.sessionId !== sessionId);
  store.state.sessionHistory = store.state.sessionHistory.filter((item) => item.sessionId !== sessionId);
  store.queueSave();
  refreshWorkoutDependentAreas();
  toast(els, 'Sesión borrada.', {
    actionLabel: 'Deshacer',
    onAction: () => {
      store.state.workouts.push(...removedWorkouts);
      if (removedSession) store.state.sessionHistory.push(removedSession);
      store.queueSave();
      refreshWorkoutDependentAreas();
      toast(els, 'Sesión recuperada.');
    }
  });
}

function saveMeasurementFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.measurementForm);
  const editingId = store.state.ui.editingMeasurementId;
  const previous = editingId ? store.state.measurements.find((item) => item.id === editingId) : null;
  const record = {
    id: editingId || uid(),
    date: form.get('date') || todayLocal(),
    bodyWeight: numOrBlank(form.get('bodyWeight')),
    bodyFat: numOrBlank(form.get('bodyFat')),
    waist: numOrBlank(form.get('waist')),
    chest: numOrBlank(form.get('chest')),
    arm: numOrBlank(form.get('arm')),
    thigh: numOrBlank(form.get('thigh')),
    hips: numOrBlank(form.get('hips')),
    neck: numOrBlank(form.get('neck')),
    sleepHours: numOrBlank(form.get('sleepHours')),
    notes: String(form.get('notes') || '').trim(),
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const hasMetric = Object.entries(record).some(([key, value]) => !['id', 'date', 'notes', 'createdAt', 'updatedAt'].includes(key) && value !== '');
  if (!hasMetric) {
    toast(els, 'Añade al menos una métrica corporal.');
    return;
  }
  const index = store.state.measurements.findIndex((item) => item.id === record.id);
  if (index >= 0) store.state.measurements[index] = record;
  else store.state.measurements.push(record);
  cancelMeasurementEdit();
  store.queueSave();
  refreshMeasurementDependentAreas();
  toast(els, index >= 0 ? 'Medición actualizada.' : 'Medición guardada.');
}

function editMeasurement(id) {
  const item = store.state.measurements.find((measurement) => measurement.id === id);
  if (!item) return;
  store.state.ui.editingMeasurementId = id;
  els.cancelMeasurementEditBtn.hidden = false;
  Object.entries(item).forEach(([key, value]) => {
    if (els.measurementForm[key]) els.measurementForm[key].value = value ?? '';
  });
  setActiveTab(store.state, 'measurements');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelMeasurementEdit() {
  store.state.ui.editingMeasurementId = '';
  els.cancelMeasurementEditBtn.hidden = true;
  els.measurementForm.reset();
  setDefaultDates();
}

function deleteMeasurement(id) {
  if (!window.confirm('¿Borrar esta medición?')) return;
  const removed = store.state.measurements.find((item) => item.id === id);
  store.state.measurements = store.state.measurements.filter((item) => item.id !== id);
  store.queueSave();
  refreshMeasurementDependentAreas();
  toast(els, 'Medición borrada.', {
    actionLabel: 'Deshacer',
    onAction: () => {
      if (removed) store.state.measurements.push(removed);
      store.queueSave();
      refreshMeasurementDependentAreas();
      toast(els, 'Medición recuperada.');
    }
  });
}

function saveGoals(event) {
  event.preventDefault();
  const form = new FormData(els.goalForm);
  store.state.goals.athleteName = String(form.get('athleteName') || '').trim();
  store.state.goals.focusGoal = String(form.get('focusGoal') || '').trim();
  store.state.goals.goalDate = String(form.get('goalDate') || '').trim();
  ['bodyWeight', 'waist', 'bodyFat', 'bench', 'squat', 'deadlift'].forEach((key) => {
    store.state.goals.resultGoals[key] = form.get(key) || '';
  });
  ['workoutsPerWeek', 'sleepHours', 'measureEveryDays', 'minimumStreakDays'].forEach((key) => {
    store.state.goals.habits[key] = form.get(key) || '';
  });
  store.queueSave();
  renderGoalsArea();
  renderAnalyticsArea();
  toast(els, 'Objetivos guardados.');
}

function savePreferences(event) {
  event.preventDefault();
  store.state.preferences.units = els.preferencesForm.units.value || 'metric';
  store.state.preferences.defaultRestSeconds = Number(els.preferencesForm.defaultRestSeconds.value || FALLBACK_REST_SECONDS);
  store.state.preferences.suggestionIncrement = Number(els.preferencesForm.suggestionIncrement.value || 2.5);
  store.state.preferences.autoStartRest = els.preferencesForm.autoStartRest.checked;
  store.state.preferences.keepScreenAwake = els.preferencesForm.keepScreenAwake.checked;
  store.state.preferences.showWarmupsInLogs = els.preferencesForm.showWarmupsInLogs.checked;
  store.state.preferences.enableVibration = els.preferencesForm.enableVibration.checked;
  store.state.preferences.collapseManualLog = els.preferencesForm.collapseManualLog.checked;
  if (!store.state.preferences.keepScreenAwake) releaseWakeLock();
  else if (store.state.session.active) requestWakeLock();
  store.queueSave();
  renderSessionArea();
  renderLogsArea();
  renderSettingsArea();
  toast(els, 'Preferencias guardadas.');
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  els.networkBadge.textContent = online ? 'Online' : 'Offline';
  els.networkBadge.classList.toggle('offline', !online);
  els.networkBadge.dataset.online = online ? 'true' : 'false';
  els.networkBadge.dataset.quiet = online ? 'true' : 'false';
}


async function requestWakeLock() {
  try {
    if (!("wakeLock" in navigator) || !store.state.preferences.keepScreenAwake || !store.state.session.active) return;
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (error) {
    console.warn('Wake Lock no disponible', error);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

function prepareForFullStateReplacement() {
  releaseWakeLock();
  stopRestTimer();
}

function syncToastOffsetFromBottomNav() {
  const tabbar = document.querySelector(".tabbar");
  const isMobile = window.matchMedia?.("(max-width: 760px)")?.matches;
  const reserved = isMobile ? Math.ceil(tabbar?.getBoundingClientRect?.().height || 0) + 16 : 0;
  els.toastRegion?.style.setProperty("--tabbar-reserved", `${reserved}px`);
}

function startRestTimer(seconds) {
  const total = Number(seconds || 0);
  if (total <= 0) return;
  store.state.session.restTimerEndsAt = new Date(Date.now() + total * 1000).toISOString();
  updateRestTimerLabel();
  store.queueSave();
}

function stopRestTimer() {
  store.state.session.restTimerEndsAt = '';
  updateRestTimerLabel();
  store.queueSave();
}

function updateRestTimerLabel() {
  const remaining = getRestRemainingSeconds();
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  els.restTimerLabel.textContent = `${minutes}:${seconds}`;
  els.restTimerLabel.closest('.rest-timer')?.classList.toggle('active', remaining > 0);
}

function getRestRemainingSeconds() {
  if (!store.state.session.restTimerEndsAt) return 0;
  const endsAt = new Date(store.state.session.restTimerEndsAt).getTime();
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

function startTickers() {
  clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    if (store?.state.session.active) {
      els.sessionDurationLabel.textContent = formatDuration(getSessionDurationSeconds(store.state));
      const effectiveVolume = store.state.session.setEntries.reduce((sum, entry) => sum + (entry.isWarmup ? 0 : Number(entry.weight || 0) * Number(entry.reps || 0)), 0);
      els.sessionVolumeLabel.textContent = `${formatNumber(effectiveVolume)} kg`;
    }
    const before = getRestRemainingSeconds();
    updateRestTimerLabel();
    const after = getRestRemainingSeconds();
    if (before > 0 && after === 0) {
      if (store.state.preferences.enableVibration && navigator.vibrate) navigator.vibrate([120, 80, 120]);
      toast(els, 'Descanso terminado.');
      store.state.session.restTimerEndsAt = '';
      store.queueSave();
    }
  }, 1000);
}

async function confirmSafeStateReplacement(actionLabel) {
  const risky = hasActiveSessionRisk(store.state);
  if (!risky) return true;
  const message = `Hay una sesión activa con series o notas temporales. Si continúas con "${actionLabel}", perderás esa sesión en progreso. ¿Quieres continuar?`;
  const accepted = window.confirm(message);
  if (!accepted) {
    toast(els, "Acción cancelada para proteger la sesión activa.");
    return false;
  }
  return true;
}

async function loadDemoData() {
  if (!await confirmSafeStateReplacement("Cargar demo")) return;
  if ((store.state.workouts.length || store.state.measurements.length || store.state.sessionHistory.length) && !window.confirm('Ya hay datos. ¿Quieres reemplazarlos con la demo?')) {
    return;
  }
  const routineA = {
    id: uid(),
    name: 'Upper Strength',
    day: 'Lunes',
    focus: 'Fuerza torso',
    notes: 'Bloque principal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: [
      normalizeRoutineExercise({ id: uid(), block: 'A1', name: 'Press banca', sets: 4, reps: '5', rest: 150 }),
      normalizeRoutineExercise({ id: uid(), block: 'A2', name: 'Dominadas lastradas', sets: 4, reps: '6', rest: 120 }),
      normalizeRoutineExercise({ id: uid(), block: 'B', name: 'Press militar', sets: 3, reps: '6-8', rest: 90 })
    ]
  };
  const routineB = {
    id: uid(),
    name: 'Lower Power',
    day: 'Jueves',
    focus: 'Pierna',
    notes: 'Foco en básicos',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: [
      normalizeRoutineExercise({ id: uid(), block: 'A', name: 'Sentadilla', sets: 4, reps: '5', rest: 150 }),
      normalizeRoutineExercise({ id: uid(), block: 'B', name: 'Peso muerto rumano', sets: 3, reps: '8', rest: 120 }),
      normalizeRoutineExercise({ id: uid(), block: 'C1', name: 'Prensa', sets: 3, reps: '10', rest: 90 }),
      normalizeRoutineExercise({ id: uid(), block: 'C2', name: 'Plancha', sets: 3, reps: '30', rest: 45 })
    ]
  };
  const newState = defaultState();
  newState.routines = [routineA, routineB];
  const session1 = uid();
  const session2 = uid();
  newState.workouts = [
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, 'Press banca', 80, 1, 5),
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, 'Press banca', 80, 1, 5),
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, 'Press banca', 77.5, 1, 6),
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, 'Dominadas lastradas', 15, 1, 6),
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, 'Dominadas lastradas', 15, 1, 6),
    workoutDemo(offsetDate(todayLocal(), -1), routineA.id, session1, 'Press militar', 45, 1, 8),
    workoutDemo(offsetDate(todayLocal(), -5), routineB.id, session2, 'Sentadilla', 110, 1, 5),
    workoutDemo(offsetDate(todayLocal(), -5), routineB.id, session2, 'Sentadilla', 110, 1, 5),
    workoutDemo(offsetDate(todayLocal(), -5), routineB.id, session2, 'Prensa', 180, 1, 10),
    workoutDemo(offsetDate(todayLocal(), -8), routineA.id, '', 'Flexiones', 0, 4, 12, 'manual')
  ];
  newState.measurements = [
    measurementDemo(todayLocal(), 81.2, 14.4, 82.5, 104, 39.2, 59.5, 97.5, 38.2, 7.2),
    measurementDemo(offsetDate(todayLocal(), -14), 81.9, 14.9, 83.1, 103.6, 39.0, 59.2, 97.9, 38.1, 7.0),
    measurementDemo(offsetDate(todayLocal(), -30), 82.8, 15.6, 84.0, 103.0, 38.4, 58.8, 98.5, 38.0, 6.7)
  ];
  newState.sessionHistory = [
    { id: uid(), sessionId: session1, routineId: routineA.id, routineName: routineA.name, date: offsetDate(todayLocal(), -1), startedAt: isoFromLocalDateTime(offsetDate(todayLocal(), -1), '18:00'), endedAt: isoFromLocalDateTime(offsetDate(todayLocal(), -1), '19:08'), durationSeconds: 68 * 60, totalSets: 6, exercisesCompleted: 3, volume: 1375, notes: '' },
    { id: uid(), sessionId: session2, routineId: routineB.id, routineName: routineB.name, date: offsetDate(todayLocal(), -5), startedAt: isoFromLocalDateTime(offsetDate(todayLocal(), -5), '19:00'), endedAt: isoFromLocalDateTime(offsetDate(todayLocal(), -5), '20:04'), durationSeconds: 64 * 60, totalSets: 3, exercisesCompleted: 2, volume: 2000, notes: '' }
  ];
  newState.goals = {
    athleteName: 'Javier',
    focusGoal: 'Subir fuerza manteniendo cintura controlada',
    goalDate: offsetDate(todayLocal(), 90),
    resultGoals: { bodyWeight: 79, waist: 80, bodyFat: 12, bench: 100, squat: 140, deadlift: 160 },
    habits: { workoutsPerWeek: 4, sleepHours: 7.5, measureEveryDays: 14, minimumStreakDays: 3 }
  };
  prepareForFullStateReplacement();
  store.state = newState;
  ensureMinimumData();
  syncAllSessionHistory(store.state);
  cancelRoutineEdit();
  cancelWorkoutEdit();
  cancelMeasurementEdit();
  refreshAll();
  store.queueSave();
  toast(els, 'Demo cargada.');
}

function workoutDemo(date, routineId, sessionId, exercise, weight, sets, reps, source = 'session') {
  const createdAt = isoFromLocalDateTime(date, '19:00');
  return normalizeWorkoutRecord({
    id: uid(),
    date,
    routineId,
    sessionId,
    exercise,
    weight,
    sets,
    reps,
    rpe: '',
    rest: 90,
    tempo: '',
    notes: 'Demo',
    isWarmup: false,
    source,
    createdAt,
    updatedAt: createdAt
  });
}

function measurementDemo(date, bodyWeight, bodyFat, waist, chest, arm, thigh, hips, neck, sleepHours) {
  const createdAt = isoFromLocalDateTime(date, '08:00');
  return { id: uid(), date, bodyWeight, bodyFat, waist, chest, arm, thigh, hips, neck, sleepHours, notes: 'Demo', createdAt, updatedAt: createdAt };
}

async function resetAllData() {
  if (!await confirmSafeStateReplacement("Resetear todos los datos")) return;
  if (!window.confirm('¿Seguro que quieres borrar todos los datos?')) return;
  prepareForFullStateReplacement();
  store.state = defaultState();
  ensureMinimumData();
  cancelRoutineEdit();
  cancelWorkoutEdit();
  cancelMeasurementEdit();
  refreshAll();
  store.queueSave();
  toast(els, 'Datos reiniciados.');
}

function exportJson() {
  const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `gymflow-pro-backup-${todayLocal()}.json`);
}

function exportCsv() {
  const workoutsCsv = toCsv(store.state.workouts, ['date', 'routineId', 'sessionId', 'exercise', 'exerciseId', 'weight', 'sets', 'reps', 'rpe', 'rest', 'isWarmup', 'source', 'notes']);
  const measurementsCsv = toCsv(store.state.measurements, ['date', 'bodyWeight', 'bodyFat', 'waist', 'chest', 'arm', 'thigh', 'hips', 'neck', 'sleepHours', 'notes']);
  const sessionsCsv = toCsv(store.state.sessionHistory, ['date', 'routineName', 'durationSeconds', 'totalSets', 'exercisesCompleted', 'volume', 'notes']);
  downloadBlob(new Blob([workoutsCsv], { type: 'text/csv;charset=utf-8' }), `gymflow-workouts-${todayLocal()}.csv`);
  downloadBlob(new Blob([measurementsCsv], { type: 'text/csv;charset=utf-8' }), `gymflow-measurements-${todayLocal()}.csv`);
  downloadBlob(new Blob([sessionsCsv], { type: 'text/csv;charset=utf-8' }), `gymflow-sessions-${todayLocal()}.csv`);
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!await confirmSafeStateReplacement("Importar JSON")) {
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      prepareForFullStateReplacement();
      store.state = migrateState(JSON.parse(String(reader.result)));
      ensureMinimumData();
      syncAllSessionHistory(store.state);
      cancelRoutineEdit();
      cancelWorkoutEdit();
      cancelMeasurementEdit();
      refreshAll();
      await store.flushSave();
      toast(els, 'Datos importados.');
    } catch (error) {
      console.error(error);
      toast(els, 'El archivo no es válido.');
    } finally {
      els.importInput.value = '';
    }
  };
  reader.readAsText(file);
}
