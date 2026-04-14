import { buildWorkoutGroups, computeLastDateByRoutine, getWorkoutGroupSorter } from "./analytics.js";
import { cardHtml, emptyHtml } from "./ui-common.js";
import { formatDate, formatNumber } from "./utils.js";

export function renderRoutines(state, els) {
  if (!state.routines.length) {
    els.routineList.innerHTML = emptyHtml("No hay rutinas todavía.");
    return;
  }

  const lastDateByRoutine = computeLastDateByRoutine(state);
  els.routineList.innerHTML = state.routines.map((routine) => `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${routine.name}</h3>
          <p class="list-subtitle">${routine.day || "Sin bloque"} · ${routine.focus || "Sin foco"}</p>
        </div>
        <span class="chip ghost">${lastDateByRoutine[routine.id] ? `Último ${formatDate(lastDateByRoutine[routine.id])}` : "Aún sin usar"}</span>
      </div>
      <div class="chip-row">
        ${routine.exercises.slice(0, 6).map((exercise) => `<span class="chip ghost">${exercise.name}</span>`).join("")}
      </div>
      <div class="actions-row">
        <button class="ghost small" data-action="start-routine" data-id="${routine.id}">Iniciar sesión</button>
        <button class="ghost small" data-action="duplicate-routine" data-id="${routine.id}">Duplicar</button>
        <button class="ghost small" data-action="edit-routine" data-id="${routine.id}">Editar</button>
        <button class="ghost small" data-action="delete-routine" data-id="${routine.id}">Borrar</button>
      </div>
    </article>
  `).join("");
}

export function renderWorkoutList(state, els) {
  const query = (state.ui.logSearch || "").trim().toLowerCase();
  const groups = buildWorkoutGroups(state, { includeWarmups: state.preferences.showWarmupsInLogs })
    .filter((group) => {
      const matchExercise = !query || group.exercise.toLowerCase().includes(query);
      const matchRoutine = state.ui.logRoutine === "all" || group.routineId === state.ui.logRoutine;
      return matchExercise && matchRoutine;
    })
    .sort(getWorkoutGroupSorter(state.ui.logSort));

  if (!groups.length) {
    els.workoutList.innerHTML = emptyHtml("No hay registros con esos filtros.");
    return;
  }

  els.workoutList.innerHTML = groups.map((group) => `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${group.exercise}</h3>
          <p class="list-subtitle">${formatDate(group.date)}${group.routineName ? ` · ${group.routineName}` : ""} · ${group.sourceLabel}</p>
        </div>
        <span class="chip ghost">${formatNumber(group.maxWeight)} kg top</span>
      </div>
      <div class="chip-row">
        <span class="chip ghost">${group.setCount} series</span>
        <span class="chip ghost">${group.repsLabel}</span>
        <span class="chip warning">e1RM ${formatNumber(group.bestE1rm)} kg</span>
        <span class="chip ghost">Volumen ${formatNumber(group.volume)} kg</span>
        ${group.containsWarmup ? `<span class="chip ghost">Incluye calentamiento</span>` : ""}
      </div>
      <div class="actions-row">
        ${group.isEditable ? `<button class="ghost small" data-action="edit-workout" data-id="${group.primaryId}">Editar</button>` : ""}
        <button class="ghost small" data-action="delete-workout-group" data-id="${group.groupId}">Borrar bloque</button>
      </div>
    </article>
  `).join("");
}

export function renderPrList(state, els) {
  const grouped = state.workouts
    .filter((item) => !item.isWarmup)
    .reduce((acc, item) => {
      const key = item.exerciseId || item.exerciseKey || item.exercise;
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});

  const exercises = Object.values(grouped)
    .sort((a, b) => a[0].exercise.localeCompare(b[0].exercise, "es"));

  if (!exercises.length) {
    els.prList.innerHTML = emptyHtml("Sin datos todavía.");
    return;
  }

  els.prList.innerHTML = exercises.map((logs) => {
    const bestWeight = logs.reduce((best, item) => Number(item.weight) > Number(best.weight) ? item : best, logs[0]);
    const bestE1rm = logs.reduce((best, item) => (item.weight * (1 + item.reps / 30)) > (best.weight * (1 + best.reps / 30)) ? item : best, logs[0]);
    const bestVolume = logs.reduce((best, item) => (item.weight * item.reps * item.sets) > (best.weight * best.reps * best.sets) ? item : best, logs[0]);
    const latest = [...logs].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];

    return cardHtml({
      title: logs[0].exercise,
      subtitle: `Carga ${formatNumber(bestWeight.weight)} kg · e1RM ${formatNumber(bestE1rm.weight * (1 + bestE1rm.reps / 30))} kg`,
      chips: [
        { label: `Top volumen ${formatNumber(bestVolume.weight * bestVolume.reps * bestVolume.sets)} kg`, type: "ghost" },
        { label: `Último ${formatDate(latest.date)}`, type: "ghost" }
      ]
    });
  }).join("");
}

export function renderMeasurements(state, els) {
  const measurements = [...state.measurements].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  els.measurementList.innerHTML = measurements.length ? measurements.map((item) => `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${formatDate(item.date)}</h3>
          <p class="list-subtitle">Peso ${item.bodyWeight ? `${formatNumber(item.bodyWeight)} kg` : "—"} · Grasa ${item.bodyFat ? `${formatNumber(item.bodyFat)} %` : "—"}</p>
        </div>
      </div>
      <div class="chip-row">
        <span class="chip ghost">Cintura ${item.waist ? `${formatNumber(item.waist)} cm` : "—"}</span>
        <span class="chip ghost">Pecho ${item.chest ? `${formatNumber(item.chest)} cm` : "—"}</span>
        <span class="chip ghost">Brazo ${item.arm ? `${formatNumber(item.arm)} cm` : "—"}</span>
        <span class="chip ghost">Pierna ${item.thigh ? `${formatNumber(item.thigh)} cm` : "—"}</span>
        <span class="chip ghost">Sueño ${item.sleepHours ? `${formatNumber(item.sleepHours)} h` : "—"}</span>
      </div>
      <div class="actions-row">
        <button class="ghost small" data-action="edit-measurement" data-id="${item.id}">Editar</button>
        <button class="ghost small" data-action="delete-measurement" data-id="${item.id}">Borrar</button>
      </div>
    </article>
  `).join("") : emptyHtml("Todavía no hay mediciones.");
}
