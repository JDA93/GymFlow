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

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasMetric(value) {
  return value !== "" && value != null;
}

export function renderStats(state, els) {
  const stats = computeStats(state);
  els.statSessionsMonth.textContent = stats.daysTrainedThisMonth;
  els.statStreak.textContent = String(stats.continuityActive);
  els.statWeight.textContent = hasMetric(stats.latestMeasurement?.bodyWeight) ? `${formatNumber(stats.latestMeasurement.bodyWeight)} kg` : "—";
  els.statBestLift.textContent = stats.bestLift ? `${formatNumber(stats.bestLift.weight)} kg` : "—";
  els.statBestLiftLabel.textContent = stats.bestLift ? stats.bestLift.exercise : "Sin datos";
  els.statBestE1rm.textContent = stats.bestE1rm ? `${formatNumber(stats.bestE1rm.value)} kg` : "—";
  els.statBestE1rmLabel.textContent = stats.bestE1rm ? stats.bestE1rm.item.exercise : "Estimado";
}



export function renderHome(state, els) {
  if (!els.homePrimaryCard || !els.homeSecondaryActions || !els.homeUtilityNav || !els.homeRecencyStats || !els.homeOnboarding) return;
  const suggestion = getSuggestedRoutine(state);
  const hasActiveSession = Boolean(state?.session?.active);
  const hasAnyData = ensureArray(state.routines).length || ensureArray(state.workouts).length || ensureArray(state.measurements).length;

  const sessionEntries = ensureArray(state?.session?.setEntries);
  const effectiveSets = sessionEntries.filter((entry) => !entry.isWarmup).length;
  const sessionVolume = sessionEntries.reduce((sum, entry) => sum + (entry.isWarmup ? 0 : Number(entry.weight || 0) * Number(entry.reps || 0)), 0);

  let primaryHtml = "";
  if (hasActiveSession) {
    const routineName = ensureArray(state.routines).find((item) => item.id === state.session.routineId)?.name || "Sesión en curso";
    primaryHtml = `
      <div class="home-primary-top">
        <span class="home-eyebrow success">Sesión activa</span>
        <h3>Retoma tu entrenamiento ahora</h3>
        <p>Tienes una sesión de <strong>${escapeHtml(routineName)}</strong> abierta: ${effectiveSets} series efectivas y ${formatNumber(sessionVolume)} kg acumulados.</p>
      </div>
      <div class="home-primary-actions">
        <button type="button" data-action="continue-session">Reanudar sesión activa</button>
        <button class="ghost" type="button" data-action="open-tab" data-id="session">Abrir panel de sesión</button>
      </div>
    `;
    els.homePrimaryCard.dataset.state = "active";
  } else if (!suggestion?.routine) {
    primaryHtml = `
      <div class="home-primary-top">
        <span class="home-eyebrow">Comienza aquí</span>
        <h3>Crea tu primera rutina</h3>
        <p>Configura tu plan y usa GymFlow Pro para registrar sesiones, progreso corporal y decisiones de entrenamiento.</p>
      </div>
      <div class="home-primary-actions">
        <button type="button" data-action="open-tab" data-id="routines">Crear rutina</button>
        <button class="ghost" type="button" data-action="load-demo">Cargar demo guiada</button>
      </div>
    `;
    els.homePrimaryCard.dataset.state = "setup";
  } else {
    const sinceLabel = suggestion.daysSince == null ? "Sin sesiones previas" : `${suggestion.daysSince} días desde la última vez`;
    primaryHtml = `
      <div class="home-primary-top">
        <span class="home-eyebrow">Siguiente mejor acción</span>
        <h3>Entrena ${escapeHtml(suggestion.routine.name)}</h3>
        <p>${escapeHtml(suggestion.reason)} · ${escapeHtml(sinceLabel)}.</p>
      </div>
      <div class="home-primary-actions">
        <button type="button" data-action="start-routine" data-id="${escapeHtml(suggestion.routine.id)}">Iniciar rutina recomendada</button>
        <button class="ghost" type="button" data-action="open-tab" data-id="session">Elegir otra rutina</button>
      </div>
    `;
    els.homePrimaryCard.dataset.state = "recommended";
  }

  els.homePrimaryCard.innerHTML = primaryHtml;

  els.homeOnboarding.hidden = Boolean(hasAnyData);
  if (!hasAnyData) {
    els.homeOnboarding.innerHTML = `
      <h3>Nuevo en GymFlow Pro</h3>
      <p>Todo funciona offline y se guarda en tu dispositivo. Empieza creando una rutina o cargando una demo editable.</p>
      <div class="home-primary-actions">
        <button type="button" data-action="open-tab" data-id="routines">Crear rutina</button>
        <button class="ghost" type="button" data-action="load-demo">Cargar demo</button>
      </div>
    `;
  }

  const latestWorkoutDate = ensureArray(state.workouts).map((item) => item.date).filter(Boolean).sort((a, b) => String(b).localeCompare(String(a)))[0] || null;
  const daysFromWorkout = latestWorkoutDate ? Math.max(0, daysBetween(latestWorkoutDate, todayLocal())) : null;
  const latestMeasurement = [...ensureArray(state.measurements)].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
  const hasGoals = Boolean(state.goals?.focusGoal || state.goals?.goalDate || state.goals?.athleteName || Object.values(state.goals?.resultGoals || {}).some(Boolean) || Object.values(state.goals?.habits || {}).some(Boolean));

  els.homeSecondaryActions.innerHTML = [
    {
      title: "Sesión",
      subtitle: hasActiveSession ? "Reanudar la sesión que dejaste abierta." : (suggestion?.routine ? "Iniciar sesión desde una rutina." : "Primero crea o carga una rutina."),
      meta: hasActiveSession ? "En progreso" : (suggestion?.routine ? "Lista para empezar" : "Sin rutinas"),
      action: "open-session-smart"
    },
    {
      title: "Historial",
      subtitle: "Revisa entrenos recientes, PRs y registros manuales.",
      meta: latestWorkoutDate ? `Último registro: ${formatDate(latestWorkoutDate)}` : "Aún sin registros",
      action: "open-tab",
      id: "logs"
    },
    {
      title: "Rutinas",
      subtitle: "Construye, ajusta y ordena tu biblioteca.",
      meta: `${ensureArray(state.routines).length} rutina${ensureArray(state.routines).length === 1 ? "" : "s"}`,
      action: "open-tab",
      id: "routines"
    },
    {
      title: "Check-in corporal",
      subtitle: "Registra peso, cintura o sueño en segundos.",
      meta: latestMeasurement ? `Última: ${formatDate(latestMeasurement.date)}` : "Sin mediciones",
      action: "open-tab",
      id: "measurements"
    }
  ].map((item) => `
    <button class="home-action-card ghost" type="button" data-action="${item.action}" ${item.id ? `data-id="${item.id}"` : ""}>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.subtitle)}</small>
      <span class="meta">${escapeHtml(item.meta)}</span>
    </button>
  `).join("");

  els.homeUtilityNav.innerHTML = [
    { title: "Evolución", subtitle: "Frecuencia, volumen y señales.", meta: "Analítica", id: "analytics" },
    { title: "Objetivos", subtitle: "Resultados y hábitos del bloque.", meta: hasGoals ? "Objetivos activos" : "Configurar objetivos", id: "goals" },
    { title: "Ajustes", subtitle: "Datos, backup y comportamiento.", meta: "Sistema", id: "settings" },
    { title: "Panel Hoy", subtitle: "Dashboard completo y tendencias.", meta: "Vista ampliada", id: "dashboard" }
  ].map((item) => `
    <button class="home-utility-card ghost" type="button" data-action="open-tab" data-id="${item.id}">
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.subtitle)}</small>
      <span class="meta">${escapeHtml(item.meta)}</span>
    </button>
  `).join("");

  els.homeRecencyStats.innerHTML = [
    { label: "Sesión activa", value: hasActiveSession ? "Sí" : "No" },
    { label: "Rutinas", value: String(ensureArray(state.routines).length) },
    { label: "Último entreno", value: daysFromWorkout == null ? "Sin datos" : (daysFromWorkout === 0 ? "Hoy" : `Hace ${daysFromWorkout} día${daysFromWorkout === 1 ? "" : "s"}`) },
    { label: "Última medición", value: latestMeasurement?.date ? formatDate(latestMeasurement.date) : "Sin datos" }
  ].map((item) => `
    <article class="home-meta-item">
      <p>${escapeHtml(item.label)}</p>
      <strong>${escapeHtml(item.value)}</strong>
    </article>
  `).join("");
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
    const recentDays = [...new Set(ensureArray(state?.workouts).filter((item) => !item.isWarmup).map((item) => item.date))]
      .filter((date) => daysBetween(date, todayLocal()) <= 6).length;
    if (recentDays < weeklyTarget) return `Te faltan ${weeklyTarget - recentDays} sesiones para cumplir el objetivo semanal.`;
  }
  return "Prioriza una acción simple hoy y mantén la continuidad.";
}

function renderPrimaryAction(state, els) {
  const suggestion = getSuggestedRoutine(state);
  const active = Boolean(state?.session?.active);
  if (active) {
    const sessionEntries = ensureArray(state?.session?.setEntries);
    const volume = sessionEntries.reduce((sum, entry) => sum + (entry.isWarmup ? 0 : Number(entry.weight || 0) * Number(entry.reps || 0)), 0);
    const workingSets = sessionEntries.filter((entry) => !entry.isWarmup).length;
    const warmupSets = sessionEntries.filter((entry) => entry.isWarmup).length;
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
  if (state?.session?.active) {
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
  const stalledExercise = ensureArray(detectPotentialStall(state))[0] || null;
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
  els.quickSignals.innerHTML = cards.length ? cards.join("") : emptyHtml("Aún no hay suficiente histórico para señales útiles. Empieza con un par de registros.");
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
  const safeOptions = ensureArray(exerciseOptions);
  if (!safeOptions.length) {
    els.dashboardExerciseSelect.innerHTML = `<option value="">Sin ejercicios</option>`;
    state.ui.dashboardExerciseId = "";
    return;
  }

  if (!state.ui.dashboardExerciseId || !safeOptions.some((item) => item.id === state.ui.dashboardExerciseId)) {
    state.ui.dashboardExerciseId = safeOptions[0].id;
  }

  const fragment = document.createDocumentFragment();
  safeOptions.forEach((item) => {
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
  els.exerciseChart.innerHTML = points.length >= 2
    ? buildLineChart(points, suffix, `${metricLabel} del ejercicio`)
    : emptyHtml("Aún no hay suficiente histórico para esta gráfica. Registra más series de este ejercicio.");
}

function renderBodyChart(state, els) {
  const metric = state.ui.dashboardMetric || "bodyWeight";
  const points = buildBodyChartPoints(state, metric);
  const suffix = metric === "bodyFat" ? "%" : metric === "sleepHours" ? " h" : metric === "bodyWeight" ? " kg" : " cm";
  const label = BODY_METRIC_LABELS[metric] || "Métrica corporal";
  const latest = [...ensureArray(state?.measurements)].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  els.bodyChart.innerHTML = points.length >= 2
    ? `${latest ? `<div class="mini-insight">Última lectura: ${hasMetric(latest[metric]) ? `${formatNumber(latest[metric])}${suffix}` : "—"}</div>` : ""}${buildLineChart(points, suffix, `Evolución de ${label}`)}`
    : emptyHtml(hasMetric(latest?.[metric]) ? `Solo hay una medición de ${label}. Registra una más para ver tendencia.` : `Todavía no hay datos de ${label}.`);
}
