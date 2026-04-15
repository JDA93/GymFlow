import {
  BODY_METRIC_LABELS,
  buildBodyChartPoints,
  buildExerciseChartPoints,
  buildRecentActivity,
  buildTrendItems,
  computeStats,
  detectPotentialStall,
  getSuggestedRoutine
} from "./analytics.js";
import { buildLineChart, cardHtml, emptyHtml } from "./ui-common.js";
import { formatDate, formatDuration, formatNumber, relativeDaysLabel, daysBetween, todayLocal } from "./utils.js";

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
  renderRecommended(state, els);
  renderRecentStory(state, els);
  renderExerciseSelect(state, els, exerciseOptions);
  renderExerciseChart(state, els);
  renderBodyChart(state, els);
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
        <span class="pill">Sesión en curso</span>
        <h2>Continúa tu sesión activa</h2>
        <p>Llevas ${workingSets} series efectivas (${warmupSets} warm-up) y ${formatNumber(volume)} kg de volumen efectivo.</p>
      </div>
      <div class="hero-actions hero-actions--stack-mobile">
        <button id="dashboardPrimaryCta" data-action="continue-session">Continuar sesión</button>
        <button class="ghost" data-action="open-tab" data-id="session">Ir a Sesión</button>
      </div>
    `;
    return;
  }

  if (!suggestion.routine) {
    els.dashboardPrimaryCard.innerHTML = `
      <div class="hero-copy">
        <span class="pill">Sin rutina sugerida</span>
        <h2>Crea una rutina y arranca</h2>
        <p>GymFlow Pro está lista para entrenar, pero necesita al menos una rutina o la demo.</p>
      </div>
      <div class="hero-actions hero-actions--stack-mobile">
        <button id="dashboardPrimaryCta" data-action="open-tab" data-id="routines">Crear rutina</button>
        <button class="ghost" data-action="load-demo">Cargar demo</button>
      </div>
    `;
    return;
  }

  const lastLabel = suggestion.daysSince == null ? "Aún sin usar" : relativeDaysLabel(suggestion.daysSince);
  els.dashboardPrimaryCard.innerHTML = `
    <div class="hero-copy">
      <span class="pill">Hoy</span>
      <h2>Empieza ${suggestion.routine.name}</h2>
      <p>${suggestion.reason} ${lastLabel}.</p>
    </div>
    <div class="hero-actions hero-actions--stack-mobile">
      <button id="dashboardPrimaryCta" data-action="start-routine" data-id="${suggestion.routine.id}">Empezar rutina recomendada</button>
      <button class="ghost" data-action="open-tab" data-id="routines">Ver rutinas</button>
    </div>
  `;
}

function renderQuickSignals(state, els) {
  const trendItems = buildTrendItems(state);
  const stalledExercise = detectPotentialStall(state)[0] || null;
  const cards = trendItems.slice(0, 3).map((item) => cardHtml(item));
  if (stalledExercise) {
    cards.push(cardHtml({
      title: `Ejercicio con riesgo de estancamiento`,
      subtitle: `${stalledExercise.exercise} muestra una pendiente casi plana en las últimas 5 referencias.`,
      chips: [
        { label: `e1RM ${formatNumber(stalledExercise.latest)} kg`, type: "warning" },
        { label: formatDate(stalledExercise.date), type: "ghost" }
      ]
    }));
  }
  els.quickSignals.innerHTML = cards.length ? cards.join("") : emptyHtml("Todavía no hay señales suficientes.");
}

function renderRecommended(state, els) {
  const suggestion = getSuggestedRoutine(state);
  if (!suggestion.routine) {
    els.recommendedRoutine.innerHTML = emptyHtml("Crea una rutina para ver una recomendación útil aquí.");
    return;
  }
  const routine = suggestion.routine;
  els.recommendedRoutine.innerHTML = cardHtml({
    title: routine.name,
    subtitle: `${routine.focus || "Sin foco"} · ${(routine.exercises || []).length} ejercicios`,
    chips: [
      { label: routine.day || "Sin bloque", type: "ghost" },
      { label: suggestion.daysSince == null ? "Aún sin usar" : `${suggestion.daysSince} días`, type: suggestion.daysSince != null && suggestion.daysSince >= 4 ? "warning" : "success" }
    ],
    footer: `<div class="actions-row"><button data-action="start-routine" data-id="${routine.id}">Empezar</button><button class="ghost small" data-action="edit-routine" data-id="${routine.id}">Editar</button></div>`
  });
}

function renderRecentStory(state, els) {
  const cards = buildRecentActivity(state, 6).map((item) => cardHtml({
    title: item.title,
    subtitle: `${formatDate(item.date)} · ${item.kind === "session" ? `Sesión completa · ${item.subtitle}` : item.subtitle}`,
    chips: item.kind === "session"
      ? [
        { label: `Duración ${formatDuration(item.durationSeconds || 0)}`, type: "ghost" },
        { label: `Volumen ${formatNumber(item.volume || 0)} kg`, type: "success" }
      ]
      : [
        { label: item.routineName || "Registro manual", type: "ghost" },
        { label: `e1RM ${formatNumber(item.bestE1rm || 0)} kg`, type: "warning" }
      ]
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

  els.dashboardExerciseSelect.innerHTML = exerciseOptions.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
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
