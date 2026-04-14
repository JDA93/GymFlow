import { getExerciseMeta, normalizeWorkoutRecord } from "./catalog.js";
import { calcVolumeFromEntries, datePartFromIso, FALLBACK_REST_SECONDS, todayLocal, uid } from "./utils.js";
import { getActiveRoutine, syncSessionHistoryEntry } from "./analytics.js";

export function createBlankSession() {
  return {
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
}

export function hasActiveSessionRisk(state) {
  return Boolean(state.session.active && (state.session.setEntries.length || state.session.notes.trim()));
}

export function beginSessionFromRoutine(state, routineId, confirmReplace = window.confirm) {
  if (!routineId) {
    return { status: "error", message: "Selecciona una rutina." };
  }

  if (state.session.active) {
    if (state.session.routineId === routineId) {
      return { status: "existing", message: "Ya tienes esta sesión activa. Continúa donde la dejaste." };
    }

    const hasData = state.session.setEntries.length > 0 || state.session.notes.trim();
    const accepted = confirmReplace(hasData
      ? "Ya hay una sesión activa con series guardadas. Si cambias de rutina, perderás esa sesión activa. ¿Quieres reemplazarla?"
      : "Ya hay una sesión activa. ¿Quieres reemplazarla?");

    if (!accepted) {
      return { status: "cancelled", message: "Se ha mantenido la sesión activa." };
    }
  }

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

  return { status: "started", message: "Sesión iniciada." };
}

export function discardActiveSession(state) {
  state.session = createBlankSession();
}

export function setSessionNotes(state, notes) {
  state.session.notes = String(notes || "");
}

export function getSessionDurationSeconds(state) {
  if (!state.session.active || !state.session.startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(state.session.startedAt).getTime()) / 1000));
}

export function recomputeCompletedExercises(state) {
  const routine = getActiveRoutine(state);
  if (!routine) {
    state.session.completedExerciseIds = [];
    return;
  }

  const completed = new Set();
  routine.exercises.forEach((exercise) => {
    const effectiveCount = state.session.setEntries.filter((item) => item.exerciseId === exercise.id && !item.isWarmup).length;
    if (effectiveCount >= Number(exercise.sets || 0)) {
      completed.add(exercise.id);
    }
  });

  state.session.completedExerciseIds = [...completed];
}

export function addSessionSet(state, exerciseId, payload) {
  const routine = getActiveRoutine(state);
  const exercise = routine?.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return { ok: false, message: "No se ha encontrado el ejercicio." };

  const weight = Number(payload.weight || 0);
  const reps = Number(payload.reps || 0);
  const rest = Number(payload.rest || exercise.rest || state.preferences.defaultRestSeconds || FALLBACK_REST_SECONDS);
  const isWarmup = Boolean(payload.isWarmup);

  if (!weight || !reps) {
    return { ok: false, message: "Completa peso y repeticiones." };
  }

  const meta = getExerciseMeta(exercise.name);
  state.session.setEntries.push({
    id: uid(),
    exerciseId,
    exerciseName: meta.name,
    exerciseKey: meta.key,
    muscleGroup: meta.muscleGroup,
    movementPattern: meta.pattern,
    weight,
    reps,
    rpe: payload.rpe === "" || payload.rpe == null ? "" : Number(payload.rpe),
    rest,
    isWarmup,
    createdAt: new Date().toISOString(),
    notes: String(payload.notes || "")
  });

  state.session.currentExerciseId = exerciseId;
  recomputeCompletedExercises(state);
  return { ok: true, message: `${exercise.name}: serie guardada.`, rest, exerciseName: exercise.name };
}

export function deleteSessionSet(state, entryId) {
  const previousLength = state.session.setEntries.length;
  state.session.setEntries = state.session.setEntries.filter((item) => item.id !== entryId);
  if (state.session.setEntries.length === previousLength) {
    return { ok: false, message: "No se ha encontrado la serie." };
  }

  recomputeCompletedExercises(state);
  return { ok: true, message: "Serie eliminada." };
}

export function copyLastSessionIntoActive(state) {
  const routine = getActiveRoutine(state);
  if (!routine) return { ok: false, message: "Inicia primero una rutina." };

  const sourceSession = [...state.sessionHistory]
    .filter((item) => item.routineId === routine.id && item.sessionId !== state.session.sessionId)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.endedAt || "").localeCompare(String(a.endedAt || "")))[0];

  if (!sourceSession?.sessionId) {
    return { ok: false, message: "No hay una sesión anterior de esta rutina para copiar." };
  }

  const sourceEntries = state.workouts
    .filter((item) => item.sessionId === sourceSession.sessionId)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));

  if (!sourceEntries.length) {
    return { ok: false, message: "La sesión anterior no tiene series guardadas." };
  }

  const now = Date.now();
  state.session.setEntries = sourceEntries.map((item, index) => ({
    id: uid(),
    exerciseId: routine.exercises.find((exercise) => (exercise.catalogId || exercise.exerciseKey || exercise.name) === (item.exerciseId || item.exerciseKey || item.exercise))?.id
      || routine.exercises.find((exercise) => exercise.name === item.exercise)?.id
      || item.exerciseId,
    exerciseName: item.exercise,
    exerciseKey: item.exerciseKey || item.exerciseId,
    muscleGroup: item.muscleGroup || "",
    movementPattern: item.movementPattern || "",
    weight: Number(item.weight || 0),
    reps: Number(item.reps || 0),
    rpe: item.rpe === "" ? "" : Number(item.rpe),
    rest: item.rest === "" ? "" : Number(item.rest),
    isWarmup: Boolean(item.isWarmup),
    createdAt: new Date(now + index * 1000).toISOString(),
    notes: item.notes || ""
  }));

  recomputeCompletedExercises(state);
  return { ok: true, message: `Se han copiado ${sourceEntries.length} series de la última sesión.` };
}

export function endSession(state) {
  if (!state.session.active) {
    return { ok: false, message: "No hay sesión activa." };
  }

  const routine = getActiveRoutine(state);
  const endedAt = new Date().toISOString();
  const entries = [...state.session.setEntries];

  const workoutRecords = entries.map((entry) => normalizeWorkoutRecord({
    id: uid(),
    date: datePartFromIso(entry.createdAt) || todayLocal(),
    routineId: state.session.routineId,
    sessionId: state.session.sessionId,
    exercise: entry.exerciseName || routine?.exercises.find((item) => item.id === entry.exerciseId)?.name || "Ejercicio",
    exerciseId: routine?.exercises.find((item) => item.id === entry.exerciseId)?.catalogId || entry.exerciseId,
    exerciseKey: entry.exerciseKey || entry.exerciseId,
    muscleGroup: entry.muscleGroup || "",
    movementPattern: entry.movementPattern || "",
    weight: Number(entry.weight || 0),
    sets: 1,
    reps: Number(entry.reps || 0),
    rpe: entry.rpe === "" ? "" : Number(entry.rpe),
    rest: entry.rest === "" ? "" : Number(entry.rest),
    tempo: "",
    notes: entry.notes || (entry.isWarmup ? "Serie de calentamiento" : "Serie guardada desde sesión"),
    isWarmup: Boolean(entry.isWarmup),
    source: "session",
    createdAt: entry.createdAt,
    updatedAt: endedAt
  }));

  state.workouts.push(...workoutRecords);

  const existingIndex = state.sessionHistory.findIndex((item) => item.sessionId === state.session.sessionId);
  const summary = {
    id: existingIndex >= 0 ? state.sessionHistory[existingIndex].id : uid(),
    sessionId: state.session.sessionId,
    routineId: state.session.routineId,
    routineName: routine?.name || "",
    date: datePartFromIso(state.session.startedAt) || todayLocal(),
    startedAt: state.session.startedAt,
    endedAt,
    durationSeconds: getSessionDurationSeconds(state),
    totalSets: entries.length,
    exercisesCompleted: state.session.completedExerciseIds.length,
    volume: calcVolumeFromEntries(entries),
    notes: state.session.notes || ""
  };

  if (existingIndex >= 0) state.sessionHistory[existingIndex] = summary;
  else state.sessionHistory.push(summary);

  syncSessionHistoryEntry(state, state.session.sessionId);
  discardActiveSession(state);

  return { ok: true, message: "Sesión guardada y cerrada.", totalRecords: workoutRecords.length };
}

export function getSessionEntriesByExercise(state, exerciseId) {
  return state.session.setEntries
    .filter((item) => item.exerciseId === exerciseId)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}
