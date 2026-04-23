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
  monthLabel,
  normalizeNameForMatch,
  parseRepRange,
  relativeDaysLabel,
  shortLabel,
  sortByDateAsc,
  sortByDateDesc,
  startOfWeek,
  todayLocal,
  uniq,
  weekLabel
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

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasValue(value) {
  return value !== "" && value != null;
}

function toFiniteNumberOrNull(value) {
  if (!hasValue(value)) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isExternalLoadRecord(item) {
  return item?.loadMode !== "bodyweight";
}

function filterExternalLoadRecords(items) {
  return ensureArray(items).filter((item) => isExternalLoadRecord(item));
}

export function getActiveRoutine(state) {
  const routines = ensureArray(state?.routines);
  const routineId = state?.session?.routineId;
  return routines.find((item) => item.id === routineId) || null;
}

export function getUniqueWorkoutDates(state) {
  return uniq(ensureArray(state?.workouts).filter((item) => !item.isWarmup).map((item) => item.date)).sort().reverse();
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
  const measurements = ensureArray(state?.measurements);
  const workouts = ensureArray(state?.workouts);
  const latestMeasurement = [...measurements].sort(sortByDateDesc)[0] || null;
  const bestLift = workouts.reduce((best, item) => !item.isWarmup && isExternalLoadRecord(item) && (!best || Number(item.weight) > Number(best.weight)) ? item : best, null);
  const bestE1rm = workouts
    .filter((item) => !item.isWarmup && isExternalLoadRecord(item))
    .reduce((best, item) => {
      const value = estimateE1RM(item.weight, item.reps);
      if (!best || value > best.value) return { value, item };
      return best;
    }, null);

  const lastSession = [...ensureArray(state?.sessionHistory)].sort((a, b) => getChronologicalAnchor(b) - getChronologicalAnchor(a))[0] || null;

  return {
    daysTrainedThisMonth,
    continuityActive: computeStreak(state),
    latestMeasurement,
    bestLift,
    bestE1rm,
    lastSession
  };
}

export function computeLastDateByRoutine(state) {
  return ensureArray(state?.workouts).reduce((acc, item) => {
    if (!item.routineId) return acc;
    if (!acc[item.routineId] || String(item.date).localeCompare(String(acc[item.routineId])) > 0) {
      acc[item.routineId] = item.date;
    }
    return acc;
  }, {});
}

export function getSuggestedRoutine(state) {
  const lastDateByRoutine = computeLastDateByRoutine(state);
  const ordered = [...ensureArray(state?.routines)].sort((a, b) => {
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

export function buildRoutineMetadata(state, routine) {
  const lastDateByRoutine = computeLastDateByRoutine(state);
  const blocks = uniq((routine.exercises || []).map((exercise) => exercise.block).filter(Boolean));
  const totalSets = (routine.exercises || []).reduce((sum, exercise) => sum + Number(exercise.sets || 0), 0);
  const lowRepBias = (routine.exercises || []).filter((exercise) => parseRepRange(exercise.reps).max && parseRepRange(exercise.reps).max <= 6).length;
  const complexityScore = totalSets + blocks.length * 2 + lowRepBias * 1.5;
  let complexityLabel = "Ligera";
  if (complexityScore >= 16) complexityLabel = "Sólida";
  if (complexityScore >= 24) complexityLabel = "Alta";

  return {
    lastDate: lastDateByRoutine[routine.id] || "",
    exerciseCount: (routine.exercises || []).length,
    blockCount: blocks.length,
    totalSets,
    complexityLabel,
    complexityScore
  };
}

export function buildWorkoutGroups(state, { includeWarmups = true } = {}) {
  const routineMap = Object.fromEntries(ensureArray(state?.routines).map((routine) => [routine.id, routine]));
  const filtered = ensureArray(state?.workouts).filter((item) => includeWarmups || !item.isWarmup);
  const groups = new Map();

  filtered.forEach((item) => {
    const exerciseGroupKey = item.exerciseId || item.exerciseKey || item.exercise;
    const groupKey = item.sessionId ? `session|${item.sessionId}|${exerciseGroupKey}` : `manual|${item.id}`;

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
        latestCreatedAt: item.createdAt || item.updatedAt || `${item.date}T00:00:00`,
        muscleGroup: item.muscleGroup || ""
      });
    }

    const group = groups.get(groupKey);
    group.entries.push(item);
    group.setCount += Number(item.sets || 1);
    group.repsList.push(Number(item.reps || 0));
    group.maxWeight = Math.max(group.maxWeight, isExternalLoadRecord(item) ? Number(item.weight || 0) : 0);
    group.volume += calcVolume(item);
    group.bestE1rm = Math.max(group.bestE1rm, isExternalLoadRecord(item) ? estimateE1RM(item.weight, item.reps) : 0);
    group.containsWarmup = group.containsWarmup || item.isWarmup;
    if (String(item.createdAt || "") > String(group.latestCreatedAt || "")) group.latestCreatedAt = item.createdAt;
  });

  return [...groups.values()]
    .map((group) => ({ ...group, repsLabel: buildRepsLabel(group.repsList) }))
    .sort(sortWorkoutGroupsByDateDesc);
}

export function sortWorkoutGroupsByDateDesc(a, b) {
  return getChronologicalAnchor(b) - getChronologicalAnchor(a);
}

export function getWorkoutGroupSorter(sortBy) {
  switch (sortBy) {
    case "date_asc":
      return (a, b) => getChronologicalAnchor(a) - getChronologicalAnchor(b);
    case "weight_desc":
      return (a, b) => Number(b.maxWeight) - Number(a.maxWeight) || sortWorkoutGroupsByDateDesc(a, b);
    case "exercise_asc":
      return (a, b) => a.exercise.localeCompare(b.exercise, "es") || sortWorkoutGroupsByDateDesc(a, b);
    default:
      return sortWorkoutGroupsByDateDesc;
  }
}

export function buildSessionExerciseSummaries(state, sessionId) {
  const entries = ensureArray(state?.workouts).filter((item) => item.sessionId === sessionId && !item.isWarmup);
  const grouped = Object.values(groupBy(entries, (item) => item.exerciseId || item.exerciseKey || item.exercise));
  return grouped
    .map((logs) => {
      const external = filterExternalLoadRecords(logs);
      return ({
      exercise: logs[0].exercise,
      setCount: logs.length,
      maxWeight: external.length ? Math.max(...external.map((item) => Number(item.weight || 0))) : 0,
      repsTop: logs.reduce((best, item) => Number(item.reps || 0) > Number(best.reps || 0) ? item : best, logs[0]).reps,
      muscleGroup: logs[0].muscleGroup || ""
      });
    })
    .sort((a, b) => b.maxWeight - a.maxWeight || a.exercise.localeCompare(b.exercise, "es"));
}

export function buildRecentActivity(state, limit = 6) {
  const sessions = [...ensureArray(state?.sessionHistory)]
    .sort((a, b) => getChronologicalAnchor(b) - getChronologicalAnchor(a))
    .slice(0, limit)
    .map((item) => ({
      kind: "session",
      title: item.routineName || "Sesión finalizada",
      subtitle: `${item.totalSets} series · ${item.exercisesCompleted} ejercicios`,
      date: item.date,
      volume: item.volume,
      durationSeconds: item.durationSeconds,
      routineName: item.routineName,
      sessionId: item.sessionId,
      notes: item.notes || "",
      sortAnchor: item.endedAt || item.startedAt || `${item.date}T00:00:00`
    }));

  const manualGroups = buildWorkoutGroups(state, { includeWarmups: false })
    .filter((group) => !group.sessionId)
    .slice(0, limit)
    .map((group) => ({
      kind: "manual",
      title: group.exercise,
      subtitle: `Registro suelto · ${group.setCount} series · ${formatNumber(group.maxWeight)} kg top`,
      date: group.date,
      volume: group.volume,
      bestE1rm: group.bestE1rm,
      routineName: group.routineName,
      notes: group.entries.map((entry) => String(entry.notes || "").trim()).find(Boolean) || "",
      sortAnchor: group.latestCreatedAt || `${group.date}T00:00:00`
    }));

  return [...sessions, ...manualGroups]
    .sort((a, b) => getChronologicalAnchor(b) - getChronologicalAnchor(a))
    .slice(0, limit);
}

export function getExerciseHistory(state, exerciseIdOrName, options = {}) {
  const { routineId = "", includeWarmups = false } = options;
  return ensureArray(state?.workouts)
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
  return getExerciseHistory(state, exerciseIdOrName, { routineId }).find((item) => !item.isWarmup)
    || getExerciseHistory(state, exerciseIdOrName).find((item) => !item.isWarmup)
    || null;
}

function getRoutineFocus(state, routineExercise) {
  const routines = ensureArray(state?.routines);
  const routine = routines.find((item) => item.id === state?.session?.routineId)
    || routines.find((item) => (item.exercises || []).some((exercise) => exercise.id === routineExercise?.id));
  return routine?.focus || "";
}

export function nextLoadSuggestionForExercise(state, routineExercise) {
  if (!routineExercise) return { value: 0, decision: "start", reason: "Sin referencias previas.", hasExternalReference: false };

  const history = getExerciseHistory(state, routineExercise.catalogId || routineExercise.exerciseKey || routineExercise.name, { routineId: state?.session?.routineId || "" });
  const fallbackHistory = history.length ? history : getExerciseHistory(state, routineExercise.catalogId || routineExercise.exerciseKey || routineExercise.name);

  if (!fallbackHistory.length) return { value: 0, decision: "start", reason: "Sin referencias previas.", hasExternalReference: false };
  const externalHistory = filterExternalLoadRecords(fallbackHistory);
  if (!externalHistory.length) return { value: 0, decision: "hold", reason: "Sin referencia de carga externa.", hasExternalReference: false };

  const top = externalHistory[0];
  const repRange = parseRepRange(routineExercise.reps);
  const routineFocus = String(getRoutineFocus(state, routineExercise) || "").toLowerCase();
  const isStrength = routineFocus.includes("fuerza") || (repRange.max > 0 && repRange.max <= 6);
  const baseIncrement = Number(state?.preferences?.suggestionIncrement || 2.5);
  const increment = isStrength && /sentadilla|peso muerto|prensa/i.test(routineExercise.name) ? baseIncrement * 2 : baseIncrement;
  const lastRpe = top.rpe === "" ? null : Number(top.rpe);

  if (lastRpe != null && lastRpe >= 9.5 && repRange.min && Number(top.reps || 0) < repRange.min) {
    return { value: Math.max(0, Number(top.weight || 0) - increment), decision: "down", reason: "Última referencia demasiado exigente para el rango objetivo.", hasExternalReference: true };
  }

  if (repRange.max && Number(top.reps || 0) >= repRange.max && (lastRpe == null || lastRpe <= 8.5)) {
    return { value: Number(top.weight || 0) + increment, decision: "up", reason: "Cumpliste el techo del rango con margen razonable.", hasExternalReference: true };
  }

  if (repRange.min && Number(top.reps || 0) < repRange.min) {
    return { value: Number(top.weight || 0), decision: "hold", reason: "Mantén la carga hasta entrar estable en el rango objetivo.", hasExternalReference: true };
  }

  return {
    value: Number(top.weight || 0),
    decision: "hold",
    reason: lastRpe != null && lastRpe >= 9 ? "Mantén. El esfuerzo ya fue alto." : "Mantén y acumula repeticiones limpias antes de subir.",
    hasExternalReference: true
  };
}

export function buildExerciseChartPoints(state, exerciseId, metric, aggregation = "day") {
  if (!exerciseId) return [];
  const rows = ensureArray(state?.workouts).filter((item) => (item.exerciseId || item.exerciseKey || item.exercise) === exerciseId && !item.isWarmup && isExternalLoadRecord(item));
  const groups = groupBy(rows, (item) => {
    if (aggregation === "reference") {
      return item.sessionId ? `session|${item.sessionId}` : `manual|${item.id}`;
    }
    return item.date;
  });

  return Object.entries(groups)
    .sort((a, b) => {
      const firstA = a[1][0];
      const firstB = b[1][0];
      return String(firstA.date || "").localeCompare(String(firstB.date || ""))
        || String(firstA.createdAt || "").localeCompare(String(firstB.createdAt || ""));
    })
    .slice(-12)
    .map(([, logs]) => {
      const anchor = [...logs].sort(sortByDateAsc)[0];
      let value = 0;
      if (metric === "weight") value = Math.max(...logs.map((item) => Number(item.weight || 0)));
      if (metric === "e1rm") value = Math.max(...logs.map((item) => estimateE1RM(item.weight, item.reps)));
      if (metric === "volume") value = logs.reduce((sum, item) => sum + calcVolume(item), 0);
      if (metric === "reps") value = Math.max(...logs.map((item) => Number(item.reps || 0)));
      return { label: shortLabel(anchor.date), value };
    })
    .filter((point) => Number.isFinite(point.value));
}

export function buildBodyChartPoints(state, metric) {
  return ensureArray(state?.measurements)
    .filter((item) => item[metric] !== "" && item[metric] != null)
    .sort(sortByDateAsc)
    .slice(-12)
    .map((item) => ({ label: shortLabel(item.date), value: Number(item[metric]) }))
    .filter((item) => Number.isFinite(item.value));
}

export function computeBestLiftMap(state) {
  return ensureArray(state?.workouts).reduce((acc, item) => {
    if (item.isWarmup || !isExternalLoadRecord(item)) return acc;
    const key = item.exerciseId || item.exerciseKey || item.exercise;
    const value = estimateE1RM(item.weight, item.reps);
    if (!acc[key] || value > acc[key].e1rm) {
      acc[key] = { value: Number(item.weight), e1rm: value, date: item.date, name: item.exercise };
    }
    return acc;
  }, {});
}

export function computeFirstLiftMap(state) {
  const map = {};
  ensureArray(state?.workouts).forEach((item) => {
    if (item.isWarmup || !isExternalLoadRecord(item)) return;
    const key = item.exerciseId || item.exerciseKey || item.exercise;
    const current = map[key];
    if (!current || String(item.date).localeCompare(String(current.date)) < 0) {
      map[key] = { value: Number(item.weight), date: item.date, name: item.exercise };
    }
  });
  return map;
}

export function computeGoalProgress({ baseline, current, target }) {
  if (current == null || target == null || target === "") return 0;
  if (baseline == null || baseline === target) {
    return clamp((current / Math.max(Number(target), 1)) * 100, 0, 100);
  }
  const totalDistance = Number(target) - Number(baseline);
  const currentDistance = Number(current) - Number(baseline);
  if (totalDistance === 0) return 100;
  return clamp((currentDistance / totalDistance) * 100, 0, 100);
}

export function buildTrendItems(state) {
  const workoutDates = getUniqueWorkoutDates(state);
  const workouts = ensureArray(state?.workouts);
  const measurements = [...ensureArray(state?.measurements)].sort(sortByDateDesc);
  const last7 = workoutDates.filter((date) => daysBetween(date, todayLocal()) <= 6).length;
  const prev7 = workoutDates.filter((date) => daysBetween(date, todayLocal()) > 6 && daysBetween(date, todayLocal()) <= 13).length;
  const last30 = workoutDates.filter((date) => daysBetween(date, todayLocal()) <= 29).length;
  const weeklyVolume = workouts.filter((item) => !item.isWarmup && isExternalLoadRecord(item) && daysBetween(item.date, todayLocal()) <= 6).reduce((sum, item) => sum + calcVolume(item), 0);
  const previousWeeklyVolume = workouts.filter((item) => !item.isWarmup && isExternalLoadRecord(item) && daysBetween(item.date, todayLocal()) > 6 && daysBetween(item.date, todayLocal()) <= 13).reduce((sum, item) => sum + calcVolume(item), 0);
  const volumeDelta = weeklyVolume - previousWeeklyVolume;
  const latestMeasurement = measurements[0] || null;
  const previousMeasurement = measurements[1] || null;
  const latestWeight = toFiniteNumberOrNull(latestMeasurement?.bodyWeight);
  const previousWeight = toFiniteNumberOrNull(previousMeasurement?.bodyWeight);
  const weightDelta = latestWeight != null && previousWeight != null ? latestWeight - previousWeight : null;

  return [
    {
      title: "Frecuencia reciente",
      subtitle: `${last7} días entrenados en 7 días · ${last30} en 30 días.`,
      chips: [{ label: `${last7 - prev7 >= 0 ? "+" : ""}${last7 - prev7} vs semana previa`, type: last7 >= prev7 ? "success" : "warning" }]
    },
    {
      title: "Volumen semanal",
      subtitle: `Llevas ${formatNumber(weeklyVolume)} kg.`,
      chips: [{ label: `${volumeDelta >= 0 ? "+" : ""}${formatNumber(volumeDelta)} kg`, type: volumeDelta >= 0 ? "success" : "warning" }]
    },
    {
      title: "Peso corporal",
      subtitle: weightDelta == null
        ? (latestWeight == null ? "Aún no hay suficiente histórico para medir tendencia." : `${formatNumber(latestWeight)} kg actual`)
        : (latestWeight == null ? "Sin dato actual" : `${formatNumber(latestWeight)} kg actual`),
      chips: [{ label: weightDelta == null ? "Sin delta" : `${weightDelta > 0 ? "+" : ""}${formatNumber(weightDelta)} kg`, type: weightDelta <= 0 ? "success" : "ghost" }]
    },
    {
      title: "Continuidad",
      subtitle: `Tu continuidad activa es de ${computeStreak(state)} días entrenados con margen real.`,
      chips: [{ label: workoutDates[0] ? relativeDaysLabel(daysBetween(workoutDates[0], todayLocal())) : "Sin entrenos", type: "ghost" }]
    }
  ];
}

export function detectPotentialStall(state) {
  const grouped = groupBy(ensureArray(state?.workouts).filter((item) => !item.isWarmup && isExternalLoadRecord(item)), (item) => item.exerciseId || item.exerciseKey || item.exercise);
  return Object.values(grouped)
    .map((logs) => {
      const recent = [...logs].sort(sortByDateAsc).slice(-5);
      if (recent.length < 5) return null;
      const slope = linearRegressionSlope(recent.map((item) => estimateE1RM(item.weight, item.reps)));
      const daySpan = daysBetween(recent[0].date, recent[recent.length - 1].date);
      if (daySpan < 14) return null;
      if (Math.abs(slope) <= 0.35) {
        const latest = recent[recent.length - 1];
        return { exercise: latest.exercise, latest: estimateE1RM(latest.weight, latest.reps), slope, points: recent.length, date: latest.date };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(a.slope) - Math.abs(b.slope));
}

export function resolveGroupEntries(state, groupId) {
  if (!groupId) return { entryIds: [], sessionId: "" };
  if (groupId.startsWith("manual|")) {
    return { entryIds: [groupId.split("|")[1]], sessionId: "" };
  }

  if (groupId.startsWith("session|")) {
    const [, sessionId, exerciseId] = groupId.split("|");
    return {
      sessionId,
      entryIds: ensureArray(state?.workouts)
        .filter((item) => item.sessionId === sessionId && (item.exerciseId || item.exerciseKey || item.exercise) === exerciseId)
        .map((item) => item.id)
    };
  }

  return { entryIds: [], sessionId: "" };
}

export function syncSessionHistoryEntry(state, sessionId) {
  if (!sessionId || !state) return;
  state.workouts = ensureArray(state.workouts);
  state.sessionHistory = ensureArray(state.sessionHistory);
  state.routines = ensureArray(state.routines);

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
    totalSets: records.length,
    workingSets: nonWarmups.length,
    warmupSets: records.length - nonWarmups.length,
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
  const workouts = ensureArray(state?.workouts);
  const sessionHistory = ensureArray(state?.sessionHistory);
  const sessionIds = uniq(workouts.filter((item) => item.sessionId).map((item) => item.sessionId).concat(sessionHistory.map((item) => item.sessionId)));
  sessionIds.forEach((sessionId) => syncSessionHistoryEntry(state, sessionId));
}

export function buildHistoryFeed(state) {
  const normalizeSearch = (value) => normalizeNameForMatch(value);
  const ui = state?.ui || {};
  const filters = {
    query: normalizeSearch(String(ui.logSearch || "")),
    routine: ui.logRoutine || "all",
    muscle: ui.logMuscle || "all",
    source: ui.logSource || "all",
    datePreset: ui.logDatePreset || "all"
  };

  const sessionItems = [...ensureArray(state?.sessionHistory)].map((session) => {
    const entries = ensureArray(state?.workouts).filter((item) => item.sessionId === session.sessionId);
    const effectiveEntries = entries.filter((item) => !item.isWarmup);
    const exercises = buildSessionExerciseSummaries(state, session.sessionId);
    return {
      kind: "session",
      id: session.sessionId,
      date: session.date,
      title: session.routineName || "Sesión",
      routineId: session.routineId,
      routineName: session.routineName,
      source: "session",
      muscleGroups: uniq(effectiveEntries.map((item) => item.muscleGroup).filter(Boolean)),
      searchText: normalizeSearch(`${session.routineName} ${exercises.map((item) => item.exercise).join(" ")}`),
      durationSeconds: session.durationSeconds,
      totalSets: session.totalSets,
      workingSets: session.workingSets ?? session.totalSets,
      warmupSets: session.warmupSets ?? 0,
      volume: session.volume,
      exercisesCompleted: session.exercisesCompleted,
      exercises,
      sessionId: session.sessionId,
      notes: session.notes || "",
      sortAnchor: session.endedAt || session.startedAt || `${session.date}T00:00:00`
    };
  });

  const manualItems = buildWorkoutGroups(state, { includeWarmups: Boolean(state?.preferences?.showWarmupsInLogs) })
    .filter((group) => !group.sessionId)
    .map((group) => ({
      kind: "manual",
      id: group.groupId,
      date: group.date,
      title: group.exercise,
      routineId: group.routineId,
      routineName: group.routineName,
      source: "manual",
      muscleGroups: group.muscleGroup ? [group.muscleGroup] : [],
      searchText: normalizeSearch(`${group.exercise} ${group.routineName}`),
      setCount: group.setCount,
      maxWeight: group.maxWeight,
      volume: group.volume,
      bestE1rm: group.bestE1rm,
      repsLabel: group.repsLabel,
      groupId: group.groupId,
      entries: group.entries,
      notes: group.entries.map((entry) => String(entry.notes || "").trim()).find(Boolean) || "",
      sortAnchor: group.latestCreatedAt || `${group.date}T00:00:00`
    }));

  const items = [...sessionItems, ...manualItems]
    .filter((item) => {
      const matchesQuery = !filters.query || item.searchText.includes(filters.query);
      const matchesRoutine = filters.routine === "all" || item.routineId === filters.routine;
      const matchesMuscle = filters.muscle === "all" || item.muscleGroups.includes(filters.muscle);
      const matchesSource = filters.source === "all" || item.source === filters.source;
      const diff = daysBetween(item.date, todayLocal());
      const matchesDate = filters.datePreset === "all"
        || (filters.datePreset === "7d" && diff >= 0 && diff <= 6)
        || (filters.datePreset === "30d" && diff >= 0 && diff <= 29)
        || (filters.datePreset === "90d" && diff >= 0 && diff <= 89);
      return matchesQuery && matchesRoutine && matchesMuscle && matchesSource && matchesDate;
    });

  const sortBy = ui.logSort || "date_desc";
  items.sort((a, b) => {
    if (sortBy === "date_asc") {
      return getChronologicalAnchor(a) - getChronologicalAnchor(b);
    }
    if (sortBy === "weight_desc") {
      const weightA = a.kind === "session" ? Math.max(0, ...(a.exercises || []).map((item) => Number(item.maxWeight || 0))) : Number(a.maxWeight || 0);
      const weightB = b.kind === "session" ? Math.max(0, ...(b.exercises || []).map((item) => Number(item.maxWeight || 0))) : Number(b.maxWeight || 0);
      return weightB - weightA || getChronologicalAnchor(b) - getChronologicalAnchor(a);
    }
    if (sortBy === "exercise_asc") {
      return String(a.title || "").localeCompare(String(b.title || ""), "es") || getChronologicalAnchor(b) - getChronologicalAnchor(a);
    }
    return getChronologicalAnchor(b) - getChronologicalAnchor(a);
  });

  return items;
}

export function buildPrItems(state) {
  const grouped = groupBy(ensureArray(state?.workouts).filter((item) => !item.isWarmup && isExternalLoadRecord(item)), (item) => item.exerciseId || item.exerciseKey || item.exercise);

  return Object.values(grouped)
    .map((logs) => {
      const ordered = [...logs].sort(sortByDateAsc);
      const latest = ordered[ordered.length - 1];
      const bestWeight = ordered.reduce((best, item) => Number(item.weight) > Number(best.weight) ? item : best, ordered[0]);
      const bestE1rm = ordered.reduce((best, item) => estimateE1RM(item.weight, item.reps) > estimateE1RM(best.weight, best.reps) ? item : best, ordered[0]);
      const previousBestE1rm = ordered.filter((item) => item.id !== bestE1rm.id).reduce((best, item) => !best || estimateE1RM(item.weight, item.reps) > estimateE1RM(best.weight, best.reps) ? item : best, null);
      return {
        exercise: ordered[0].exercise,
        exerciseId: ordered[0].exerciseId || ordered[0].exerciseKey || ordered[0].exercise,
        bestWeight,
        bestE1rm,
        previousBestE1rm,
        latest,
        deltaVsPrevBest: previousBestE1rm ? estimateE1RM(bestE1rm.weight, bestE1rm.reps) - estimateE1RM(previousBestE1rm.weight, previousBestE1rm.reps) : estimateE1RM(bestE1rm.weight, bestE1rm.reps)
      };
    })
    .sort((a, b) => estimateE1RM(b.bestE1rm.weight, b.bestE1rm.reps) - estimateE1RM(a.bestE1rm.weight, a.bestE1rm.reps));
}

export function buildMeasurementRows(state) {
  const measurements = [...ensureArray(state?.measurements)].sort(sortByDateDesc);
  return measurements.map((item, index) => {
    const previous = measurements[index + 1] || null;
    const delta = (metric) => {
      if (!previous || item[metric] === "" || previous[metric] === "" || item[metric] == null || previous[metric] == null) return null;
      return Number(item[metric]) - Number(previous[metric]);
    };
    return {
      ...item,
      deltaBodyWeight: delta("bodyWeight"),
      deltaWaist: delta("waist"),
      deltaBodyFat: delta("bodyFat"),
      deltaSleepHours: delta("sleepHours")
    };
  });
}

export function buildWeeklyVolumeSeries(state) {
  const grouped = groupBy(ensureArray(state?.workouts).filter((item) => !item.isWarmup && isExternalLoadRecord(item)), (item) => startOfWeek(item.date));
  return Object.entries(grouped)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .slice(-8)
    .map(([date, logs]) => ({ label: weekLabel(date), value: logs.reduce((sum, item) => sum + calcVolume(item), 0) }));
}

export function buildWeeklyFrequencySeries(state) {
  const grouped = groupBy(getUniqueWorkoutDates(state), (date) => startOfWeek(date));
  return Object.entries(grouped)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .slice(-8)
    .map(([date, days]) => ({ label: weekLabel(date), value: days.length }));
}

export function buildMonthlyVolumeSeries(state) {
  const grouped = groupBy(ensureArray(state?.workouts).filter((item) => !item.isWarmup && isExternalLoadRecord(item)), (item) => String(item.date).slice(0, 7));
  return Object.entries(grouped)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .slice(-6)
    .map(([month, logs]) => ({ label: monthLabel(`${month}-01`), value: logs.reduce((sum, item) => sum + calcVolume(item), 0) }));
}

export function buildMuscleDistribution(state, windowDays = 30) {
  const recent = ensureArray(state?.workouts).filter((item) => !item.isWarmup && isExternalLoadRecord(item) && daysBetween(item.date, todayLocal()) <= windowDays - 1);
  const grouped = groupBy(recent, (item) => item.muscleGroup || "Sin grupo");
  return Object.entries(grouped)
    .map(([label, logs]) => ({ label, value: logs.reduce((sum, item) => sum + calcVolume(item), 0), sets: logs.length }))
    .sort((a, b) => b.value - a.value);
}

export function computeAdherence(state) {
  const habits = state?.goals?.habits || {};
  const last7 = getUniqueWorkoutDates(state).filter((date) => daysBetween(date, todayLocal()) <= 6).length;
  const measurements = [...ensureArray(state?.measurements)].sort(sortByDateDesc);
  const latestMeasurement = measurements[0] || null;
  const previousMeasurement = measurements[1] || null;
  const lastGap = latestMeasurement ? daysBetween(latestMeasurement.date, todayLocal()) : null;
  const sleep = toFiniteNumberOrNull(latestMeasurement?.sleepHours);
  const latestWeight = toFiniteNumberOrNull(latestMeasurement?.bodyWeight);
  const previousWeight = toFiniteNumberOrNull(previousMeasurement?.bodyWeight);
  return {
    workoutsPerWeek: {
      target: habits.workoutsPerWeek === "" ? null : Number(habits.workoutsPerWeek),
      current: last7
    },
    sleepHours: {
      target: habits.sleepHours === "" ? null : Number(habits.sleepHours),
      current: sleep
    },
    measureEveryDays: {
      target: habits.measureEveryDays === "" ? null : Number(habits.measureEveryDays),
      current: lastGap == null ? null : lastGap
    },
    minimumStreakDays: {
      target: habits.minimumStreakDays === "" ? null : Number(habits.minimumStreakDays),
      current: computeStreak(state)
    },
    measurementDeltaWeight: latestMeasurement && previousMeasurement && latestMeasurement.bodyWeight !== "" && previousMeasurement.bodyWeight !== ""
      ? (latestWeight != null && previousWeight != null ? latestWeight - previousWeight : null)
      : null
  };
}

function getChronologicalAnchor(item) {
  const iso = item?.sortAnchor || item?.endedAt || item?.latestCreatedAt || item?.createdAt || item?.startedAt || (item?.date ? `${item.date}T00:00:00` : "");
  const millis = Date.parse(iso);
  if (Number.isFinite(millis)) return millis;
  if (item?.date) {
    const dateMillis = Date.parse(`${item.date}T00:00:00`);
    return Number.isFinite(dateMillis) ? dateMillis : 0;
  }
  return 0;
}
