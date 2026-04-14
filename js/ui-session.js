import { getExerciseReference, getActiveRoutine, nextLoadSuggestionForExercise } from "./analytics.js";
import { emptyHtml } from "./ui-common.js";
import { escapeHtml, extractMainRep, formatDuration, formatNumber, parseRepRange } from "./utils.js";
import { getExerciseCompletionStatus, getSessionDurationSeconds, getSessionEntriesByExercise, getNextSuggestedExerciseId, isExerciseSkipped } from "./session.js";

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
  els.endSessionBtn.disabled = !active;
  els.startSessionBtn.textContent = active ? "Cambiar rutina" : "Iniciar sesión";
  els.sessionRoutineSelect.value = state.session.routineId || els.sessionRoutineSelect.value || "";

  if (!active) {
    els.activeSessionCard.innerHTML = emptyHtml("Selecciona una rutina e inicia la sesión para ver tu flujo de trabajo aquí.");
    return;
  }

  const effectiveCompleted = (routine.exercises || []).filter((exercise) => getExerciseCompletionStatus(state, exercise).completed).length;
  const skippedCount = (routine.exercises || []).filter((exercise) => isExerciseSkipped(state, exercise.id)).length;
  const progressBase = routine.exercises.length || 1;
  const progress = Math.round(((effectiveCompleted + skippedCount) / progressBase) * 100);
  const nextExerciseId = getNextSuggestedExerciseId(state, state.session.currentExerciseId || routine.exercises[0]?.id);
  const header = `
    <div class="list-item highlight session-header-card">
      <div class="list-head">
        <div>
          <h3 class="list-title">${escapeHtml(routine.name)}</h3>
          <p class="list-subtitle">${escapeHtml(routine.focus || "Sin foco")} · ${routine.exercises.length} ejercicios planificados</p>
        </div>
        <span class="chip success">${effectiveCompleted}/${routine.exercises.length} completos</span>
      </div>
      <div class="session-progress">
        <div class="progress-bar"><span style="width:${progress}%"></span></div>
        <strong>${progress}%</strong>
      </div>
      <div class="chip-row">
        <span class="chip ghost">Siguiente: ${escapeHtml(routine.exercises.find((exercise) => exercise.id === nextExerciseId)?.name || routine.exercises[0]?.name || "—")}</span>
        <span class="chip ghost">Omitidos ${skippedCount}</span>
        <span class="chip ghost">Series ${state.session.setEntries.length}</span>
      </div>
    </div>
  `;

  const cards = routine.exercises.map((exercise, index) => renderExerciseCard(state, exercise, index, nextExerciseId)).join("");
  els.activeSessionCard.innerHTML = header + cards;
}

function renderExerciseCard(state, exercise, index, nextExerciseId) {
  const reference = getExerciseReference(state, exercise.catalogId || exercise.exerciseKey || exercise.name, state.session.routineId)
    || getExerciseReference(state, exercise.catalogId || exercise.exerciseKey || exercise.name);
  const entries = getSessionEntriesByExercise(state, exercise.id);
  const status = getExerciseCompletionStatus(state, exercise);
  const suggestion = nextLoadSuggestionForExercise(state, exercise);
  const repRange = parseRepRange(exercise.reps);
  const restDefault = exercise.rest || state.preferences.defaultRestSeconds;
  const latestEntry = entries[entries.length - 1] || null;
  const suggestedWeight = latestEntry ? latestEntry.weight : (reference?.weight ?? suggestion.value ?? 0);
  const suggestedReps = latestEntry ? latestEntry.reps : extractMainRep(exercise.reps);
  const suggestedRest = latestEntry?.rest ?? restDefault;
  const plannedSets = Array.from({ length: Number(exercise.sets || 0) }, (_, setIndex) => {
    const done = status.workingEntries.length > setIndex;
    return `<span class="planned-set ${done ? "done" : ""}">Serie ${setIndex + 1}</span>`;
  }).join("");
  const stateClass = status.skipped ? "skipped" : status.completed ? "completed" : status.inProgress ? "in-progress" : "";

  return `
    <article class="session-exercise ${stateClass}" id="exercise-card-${exercise.id}">
      <div class="session-exercise-top">
        <div>
          <div class="exercise-title-row">
            <h3 class="list-title">${index + 1}. ${escapeHtml(exercise.name)}</h3>
            ${exercise.block ? `<span class="chip ghost">${escapeHtml(exercise.block)}</span>` : ""}
          </div>
          <p class="list-subtitle">${exercise.sets || "—"} series objetivo · ${escapeHtml(String(exercise.reps || "—"))} reps · descanso ${restDefault}s</p>
        </div>
        <div class="actions-row actions-row--tight">
          <button class="ghost small" data-action="toggle-skip-exercise" data-id="${exercise.id}">${status.skipped ? "Reactivar" : "Omitir"}</button>
        </div>
      </div>

      <div class="planned-sets" aria-label="Series objetivo">
        ${plannedSets || `<span class="planned-set">Sin series objetivo</span>`}
      </div>

      <div class="chip-row">
        <span class="chip ghost">Último top set: ${reference ? `${formatNumber(reference.weight)} kg × ${reference.reps}` : "—"}</span>
        <span class="chip ${suggestion.decision === "up" ? "success" : suggestion.decision === "down" ? "warning" : "ghost"}">Siguiente carga: ${formatNumber(suggestion.value)} kg</span>
        <span class="chip ghost">Rango objetivo: ${repRange.max ? `${repRange.min}-${repRange.max}` : repRange.min || "—"}</span>
        <span class="chip ${status.skipped ? "warning" : status.completed ? "success" : nextExerciseId === exercise.id ? "success" : "ghost"}">${status.skipped ? "Omitido" : status.completed ? "Completado automático" : nextExerciseId === exercise.id ? "Ahora toca" : `${status.workingEntries.length} guardadas`}</span>
      </div>
      <p class="helper-line">${escapeHtml(status.skipped ? "Ejercicio apartado temporalmente para no romper el flujo. Puedes reactivarlo cuando quieras." : suggestion.reason)}</p>
      ${exercise.notes ? `<p class="helper-line helper-line--strong">Nota: ${escapeHtml(exercise.notes)}</p>` : ""}

      <div class="session-series-grid">
        <div class="quick-input-group">
          <label for="session-weight-${exercise.id}">Kg</label>
          <input inputmode="decimal" type="number" step="0.5" min="0" placeholder="Kg" id="session-weight-${exercise.id}" value="${suggestedWeight}" />
        </div>
        <div class="quick-input-group">
          <label for="session-reps-${exercise.id}">Reps</label>
          <input inputmode="numeric" type="number" step="1" min="1" placeholder="Reps" id="session-reps-${exercise.id}" value="${suggestedReps}" />
        </div>
        <div class="quick-input-group quick-input-group--small">
          <label for="session-rpe-${exercise.id}">RPE</label>
          <input inputmode="decimal" type="number" step="0.5" min="1" max="10" placeholder="RPE" id="session-rpe-${exercise.id}" value="" />
        </div>
        <div class="quick-input-group quick-input-group--small">
          <label for="session-rest-${exercise.id}">Descanso</label>
          <input inputmode="numeric" type="number" min="0" step="15" placeholder="Segundos" id="session-rest-${exercise.id}" value="${suggestedRest}" />
        </div>
        <label class="switch-row compact-switch quick-switch">
          <input type="checkbox" id="session-warmup-${exercise.id}" />
          <span>Warm-up</span>
        </label>
        <button data-action="add-session-set" data-id="${exercise.id}" ${status.skipped ? "disabled" : ""}>Guardar serie</button>
      </div>

      <div class="session-quick-actions">
        <button class="ghost small" data-action="fill-last-session-values" data-id="${exercise.id}" ${reference ? "" : "disabled"}>Usar última referencia</button>
        <button class="ghost small" data-action="repeat-last-session-set" data-id="${exercise.id}" ${latestEntry ? "" : "disabled"}>Repetir última serie</button>
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
