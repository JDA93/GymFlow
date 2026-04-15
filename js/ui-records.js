import { buildHistoryFeed, buildMeasurementRows, buildPrItems, buildRoutineMetadata } from "./analytics.js";
import { cardHtml, emptyHtml } from "./ui-common.js";
import { formatCompactDelta, formatDate, formatDuration, formatNumber } from "./utils.js";

export function renderRoutines(state, els) {
  const search = String(state.ui.routineSearch || "").trim().toLowerCase();
  const dayFilter = state.ui.routineDayFilter || "all";
  const routines = state.routines.filter((routine) => {
    const dayMatches = dayFilter === "all" || (routine.day || "") === dayFilter;
    if (!dayMatches) return false;
    if (!search) return true;
    const haystack = [routine.name, routine.day, routine.focus, ...(routine.exercises || []).map((item) => item.name)].join(" ").toLowerCase();
    return haystack.includes(search);
  });

  if (els.routineFilterSummary) {
    const bits = [];
    if (search) bits.push(`búsqueda "${search}"`);
    if (dayFilter !== "all") bits.push(`bloque ${dayFilter}`);
    els.routineFilterSummary.textContent = bits.length
      ? `${routines.length} rutinas visibles · filtros: ${bits.join(" · ")}.`
      : `${routines.length} rutinas disponibles en biblioteca.`;
  }

  if (!routines.length) {
    els.routineList.innerHTML = emptyHtml(state.routines.length ? "No hay rutinas que coincidan con los filtros." : "No hay rutinas todavía.");
    return;
  }

  els.routineList.innerHTML = routines.map((routine) => {
    const meta = buildRoutineMetadata(state, routine);
    const blockPreview = [...new Set((routine.exercises || []).map((exercise) => exercise.block).filter(Boolean))].slice(0, 4);
    const estimatedMinutes = Math.max(25, Math.round((meta.totalSets * 2.1) + (meta.totalSets * 0.9)));
    return `
      <article class="list-item routine-card">
        <div class="list-head">
          <div>
            <h3 class="list-title">${routine.name}</h3>
            <p class="list-subtitle">${routine.day || "Sin bloque"} · ${routine.focus || "Sin foco"}</p>
          </div>
          <span class="chip ghost">${meta.lastDate ? `Último ${formatDate(meta.lastDate)}` : "Aún sin usar"}</span>
        </div>
        <div class="chip-row">
          <span class="chip ghost">${meta.exerciseCount} ejercicios</span>
          <span class="chip ghost">${meta.totalSets} series</span>
          <span class="chip ghost">~${estimatedMinutes} min</span>
          <span class="chip ${meta.complexityScore >= 24 ? "warning" : meta.complexityScore >= 16 ? "success" : "ghost"}">${meta.complexityLabel}</span>
          ${meta.blockCount ? `<span class="chip ghost">${meta.blockCount} bloques</span>` : ""}
          ${blockPreview.map((block) => `<span class="chip ghost">${block}</span>`).join("")}
        </div>
        <div class="routine-preview-list">
          ${(routine.exercises || []).slice(0, 5).map((exercise) => `
            <div class="routine-preview-row">
              <strong>${exercise.block ? `${exercise.block} · ` : ""}${exercise.name}</strong>
              <span>${exercise.sets}×${exercise.reps} · ${exercise.rest}s</span>
            </div>
          `).join("")}
          ${routine.exercises.length > 5 ? `<p class="helper-line">+${routine.exercises.length - 5} ejercicios más</p>` : ""}
        </div>
        <div class="actions-row">
          <button data-action="start-routine" data-id="${routine.id}">Iniciar sesión</button>
          <button class="ghost small" data-action="edit-routine" data-id="${routine.id}">Editar</button>
          <button class="ghost small" data-action="duplicate-routine" data-id="${routine.id}">Duplicar</button>
          <button class="ghost small" data-action="delete-routine" data-id="${routine.id}">Borrar</button>
        </div>
      </article>
    `;
  }).join("");
}

export function renderWorkoutList(state, els) {
  const feed = buildHistoryFeed(state);
  renderHistoryFilterSummary(state, els, feed.length);
  if (!feed.length) {
    els.workoutList.innerHTML = emptyHtml("No hay registros con esos filtros.");
    return;
  }

  let lastDate = "";
  els.workoutList.innerHTML = feed.map((item) => {
    const separator = item.date !== lastDate ? `<p class="history-day-separator">${formatDate(item.date)}</p>` : "";
    lastDate = item.date;
    return `${separator}${item.kind === "session" ? renderSessionHistoryCard(item) : renderManualHistoryCard(item)}`;
  }).join("");
}

function renderHistoryFilterSummary(state, els, total) {
  if (!els.logFilterSummary) return;
  const active = [];
  if (state.ui.logSearch) active.push(`texto "${state.ui.logSearch}"`);
  if (state.ui.logRoutine && state.ui.logRoutine !== "all") active.push("rutina");
  if (state.ui.logSource && state.ui.logSource !== "all") active.push(`origen: ${state.ui.logSource}`);
  if (state.ui.logMuscle && state.ui.logMuscle !== "all") active.push(`grupo: ${state.ui.logMuscle}`);
  if (state.ui.logDatePreset && state.ui.logDatePreset !== "all") active.push(`ventana: ${state.ui.logDatePreset}`);
  els.logFilterSummary.textContent = active.length
    ? `${total} resultados · filtros activos: ${active.join(" · ")}.`
    : `${total} resultados · vista completa.`;
}

function renderSessionHistoryCard(item) {
  return `
    <article class="list-item history-card history-card--session">
      <div class="list-head">
        <div>
          <h3 class="list-title">${item.title}</h3>
          <p class="list-subtitle">Sesión completa · ${item.exercisesCompleted} ejercicios · ${formatDuration(item.durationSeconds || 0)}</p>
        </div>
        <span class="chip success">${formatNumber(item.volume)} kg</span>
      </div>
      <div class="chip-row">
        <span class="chip ghost">${item.workingSets ?? item.totalSets} efectivas</span>
        <span class="chip ghost">${item.warmupSets ?? 0} warm-up</span>
        <span class="chip ghost">${item.exercisesCompleted ?? 0} ejercicios</span>
        ${item.muscleGroups.slice(0, 3).map((group) => `<span class="chip ghost">${group}</span>`).join("")}
      </div>
      ${item.notes ? `<p class="helper-line history-note-line">📝 ${item.notes}</p>` : ""}
      <div class="history-session-exercises">
        ${item.exercises.slice(0, 4).map((exercise) => `
          <div class="history-mini-row">
            <strong>${exercise.exercise}</strong>
            <span>${exercise.setCount} series · ${formatNumber(exercise.maxWeight)} kg top</span>
          </div>
        `).join("")}
      </div>
      <div class="actions-row">
        <button class="ghost small" data-action="start-routine" data-id="${item.routineId}">Repetir hoy</button>
        <button class="ghost small" data-action="edit-session-history" data-id="${item.sessionId}">Corregir series</button>
        <button class="ghost small danger-ghost" data-action="delete-session-history" data-id="${item.sessionId}">Borrar sesión</button>
      </div>
    </article>
  `;
}

function renderManualHistoryCard(item) {
  return `
    <article class="list-item history-card history-card--manual">
      <div class="list-head">
        <div>
          <h3 class="list-title">${item.title}</h3>
          <p class="list-subtitle">Registro manual${item.routineName ? ` · ${item.routineName}` : ""}</p>
        </div>
        <span class="chip ghost">${formatNumber(item.maxWeight)} kg top</span>
      </div>
      <div class="chip-row">
        <span class="chip ghost">${item.setCount} series</span>
        <span class="chip ghost">${item.repsLabel}</span>
        <span class="chip warning">e1RM ${formatNumber(item.bestE1rm)} kg</span>
        <span class="chip ghost">Volumen ${formatNumber(item.volume)} kg</span>
      </div>
      ${item.notes ? `<p class="helper-line history-note-line">📝 ${item.notes}</p>` : ""}
      <div class="actions-row">
        <button class="ghost small" data-action="edit-history-group" data-id="${item.groupId}">Corregir</button>
        <button class="ghost small danger-ghost" data-action="delete-workout-group" data-id="${item.groupId}">Borrar bloque</button>
      </div>
    </article>
  `;
}

export function renderPrList(state, els) {
  const items = buildPrItems(state);
  if (!items.length) {
    els.prList.innerHTML = emptyHtml("Sin datos todavía.");
    return;
  }

  els.prList.innerHTML = items.map((item) => cardHtml({
    title: item.exercise,
    subtitle: `Carga ${formatNumber(item.bestWeight.weight)} kg · e1RM ${formatNumber(item.bestE1rm.weight * (1 + item.bestE1rm.reps / 30))} kg`,
    chips: [
      { label: `Último ${formatDate(item.latest.date)}`, type: "ghost" },
      { label: `PR reciente ${formatDate(item.bestE1rm.date)}`, type: "ghost" },
      { label: `${item.deltaVsPrevBest >= 0 ? "+" : ""}${formatNumber(item.deltaVsPrevBest)} kg vs PR anterior`, type: item.deltaVsPrevBest >= 0 ? "success" : "warning" }
    ]
  })).join("");
}

export function renderMeasurements(state, els) {
  const measurements = buildMeasurementRows(state);
  const trendLabel = (delta) => {
    if (delta == null) return "Sin tendencia";
    if (Math.abs(delta) < 0.2) return "Estable";
    return delta < 0 ? "Mejorando" : "Deriva al alza";
  };
  els.measurementList.innerHTML = measurements.length ? measurements.map((item) => `
    <article class="list-item measurement-card">
      <div class="list-head">
        <div>
          <h3 class="list-title">${formatDate(item.date)}</h3>
          <p class="list-subtitle">Peso ${item.bodyWeight !== "" && item.bodyWeight != null ? `${formatNumber(item.bodyWeight)} kg` : "—"} · Cintura ${item.waist !== "" && item.waist != null ? `${formatNumber(item.waist)} cm` : "—"}</p>
        </div>
        <span class="chip ghost">Sueño ${item.sleepHours !== "" && item.sleepHours != null ? `${formatNumber(item.sleepHours)} h` : "—"}</span>
      </div>
      <div class="chip-row">
        <span class="chip ${item.deltaBodyWeight == null ? "ghost" : item.deltaBodyWeight <= 0 ? "success" : "warning"}">Peso ${item.deltaBodyWeight == null ? "—" : `${item.deltaBodyWeight < 0 ? "↘ " : item.deltaBodyWeight > 0 ? "↗ " : "→ "}${formatCompactDelta(item.deltaBodyWeight, " kg")}`}</span>
        <span class="chip ${item.deltaWaist == null ? "ghost" : item.deltaWaist <= 0 ? "success" : "warning"}">Cintura ${item.deltaWaist == null ? "—" : `${item.deltaWaist < 0 ? "↘ " : item.deltaWaist > 0 ? "↗ " : "→ "}${formatCompactDelta(item.deltaWaist, " cm")}`}</span>
        <span class="chip ${item.deltaBodyFat == null ? "ghost" : item.deltaBodyFat <= 0 ? "success" : "warning"}">Grasa ${item.deltaBodyFat == null ? "—" : `${item.deltaBodyFat < 0 ? "↘ " : item.deltaBodyFat > 0 ? "↗ " : "→ "}${formatCompactDelta(item.deltaBodyFat, " %")}`}</span>
        <span class="chip ${item.deltaWaist == null ? "ghost" : item.deltaWaist <= 0 ? "success" : "warning"}">${trendLabel(item.deltaWaist)}</span>
        <span class="chip ghost">Pecho ${item.chest !== "" && item.chest != null ? `${formatNumber(item.chest)} cm` : "—"}</span>
        <span class="chip ghost">Brazo ${item.arm !== "" && item.arm != null ? `${formatNumber(item.arm)} cm` : "—"}</span>
        <span class="chip ghost">Pierna ${item.thigh !== "" && item.thigh != null ? `${formatNumber(item.thigh)} cm` : "—"}</span>
      </div>
      <div class="actions-row">
        <button class="ghost small" data-action="edit-measurement" data-id="${item.id}">Editar</button>
        <button class="ghost small" data-action="delete-measurement" data-id="${item.id}">Borrar</button>
      </div>
    </article>
  `).join("") : emptyHtml("Todavía no hay mediciones.");
}
