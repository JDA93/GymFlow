import {
  BODY_METRIC_LABELS,
  buildBodyChartPoints,
  buildExerciseChartPoints,
  buildRecentActivity,
  computeLastDateByRoutine,
  computeStats,
  detectPotentialStall,
  getSuggestedRoutine
} from "./analytics.js";
import { buildLineChart, cardHtml, emptyHtml } from "./ui-common.js";
import { formatDate, formatDuration, formatNumber } from "./utils.js";

export function renderStats(state, els) {
  const stats = computeStats(state);
  els.statSessionsMonth.textContent = stats.daysTrainedThisMonth;
  els.statStreak.textContent = String(stats.continuityActive);
  els.statWeight.textContent = stats.latestMeasurement?.bodyWeight ? `${formatNumber(stats.latestMeasurement.bodyWeight)} kg` : "—";
  els.statBestLift.textContent = stats.bestLift ? `${formatNumber(stats.bestLift.weight)} kg` : "—";
  els.statBestLiftLabel.textContent = stats.bestLift ? stats.bestLift.exercise : "Sin datos";
  els.statBestE1rm.textContent = stats.bestE1rm ? `${formatNumber(stats.bestE1rm.value)} kg` : "—";
  els.statBestE1rmLabel.textContent = stats.bestE1rm ? stats.bestE1rm.item.exercise : "Estimado";
}

export function renderDashboard(state, els, exerciseOptions) {
  renderTodayFocus(state, els);
  renderQuickStart(state, els);
  renderRecentLogs(state, els);
  renderExerciseSelect(state, els, exerciseOptions);
  renderExerciseChart(state, els);
  renderBodyChart(state, els);
  renderTrendSummary(state, els);
}

function renderTodayFocus(state, els) {
  const cards = [];
  const suggestion = getSuggestedRoutine(state);
  const recent = buildRecentActivity(state, 5)[0];
  const latestMeasurement = [...state.measurements].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const stalledExercise = detectPotentialStall(state);

  if (state.session.active) {
    const completed = state.session.completedExerciseIds.length;
    const volume = formatNumber(state.session.setEntries.reduce((sum, entry) => sum + (entry.isWarmup ? 0 : Number(entry.weight || 0) * Number(entry.reps || 0)), 0));
    cards.push(cardHtml({
      title: "Tienes una sesión en marcha",
      subtitle: `${completed} ejercicios marcados · ${state.session.setEntries.length} series registradas hasta ahora.`,
      chips: [
        { label: "Ve a Sesión", type: "success" },
        { label: `Volumen ${volume} kg`, type: "ghost" }
      ],
      extraClass: "highlight"
    }));
  } else if (suggestion.routine) {
    cards.push(cardHtml({
      title: `Hoy te toca ${suggestion.routine.name}`,
      subtitle: suggestion.reason,
      chips: [
        { label: suggestion.routine.day || "Sin bloque", type: "ghost" },
        { label: suggestion.daysSince == null ? "Aún no la has usado" : `${suggestion.daysSince} días desde la última vez`, type: suggestion.daysSince != null && suggestion.daysSince >= 4 ? "warning" : "success" }
      ],
      extraClass: "highlight"
    }));
  }

  if (recent) {
    cards.push(cardHtml({
      title: "Último entreno",
      subtitle: `${formatDate(recent.date)} · ${recent.title}`,
      chips: [
        { label: recent.kind === "session" ? `Duración ${formatDuration(recent.durationSeconds || 0)}` : recent.subtitle, type: "ghost" },
        { label: `Volumen ${formatNumber(recent.volume || 0)} kg`, type: "ghost" }
      ]
    }));
  }

  if (latestMeasurement) {
    cards.push(cardHtml({
      title: "Progreso clave",
      subtitle: `${formatDate(latestMeasurement.date)} · Peso ${latestMeasurement.bodyWeight ? `${formatNumber(latestMeasurement.bodyWeight)} kg` : "—"} · Cintura ${latestMeasurement.waist ? `${formatNumber(latestMeasurement.waist)} cm` : "—"}`,
      chips: [
        { label: latestMeasurement.sleepHours ? `Sueño ${formatNumber(latestMeasurement.sleepHours)} h` : "Sueño sin dato", type: "ghost" }
      ]
    }));
  }

  if (stalledExercise) {
    cards.push(cardHtml({
      title: `Atento a ${stalledExercise.exercise}`,
      subtitle: `La tendencia reciente es plana. Revisa rango, descanso o fatiga acumulada.`,
      chips: [
        { label: `Último e1RM ${formatNumber(stalledExercise.latest)} kg`, type: "warning" }
      ]
    }));
  }

  els.todayFocus.innerHTML = cards.length ? cards.join("") : emptyHtml("Todavía no hay datos. Carga la demo o crea tu primer registro.");
}

function renderQuickStart(state, els) {
  if (!state.routines.length) {
    els.quickStartList.innerHTML = emptyHtml("Crea una rutina para ver accesos rápidos.");
    return;
  }

  const lastDateByRoutine = computeLastDateByRoutine(state);
  els.quickStartList.innerHTML = state.routines.slice(0, 4).map((routine) => `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${routine.name}</h3>
          <p class="list-subtitle">${routine.focus || "Sin foco"} · ${routine.exercises.length} ejercicios</p>
        </div>
        <span class="chip ghost">${lastDateByRoutine[routine.id] ? `Último ${formatDate(lastDateByRoutine[routine.id])}` : "Aún sin usar"}</span>
      </div>
      <div class="actions-row">
        <button class="ghost small" data-action="start-routine" data-id="${routine.id}">Iniciar</button>
        <button class="ghost small" data-action="edit-routine" data-id="${routine.id}">Editar</button>
      </div>
    </article>
  `).join("");
}

function renderRecentLogs(state, els) {
  const cards = buildRecentActivity(state, 5).map((item) => cardHtml({
    title: item.title,
    subtitle: `${formatDate(item.date)} · ${item.subtitle}`,
    chips: item.kind === "session"
      ? [
        { label: `Duración ${formatDuration(item.durationSeconds || 0)}`, type: "ghost" },
        { label: `Volumen ${formatNumber(item.volume || 0)} kg`, type: "success" }
      ]
      : [
        { label: item.routineName || "Registro", type: "ghost" },
        { label: `e1RM ${formatNumber(item.bestE1rm || 0)} kg`, type: "warning" }
      ]
  }));

  els.recentLogs.innerHTML = cards.length ? cards.join("") : emptyHtml("Aún no hay actividad reciente.");
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
  els.dashboardExerciseMetricSelect.value = state.ui.dashboardExerciseMetric || "weight";
  els.dashboardMetricSelect.value = state.ui.dashboardMetric || "bodyWeight";
}

function renderExerciseChart(state, els) {
  const metric = state.ui.dashboardExerciseMetric || "weight";
  const points = buildExerciseChartPoints(state, state.ui.dashboardExerciseId, metric);
  const suffix = metric === "volume" ? "kg" : metric === "reps" ? " reps" : "kg";
  const metricLabel = {
    weight: "Carga máxima",
    e1rm: "e1RM",
    volume: "Volumen",
    reps: "Repeticiones"
  }[metric] || "Carga";

  els.exerciseChart.innerHTML = points.length >= 2
    ? buildLineChart(points, suffix, `${metricLabel} del ejercicio`)
    : emptyHtml("Necesitas al menos 2 referencias del ejercicio para ver evolución.");
}

function renderBodyChart(state, els) {
  const metric = state.ui.dashboardMetric || "bodyWeight";
  const points = buildBodyChartPoints(state, metric);
  const suffix = metric === "bodyFat" ? "%" : metric === "sleepHours" ? "h" : metric === "bodyWeight" ? "kg" : "cm";
  const label = BODY_METRIC_LABELS[metric] || "Métrica corporal";

  els.bodyChart.innerHTML = points.length >= 2
    ? buildLineChart(points, suffix, `Evolución de ${label}`)
    : emptyHtml("Necesitas al menos 2 mediciones para esta métrica.");
}

function renderTrendSummary(state, els) {
  const cards = buildTrendItems(state).slice(0, 3).map((item) => cardHtml(item));
  els.trendSummaryTop.innerHTML = cards.length ? cards.join("") : emptyHtml("Sin señales suficientes todavía.");
}
