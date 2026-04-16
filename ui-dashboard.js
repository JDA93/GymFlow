import {
  BODY_METRIC_LABELS,
  buildBodyChartPoints,
  buildExerciseChartPoints,
  buildRecentActivity,
  buildTrendItems,
  computeStats,
  detectPotentialStall,
  getSuggestedRoutine
} from "./analytics-core.js";
import { buildLineChart, cardHtml, emptyHtml } from "./ui-common.js";
import { escapeHtml, formatDate, formatDuration, formatNumber, relativeDaysLabel, daysBetween, todayLocal } from "./utils.js";

export function renderStats(state, els) {
  const stats = computeStats(state);
  els.statSessionsMonth.textContent = stats.daysTrainedThisMonth;
  els.statStreak.textContent = String(stats.continuityActive);
  els.statWeight.textContent = stats.latestMeasurement?.bodyWeight !== "" && stats.latestMeasurement?.bodyWeight != null ? `${formatNumber(stats.latestMeasurement.bodyWeight)} kg` : "—";
  els.statBestLift.textContent = stats.bestLift ? `${formatNumber(stats.bestLift.weight)} kg` : "—";
  els.statBestLiftLabel.textContent = stats.bestLift ? stats.bestLift.exercise : "Sin datos";
  els.statBestE1rm.textContent = stats.bestE1rm ? `${formatNumber(stats.bestE1rm.value)} kg` : "—";
  els.statBestE1rmLabel.textContent = stats.bestE1rm ? stats.bestE1rm.item.exercise : "Estimado";
}

export function renderDashboard(state, els, exerciseOptions) {
  renderPrimaryAction(state, els);
  renderQuickSignals(state, els);
  renderLauncher(state, els);
  renderRecentStory(state, els);
  renderExerciseSelect(state, els, exerciseOptions);
  renderExerciseChart(state, els);
  renderBodyChart(state, els);
}

function buildTodayInsight(state, suggestion) {
  const routine = suggestion?.routine;
  if (routine && suggestion?.daysSince != null && suggestion.daysSince >= 4) {
    return `Llevas ${suggestion.daysSince} días sin entrenar ${routine.name}.`;
  }
  const weeklyTarget = Number(state.goals?.habits?.workoutsPerWeek || 0);
  if (weeklyTarget > 0) {
    const recentDays = [...new Set(state.workouts.filter((item) => !item.isWarmup).map((item) => item.date))]
      .filter((date) => daysBetween(date, todayLocal()) <= 6).length;
    if (recentDays < weeklyTarget) return `Te faltan ${weeklyTarget - recentDays} sesiones para cumplir el objetivo semanal.`;
  }
  return "Prioriza la siguiente acción y ejecuta sin fricción.";
}

function renderPrimaryAction(state, els) {
  const suggestion = getSuggestedRoutine(state);
  const active = state.session.active;
  if (active) {
    const volume = state.session.setEntries.reduce((sum, entry) => sum + (entry.isWarmup ? 0 : Number(entry.weight || 0) * Number(entry.reps || 0)), 0);
    const workingSets = state.session.setEntries.filter((entry) => !entry.isWarmup).length;
    const warmupSets = state.session.setEntries.filter((entry) => entry.isWarmup).length;
    els.dashboardPrimaryCard.innerHTML = `
      <div class="hero-copy">
        <span class="pill">En curso</span>
        <h2>Vuelve a tu sesión activa</h2>
        <p class="today-insight">${buildTodayInsight(state, suggestion)}</p>
        <p>${workingSets} series efectivas · ${warmupSets} warm-up · ${formatNumber(volume)} kg acumulados.</p>
      </div>
      <div class="hero-actions hero-actions--stack-mobile">
        <button id="dashboardPrimaryCta" data-action="continue-session">Continuar sesión</button>
        <button class="ghost" data-action="open-tab" data-id="session">Abrir flujo de sesión</button>
      </div>
    `;
    return;
  }

  if (!suggestion.routine) {
    els.dashboardPrimaryCard.innerHTML = `
      <div class="hero-copy">
        <span class="pill">Primer paso</span>
        <h2>Prepara tu primera rutina</h2>
        <p>GymFlow Pro está lista para entrenar. Crea una rutina o carga demo para empezar en menos de un minuto.</p>
      </div>
      <div class="hero-actions hero-actions--stack-mobile">
        <button id="dashboardPrimaryCta" data-action="open-tab" data-id="routines">Crear rutina</button>
        <button class="ghost" data-action="load-demo">Cargar demo</button>
      </div>
    `;
    return;
  }

  const lastLabel = suggestion.daysSince == null ? "Aún sin uso" : relativeDaysLabel(suggestion.daysSince);
  els.dashboardPrimaryCard.innerHTML = `
    <div class="hero-copy">
      <span class="pill">Recomendación</span>
      <h2>Entrena ${escapeHtml(suggestion.routine.name)} ahora</h2>
      <p class="today-insight">${buildTodayInsight(state, suggestion)}</p>
      <p>${suggestion.reason} ${lastLabel}.</p>
    </div>
    <div class="hero-actions hero-actions--stack-mobile">
      <button id="dashboardPrimaryCta" data-action="start-routine" data-id="${escapeHtml(suggestion.routine.id)}">Empezar rutina recomendada</button>
      <button class="ghost" data-action="open-tab" data-id="routines">Ver biblioteca</button>
    </div>
  `;
}

function renderLauncher(state, els) {
  const suggestion = getSuggestedRoutine(state);
  const cards = [];
  if (state.session.active) {
    cards.push(cardHtml({
      title: "Continuar sesión activa",
      subtitle: "Retoma exactamente donde te quedaste.",
      chips: [{ label: "Prioridad alta", type: "success" }],
      footer: `<button data-action="continue-session">Ir a sesión</button>`
    }));
  } else if (suggestion.routine) {
    cards.push(cardHtml({
      title: `Arrancar ${suggestion.routine.name}`,
      subtitle: suggestion.reason,
      chips: [{ label: suggestion.daysSince == null ? "Nueva" : `${suggestion.daysSince} días`, type: "ghost" }],
      footer: `<button data-action="start-routine" data-id="${escapeHtml(suggestion.routine.id)}">Empezar</button>`
    }));
  }

  cards.push(cardHtml({
    title: "Check-in corporal",
    subtitle: "Registra peso, cintura o sueño para mantener contexto.",
    chips: [{ label: "30 segundos", type: "ghost" }],
    footer: `<button class="ghost small" data-action="open-tab" data-id="measurements">Log medida</button>`
  }));

  els.recommendedRoutine.innerHTML = cards.join("");
}

function renderQuickSignals(state, els) {
  const trendItems = buildTrendItems(state);
  const stalledExercise = detectPotentialStall(state)[0] || null;
  const cards = trendItems.slice(0, 3).map((item) => cardHtml(item));
  if (stalledExercise) {
    cards.push(cardHtml({
      title: `Posible estancamiento`,
      subtitle: `${stalledExercise.exercise} lleva varias referencias planas.`,
      chips: [
        { label: `e1RM ${formatNumber(stalledExercise.latest)} kg`, type: "warning" },
        { label: formatDate(stalledExercise.date), type: "ghost" }
      ]
    }));
  }
  els.quickSignals.innerHTML = cards.length ? cards.join("") : emptyHtml("Todavía no hay señales suficientes.");
}

function renderRecentStory(state, els) {
  const cards = buildRecentActivity(state, 6).map((item) => cardHtml({
    title: item.title,
    subtitle: `${formatDate(item.date)} · ${item.kind === "session" ? `Sesión completa · ${item.subtitle}` : `Registro manual · ${item.subtitle}`}`,
    chips: item.kind === "session"
      ? [
        { label: `Duración ${formatDuration(item.durationSeconds || 0)}`, type: "ghost" },
        { label: `Volumen ${formatNumber(item.volume || 0)} kg`, type: "success" },
        ...(item.notes ? [{ label: "Incluye notas", type: "warning" }] : [])
      ]
      : [
        { label: item.routineName || "Registro manual", type: "ghost" },
        { label: `e1RM ${formatNumber(item.bestE1rm || 0)} kg`, type: "warning" },
        ...(item.notes ? [{ label: "Con nota", type: "ghost" }] : [])
      ],
    footer: item.notes ? `<p class="helper-line">📝 ${escapeHtml(item.notes)}</p>` : ""
  }));
  els.recentStory.innerHTML = cards.length ? cards.join("") : emptyHtml("Aún no hay actividad reciente.");
}

function renderExerciseSelect(state, els, exerciseOptions) {
  if (!exerciseOptions.length) {
    els.dashboardExerciseSelect.innerHTML = `<option value="">Sin ejercicios</option>`;
    state.ui.dashboardExerciseId = "";
    return;
  }

  if (!state.ui.dashboardExerciseId || !exerciseOptions.some((item) => item.id === state.ui.dashboardExerciseId)) {
    state.ui.dashboardExerciseId = exerciseOptions[0].id;
  }

  const fragment = document.createDocumentFragment();
  exerciseOptions.forEach((item) => {
    const option = document.createElement("option");
    option.value = String(item.id || "");
    option.textContent = String(item.name || "");
    fragment.appendChild(option);
  });
  els.dashboardExerciseSelect.innerHTML = "";
  els.dashboardExerciseSelect.appendChild(fragment);
  els.dashboardExerciseSelect.value = state.ui.dashboardExerciseId;
  els.dashboardExerciseMetricSelect.value = state.ui.dashboardExerciseMetric || "e1rm";
  els.dashboardMetricSelect.value = state.ui.dashboardMetric || "bodyWeight";
  if (els.chartAggregationSelect) els.chartAggregationSelect.value = state.ui.chartAggregation || "day";
}

function renderExerciseChart(state, els) {
  const metric = state.ui.dashboardExerciseMetric || "e1rm";
  const points = buildExerciseChartPoints(state, state.ui.dashboardExerciseId, metric, state.ui.chartAggregation || "day");
  const suffix = metric === "volume" ? " kg" : metric === "reps" ? " reps" : " kg";
  const metricLabel = { weight: "Carga máxima", e1rm: "e1RM", volume: "Volumen", reps: "Repeticiones" }[metric] || "Carga";
  els.exerciseChart.innerHTML = points.length >= 2 ? buildLineChart(points, suffix, `${metricLabel} del ejercicio`) : emptyHtml("Necesitas al menos 2 referencias del ejercicio para ver evolución.");
}

function renderBodyChart(state, els) {
  const metric = state.ui.dashboardMetric || "bodyWeight";
  const points = buildBodyChartPoints(state, metric);
  const suffix = metric === "bodyFat" ? "%" : metric === "sleepHours" ? " h" : metric === "bodyWeight" ? " kg" : " cm";
  const label = BODY_METRIC_LABELS[metric] || "Métrica corporal";
  const latest = [...state.measurements].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  els.bodyChart.innerHTML = points.length >= 2
    ? `${latest ? `<div class="mini-insight">Última lectura: ${latest[metric] !== "" && latest[metric] != null ? `${formatNumber(latest[metric])}${suffix}` : "—"}</div>` : ""}${buildLineChart(points, suffix, `Evolución de ${label}`)}`
    : emptyHtml("Necesitas al menos 2 mediciones para esta métrica.");
}
