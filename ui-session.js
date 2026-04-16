import { getActiveRoutine, getExerciseReference, nextLoadSuggestionForExercise } from "./analytics.js";
import { getExerciseCompletionStatus, getNextSuggestedExerciseId, getSessionDurationSeconds, getSessionEntriesByExercise } from "./session.js";
import { emptyHtml } from "./ui-common.js";
import { escapeHtml, extractMainRep, formatDuration, formatNumber } from "./utils.js";

function exerciseStatusClass(status) {
  if (status.skipped) return "skipped";
  if (status.completed) return "completed";
  if (status.inProgress) return "progress";
  return "idle";
}

function entryTypeLabel(entry) {
  return entry.isWarmup ? "Warm-up" : "Trabajo";
}

function buildEntryRow(entry, index) {
  const parts = [
    `${formatNumber(entry.weight)} kg × ${Number(entry.reps || 0)}`,
    entry.rpe !== "" && entry.rpe != null ? `RPE ${formatNumber(entry.rpe)}` : "",
    entry.rest !== "" && entry.rest != null ? `${Number(entry.rest)} s` : ""
  ].filter(Boolean);

  return `
    <div class="session-entry ${entry.isWarmup ? "session-entry--warmup" : ""}">
      <div class="session-entry-meta">
        <strong>S${index + 1}</strong>
        <span>${escapeHtml(entryTypeLabel(entry))} · ${escapeHtml(parts.join(" · "))}</span>
      </div>
      ${entry.notes ? `<p class="helper-line">📝 ${escapeHtml(entry.notes)}</p>` : ""}
      <div class="actions-row">
        <button type="button" class="ghost small" data-action="prefill-session-set" data-id="${entry.id}">Cargar</button>
        <button type="button" class="ghost small" data-action="edit-session-set" data-id="${entry.id}">Editar</button>
        <button type="button" class="ghost small danger-ghost" data-action="delete-session-set" data-id="${entry.id}">Borrar</button>
      </div>
    </div>
  `;
}

function buildExerciseCard(state, exercise, isOpen = false) {
  const status = getExerciseCompletionStatus(state, exercise);
  const entries = getSessionEntriesByExercise(state, exercise.id);
  const lastSessionEntry = entries[entries.length - 1] || null;
  const reference = getExerciseReference(
    state,
    exercise.catalogId || exercise.exerciseKey || exercise.name,
    state.session.routineId
  ) || getExerciseReference(state, exercise.catalogId || exercise.exerciseKey || exercise.name);

  const suggestion = nextLoadSuggestionForExercise(state, exercise);
  const defaultWeight = lastSessionEntry?.weight ?? (suggestion?.value ?? "");
  const defaultReps = lastSessionEntry?.reps ?? extractMainRep(exercise.reps);
  const defaultRest = lastSessionEntry?.rest || exercise.rest || state.preferences.defaultRestSeconds || 90;

  const summaryBits = [
    exercise.block ? `Bloque ${exercise.block}` : "",
    exercise.muscleGroup || "",
    `${status.workingEntries.length}/${status.targetSets || 0} series`
  ].filter(Boolean);

  const referenceLabel = reference
    ? `${formatNumber(reference.weight)} kg × ${Number(reference.reps || 0)}`
    : "Sin referencia previa";

  const suggestionLabel = suggestion?.value
    ? `${formatNumber(suggestion.value)} kg`
    : "Empezar ligero";

  return `
    <details class="session-exercise-card ${exerciseStatusClass(status)}" id="exercise-card-${exercise.id}" ${isOpen ? "open" : ""}>
      <summary>
        <div class="session-card-summary">
          <div>
            <strong>${escapeHtml(exercise.name)}</strong>
            <p>${escapeHtml(summaryBits.join(" · "))}</p>
          </div>
          <div class="chip-row">
            <span class="chip ${status.completed ? "success" : status.skipped ? "danger" : status.inProgress ? "warning" : "ghost"}">
              ${status.skipped ? "Omitido" : status.completed ? "Completado" : status.inProgress ? "En progreso" : "Pendiente"}
            </span>
          </div>
        </div>
      </summary>

      <div class="session-card-body">
        <div class="session-reference-grid">
          <div class="session-reference">
            <span class="eyebrow-dark">Última referencia</span>
            <strong>${escapeHtml(referenceLabel)}</strong>
          </div>
          <div class="session-reference">
            <span class="eyebrow-dark">Carga sugerida</span>
            <strong>${escapeHtml(suggestionLabel)}</strong>
            <p>${escapeHtml(suggestion?.reason || "Sin sugerencia disponible.")}</p>
          </div>
        </div>

        <div class="session-form-grid">
          <div class="form-field">
            <label for="session-weight-${exercise.id}">Peso</label>
            <input id="session-weight-${exercise.id}" type="number" min="0" step="0.5" inputmode="decimal" value="${defaultWeight === "" ? "" : Number(defaultWeight)}" />
          </div>
          <div class="form-field">
            <label for="session-reps-${exercise.id}">Reps</label>
            <input id="session-reps-${exercise.id}" type="number" min="1" step="1" inputmode="numeric" value="${defaultReps === "" ? "" : Number(defaultReps)}" />
          </div>
          <div class="form-field">
            <label for="session-rpe-${exercise.id}">RPE</label>
            <input id="session-rpe-${exercise.id}" type="number" min="1" max="10" step="0.5" inputmode="decimal" />
          </div>
          <div class="form-field">
            <label for="session-rest-${exercise.id}">Descanso</label>
            <input id="session-rest-${exercise.id}" type="number" min="0" step="15" inputmode="numeric" value="${defaultRest}" />
          </div>
          <label class="switch-row compact-switch">
            <input id="session-warmup-${exercise.id}" type="checkbox" />
            <span>Warm-up</span>
          </label>
        </div>

        <div class="actions-row">
          <button type="button" data-action="add-session-set" data-id="${exercise.id}">Guardar serie</button>
          <button type="button" class="ghost small" data-action="fill-last-session-values" data-id="${exercise.id}">Última ref</button>
          <button type="button" class="ghost small" data-action="repeat-last-session-set" data-id="${exercise.id}">Repetir</button>
          <button type="button" class="ghost small" data-action="save-last-session-set-again" data-id="${exercise.id}">Guardar igual</button>
          <button type="button" class="ghost small" data-action="toggle-skip-exercise" data-id="${exercise.id}">
            ${status.skipped ? "Reactivar" : "Omitir"}
          </button>
          <button type="button" class="ghost small" data-action="jump-next-exercise" data-id="${exercise.id}">Siguiente</button>
        </div>

        <div class="session-entries">
          ${entries.length
            ? entries.map((entry, index) => buildEntryRow(entry, index)).join("")
            : emptyHtml("Todavía no hay series registradas para este ejercicio.")}
        </div>
      </div>
    </details>
  `;
}

export function renderSession(state, els) {
  const routine = getActiveRoutine(state);
  const active = Boolean(state.session.active && routine);

  els.sessionNotes.value = state.session.notes || "";
  const effectiveVolume = state.session.setEntries.reduce((sum, entry) => (
    entry.isWarmup ? sum : sum + Number(entry.weight || 0) * Number(entry.reps || 0)
  ), 0);

  els.sessionDurationLabel.textContent = active ? formatDuration(getSessionDurationSeconds(state)) : "00:00";
  els.sessionVolumeLabel.textContent = `${formatNumber(effectiveVolume)} kg`;

  if (!active) {
    els.sessionStatusLabel.textContent = "Sin sesión";
    els.activeSessionCard.innerHTML = `
      <div class="session-empty">
        <h3>Empieza una rutina para activar el modo sesión</h3>
        <p>Selecciona una rutina arriba y pulsa <strong>Iniciar sesión</strong>. Cuando guardes series aquí, luego se cerrarán juntas en el histórico.</p>
        <div class="session-empty-actions">
          <button type="button" data-action="open-tab" data-id="routines">Ir a Rutinas</button>
          <button type="button" class="ghost" data-action="load-demo">Cargar demo</button>
        </div>
      </div>
    `;
    return;
  }

  const nextExerciseId = getNextSuggestedExerciseId(state, state.session.currentExerciseId || "");
  const completedCount = routine.exercises.filter((exercise) => getExerciseCompletionStatus(state, exercise).completed).length;
  const skippedCount = routine.exercises.filter((exercise) => getExerciseCompletionStatus(state, exercise).skipped).length;
  const workingCount = state.session.setEntries.filter((entry) => !entry.isWarmup).length;
  const warmupCount = state.session.setEntries.filter((entry) => entry.isWarmup).length;

  els.sessionStatusLabel.textContent = `En curso · ${routine.name}`;
  els.activeSessionCard.innerHTML = `
    <div class="session-overview">
      <div class="chip-row">
        <span class="chip ghost">${routine.exercises.length} ejercicios</span>
        <span class="chip success">${completedCount} completos</span>
        <span class="chip ghost">${workingCount} series efectivas</span>
        <span class="chip ghost">${warmupCount} warm-up</span>
        ${skippedCount ? `<span class="chip warning">${skippedCount} omitidos</span>` : ""}
      </div>
      <p class="helper-line">
        ${nextExerciseId
          ? `Siguiente ejercicio sugerido: ${escapeHtml(routine.exercises.find((item) => item.id === nextExerciseId)?.name || "—")}.`
          : "No quedan ejercicios pendientes en esta sesión."}
      </p>
    </div>
    <div class="session-exercise-stack">
      ${routine.exercises.map((exercise) => buildExerciseCard(state, exercise, exercise.id === nextExerciseId || exercise.id === state.session.currentExerciseId)).join("")}
    </div>
  `;
}
