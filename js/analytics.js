import {
  buildRepsLabel,
  calcVolume,
  calcVolumeFromEntries,
  clamp,
  daysBetween,
  estimateE1RM,
  formatNumber,
  groupBy,
  linearRegressionSlope,
  parseRepRange,
  shortLabel,
  sortByDateAsc,
  sortByDateDesc,
  todayLocal,
  uniq
} from "./utils.js";

export const BODY_METRIC_LABELS = {
  bodyWeight: "Peso",
  bodyFat: "Grasa corporal",
  waist: "Cintura",
  chest: "Pecho",
  arm: "Brazo",
  thigh: "Pierna",
  hips: "Cadera",
  neck: "Cuello",
  sleepHours: "Sueño"
};

export function getActiveRoutine(state) {
  return state.routines.find((item) => item.id === state.session.routineId) || null;
}

export function getUniqueWorkoutDates(state) {
  return uniq(state.workouts.filter((item) => !item.isWarmup).map((item) => item.date)).sort().reverse();
}

export function computeStreak(state) {
  const workoutDates = getUniqueWorkoutDates(state);
  if (!workoutDates.length) return 0;
  if (daysBetween(workoutDates[0], todayLocal()) > 2) return 0;

  let streak = 1;
  for (let index = 1; index < workoutDates.length; index += 1) {
    const diff = daysBetween(workoutDates[index], workoutDates[index - 1]);
    if (diff <= 2) streak += 1;
    else break;
  }
  return streak;
}

export function computeStats(state) {
  const workoutDates = getUniqueWorkoutDates(state);
  const monthPrefix = todayLocal().slice(0, 7);
  const daysTrainedThisMonth = workoutDates.filter((date) => date.startsWith(monthPrefix)).length;
  const latestMeasurement = [...state.measurements].sort(sortByDateDesc)[0] || null;
  const bestLift = state.workouts.reduce((best, item) => !best || Number(item.weight) > Number(best.weight) ? item : best, null);
  const bestE1rm = state.workouts
    .filter((item) => !item.isWarmup)
    .reduce((best, item) => {
      const value = estimateE1RM(item.weight, item.reps);
      if (!best || value > best.value) return { value, item };
      return best;
    }, null);

  return {
    daysTrainedThisMonth,
    continuityActive: computeStreak(state),
    latestMeasurement,
    bestLift,
    bestE1rm
  };
}

export function computeLastDateByRoutine(state) {
  return state.workouts.reduce((acc, item) => {
    if (!item.routineId) return acc;
    if (!acc[item.routineId] || String(item.date).localeCompare(String(acc[item.routineId])) > 0) {
      acc[item.routineId] = item.date;
    }
    return acc;
  }, {});
}

export function getSuggestedRoutine(state) {
  const lastDateByRoutine = computeLastDateByRoutine(state);
  const ordered = [...state.routines].sort((a, b) => {
    const dateA = lastDateByRoutine[a.id];
    const dateB = lastDateByRoutine[b.id];
    if (!dateA && !dateB) return a.name.localeCompare(b.name, "es");
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
      ? `Es la rutina que llevas más tiempo sin tocar.`
      : `Todavía no la has usado, así que es la mejor candidata para arrancar.`
  };
}

export function buildWorkoutGroups(state, { includeWarmups = true } = {}) {
  const routineMap = Object.fromEntries(state.routines.map((routine) => [routine.id, routine]));
  const filtered = state.workouts.filter((item) => includeWarmups || !item.isWarmup);
  const groups = new Map();

  filtered.forEach((item) => {
    const exerciseGroupKey = item.exerciseId || item.exerciseKey || item.exercise;
    const groupKey = item.sessionId
      ? `session|${item.sessionId}|${exerciseGroupKey}`
      : `manual|${item.id}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupId: groupKey,
        primaryId: item.id,
        sessionId: item.sessionId || "",
        exercise: item.exercise,
        exerciseId: item.exerciseId || exerciseGroupKey,
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
        isEditable: !item.sessionId,
        latestCreatedAt: item.createdAt || item.updatedAt || `${item.date}T00:00:00`
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
    if (String(item.createdAt || "") > String(group.latestCreatedAt || "")) {
      group.latestCreatedAt = item.createdAt;
    }
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      repsLabel: buildRepsLabel(group.repsList)
    }))
    .sort(sortWorkoutGroupsByDateDesc);
}

export function sortWorkoutGroupsByDateDesc(a, b) {
  const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
  if (dateCompare !== 0) return dateCompare;
  return String(b.latestCreatedAt || b.primaryId || "").localeCompare(String(a.latestCreatedAt || a.primaryId || ""));
}

export function getWorkoutGroupSorter(sortBy) {
  switch (sortBy) {
    case "date_asc":
      return (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.latestCreatedAt || "").localeCompare(String(b.latestCreatedAt || ""));
    case "weight_desc":
      return (a, b) => Number(b.maxWeight) - Number(a.maxWeight) || sortWorkoutGroupsByDateDesc(a, b);
    case "exercise_asc":
      return (a, b) => a.exercise.localeCompare(b.exercise, "es") || sortWorkoutGroupsByDateDesc(a, b);
    default:
      return sortWorkoutGroupsByDateDesc;
  }
}

export function buildRecentActivity(state, limit = 5) {
  const sessions = [...state.sessionHistory]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.endedAt || "").localeCompare(String(a.endedAt || "")))
    .slice(0, 2)
    .map((item) => ({
      kind: "session",
      title: item.routineName || "Sesión finalizada",
      subtitle: `${item.totalSets} series · ${item.exercisesCompleted} ejercicios`,
      date: item.date,
      volume: item.volume,
      durationSeconds: item.durationSeconds
    }));

  const groups = buildWorkoutGroups(state, { includeWarmups: false })
    .slice(0, limit)
    .map((group) => ({
      kind: "group",
      title: group.exercise,
      subtitle: `${group.sourceLabel} · ${group.setCount} series · ${formatNumber(group.maxWeight)} kg top`,
      date: group.date,
      volume: group.volume,
      bestE1rm: group.bestE1rm,
      routineName: group.routineName
    }));

  return [...sessions, ...groups].slice(0, limit);
}

export function getExerciseHistory(state, exerciseIdOrName, options = {}) {
  const { routineId = "", includeWarmups = false } = options;
  return state.workouts
    .filter((item) => {
      const sameExercise = (item.exerciseId && item.exerciseId === exerciseIdOrName)
        || item.exercise === exerciseIdOrName
        || item.exerciseKey === exerciseIdOrName;
      const sameRoutine = !routineId || item.routineId === routineId;
      return sameExercise && sameRoutine && (includeWarmups || !item.isWarmup);
    })
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export function getExerciseReference(state, exerciseIdOrName, routineId = "") {
  return getExerciseHistory(state, exerciseIdOrName, { routineId }).find((item) => !item.isWarmup) || null;
}

export function nextLoadSuggestionForExercise(state, routineExercise) {
  if (!routineExercise) return { value: 0, decision: "start", reason: "Sin referencias previas." };

  const history = getExerciseHistory(state, routineExercise.catalogId || routineExercise.exerciseKey || routineExercise.name, {
    routineId: state.session.routineId || ""
  });
  const fallbackHistory = history.length
    ? history
    : getExerciseHistory(state, routineExercise.catalogId || routineExercise.exerciseKey || routineExercise.name);

  if (!fallbackHistory.length) {
    return { value: 0, decision: "start", reason: "Sin referencias previas." };
  }

  const top = fallbackHistory[0];
  const repRange = parseRepRange(routineExercise.reps);
  const routineFocus = String(getRoutineFocus(state, routineExercise) || "").toLowerCase();
  const isStrength = routineFocus.includes("fuerza") || (repRange.max > 0 && repRange.max <= 6);
  const baseIncrement = Number(state.preferences.suggestionIncrement || 2.5);
  const increment = isStrength && /sentadilla|peso muerto|prensa/i.test(routineExercise.name) ? baseIncrement * 2 : baseIncrement;
  const lastRpe = top.rpe === "" ? null : Number(top.rpe);

  if (lastRpe != null && lastRpe >= 9.5 && repRange.min && Number(top.reps || 0) < repRange.min) {
    return {
      value: Math.max(0, Number(top.weight || 0) - increment),
      decision: "down",
      reason: "Última referencia demasiado exigente para el rango objetivo."
    };
  }

  if (repRange.max && Number(top.reps || 0) >= repRange.max && (lastRpe == null || lastRpe <= 8.5)) {
    return {
      value: Number(top.weight || 0) + increment,
      decision: "up",
      reason: "Cumpliste el techo del rango con margen razonable."
    };
  }

  if (repRange.min && Number(top.reps || 0) < repRange.min) {
    return {
      value: Number(top.weight || 0),
      decision: "hold",
      reason: "Mantén la carga hasta entrar estable en el rango objetivo."
    };
  }

  return {
    value: Number(top.weight || 0),
    decision: "hold",
    reason: lastRpe != null && lastRpe >= 9
      ? "Mantén. El esfuerzo ya fue alto."
      : "Mantén y acumula repeticiones limpias antes de subir."
  };
}

function getRoutineFocus(state, routineExercise) {
  const routine = state.routines.find((item) => item.id === state.session.routineId)
    || state.routines.find((item) => (item.exercises || []).some((exercise) => exercise.id === routineExercise.id));
  return routine?.focus || "";
}

export function detectPotentialStall(state) {
  const grouped = groupBy(state.workouts.filter((item) => !item.isWarmup), (item) => item.exerciseId || item.exerciseKey || item.exercise);
  for (const logs of Object.values(grouped)) {
    const recent = logs.sort(sortByDateAsc).slice(-5);
    if (recent.length < 5) continue;
    const slope = linearRegressionSlope(recent.map((item) => estimateE1RM(item.weight, item.reps)));
    const daySpan = daysBetween(recent[0].date, recent[recent.length - 1].date);
    if (daySpan < 14) continue;
    if (Math.abs(slope) <= 0.35) {
      const latest = recent[recent.length - 1];
      return {
        exercise: latest.exercise,
        latest: estimateE1RM(latest.weight, latest.reps),
        slope,
        points: recent.length
      };
    }
  }
  return null;
}

export function buildExerciseChartPoints(state, exerciseId, metric) {
  if (!exerciseId) return [];
  const groups = groupBy(
    state.workouts.filter((item) => (item.exerciseId || item.exerciseKey || item.exercise) === exerciseId && !item.isWarmup),
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

export function buildBodyChartPoints(state, metric) {
  return state.measurements
    .filter((item) => item[metric] !== "" && item[metric] != null)
    .sort(sortByDateAsc)
    .slice(-12)
    .map((item) => ({ label: shortLabel(item.date), value: Number(item[metric]) }));
}

export function computeBestLiftMap(state) {
  return state.workouts.reduce((acc, item) => {
    if (item.isWarmup) return acc;
    const key = item.exerciseId || item.exerciseKey || item.exercise;
    if (!acc[key] || Number(item.weight) > Number(acc[key].value)) {
      acc[key] = { value: Number(item.weight), name: item.exercise };
    }
    return acc;
  }, {});
}

export function computeFirstLiftMap(state) {
  const map = {};
  state.workouts.forEach((item) => {
    if (item.isWarmup) return;
    const key = item.exerciseId || item.exerciseKey || item.exercise;
    const current = map[key];
    if (!current || String(item.date).localeCompare(String(current.date)) < 0) {
      map[key] = { value: Number(item.weight), date: item.date, name: item.exercise };
    }
  });
  return map;
}

export function computeGoalProgress({ baseline, current, target }) {
  if (current == null) return 0;
  if (baseline == null || baseline === target) {
    return clamp((current / Math.max(target, 1)) * 100, 0, 100);
  }
  const totalDistance = target - baseline;
  const currentDistance = current - baseline;
  if (totalDistance === 0) return 100;
  return clamp((currentDistance / totalDistance) * 100, 0, 100);
}

export function buildTrendItems(state) {
  const workoutDates = getUniqueWorkoutDates(state);
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

  const mostFrequentExercise = Object.entries(groupBy(state.workouts.filter((item) => !item.isWarmup), (item) => item.exerciseId || item.exerciseKey || item.exercise))
    .sort((a, b) => b[1].length - a[1].length)[0];
  const stall = detectPotentialStall(state);

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
      title: "Continuidad activa",
      subtitle: `Tu continuidad actual es de ${computeStreak(state)} días entrenados con margen real de adherencia.`,
      chips: [{ label: workoutDates[0] ? `Último entreno ${workoutDates[0]}` : "Sin entrenos", type: "ghost" }]
    },
    {
      title: "Peso corporal",
      subtitle: weightDelta == null ? "Aún no hay suficiente histórico para medir tendencia." : `Cambio acumulado ${weightDelta >= 0 ? "+" : ""}${formatNumber(weightDelta)} kg desde tu primera medición.`,
      chips: [{ label: latestMeasurement?.bodyWeight ? `Actual ${formatNumber(latestMeasurement.bodyWeight)} kg` : "Sin peso actual", type: "ghost" }]
    },
    {
      title: "Ejercicio más trabajado",
      subtitle: mostFrequentExercise ? `${mostFrequentExercise[1][0].exercise} con ${mostFrequentExercise[1].length} registros.` : "Sin suficiente histórico.",
      chips: [{ label: stall ? `Atento a ${stall.exercise}` : "Sin estancamiento claro", type: stall ? "warning" : "ghost" }]
    }
  ];
}

export function resolveGroupEntries(state, groupId) {
  if (groupId.startsWith("manual|")) {
    return {
      entryIds: [groupId.split("|")[1]],
      sessionId: ""
    };
  }

  if (groupId.startsWith("session|")) {
    const [, sessionId, exerciseId] = groupId.split("|");
    return {
      sessionId,
      entryIds: state.workouts
        .filter((item) => item.sessionId === sessionId && (item.exerciseId || item.exerciseKey || item.exercise) === exerciseId)
        .map((item) => item.id)
    };
  }

  return { entryIds: [], sessionId: "" };
}

export function syncSessionHistoryEntry(state, sessionId) {
  if (!sessionId) return;
  const records = state.workouts.filter((item) => item.sessionId === sessionId);
  const existingIndex = state.sessionHistory.findIndex((item) => item.sessionId === sessionId);

  if (!records.length) {
    if (existingIndex >= 0) state.sessionHistory.splice(existingIndex, 1);
    return;
  }

  const existing = existingIndex >= 0 ? state.sessionHistory[existingIndex] : null;
  const sorted = [...records].sort(sortByDateAsc);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const nonWarmups = records.filter((item) => !item.isWarmup);
  const routineName = state.routines.find((item) => item.id === (existing?.routineId || first.routineId))?.name || existing?.routineName || "";

  const entry = {
    id: existing?.id || sessionId,
    sessionId,
    routineId: existing?.routineId || first.routineId || "",
    routineName,
    date: existing?.date || first.date,
    startedAt: existing?.startedAt || first.createdAt || "",
    endedAt: existing?.endedAt || last.updatedAt || last.createdAt || "",
    durationSeconds: existing?.durationSeconds || 0,
    totalSets: records.reduce((sum, item) => sum + Number(item.sets || 1), 0),
    exercisesCompleted: uniq(nonWarmups.map((item) => item.exerciseId || item.exerciseKey || item.exercise)).length,
    volume: nonWarmups.reduce((sum, item) => sum + calcVolume(item), 0),
    notes: existing?.notes || ""
  };

  if (!entry.durationSeconds && entry.startedAt && entry.endedAt) {
    const diff = Math.max(0, Math.floor((new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000));
    entry.durationSeconds = diff;
  }

  if (existingIndex >= 0) state.sessionHistory[existingIndex] = entry;
  else state.sessionHistory.push(entry);
}

export function syncAllSessionHistory(state) {
  const sessionIds = uniq(state.workouts.filter((item) => item.sessionId).map((item) => item.sessionId).concat(state.sessionHistory.map((item) => item.sessionId)));
  sessionIds.forEach((sessionId) => syncSessionHistoryEntry(state, sessionId));
}
