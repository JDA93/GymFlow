import {
  BODY_METRIC_LABELS,
  buildBodyChartPoints,
  buildExerciseChartPoints,
  buildMonthlyVolumeSeries,
  buildMuscleDistribution,
  buildTrendItems,
  buildWeeklyFrequencySeries,
  buildWeeklyVolumeSeries,
  computeAdherence,
  computeBestLiftMap,
  computeFirstLiftMap,
  computeGoalProgress,
  detectPotentialStall
} from "./analytics.js";
import { buildBarChart, buildLineChart, cardHtml, emptyHtml } from "./ui-common.js";
import { formatDate, formatNumber, percentage, daysBetween, todayLocal } from "./utils.js";

export function renderAnalytics(state, els, exerciseOptions) {
  renderAnalyticsHighlights(state, els);
  renderAnalyticsCharts(state, els, exerciseOptions);
  renderAnalyticsDeep(state, els);
}

function renderAnalyticsHighlights(state, els) {
  const items = buildTrendItems(state);
  const adherence = computeAdherence(state);
  const summary = cardHtml({
    title: "Qué cambió esta semana",
    subtitle: adherence.workoutsPerWeek.target != null
      ? `Esta semana llevas ${adherence.workoutsPerWeek.current}/${adherence.workoutsPerWeek.target} sesiones frente a tu objetivo.`
      : "Define objetivos de hábito para tener una lectura de ritmo semanal.",
    chips: [{ label: adherence.workoutsPerWeek.target != null && adherence.workoutsPerWeek.current >= adherence.workoutsPerWeek.target ? "Ritmo sólido" : "Ritmo mejorable", type: adherence.workoutsPerWeek.target != null && adherence.workoutsPerWeek.current >= adherence.workoutsPerWeek.target ? "success" : "warning" }]
  });
  const keyItems = items.slice(0, 2).map((item) => cardHtml(item));
  els.analyticsHighlights.innerHTML = [summary, ...keyItems].join("");
}

function renderAnalyticsCharts(state, els, exerciseOptions) {
  if (!exerciseOptions.length) {
    els.analyticsLiftSelect.innerHTML = `<option value="">Sin ejercicios</option>`;
    state.ui.analyticsLiftId = "";
    els.analyticsLiftChart.innerHTML = emptyHtml("Sin ejercicios para analizar.");
  } else {
    if (!state.ui.analyticsLiftId || !exerciseOptions.some((item) => item.id === state.ui.analyticsLiftId)) {
      state.ui.analyticsLiftId = exerciseOptions[0].id;
    }
    els.analyticsLiftSelect.innerHTML = exerciseOptions.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
    els.analyticsLiftSelect.value = state.ui.analyticsLiftId;
    const liftPoints = buildExerciseChartPoints(state, state.ui.analyticsLiftId, "e1rm", state.ui.chartAggregation || "day");
    els.analyticsLiftChart.innerHTML = liftPoints.length >= 2 ? buildLineChart(liftPoints, " kg", "Evolución de e1RM") : emptyHtml("Necesitas al menos dos referencias del ejercicio.");
  }

  const weeklyVolume = buildWeeklyVolumeSeries(state);
  const weeklyFrequency = buildWeeklyFrequencySeries(state);
  const monthlyVolume = buildMonthlyVolumeSeries(state);

  els.analyticsFrequencyChart.innerHTML = weeklyFrequency.length ? buildBarChart(weeklyFrequency, " días", "Frecuencia semanal") : emptyHtml("Sin semanas suficientes.");
  els.analyticsVolumeChart.innerHTML = weeklyVolume.length ? buildBarChart(weeklyVolume, " kg", "Volumen semanal") : emptyHtml("Sin volumen suficiente.");
  els.analyticsMonthlyChart.innerHTML = monthlyVolume.length ? buildBarChart(monthlyVolume, " kg", "Comparación mensual") : emptyHtml("Sin meses suficientes.");
}

function renderAnalyticsDeep(state, els) {
  const stalls = detectPotentialStall(state).slice(0, 4);
  const muscleDistribution = buildMuscleDistribution(state, 30).slice(0, 6);
  const adherence = computeAdherence(state);

  els.analyticsStalls.innerHTML = stalls.length
    ? stalls.map((item) => cardHtml({
      title: item.exercise,
      subtitle: `Pendiente plana en 5 referencias recientes.`,
      chips: [
        { label: `e1RM ${formatNumber(item.latest)} kg`, type: "warning" },
        { label: formatDate(item.date), type: "ghost" }
      ]
    })).join("")
    : emptyHtml("No se detectan ejercicios claramente estancados.");

  els.analyticsMuscles.innerHTML = muscleDistribution.length
    ? buildBarChart(muscleDistribution.map((item) => ({ label: item.label, value: item.value })), " kg", "Distribución por grupo muscular (30 días)")
    : emptyHtml("Entrena más sesiones para ver patrones musculares.");

  const habitCards = [];
  if (adherence.workoutsPerWeek.target != null) {
    habitCards.push(cardHtml({
      title: "Objetivo semanal de entrenos",
      subtitle: `${adherence.workoutsPerWeek.current}/${adherence.workoutsPerWeek.target} sesiones esta semana.`,
      chips: [{ label: adherence.workoutsPerWeek.current >= adherence.workoutsPerWeek.target ? "Vas en ritmo" : "Debajo de ritmo", type: adherence.workoutsPerWeek.current >= adherence.workoutsPerWeek.target ? "success" : "warning" }]
    }));
  }
  if (adherence.sleepHours.target != null) {
    habitCards.push(cardHtml({
      title: "Sueño",
      subtitle: adherence.sleepHours.current == null ? "Sin dato actual de sueño." : `Último dato ${formatNumber(adherence.sleepHours.current)} h.`,
      chips: [{ label: adherence.sleepHours.current != null && adherence.sleepHours.current >= adherence.sleepHours.target ? "Vas en ritmo" : "No vas en ritmo", type: adherence.sleepHours.current != null && adherence.sleepHours.current >= adherence.sleepHours.target ? "success" : "warning" }]
    }));
  }
  if (adherence.measureEveryDays.target != null) {
    habitCards.push(cardHtml({
      title: "Frecuencia de medidas",
      subtitle: adherence.measureEveryDays.current == null ? "Aún sin mediciones." : `Han pasado ${adherence.measureEveryDays.current} días desde la última medición.`,
      chips: [{ label: adherence.measureEveryDays.current != null && adherence.measureEveryDays.current <= adherence.measureEveryDays.target ? "Vas en ritmo" : "No vas en ritmo", type: adherence.measureEveryDays.current != null && adherence.measureEveryDays.current <= adherence.measureEveryDays.target ? "success" : "warning" }]
    }));
  }
  if (adherence.minimumStreakDays.target != null) {
    habitCards.push(cardHtml({
      title: "Continuidad",
      subtitle: `Tu continuidad activa es de ${adherence.minimumStreakDays.current} días entrenados.`,
      chips: [{ label: adherence.minimumStreakDays.current >= adherence.minimumStreakDays.target ? "Vas en ritmo" : "No vas en ritmo", type: adherence.minimumStreakDays.current >= adherence.minimumStreakDays.target ? "success" : "warning" }]
    }));
  }

  els.analyticsHabits.innerHTML = habitCards.length ? habitCards.join("") : emptyHtml("Define hábitos en Objetivos para medir adherencia aquí.");
}

export function renderGoalSummary(state, els) {
  const goals = state.goals;
  const latestMeasurement = [...state.measurements].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const oldestMeasurement = [...state.measurements].sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  const bestMap = computeBestLiftMap(state);
  const firstLiftMap = computeFirstLiftMap(state);
  const cards = [];

  if (goals.focusGoal) {
    const dateStatus = goals.goalDate ? buildGoalDateStatus(goals.goalDate) : null;
    cards.push(cardHtml({
      title: "Meta principal del bloque",
      subtitle: goals.focusGoal,
      chips: [
        { label: goals.athleteName || "Atleta", type: "ghost" },
        ...(goals.goalDate ? [{ label: `Fecha objetivo ${goals.goalDate}`, type: "ghost" }] : []),
        ...(dateStatus ? [{ label: dateStatus, type: daysBetween(todayLocal(), goals.goalDate) >= 0 ? "success" : "warning" }] : [])
      ],
      extraClass: "highlight"
    }));
  }

  const resultGoals = [
    {
      key: "bodyWeight",
      label: "Peso",
      current: latestMeasurement?.bodyWeight,
      baseline: oldestMeasurement?.bodyWeight,
      baselineDate: oldestMeasurement?.date || "",
      target: goals.resultGoals.bodyWeight,
      suffix: "kg"
    },
    {
      key: "waist",
      label: "Cintura",
      current: latestMeasurement?.waist,
      baseline: oldestMeasurement?.waist,
      baselineDate: oldestMeasurement?.date || "",
      target: goals.resultGoals.waist,
      suffix: "cm"
    },
    {
      key: "bodyFat",
      label: "Grasa corporal",
      current: latestMeasurement?.bodyFat,
      baseline: oldestMeasurement?.bodyFat,
      baselineDate: oldestMeasurement?.date || "",
      target: goals.resultGoals.bodyFat,
      suffix: "%"
    },
    {
      key: "bench",
      label: "Press banca",
      current: bestMap["bench-press"]?.value,
      baseline: firstLiftMap["bench-press"]?.value,
      baselineDate: firstLiftMap["bench-press"]?.date || "",
      target: goals.resultGoals.bench,
      suffix: "kg"
    },
    {
      key: "squat",
      label: "Sentadilla",
      current: bestMap["squat"]?.value,
      baseline: firstLiftMap["squat"]?.value,
      baselineDate: firstLiftMap["squat"]?.date || "",
      target: goals.resultGoals.squat,
      suffix: "kg"
    },
    {
      key: "deadlift",
      label: "Peso muerto",
      current: bestMap["deadlift"]?.value || bestMap["romanian-deadlift"]?.value,
      baseline: firstLiftMap["deadlift"]?.value || firstLiftMap["romanian-deadlift"]?.value,
      baselineDate: firstLiftMap["deadlift"]?.date || firstLiftMap["romanian-deadlift"]?.date || "",
      target: goals.resultGoals.deadlift,
      suffix: "kg"
    }
  ];

  resultGoals.filter((goal) => goal.target !== "" && goal.target != null).forEach((goal) => cards.push(goalCard(goal, goals.goalDate)));

  const habitCards = buildHabitGoalCards(goals.habits, latestMeasurement, state);
  cards.push(...habitCards);

  if (!cards.length) {
    els.goalSummary.innerHTML = emptyHtml("Todavía no has definido objetivos.");
    return;
  }
  els.goalSummary.innerHTML = cards.join("");
}

function buildGoalDateStatus(goalDate) {
  const remaining = daysBetween(todayLocal(), goalDate);
  if (remaining > 0) return `Quedan ${remaining} días`;
  if (remaining === 0) return "Fecha objetivo hoy";
  return `Fecha superada hace ${Math.abs(remaining)} días`;
}

function goalCard({ label, current, target, baseline, baselineDate, suffix }, goalDate) {
  const currentValue = current === "" || current == null ? null : Number(current);
  const targetValue = target === "" || target == null ? null : Number(target);
  const baselineValue = baseline === "" || baseline == null ? null : Number(baseline);
  const progress = computeGoalProgress({ baseline: baselineValue, current: currentValue, target: targetValue });
  const delta = currentValue == null || targetValue == null ? null : targetValue - currentValue;
  const paceLabel = buildPaceLabel({ baseline: baselineValue, baselineDate, current: currentValue, target: targetValue, goalDate });

  return `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${label}</h3>
          <p class="list-subtitle">${currentValue == null ? `Objetivo ${formatNumber(targetValue)} ${suffix}. Aún no hay valor actual.` : `Actual ${formatNumber(currentValue)} ${suffix} · Objetivo ${formatNumber(targetValue)} ${suffix}`}</p>
        </div>
        <span class="chip ${progress >= 100 ? "success" : progress >= 70 ? "warning" : "ghost"}">${formatNumber(progress)}%</span>
      </div>
      <div class="goal-progress">
        <div class="goal-progress-bar"><span style="width:${Math.min(progress, 100)}%"></span></div>
        <div class="goal-progress-meta">
          <span>${baselineValue == null ? "Sin referencia inicial" : `Inicio ${formatNumber(baselineValue)} ${suffix}`}</span>
          <span>${delta == null ? "Sin valor actual" : `${delta > 0 ? "Te faltan" : "Ya superado por"} ${formatNumber(Math.abs(delta))} ${suffix}`}</span>
        </div>
      </div>
      ${paceLabel ? `<div class="chip-row"><span class="chip ${paceLabel.includes("Vas") ? "success" : "warning"}">${paceLabel}</span></div>` : ""}
    </article>
  `;
}

function buildPaceLabel({ baseline, baselineDate, current, target, goalDate }) {
  if (!goalDate || current == null || target == null) return "";
  const remaining = daysBetween(todayLocal(), goalDate);
  if (remaining < 0) return current === target ? "Objetivo cumplido" : "Fecha objetivo superada";
  if (baseline == null) return "Falta línea base para calcular ritmo";
  const totalDistance = Math.abs(target - baseline);
  if (!totalDistance) return "Objetivo cumplido";
  const currentDistance = Math.abs(current - baseline);
  if (!baselineDate) return "Define más histórico para calcular ritmo";
  const elapsedDays = Math.max(1, daysBetween(baselineDate, todayLocal()));
  const velocity = currentDistance / elapsedDays;
  const requiredVelocity = Math.abs(target - current) / Math.max(1, remaining);
  if (!Number.isFinite(velocity) || velocity <= 0) return "Ritmo incierto: aún faltan más datos";
  const ratio = velocity / Math.max(requiredVelocity, 0.0001);
  if (ratio >= 1.15) return "Vas por delante del ritmo";
  if (ratio >= 0.9) return "Vas en ritmo";
  return "Vas por debajo del ritmo";
}

function buildHabitGoalCards(habits, latestMeasurement, state) {
  const cards = [];
  const workoutCurrent = [...state.workouts.filter((item) => !item.isWarmup).reduce((acc, item) => { acc.add(item.date); return acc; }, new Set())].filter((date) => daysBetween(date, todayLocal()) <= 6).length;
  if (habits.workoutsPerWeek !== "" && habits.workoutsPerWeek != null) {
    const target = Number(habits.workoutsPerWeek);
    cards.push(cardHtml({
      title: "Hábito: entrenar por semana",
      subtitle: `${workoutCurrent}/${target} sesiones esta semana.`,
      chips: [{ label: workoutCurrent >= target ? "Vas en ritmo" : "No vas en ritmo", type: workoutCurrent >= target ? "success" : "warning" }]
    }));
  }
  if (habits.sleepHours !== "" && habits.sleepHours != null) {
    const current = latestMeasurement?.sleepHours === "" || latestMeasurement?.sleepHours == null ? null : Number(latestMeasurement.sleepHours);
    const target = Number(habits.sleepHours);
    cards.push(cardHtml({
      title: "Hábito: sueño",
      subtitle: current == null ? `Objetivo ${target} h. Sin dato actual.` : `Último dato ${formatNumber(current)} h · objetivo ${target} h.`,
      chips: [{ label: current != null && current >= target ? "Vas en ritmo" : "No vas en ritmo", type: current != null && current >= target ? "success" : "warning" }]
    }));
  }
  if (habits.measureEveryDays !== "" && habits.measureEveryDays != null) {
    const lastMeasurementDate = latestMeasurement?.date || null;
    const gap = lastMeasurementDate ? daysBetween(lastMeasurementDate, todayLocal()) : null;
    const target = Number(habits.measureEveryDays);
    cards.push(cardHtml({
      title: "Hábito: medir progreso",
      subtitle: gap == null ? `Objetivo cada ${target} días. Aún no hay mediciones.` : `Han pasado ${gap} días desde la última medición.`,
      chips: [{ label: gap != null && gap <= target ? "Vas en ritmo" : "No vas en ritmo", type: gap != null && gap <= target ? "success" : "warning" }]
    }));
  }
  return cards;
}

export function renderGoalForm(state, els) {
  const goals = state.goals;
  if (els.goalForm.athleteName) els.goalForm.athleteName.value = goals.athleteName || "";
  if (els.goalForm.focusGoal) els.goalForm.focusGoal.value = goals.focusGoal || "";
  if (els.goalForm.goalDate) els.goalForm.goalDate.value = goals.goalDate || "";
  Object.entries(goals.resultGoals || {}).forEach(([key, value]) => {
    if (els.goalForm[key]) els.goalForm[key].value = value ?? "";
  });
  Object.entries(goals.habits || {}).forEach(([key, value]) => {
    if (els.goalForm[key]) els.goalForm[key].value = value ?? "";
  });
}

export function renderPreferencesForm(state, els) {
  Object.entries(state.preferences).forEach(([key, value]) => {
    if (!els.preferencesForm[key]) return;
    if (typeof value === "boolean") els.preferencesForm[key].checked = value;
    else els.preferencesForm[key].value = value;
  });
}

export function renderPwaStatus(els, pwaStatus, storageStatus) {
  const items = [
    {
      title: "Compatibilidad de instalación",
      subtitle: !pwaStatus.secureContext
        ? "La instalación PWA requiere HTTPS o localhost."
        : pwaStatus.standalone
          ? "La app ya está instalada y ejecutándose en modo standalone."
          : pwaStatus.ios
            ? "En iPhone: Compartir > Añadir a pantalla de inicio."
            : pwaStatus.installAvailable
              ? "Este navegador ya habilitó la instalación desde el botón."
              : "La instalación aún no está habilitada en esta sesión. Sigue siendo usable desde navegador.",
      chips: [{ label: pwaStatus.standalone ? "Instalada" : pwaStatus.installAvailable ? "Lista" : "Pendiente", type: pwaStatus.standalone ? "success" : pwaStatus.installAvailable ? "warning" : "ghost" }]
    },
    {
      title: "Manifest e iconos",
      subtitle: pwaStatus.manifestPresent
        ? "Manifest enlazado y assets principales detectados."
        : "Falta manifest o iconos; revisa para asegurar instalabilidad.",
      chips: [{ label: pwaStatus.manifestPresent ? "OK" : "Revisar", type: pwaStatus.manifestPresent ? "success" : "danger" }]
    },
    {
      title: "Service worker",
      subtitle: !pwaStatus.swSupported
        ? "Este navegador no soporta service worker."
        : pwaStatus.registration
          ? (pwaStatus.controlled ? "Registrado y controlando esta pestaña. Habrá caché offline según versiones ya visitadas." : "Registrado, pero esta pestaña aún no está bajo control. Recarga para finalizar.")
          : "No se detecta registro activo todavía; sin caché offline confiable.",
      chips: [{ label: !pwaStatus.swSupported ? "No soportado" : pwaStatus.controlled ? "Activo" : pwaStatus.registration ? "Parcial" : "Pendiente", type: !pwaStatus.swSupported ? "warning" : pwaStatus.controlled ? "success" : "warning" }]
    },
    {
      title: "Guardado local y offline",
      subtitle: storageStatus.mode === "indexeddb"
        ? "Guardado principal en IndexedDB con respaldo local automático."
        : "Se usa respaldo local porque IndexedDB no está disponible en este entorno.",
      chips: [{ label: storageStatus.mode === "indexeddb" ? "Persistencia robusta" : "Modo respaldo", type: storageStatus.mode === "indexeddb" ? "success" : "warning" }]
    }
  ];

  els.pwaStatusBox.innerHTML = items.map((item) => cardHtml(item)).join("");
}
