import { mergeDeep, numOrBlank, optionalNumber, safeClone, safeNumber, uid, todayLocal, FALLBACK_REST_SECONDS } from "./utils.js";
import { normalizeRoutineExercise, normalizeWorkoutRecord } from "./catalog.js";

const DB_NAME = "gymflow-pro-db";
const DB_VERSION = 1;
const DB_STORE = "app_state";
const DB_KEY = "state";
const FALLBACK_STORAGE_KEY = "gymflow-pro-fallback";
const LEGACY_STORAGE_KEYS = [
  FALLBACK_STORAGE_KEY,
  "gymflow-pro-v6-fallback",
  "gymflow-pro-v5-fallback",
  "gymflow-pro-v4-data",
  "gymflow-pro-v3-data"
];

export function defaultState() {
  return {
    version: 7,
    workouts: [],
    measurements: [],
    routines: [],
    sessionHistory: [],
    goals: {
      athleteName: "",
      focusGoal: "",
      goalDate: "",
      resultGoals: {
        bodyWeight: "",
        waist: "",
        bodyFat: "",
        bench: "",
        squat: "",
        deadlift: ""
      },
      habits: {
        workoutsPerWeek: "",
        sleepHours: "",
        measureEveryDays: "",
        minimumStreakDays: ""
      }
    },
    preferences: {
      units: "metric",
      defaultRestSeconds: FALLBACK_REST_SECONDS,
      suggestionIncrement: 2.5,
      autoStartRest: true,
      keepScreenAwake: false,
      showWarmupsInLogs: true,
      enableVibration: true,
      collapseManualLog: true
    },
    session: {
      active: false,
      sessionId: "",
      routineId: "",
      startedAt: "",
      endedAt: "",
      completedExerciseIds: [],
      skippedExerciseIds: [],
      currentExerciseId: "",
      notes: "",
      setEntries: [],
      lastDeletedSet: null,
      restTimerEndsAt: ""
    },
    ui: {
      activeTab: "dashboard",
      editingWorkoutId: "",
      editingRoutineId: "",
      editingMeasurementId: "",
      editingGroupId: "",
      routineSearch: "",
      routineDayFilter: "all",
      dashboardExerciseId: "",
      dashboardExerciseMetric: "e1rm",
      dashboardMetric: "bodyWeight",
      chartAggregation: "day",
      analyticsLiftId: "",
      logSearch: "",
      logRoutine: "all",
      logSort: "date_desc",
      logSource: "all",
      logMuscle: "all",
      logDatePreset: "all",
      sessionManualOpen: false,
      settingsAdvancedOpen: false,
      logFiltersOpen: false,
      moreSection: "routines"
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
    const snapshot = safeClone(state);
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
  const raw = rawState || {};
  const base = mergeDeep(defaultState(), raw);
  base.version = 7;

  const legacyGoals = raw.goals || {};
  base.goals = {
    athleteName: String(legacyGoals.athleteName || base.goals.athleteName || "").trim(),
    focusGoal: String(legacyGoals.focusGoal || base.goals.focusGoal || "").trim(),
    goalDate: String(legacyGoals.goalDate || base.goals.goalDate || "").trim(),
    resultGoals: {
      bodyWeight: legacyGoals.resultGoals?.bodyWeight ?? legacyGoals.weightGoal ?? base.goals.resultGoals.bodyWeight ?? "",
      waist: legacyGoals.resultGoals?.waist ?? legacyGoals.waistGoal ?? base.goals.resultGoals.waist ?? "",
      bodyFat: legacyGoals.resultGoals?.bodyFat ?? legacyGoals.bodyFatGoal ?? base.goals.resultGoals.bodyFat ?? "",
      bench: legacyGoals.resultGoals?.bench ?? legacyGoals.benchGoal ?? base.goals.resultGoals.bench ?? "",
      squat: legacyGoals.resultGoals?.squat ?? legacyGoals.squatGoal ?? base.goals.resultGoals.squat ?? "",
      deadlift: legacyGoals.resultGoals?.deadlift ?? legacyGoals.deadliftGoal ?? base.goals.resultGoals.deadlift ?? ""
    },
    habits: {
      workoutsPerWeek: legacyGoals.habits?.workoutsPerWeek ?? "",
      sleepHours: legacyGoals.habits?.sleepHours ?? "",
      measureEveryDays: legacyGoals.habits?.measureEveryDays ?? "",
      minimumStreakDays: legacyGoals.habits?.minimumStreakDays ?? ""
    }
  };

  base.preferences = {
    ...defaultState().preferences,
    ...(raw.preferences || {})
  };

  base.workouts = Array.isArray(base.workouts) ? base.workouts.map((item) => normalizeWorkoutRecord({
    id: item.id || uid(),
    date: item.date || todayLocal(),
    routineId: item.routineId || "",
    sessionId: item.sessionId || "",
    exercise: String(item.exercise || item.exerciseName || "").trim(),
    weight: safeNumber(item.weight, 0),
    loadMode: item.loadMode === "bodyweight" ? "bodyweight" : "kg",
    sets: item.sessionId ? 1 : Math.max(1, safeNumber(item.sets, 1)),
    reps: Math.max(1, safeNumber(item.reps, 1)),
    rpe: optionalNumber(item.rpe, { min: 1, max: 10 }),
    rest: optionalNumber(item.rest, { min: 0 }),
    tempo: String(item.tempo || "").trim(),
    notes: String(item.notes || "").trim(),
    isWarmup: Boolean(item.isWarmup),
    source: item.source || (item.sessionId ? "session" : "manual"),
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
    createdAt: routine.createdAt || new Date().toISOString(),
    updatedAt: routine.updatedAt || routine.createdAt || new Date().toISOString(),
    exercises: Array.isArray(routine.exercises)
      ? routine.exercises.map((exercise) => normalizeRoutineExercise({
        id: exercise.id || uid(),
        name: String(exercise.name || "").trim(),
        sets: Number(exercise.sets || 0),
        reps: String(exercise.reps || "").trim(),
        rest: Number(exercise.rest ?? base.preferences.defaultRestSeconds ?? FALLBACK_REST_SECONDS),
        block: String(exercise.block || "").trim(),
        notes: String(exercise.notes || "").trim(),
        createdAt: exercise.createdAt || new Date().toISOString()
      }))
      : []
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
    workingSets: Number(item.workingSets || item.totalSets || 0),
    warmupSets: Number(item.warmupSets || 0),
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
    skippedExerciseIds: Array.isArray(base.session?.skippedExerciseIds) ? [...new Set(base.session.skippedExerciseIds)] : [],
    currentExerciseId: base.session?.currentExerciseId || "",
    notes: String(base.session?.notes || ""),
    lastDeletedSet: base.session?.lastDeletedSet
      ? normalizeWorkoutRecord({
        ...base.session.lastDeletedSet,
        loadMode: base.session.lastDeletedSet.loadMode === "bodyweight" ? "bodyweight" : "kg",
        weight: safeNumber(base.session.lastDeletedSet.weight, 0),
        reps: Math.max(1, safeNumber(base.session.lastDeletedSet.reps, 1)),
        source: "session"
      })
      : null,
    restTimerEndsAt: base.session?.restTimerEndsAt || "",
    setEntries: Array.isArray(base.session?.setEntries)
      ? base.session.setEntries.map((entry) => normalizeWorkoutRecord({
        id: entry.id || uid(),
        exerciseId: entry.exerciseId || "",
        exerciseName: entry.exerciseName || entry.exercise || "",
        exercise: entry.exerciseName || entry.exercise || "",
        exerciseKey: entry.exerciseKey || "",
        muscleGroup: entry.muscleGroup || "",
        movementPattern: entry.movementPattern || "",
        weight: safeNumber(entry.weight, 0),
        loadMode: entry.loadMode === "bodyweight" ? "bodyweight" : "kg",
        reps: Math.max(1, safeNumber(entry.reps, 1)),
        rpe: optionalNumber(entry.rpe, { min: 1, max: 10 }),
        rest: optionalNumber(entry.rest, { min: 0 }),
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
        loadMode: entry.loadMode === "bodyweight" ? "bodyweight" : "kg",
        createdAt: entry.createdAt,
        notes: entry.notes || ""
      }))
      : []
  };
  if (base.session.active) {
    const activeRoutine = base.routines.find((routine) => routine.id === base.session.routineId);
    const validExerciseIds = new Set((activeRoutine?.exercises || []).map((exercise) => exercise.id));
    base.session.setEntries = base.session.setEntries.filter((entry) => validExerciseIds.has(entry.exerciseId));
    if (!activeRoutine) {
      base.session.active = false;
      base.session.setEntries = [];
      base.session.completedExerciseIds = [];
      base.session.skippedExerciseIds = [];
    }
  }

  base.ui = {
    ...defaultState().ui,
    ...(raw.ui || {})
  };

  if (!base.ui.dashboardExerciseMetric) base.ui.dashboardExerciseMetric = "e1rm";
  if (!base.ui.dashboardMetric) base.ui.dashboardMetric = "bodyWeight";
  if (!base.ui.chartAggregation) base.ui.chartAggregation = "day";
  if (!base.ui.logRoutine) base.ui.logRoutine = "all";
  if (!base.ui.logSort) base.ui.logSort = "date_desc";
  if (!base.ui.logSource) base.ui.logSource = "all";
  if (!base.ui.logMuscle) base.ui.logMuscle = "all";
  if (!base.ui.logDatePreset) base.ui.logDatePreset = "all";
  if (base.ui.activeTab === "tab-dashboard") base.ui.activeTab = "dashboard";
  if (base.ui.activeTab === "tab-session") base.ui.activeTab = "session";
  if (![ "dashboard", "session", "logs", "more", "routines", "measurements", "analytics", "goals", "settings" ].includes(base.ui.activeTab)) {
    base.ui.activeTab = "dashboard";
  }
  if (!base.ui.moreSection) base.ui.moreSection = "routines";

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
    const request = store.put(safeClone(value), key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
