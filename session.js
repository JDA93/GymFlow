import { getExerciseMeta, normalizeWorkoutRecord } from "./catalog.js";
import { calcVolumeFromEntries, datePartFromIso, FALLBACK_REST_SECONDS, normalizeNameForMatch, optionalNumber, safeNumber, todayLocal, uid } from "./utils.js";
import { getActiveRoutine, syncSessionHistoryEntry } from "./analytics-core.js";

export function createBlankSession() {
  return {
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
  };
}

export function hasActiveSessionRisk(state) {
  return Boolean(state.session.active && (state.session.setEntries.length || state.session.notes.trim()));
}

export function describeActiveSessionRisk(state) {
  const entries = state.session.setEntries || [];
  const working = entries.filter((item) => !item.isWarmup).length;
  const warmups = entries.filter((item) => item.isWarmup).length;
  const notes = state.session.notes?.trim() ? 1 : 0;
  if (!working && !warmups && !notes) return "";
  const parts = [];
  if (working) parts.push(`${working} series efectivas`);
  if (warmups) parts.push(`${warmups} warm-up`);
  if (notes) parts.push("notas");
  return parts.join(", ");
}

export function beginSessionFromRoutine(state, routineId, confirmReplace = window.confirm) {
  if (!routineId) return { status: "error", message: "Selecciona una rutina." };

  const routine = state.routines.find((item) => item.id === routineId);
  if (!routine) {
    return { status: "error", message: "La rutina seleccionada ya no existe. Abre Rutinas y elige una válida." };
  }
  if (!Array.isArray(routine.exercises) || !routine.exercises.length) {
    return { status: "error", message: "La rutina seleccionada no tiene ejercicios. Añade al menos uno antes de iniciar." };
  }

  if (state.session.active) {
    if (state.session.routineId === routineId) {
      return { status: "existing", message: "Ya tienes esta sesión activa. Continúa donde la dejaste." };
    }

    const hasData = state.session.setEntries.length > 0 || state.session.notes.trim();
    const accepted = confirmReplace(hasData
      ? "Ya hay una sesión activa con series guardadas. Si cambias de rutina, perderás esa sesión activa. ¿Quieres reemplazarla?"
      : "Ya hay una sesión activa. ¿Quieres reemplazarla?");

    if (!accepted) return { status: "cancelled", message: "Se mantiene la sesión actual." };
  }

  state.session = {
    ...createBlankSession(),
    active: true,
    sessionId: uid(),
    routineId,
    startedAt: new Date().toISOString(),
    currentExerciseId: ""
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

export function getSessionEntriesByExercise(state, exerciseId) {
  return state.session.setEntries
    .filter((item) => item.exerciseId === exerciseId)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function getWorkingEntriesByExercise(state, exerciseId) {
  return getSessionEntriesByExercise(state, exerciseId).filter((item) => !item.isWarmup);
}

export function recomputeCompletedExercises(state) {
  const routine = getActiveRoutine(state);
  if (!routine) {
    state.session.completedExerciseIds = [];
    return [];
  }

  const completed = routine.exercises
    .filter((exercise) => getWorkingEntriesByExercise(state, exercise.id).length >= Number(exercise.sets || 0) && Number(exercise.sets || 0) > 0)
    .map((exercise) => exercise.id);

  state.session.completedExerciseIds = completed;
  state.session.skippedExerciseIds = (state.session.skippedExerciseIds || []).filter((id) => routine.exercises.some((exercise) => exercise.id === id));
  return completed;
}

export function isExerciseSkipped(state, exerciseId) {
  return (state.session.skippedExerciseIds || []).includes(exerciseId);
}

export function getExerciseCompletionStatus(state, exercise) {
  const workingEntries = getWorkingEntriesByExercise(state, exercise.id);
  const targetSets = Number(exercise.sets || 0);
  const skipped = isExerciseSkipped(state, exercise.id);
  const completed = !skipped && targetSets > 0 && workingEntries.length >= targetSets;
  const inProgress = !skipped && workingEntries.length > 0 && !completed;
  return { skipped, completed, inProgress, workingEntries, targetSets };
}

export function toggleSkipExercise(state, exerciseId) {
  const set = new Set(state.session.skippedExerciseIds || []);
  const wasSkipped = set.has(exerciseId);
  if (wasSkipped) set.delete(exerciseId);
  else set.add(exerciseId);
  state.session.skippedExerciseIds = [...set];
  recomputeCompletedExercises(state);
  return !wasSkipped
    ? { ok: true, message: "Ejercicio omitido por ahora." }
    : { ok: true, message: "Ejercicio reactivado." };
}

export function addSessionSet(state, exerciseId, payload) {
  const routine = getActiveRoutine(state);
  const exercise = routine?.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return { ok: false, message: "No se ha encontrado el ejercicio." };

  const weight = Number(payload.weight);
  const reps = Number(payload.reps);
  // Nota: `0` es un descanso válido, por eso evitamos usar `||` aquí.
  const rest = safeNumber(payload.rest ?? exercise.rest ?? state.preferences.defaultRestSeconds ?? FALLBACK_REST_SECONDS, FALLBACK_REST_SECONDS);
  const isWarmup = Boolean(payload.isWarmup);

  if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps <= 0) {
    return { ok: false, message: "Introduce un peso válido (puede ser 0) y repeticiones mayores que 0." };
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
    rpe: optionalNumber(payload.rpe, { min: 1, max: 10 }),
    rest,
    isWarmup,
    createdAt: new Date().toISOString(),
    notes: String(payload.notes || "")
  });

  state.session.currentExerciseId = exerciseId;
  state.session.lastDeletedSet = null;
  recomputeCompletedExercises(state);
  const nextExerciseId = getNextSuggestedExerciseId(state, exerciseId);
  return {
    ok: true,
    message: `${exercise.name}: serie guardada.`,
    rest,
    exerciseName: exercise.name,
    currentExerciseCompleted: getWorkingEntriesByExercise(state, exerciseId).length >= Number(exercise.sets || 0),
    nextExerciseId
  };
}

export function deleteSessionSet(state, entryId) {
  const index = state.session.setEntries.findIndex((item) => item.id === entryId);
  if (index < 0) return { ok: false, message: "No se ha encontrado la serie." };
  const [removed] = state.session.setEntries.splice(index, 1);
  state.session.lastDeletedSet = removed;
  recomputeCompletedExercises(state);
  return { ok: true, message: "Serie eliminada.", removed };
}

export function updateSessionSet(state, entryId, payload) {
  const index = state.session.setEntries.findIndex((item) => item.id === entryId);
  if (index < 0) return { ok: false, message: "No se ha encontrado la serie para editar." };
  const current = state.session.setEntries[index];
  const weight = Number(payload.weight);
  const reps = Number(payload.reps);
  const rpe = payload.rpe === "" || payload.rpe == null ? "" : optionalNumber(payload.rpe, { min: 1, max: 10 });
  if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps <= 0) {
    return { ok: false, message: "La edición requiere peso válido y reps mayores a 0." };
  }
  state.session.setEntries[index] = {
    ...current,
    weight,
    reps,
    rpe,
    isWarmup: Boolean(payload.isWarmup),
    // Nota: `0` es un descanso válido, por eso evitamos usar `||` aquí.
    rest: safeNumber(payload.rest ?? current.rest ?? state.preferences.defaultRestSeconds ?? FALLBACK_REST_SECONDS, FALLBACK_REST_SECONDS),
    updatedAt: new Date().toISOString()
  };
  recomputeCompletedExercises(state);
  return { ok: true, message: "Serie actualizada." };
}

export function restoreLastDeletedSessionSet(state) {
  if (!state.session.lastDeletedSet) return { ok: false, message: "No hay una serie reciente para recuperar." };
  state.session.setEntries.push({ ...state.session.lastDeletedSet, id: uid(), createdAt: new Date().toISOString() });
  state.session.lastDeletedSet = null;
  recomputeCompletedExercises(state);
  return { ok: true, message: "Serie recuperada." };
}

export function copyLastSessionIntoActive(state, confirmReplace = window.confirm) {
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

  const activeRisk = describeActiveSessionRisk(state);
  if (activeRisk) {
    const accepted = confirmReplace(`Ya tienes datos en la sesión activa (${activeRisk}). Copiar la última sesión reemplazará esas series. ¿Quieres continuar?`);
    if (!accepted) return { ok: false, code: "cancelled", message: "Se mantiene la sesión activa actual." };
  }

  const now = Date.now();
  const copied = [];
  const omitted = [];
  sourceEntries.forEach((item) => {
    const matchedExercise = matchRoutineExercise(routine, item);
    if (!matchedExercise) {
      omitted.push(item.id);
      return;
    }
    copied.push({
      id: uid(),
      exerciseId: matchedExercise.id,
      exerciseName: matchedExercise.name,
      exerciseKey: matchedExercise.exerciseKey || matchedExercise.catalogId || item.exerciseKey || item.exerciseId || "",
      muscleGroup: matchedExercise.muscleGroup || item.muscleGroup || "",
      movementPattern: matchedExercise.movementPattern || item.movementPattern || "",
      weight: safeNumber(item.weight, 0),
      reps: Math.max(1, safeNumber(item.reps, 1)),
      rpe: optionalNumber(item.rpe, { min: 1, max: 10 }),
      rest: optionalNumber(item.rest, { min: 0 }),
      isWarmup: Boolean(item.isWarmup),
      createdAt: new Date(now + copied.length * 1000).toISOString(),
      notes: String(item.notes || "")
    });
  });

  state.session.setEntries = copied;
  state.session.skippedExerciseIds = [];
  state.session.lastDeletedSet = null;
  recomputeCompletedExercises(state);
  if (!copied.length) {
    return { ok: false, message: "La sesión anterior no tiene series compatibles con la rutina activa." };
  }
  return {
    ok: true,
    message: omitted.length
      ? `Se copiaron ${copied.length} series válidas. ${omitted.length} se omitieron por no tener match seguro.`
      : `Se han copiado ${copied.length} series de la última sesión.`
  };
}

function matchRoutineExercise(routine, entry) {
  if (!routine?.exercises?.length) return null;
  const byRoutineInternalId = routine.exercises.find((exercise) => exercise.id && exercise.id === entry.exerciseId);
  if (byRoutineInternalId) return byRoutineInternalId;
  const byCatalogId = routine.exercises.find((exercise) => exercise.catalogId && exercise.catalogId === entry.exerciseId);
  if (byCatalogId) return byCatalogId;
  const byExerciseKey = routine.exercises.find((exercise) => exercise.exerciseKey && exercise.exerciseKey === (entry.exerciseKey || entry.exerciseId));
  if (byExerciseKey) return byExerciseKey;
  const normalizedEntryName = normalizeNameForMatch(entry.exercise || entry.exerciseName);
  if (!normalizedEntryName) return null;
  return routine.exercises.find((exercise) => normalizeNameForMatch(exercise.name) === normalizedEntryName) || null;
}

export function getNextSuggestedExerciseId(state, currentExerciseId = "") {
  const routine = getActiveRoutine(state);
  if (!routine) return "";
  const currentIndex = routine.exercises.findIndex((exercise) => exercise.id === currentExerciseId);
  const candidates = currentIndex >= 0
    ? [...routine.exercises.slice(currentIndex), ...routine.exercises.slice(0, currentIndex)]
    : [...routine.exercises];
  const next = candidates.find((exercise) => {
    const status = getExerciseCompletionStatus(state, exercise);
    return !status.completed && !status.skipped;
  });
  return next?.id || currentExerciseId || routine.exercises[0]?.id || "";
}

export function endSession(state) {
  if (!state.session.active) {
    return { ok: false, code: "no-session", message: "No hay sesión activa." };
  }

  if (!state.session.setEntries.length) {
    return { ok: false, code: "empty-session", message: "La sesión está vacía." };
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

  const effectiveCompleted = (routine?.exercises || []).filter((exercise) => {
    const status = getExerciseCompletionStatus(state, exercise);
    return status.completed;
  }).length;

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
    workingSets: entries.filter((entry) => !entry.isWarmup).length,
    warmupSets: entries.filter((entry) => entry.isWarmup).length,
    exercisesCompleted: effectiveCompleted,
    volume: calcVolumeFromEntries(entries),
    notes: state.session.notes || ""
  };

  if (existingIndex >= 0) state.sessionHistory[existingIndex] = summary;
  else state.sessionHistory.push(summary);

  syncSessionHistoryEntry(state, state.session.sessionId);
  discardActiveSession(state);

  return { ok: true, message: "Sesión guardada y cerrada.", totalRecords: workoutRecords.length };
}
