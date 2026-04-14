import { mergeDeep, numOrBlank, uid, todayLocal, FALLBACK_REST_SECONDS } from "./utils.js";
import { normalizeRoutineExercise, normalizeWorkoutRecord } from "./catalog.js";

const DB_NAME = "gymflow-pro-v5-db";
const DB_VERSION = 1;
const DB_STORE = "app_state";
const DB_KEY = "state";
const FALLBACK_STORAGE_KEY = "gymflow-pro-v5-fallback";
const LEGACY_STORAGE_KEYS = [
  FALLBACK_STORAGE_KEY,
  "gymflow-pro-v4-data",
  "gymflow-pro-v3-data"
];

export function defaultState() {
  return {
    version: 5,
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
      focusGoal: "",
      goalDate: ""
    },
    preferences: {
      defaultRestSeconds: FALLBACK_REST_SECONDS,
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
      dashboardExerciseId: "",
      dashboardExerciseMetric: "weight",
      dashboardMetric: "bodyWeight",
      logSearch: "",
      logRoutine: "all",
      logSort: "date_desc"
    },
    meta: {
      saveStatus: "saved",
      lastSavedAt: "",
      storageMode: "indexeddb"
    }
  };
}

export async function createStore(saveStatusEl) {
  let db = null;
  let state = defaultState();
  let saveTimeout = null;
  let saveInFlight = Promise.resolve();

  try {
    db = await openDb();
    const stored = await idbGet(db, DB_KEY);
    if (stored) state = migrateState(stored);
  } catch (error) {
    console.warn("IndexedDB no disponible, se intentará usar almacenamiento de respaldo.", error);
  }

  if (!state.workouts.length && !state.measurements.length && !state.routines.length) {
    for (const key of LEGACY_STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        state = migrateState(JSON.parse(raw));
        break;
      } catch (error) {
        console.warn("No se pudo leer almacenamiento legado", key, error);
      }
    }
  }

  const store = {
    get state() {
      return state;
    },
    set state(nextState) {
      state = migrateState(nextState);
    },
    queueSave,
    flushSave,
    markSaved,
    updateSaveIndicator,
    isUsingFallback() {
      return state.meta.storageMode !== "indexeddb";
    }
  };

  updateSaveIndicator("saved");
  return store;

  function updateSaveIndicator(status) {
    state.meta.saveStatus = status;
    if (!saveStatusEl) return;
    saveStatusEl.dataset.state = status;
    const labels = {
      dirty: "Pendiente",
      saving: "Guardando…",
      saved: state.meta.lastSavedAt ? `Guardado ${new Date(state.meta.lastSavedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : "Guardado",
      degraded: "Guardado local",
      error: "Error al guardar"
    };
    saveStatusEl.textContent = labels[status] || "Guardado";
  }

  function markSaved(mode = db ? "indexeddb" : "localStorage") {
    state.meta.lastSavedAt = new Date().toISOString();
    state.meta.storageMode = mode;
    updateSaveIndicator(mode === "indexeddb" ? "saved" : "degraded");
  }

  function queueSave() {
    updateSaveIndicator("dirty");
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveInFlight = saveInFlight.then(() => persist());
    }, 160);
  }

  async function flushSave() {
    clearTimeout(saveTimeout);
    await saveInFlight;
    await persist();
  }

  async function persist() {
    updateSaveIndicator("saving");
    const snapshot = structuredClone(state);
    try {
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("No se pudo actualizar el respaldo en localStorage", error);
    }

    if (!db) {
      markSaved("localStorage");
      return;
    }

    try {
      await idbSet(db, DB_KEY, snapshot);
      markSaved("indexeddb");
    } catch (error) {
      console.error("No se pudo guardar en IndexedDB", error);
      try {
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(snapshot));
        markSaved("localStorage");
      } catch (fallbackError) {
        console.error("No se pudo guardar ni siquiera el respaldo local", fallbackError);
        updateSaveIndicator("error");
      }
    }
  }
}

export function migrateState(rawState) {
  const base = mergeDeep(defaultState(), rawState || {});
  base.version = 5;
  base.workouts = Array.isArray(base.workouts) ? base.workouts.map((item) => normalizeWorkoutRecord({
    id: item.id || uid(),
    date: item.date || todayLocal(),
    routineId: item.routineId || "",
    sessionId: item.sessionId || "",
    exercise: String(item.exercise || item.exerciseName || "").trim(),
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
  })) : [];

  base.measurements = Array.isArray(base.measurements) ? base.measurements.map((item) => ({
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
  })) : [];

  base.routines = Array.isArray(base.routines) ? base.routines.map((routine) => ({
    id: routine.id || uid(),
    name: String(routine.name || "").trim(),
    day: String(routine.day || "").trim(),
    focus: String(routine.focus || "").trim(),
    notes: String(routine.notes || "").trim(),
    exercises: Array.isArray(routine.exercises) ? routine.exercises.map((exercise) => normalizeRoutineExercise({
      id: exercise.id || uid(),
      name: String(exercise.name || "").trim(),
      sets: Number(exercise.sets || 0),
      reps: String(exercise.reps || "").trim(),
      rest: Number(exercise.rest || base.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS)
    })) : []
  })) : [];

  base.sessionHistory = Array.isArray(base.sessionHistory) ? base.sessionHistory.map((item) => ({
    id: item.id || uid(),
    sessionId: item.sessionId || uid(),
    routineId: item.routineId || "",
    routineName: String(item.routineName || "").trim(),
    date: item.date || todayLocal(),
    startedAt: item.startedAt || "",
    endedAt: item.endedAt || "",
    durationSeconds: Number(item.durationSeconds || 0),
    totalSets: Number(item.totalSets || 0),
    exercisesCompleted: Number(item.exercisesCompleted || 0),
    volume: Number(item.volume || 0),
    notes: String(item.notes || "").trim()
  })) : [];

  base.session = {
    active: Boolean(base.session?.active),
    sessionId: base.session?.sessionId || "",
    routineId: base.session?.routineId || "",
    startedAt: base.session?.startedAt || "",
    endedAt: base.session?.endedAt || "",
    completedExerciseIds: Array.isArray(base.session?.completedExerciseIds) ? [...new Set(base.session.completedExerciseIds)] : [],
    currentExerciseId: base.session?.currentExerciseId || "",
    notes: String(base.session?.notes || ""),
    setEntries: Array.isArray(base.session?.setEntries)
      ? base.session.setEntries.map((entry) => normalizeWorkoutRecord({
        id: entry.id || uid(),
        exerciseId: entry.exerciseId || "",
        exerciseName: entry.exerciseName || entry.exercise || "",
        exercise: entry.exerciseName || entry.exercise || "",
        exerciseKey: entry.exerciseKey || "",
        muscleGroup: entry.muscleGroup || "",
        movementPattern: entry.movementPattern || "",
        weight: Number(entry.weight || 0),
        reps: Number(entry.reps || 0),
        rpe: entry.rpe === "" || entry.rpe == null ? "" : Number(entry.rpe),
        rest: entry.rest === "" || entry.rest == null ? "" : Number(entry.rest),
        isWarmup: Boolean(entry.isWarmup),
        createdAt: entry.createdAt || new Date().toISOString(),
        updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
        sets: 1,
        date: entry.date || todayLocal(),
        routineId: base.session?.routineId || "",
        sessionId: base.session?.sessionId || "",
        source: "session",
        notes: String(entry.notes || "")
      })).map((entry) => ({
        id: entry.id,
        exerciseId: entry.exerciseId,
        exerciseName: entry.exercise,
        exerciseKey: entry.exerciseKey,
        muscleGroup: entry.muscleGroup,
        movementPattern: entry.movementPattern,
        weight: entry.weight,
        reps: entry.reps,
        rpe: entry.rpe,
        rest: entry.rest,
        isWarmup: entry.isWarmup,
        createdAt: entry.createdAt,
        notes: entry.notes || ""
      }))
      : []
  };

  base.ui.dashboardExerciseMetric = base.ui.dashboardExerciseMetric || "weight";
  base.ui.dashboardMetric = base.ui.dashboardMetric || "bodyWeight";
  base.ui.dashboardExerciseId = base.ui.dashboardExerciseId || "";
  base.ui.logRoutine = base.ui.logRoutine || "all";
  base.ui.logSort = base.ui.logSort || "date_desc";
  base.ui.activeTab = base.ui.activeTab || "dashboard";

  return base;
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

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readonly");
    const store = transaction.objectStore(DB_STORE);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

function idbSet(db, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    const store = transaction.objectStore(DB_STORE);
    const request = store.put(structuredClone(value), key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
