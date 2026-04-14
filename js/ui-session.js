import { getExerciseReference, getActiveRoutine, nextLoadSuggestionForExercise } from "./analytics.js";
import { buildLineChart, emptyHtml } from "./ui-common.js";
import { escapeHtml, extractMainRep, formatDuration, formatNumber, parseRepRange } from "./utils.js";
import { getSessionDurationSeconds, getSessionEntriesByExercise } from "./session.js";

export function renderSession(state, els) {
  const routine = getActiveRoutine(state);
  const active = state.session.active && routine;
  const durationSeconds = getSessionDurationSeconds(state);
  const effectiveVolume = state.session.setEntries.reduce((sum, entry) => sum + (entry.isWarmup ? 0 : Number(entry.weight || 0) * Number(entry.reps || 0)), 0);

  els.sessionStatusLabel.textContent = active ? routine.name : "Sin sesión";
  els.sessionDurationLabel.textContent = formatDuration(durationSeconds);
  els.sessionVolumeLabel.textContent = `${formatNumber(effectiveVolume)} kg`;
  els.sessionNotes.value = state.session.notes || "";
  els.copyLastSessionBtn.disabled = !active;
  els.discardSessionBtn.disabled = !active;

  if (!active) {
    els.activeSessionCard.innerHTML = `<p class="empty">Selecciona una rutina e inicia la sesión para ver tus ejercicios aquí.</p>`;
    return;
  }

  const completed = state.session.completedExerciseIds.length;
  const progress = routine.exercises.length ? Math.round((completed / routine.exercises.length) * 100) : 0;
  const header = `
    <div class="list-item highlight">
      <div class="list-head">
        <div>
          <h3 class="list-title">${escapeHtml(routine.name)}</h3>
          <p class="list-subtitle">${escapeHtml(routine.focus || "Sin foco")} · ${routine.exercises.length} ejercicios planificados</p>
        </div>
        <span class="chip success">${completed}/${routine.exercises.length} completados</span>
      </div>
      <div class="session-progress">
        <div class="progress-bar"><span style="width:${progress}%"></span></div>
        <strong>${progress}%</strong>
      </div>
    </div>
  `;

  const cards = routine.exercises.map((exercise, index) => renderExerciseCard(state, exercise, index)).join("");
  els.activeSessionCard.innerHTML = header + cards;
}

function renderExerciseCard(state, exercise, index) {
  const reference = getExerciseReference(state, exercise.catalogId || exercise.exerciseKey || exercise.name, state.session.routineId)
    || getExerciseReference(state, exercise.catalogId || exercise.exerciseKey || exercise.name);
  const entries = getSessionEntriesByExercise(state, exercise.id);
  const workingEntries = entries.filter((item) => !item.isWarmup);
  const isCompleted = state.session.completedExerciseIds.includes(exercise.id) || workingEntries.length >= Number(exercise.sets || 0);
  const suggestion = nextLoadSuggestionForExercise(state, exercise);
  const repRange = parseRepRange(exercise.reps);
  const restDefault = exercise.rest || state.preferences.defaultRestSeconds;
  const plannedSets = Array.from({ length: Number(exercise.sets || 0) }, (_, setIndex) => {
    const done = workingEntries.length > setIndex;
    return `<span class="planned-set ${done ? "done" : ""}">Serie ${setIndex + 1}</span>`;
  }).join("");

  return `
    <article class="session-exercise ${isCompleted ? "completed" : ""}" id="exercise-card-${exercise.id}">
      <div class="session-exercise-top">
        <div>
          <h3 class="list-title">${index + 1}. ${escapeHtml(exercise.name)}</h3>
          <p class="list-subtitle">${exercise.sets || "—"} series objetivo · ${escapeHtml(String(exercise.reps || "—"))} reps · descanso ${restDefault}s</p>
        </div>
        <button class="ghost small" data-action="toggle-complete-exercise" data-id="${exercise.id}">
          ${isCompleted ? "Desmarcar" : "Completar"}
        </button>
      </div>

      <div class="planned-sets" aria-label="Series objetivo">
        ${plannedSets || `<span class="planned-set">Sin series objetivo</span>`}
      </div>

      <div class="chip-row">
        <span class="chip ghost">Último top set: ${reference ? `${formatNumber(reference.weight)} kg × ${reference.reps}` : "—"}</span>
        <span class="chip ${suggestion.decision === "up" ? "success" : suggestion.decision === "down" ? "warning" : "ghost"}">
          Siguiente carga: ${suggestion.value ? `${formatNumber(suggestion.value)} kg` : "Empieza cómodo"}
        </span>
        <span class="chip ghost">Rango objetivo: ${repRange.max ? `${repRange.min}-${repRange.max}` : repRange.min || "—"}</span>
        <span class="chip ghost">Series guardadas: ${workingEntries.length}</span>
      </div>
      <p class="helper-line">${escapeHtml(suggestion.reason)}</p>

      <div class="session-series-row">
        <input inputmode="decimal" type="number" step="0.5" min="0" placeholder="Kg" id="session-weight-${exercise.id}" value="${reference?.weight ?? suggestion.value ?? ""}" />
        <input inputmode="numeric" type="number" step="1" min="1" placeholder="Reps" id="session-reps-${exercise.id}" value="${extractMainRep(exercise.reps)}" />
        <input inputmode="decimal" type="number" step="0.5" min="1" max="10" placeholder="RPE" id="session-rpe-${exercise.id}" value="" />
        <input inputmode="numeric" type="number" min="0" step="15" placeholder="Descanso" id="session-rest-${exercise.id}" value="${restDefault}" />
        <label class="switch-row compact-switch">
          <input type="checkbox" id="session-warmup-${exercise.id}" />
          <span>Calentamiento</span>
        </label>
        <button data-action="add-session-set" data-id="${exercise.id}">Guardar serie</button>
      </div>

      ${entries.length ? buildSessionTable(entries) : `<p class="helper-line">Todavía no has guardado series para este ejercicio en esta sesión.</p>`}
    </article>
  `;
}

function buildSessionTable(entries) {
  return `
    <div class="session-table-wrap">
      <table class="session-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tipo</th>
            <th>Peso</th>
            <th>Reps</th>
            <th>RPE</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map((entry, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${entry.isWarmup ? "Calentamiento" : "Efectiva"}</td>
              <td>${formatNumber(entry.weight)} kg</td>
              <td>${entry.reps}</td>
              <td>${entry.rpe === "" ? "—" : entry.rpe}</td>
              <td><button class="ghost small" data-action="delete-session-set" data-id="${entry.id}">Quitar</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
