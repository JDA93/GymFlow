import { collectExerciseOptions, getExerciseMeta, normalizeRoutineExercise, normalizeWorkoutRecord } from "./js/catalog.js";
import {
  buildWorkoutGroups,
  resolveGroupEntries,
  syncAllSessionHistory,
  syncSessionHistoryEntry
} from "./js/analytics.js";
import { createPwaManager } from "./js/pwa.js";
import { addSessionSet, beginSessionFromRoutine, copyLastSessionIntoActive, createBlankSession, deleteSessionSet, discardActiveSession, endSession, getSessionDurationSeconds, hasActiveSessionRisk, setSessionNotes } from "./js/session.js";
import { createStore, defaultState, migrateState } from "./js/store.js";
import { cardHtml, setActiveTab, toast } from "./js/ui-common.js";
import { renderDashboard, renderStats } from "./js/ui-dashboard.js";
import { renderAnalytics, renderGoalForm, renderGoalSummary, renderPreferencesForm, renderPwaStatus } from "./js/ui-meta.js";
import { renderMeasurements, renderPrList, renderRoutines, renderWorkoutList } from "./js/ui-records.js";
import { renderSession } from "./js/ui-session.js";
import { downloadBlob, FALLBACK_REST_SECONDS, formatDuration, formatNumber, isoFromLocalDateTime, numOrBlank, offsetDate, todayLocal, toCsv, uid } from "./js/utils.js";

const els = {
  networkBadge: document.querySelector("#networkBadge"),
  saveStatusBadge: document.querySelector("#saveStatusBadge"),
  installBtn: document.querySelector("#installBtn"),
  iosInstallBtn: document.querySelector("#iosInstallBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  importInput: document.querySelector("#importInput"),
  startTodayBtn: document.querySelector("#startTodayBtn"),
  goToSessionBtn: document.querySelector("#goToSessionBtn"),
  loadDemoBtn: document.querySelector("#loadDemoBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  refreshAppBtn: document.querySelector("#refreshAppBtn"),
  updateBanner: document.querySelector("#updateBanner"),
  dashboardExerciseSelect: document.querySelector("#dashboardExerciseSelect"),
  dashboardExerciseMetricSelect: document.querySelector("#dashboardExerciseMetricSelect"),
  dashboardMetricSelect: document.querySelector("#dashboardMetricSelect"),
  todayFocus: document.querySelector("#todayFocus"),
  quickStartList: document.querySelector("#quickStartList"),
  trendSummaryTop: document.querySelector("#trendSummaryTop"),
  recentLogs: document.querySelector("#recentLogs"),
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
  workoutRoutineSelect: document.querySelector("#workoutRoutineSelect"),
  workoutForm: document.querySelector("#workoutForm"),
  cancelWorkoutEditBtn: document.querySelector("#cancelWorkoutEditBtn"),
  activeSessionCard: document.querySelector("#activeSessionCard"),
  sessionStatusLabel: document.querySelector("#sessionStatusLabel"),
  sessionDurationLabel: document.querySelector("#sessionDurationLabel"),
  sessionVolumeLabel: document.querySelector("#sessionVolumeLabel"),
  startSessionBtn: document.querySelector("#startSessionBtn"),
  endSessionBtn: document.querySelector("#endSessionBtn"),
  discardSessionBtn: document.querySelector("#discardSessionBtn"),
  copyLastSessionBtn: document.querySelector("#copyLastSessionBtn"),
  sessionNotes: document.querySelector("#sessionNotes"),
  startRestBtn: document.querySelector("#startRestBtn"),
  stopRestBtn: document.querySelector("#stopRestBtn"),
  restTimerLabel: document.querySelector("#restTimerLabel"),
  routineForm: document.querySelector("#routineForm"),
  addExerciseRowBtn: document.querySelector("#addExerciseRowBtn"),
  exerciseRows: document.querySelector("#exerciseRows"),
  exerciseRowTemplate: document.querySelector("#exerciseRowTemplate"),
  routineList: document.querySelector("#routineList"),
  cancelRoutineEditBtn: document.querySelector("#cancelRoutineEditBtn"),
  workoutList: document.querySelector("#workoutList"),
  prList: document.querySelector("#prList"),
  logSearchInput: document.querySelector("#logSearchInput"),
  logRoutineFilter: document.querySelector("#logRoutineFilter"),
  logSortSelect: document.querySelector("#logSortSelect"),
  measurementForm: document.querySelector("#measurementForm"),
  measurementList: document.querySelector("#measurementList"),
  cancelMeasurementEditBtn: document.querySelector("#cancelMeasurementEditBtn"),
  volumeSummary: document.querySelector("#volumeSummary"),
  trendSummary: document.querySelector("#trendSummary"),
  goalForm: document.querySelector("#goalForm"),
  goalSummary: document.querySelector("#goalSummary"),
  preferencesForm: document.querySelector("#preferencesForm"),
  pwaStatusBox: document.querySelector("#pwaStatusBox"),
  iosInstallDialog: document.querySelector("#iosInstallDialog"),
  closeIosDialogBtn: document.querySelector("#closeIosDialogBtn"),
  exerciseSuggestions: document.querySelector("#exerciseSuggestions"),
  toastRegion: document.querySelector("#toastRegion")
};

let store;
let pwa;
let exerciseOptions = [];
let restTimerInterval = null;
let restRemaining = 0;
let wakeLock = null;
let sessionDurationInterval = null;

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
  startSessionDurationTicker();
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

  els.startTodayBtn.addEventListener("click", () => {
    setActiveTab(store.state, "session");
    store.queueSave();
    els.sessionRoutineSelect.focus();
  });
  els.goToSessionBtn.addEventListener("click", () => {
    setActiveTab(store.state, "session");
    store.queueSave();
  });
  els.loadDemoBtn.addEventListener("click", loadDemoData);
  els.resetBtn.addEventListener("click", resetAllData);

  els.exportBtn.addEventListener("click", exportJson);
  els.exportCsvBtn.addEventListener("click", exportCsv);
  els.importInput.addEventListener("change", importJson);

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

  els.workoutForm.addEventListener("submit", saveWorkoutFromForm);
  els.cancelWorkoutEditBtn.addEventListener("click", cancelWorkoutEdit);
  els.routineForm.addEventListener("submit", saveRoutineFromForm);
  els.addExerciseRowBtn.addEventListener("click", () => addExerciseRow());
  els.cancelRoutineEditBtn.addEventListener("click", cancelRoutineEdit);
  els.measurementForm.addEventListener("submit", saveMeasurementFromForm);
  els.cancelMeasurementEditBtn.addEventListener("click", cancelMeasurementEdit);
  els.goalForm.addEventListener("submit", saveGoals);
  els.preferencesForm.addEventListener("submit", savePreferences);

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

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  window.addEventListener("pagehide", () => {
    stopRestTimer();
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
    const nextIndex = event.key === "ArrowRight"
      ? (currentIndex + 1) % tabs.length
      : (currentIndex - 1 + tabs.length) % tabs.length;
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
    case "edit-workout":
      editWorkout(id);
      break;
    case "delete-workout-group":
      deleteWorkoutGroup(id);
      break;
    case "edit-measurement":
      editMeasurement(id);
      break;
    case "delete-measurement":
      deleteMeasurement(id);
      break;
    case "toggle-complete-exercise":
      toggleCompleteExercise(id);
      break;
    case "add-session-set":
      handleAddSessionSet(id);
      break;
    case "delete-session-set":
      handleDeleteSessionSet(id);
      break;
    case "remove-routine-row":
      trigger?.closest?.(".exercise-row")?.remove();
      break;
    default:
      break;
  }
}

function refreshAll() {
  refreshExerciseOptions();
  populateRoutineSelects();
  renderStats(store.state, els);
  renderDashboardArea();
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

function renderDashboardArea() {
  renderStats(store.state, els);
  renderDashboard(store.state, els, exerciseOptions);
}

function renderSessionArea() {
  populateRoutineSelects();
  renderSession(store.state, els);
}

function renderRoutinesArea() {
  renderRoutines(store.state, els);
}

function renderLogsArea() {
  populateRoutineSelects();
  renderWorkoutList(store.state, els);
  renderPrList(store.state, els);
}

function renderMeasurementsArea() {
  renderMeasurements(store.state, els);
}

function renderAnalyticsArea() {
  renderAnalytics(store.state, els);
}

function renderGoalsArea() {
  renderGoalSummary(store.state, els);
  renderGoalForm(store.state, els);
}

function renderSettingsArea() {
  renderPreferencesForm(store.state, els);
  renderPwaStatus(els, pwa.getStatus(), {
    mode: store.state.meta.storageMode || "indexeddb"
  });
}

function refreshWorkoutDependentAreas() {
  refreshExerciseOptions();
  populateRoutineSelects();
  renderDashboardArea();
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
  renderDashboardArea();
  renderSessionArea();
  renderRoutinesArea();
  renderLogsArea();
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
      name: "Torso",
      day: "Día A",
      focus: "Hipertrofia",
      notes: "Base inicial del bloque",
      exercises: [
        normalizeRoutineExercise({ id: uid(), name: "Press banca", sets: 4, reps: "6-8", rest: 120 }),
        normalizeRoutineExercise({ id: uid(), name: "Remo con barra", sets: 4, reps: "8-10", rest: 90 }),
        normalizeRoutineExercise({ id: uid(), name: "Press militar", sets: 3, reps: "8-10", rest: 90 })
      ]
    },
    {
      id: uid(),
      name: "Pierna",
      day: "Día B",
      focus: "Fuerza + hipertrofia",
      notes: "Prioridad en básicos",
      exercises: [
        normalizeRoutineExercise({ id: uid(), name: "Sentadilla", sets: 4, reps: "5-6", rest: 150 }),
        normalizeRoutineExercise({ id: uid(), name: "Peso muerto rumano", sets: 3, reps: "8-10", rest: 120 }),
        normalizeRoutineExercise({ id: uid(), name: "Prensa", sets: 3, reps: "10-12", rest: 90 })
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
    startSessionDurationTicker();
    refreshWorkoutDependentAreas();
  }
  if (result.status === "existing") {
    setActiveTab(store.state, "session");
  }
  if (result.message) toast(els, result.message);
}

async function handleEndSession() {
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

function handleDiscardSession() {
  if (!store.state.session.active) {
    toast(els, "No hay sesión activa.");
    return;
  }
  const hasData = hasActiveSessionRisk(store.state);
  if (hasData && !window.confirm("Vas a descartar la sesión activa y sus series temporales. ¿Quieres continuar?")) {
    return;
  }
  discardActiveSession(store.state);
  releaseWakeLock();
  stopRestTimer();
  store.queueSave();
  renderSessionArea();
  renderDashboardArea();
  toast(els, "Sesión descartada.");
}

function handleCopyLastSession() {
  const result = copyLastSessionIntoActive(store.state);
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
  const weight = Number(document.querySelector(`#session-weight-${CSS.escape(exerciseId)}`)?.value || 0);
  const reps = Number(document.querySelector(`#session-reps-${CSS.escape(exerciseId)}`)?.value || 0);
  const rpe = document.querySelector(`#session-rpe-${CSS.escape(exerciseId)}`)?.value || "";
  const rest = Number(document.querySelector(`#session-rest-${CSS.escape(exerciseId)}`)?.value || store.state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS);
  const isWarmup = document.querySelector(`#session-warmup-${CSS.escape(exerciseId)}`)?.checked || false;

  const result = addSessionSet(store.state, exerciseId, { weight, reps, rpe, rest, isWarmup });
  if (!result.ok) {
    toast(els, result.message);
    return;
  }

  const rpeInput = document.querySelector(`#session-rpe-${CSS.escape(exerciseId)}`);
  const warmupInput = document.querySelector(`#session-warmup-${CSS.escape(exerciseId)}`);
  if (rpeInput) rpeInput.value = "";
  if (warmupInput) warmupInput.checked = false;

  store.queueSave();
  renderSessionArea();
  renderDashboardArea();
  toast(els, result.message);
  if (store.state.preferences.autoStartRest) startRestTimer(rest);
  const nextCard = document.querySelector(`#exercise-card-${CSS.escape(exerciseId)}`);
  nextCard?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
  toast(els, result.message);
}

function toggleCompleteExercise(exerciseId) {
  const list = new Set(store.state.session.completedExerciseIds);
  if (list.has(exerciseId)) list.delete(exerciseId); else list.add(exerciseId);
  store.state.session.completedExerciseIds = [...list];
  store.queueSave();
  renderSessionArea();
  renderDashboardArea();
}

function saveWorkoutFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.workoutForm);
  const editingId = store.state.ui.editingWorkoutId;
  const previous = editingId ? store.state.workouts.find((item) => item.id === editingId) : null;
  const meta = getExerciseMeta(form.get("exercise") || "");

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
  });

  if (!record.exercise || !record.weight || !record.sets || !record.reps) {
    toast(els, "Completa ejercicio, peso, series y reps.");
    return;
  }

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

function deleteWorkoutGroup(groupId) {
  if (!window.confirm("¿Borrar este bloque de entrenamiento?")) return;
  const { entryIds, sessionId } = resolveGroupEntries(store.state, groupId);
  store.state.workouts = store.state.workouts.filter((item) => !entryIds.includes(item.id));
  if (sessionId) {
    syncSessionHistoryEntry(store.state, sessionId);
  }
  store.queueSave();
  refreshWorkoutDependentAreas();
  toast(els, "Bloque borrado.");
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
      rest: Number(row.querySelector('[data-field="rest"]').value || store.state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS)
    }))
    .filter((item) => item.name);

  if (!form.get("name") || !exercises.length) {
    toast(els, "Pon nombre a la rutina y al menos un ejercicio.");
    return;
  }

  const routine = {
    id: store.state.ui.editingRoutineId || uid(),
    name: String(form.get("name") || "").trim(),
    day: String(form.get("day") || "").trim(),
    focus: String(form.get("focus") || "").trim(),
    notes: String(form.get("notes") || "").trim(),
    exercises
  };

  const index = store.state.routines.findIndex((item) => item.id === routine.id);
  if (index >= 0) store.state.routines[index] = routine;
  else store.state.routines.push(routine);

  cancelRoutineEdit();
  store.queueSave();
  refreshRoutineDependentAreas();
  toast(els, index >= 0 ? "Rutina actualizada." : "Rutina guardada.");
}

function addExerciseRow(data = {}) {
  const fragment = els.exerciseRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".exercise-row");
  row.dataset.id = data.id || uid();
  row.querySelector('[data-field="name"]').value = data.name || "";
  row.querySelector('[data-field="sets"]').value = data.sets || "";
  row.querySelector('[data-field="reps"]').value = data.reps || "";
  row.querySelector('[data-field="rest"]').value = data.rest || store.state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS;
  els.exerciseRows.appendChild(fragment);
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

function duplicateRoutine(id) {
  const routine = store.state.routines.find((item) => item.id === id);
  if (!routine) return;
  const clone = structuredClone(routine);
  clone.id = uid();
  clone.name = `${routine.name} copia`;
  clone.exercises = clone.exercises.map((exercise) => ({ ...exercise, id: uid() }));
  store.state.routines.push(clone);
  store.queueSave();
  refreshRoutineDependentAreas();
  toast(els, "Rutina duplicada.");
}

function deleteRoutine(id) {
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

function saveMeasurementFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.measurementForm);
  const editingId = store.state.ui.editingMeasurementId;
  const previous = editingId ? store.state.measurements.find((item) => item.id === editingId) : null;

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
    toast(els, "Añade al menos una métrica corporal.");
    return;
  }

  const index = store.state.measurements.findIndex((item) => item.id === record.id);
  if (index >= 0) store.state.measurements[index] = record;
  else store.state.measurements.push(record);

  cancelMeasurementEdit();
  store.queueSave();
  refreshMeasurementDependentAreas();
  toast(els, index >= 0 ? "Medición actualizada." : "Medición guardada.");
}

function editMeasurement(id) {
  const item = store.state.measurements.find((measurement) => measurement.id === id);
  if (!item) return;
  store.state.ui.editingMeasurementId = id;
  els.cancelMeasurementEditBtn.hidden = false;
  Object.entries(item).forEach(([key, value]) => {
    if (els.measurementForm[key]) els.measurementForm[key].value = value ?? "";
  });
  setActiveTab(store.state, "measurements");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelMeasurementEdit() {
  store.state.ui.editingMeasurementId = "";
  els.cancelMeasurementEditBtn.hidden = true;
  els.measurementForm.reset();
  setDefaultDates();
}

function deleteMeasurement(id) {
  if (!window.confirm("¿Borrar esta medición?")) return;
  store.state.measurements = store.state.measurements.filter((item) => item.id !== id);
  store.queueSave();
  refreshMeasurementDependentAreas();
  toast(els, "Medición borrada.");
}

function saveGoals(event) {
  event.preventDefault();
  const form = new FormData(els.goalForm);
  Object.keys(store.state.goals).forEach((key) => {
    store.state.goals[key] = form.get(key) || "";
  });
  store.queueSave();
  renderGoalsArea();
  toast(els, "Objetivos guardados.");
}

function savePreferences(event) {
  event.preventDefault();
  store.state.preferences.defaultRestSeconds = Number(els.preferencesForm.defaultRestSeconds.value || FALLBACK_REST_SECONDS);
  store.state.preferences.suggestionIncrement = Number(els.preferencesForm.suggestionIncrement.value || 2.5);
  store.state.preferences.autoStartRest = els.preferencesForm.autoStartRest.checked;
  store.state.preferences.keepScreenAwake = els.preferencesForm.keepScreenAwake.checked;
  store.state.preferences.showWarmupsInLogs = els.preferencesForm.showWarmupsInLogs.checked;
  if (!store.state.preferences.keepScreenAwake) releaseWakeLock();
  store.queueSave();
  renderSessionArea();
  renderLogsArea();
  renderSettingsArea();
  toast(els, "Preferencias guardadas.");
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  els.networkBadge.textContent = online ? "Online" : "Offline";
  els.networkBadge.classList.toggle("offline", !online);
}

async function requestWakeLock() {
  try {
    if (!("wakeLock" in navigator) || !store.state.preferences.keepScreenAwake || !store.state.session.active) return;
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
      toast(els, "Descanso terminado.");
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
    if (!store?.state.session.active) return;
    els.sessionDurationLabel.textContent = formatDuration(getSessionDurationSeconds(store.state));
    const effectiveVolume = store.state.session.setEntries.reduce((sum, entry) => sum + (entry.isWarmup ? 0 : Number(entry.weight || 0) * Number(entry.reps || 0)), 0);
    els.sessionVolumeLabel.textContent = `${formatNumber(effectiveVolume)} kg`;
  }, 1000);
}

function loadDemoData() {
  if ((store.state.workouts.length || store.state.measurements.length || store.state.sessionHistory.length) && !window.confirm("Ya hay datos. ¿Quieres reemplazarlos con la demo?")) {
    return;
  }

  const routineA = {
    id: uid(),
    name: "Upper Strength",
    day: "Lunes",
    focus: "Fuerza torso",
    notes: "Bloque principal",
    exercises: [
      normalizeRoutineExercise({ id: uid(), name: "Press banca", sets: 4, reps: "5", rest: 150 }),
      normalizeRoutineExercise({ id: uid(), name: "Dominadas lastradas", sets: 4, reps: "6", rest: 120 }),
      normalizeRoutineExercise({ id: uid(), name: "Press militar", sets: 3, reps: "6-8", rest: 90 })
    ]
  };
  const routineB = {
    id: uid(),
    name: "Lower Power",
    day: "Jueves",
    focus: "Pierna",
    notes: "Foco en básicos",
    exercises: [
      normalizeRoutineExercise({ id: uid(), name: "Sentadilla", sets: 4, reps: "5", rest: 150 }),
      normalizeRoutineExercise({ id: uid(), name: "Peso muerto rumano", sets: 3, reps: "8", rest: 120 }),
      normalizeRoutineExercise({ id: uid(), name: "Prensa", sets: 3, reps: "10", rest: 90 })
    ]
  };

  const newState = defaultState();
  newState.routines = [routineA, routineB];
  const session1 = uid();
  const session2 = uid();

  newState.workouts = [
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

  newState.measurements = [
    measurementDemo(todayLocal(), 81.2, 14.4, 82.5, 104, 39.2, 59.5, 97.5, 38.2, 7.2),
    measurementDemo(offsetDate(todayLocal(), -14), 81.9, 14.9, 83.1, 103.6, 39.0, 59.2, 97.9, 38.1, 7.0),
    measurementDemo(offsetDate(todayLocal(), -30), 82.8, 15.6, 84.0, 103.0, 38.4, 58.8, 98.5, 38.0, 6.7)
  ];

  newState.sessionHistory = [
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

  newState.goals = {
    athleteName: "Javier",
    weightGoal: 79,
    waistGoal: 80,
    bodyFatGoal: 12,
    benchGoal: 100,
    squatGoal: 140,
    deadliftGoal: 160,
    focusGoal: "Subir fuerza manteniendo cintura controlada",
    goalDate: offsetDate(todayLocal(), 90)
  };

  releaseWakeLock();
  stopRestTimer();
  store.state = newState;
  ensureMinimumData();
  syncAllSessionHistory(store.state);
  cancelRoutineEdit();
  cancelWorkoutEdit();
  cancelMeasurementEdit();
  refreshAll();
  store.queueSave();
  toast(els, "Demo cargada.");
}

function workoutDemo(date, routineId, sessionId, exercise, weight, sets, reps, source = "session") {
  const createdAt = isoFromLocalDateTime(date, "19:00");
  return normalizeWorkoutRecord({
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
  });
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
  if (!window.confirm("¿Seguro que quieres borrar todos los datos?")) return;
  releaseWakeLock();
  stopRestTimer();
  store.state = defaultState();
  ensureMinimumData();
  cancelRoutineEdit();
  cancelWorkoutEdit();
  cancelMeasurementEdit();
  refreshAll();
  store.queueSave();
  toast(els, "Datos reiniciados.");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: "application/json" });
  downloadBlob(blob, `gymflow-pro-v5-backup-${todayLocal()}.json`);
}

function exportCsv() {
  const workoutsCsv = toCsv(
    store.state.workouts,
    ["date", "routineId", "sessionId", "exercise", "exerciseId", "weight", "sets", "reps", "rpe", "rest", "isWarmup", "source", "notes"]
  );
  const measurementsCsv = toCsv(
    store.state.measurements,
    ["date", "bodyWeight", "bodyFat", "waist", "chest", "arm", "thigh", "hips", "neck", "sleepHours", "notes"]
  );
  const sessionsCsv = toCsv(
    store.state.sessionHistory,
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
  reader.onload = async () => {
    try {
      store.state = migrateState(JSON.parse(String(reader.result)));
      ensureMinimumData();
      syncAllSessionHistory(store.state);
      cancelRoutineEdit();
      cancelWorkoutEdit();
      cancelMeasurementEdit();
      refreshAll();
      await store.flushSave();
      toast(els, "Datos importados.");
    } catch (error) {
      console.error(error);
      toast(els, "El archivo no es válido.");
    } finally {
      els.importInput.value = "";
    }
  };
  reader.readAsText(file);
}
