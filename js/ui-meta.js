import {
  BODY_METRIC_LABELS,
  buildTrendItems,
  computeBestLiftMap,
  computeFirstLiftMap,
  computeGoalProgress
} from "./analytics.js";
import { cardHtml, emptyHtml } from "./ui-common.js";
import { formatNumber } from "./utils.js";

export function renderAnalytics(state, els) {
  renderVolumeSummary(state, els);
  renderTrendSummary(state, els);
}

function renderVolumeSummary(state, els) {
  const grouped = state.workouts
    .filter((item) => !item.isWarmup)
    .reduce((acc, item) => {
      const key = item.exerciseId || item.exerciseKey || item.exercise;
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});

  const volumeCards = Object.values(grouped)
    .map((logs) => {
      const totalVolume = logs.reduce((sum, item) => sum + Number(item.weight || 0) * Number(item.reps || 0) * Number(item.sets || 0), 0);
      const averageWeight = logs.reduce((sum, item) => sum + Number(item.weight || 0), 0) / Math.max(logs.length, 1);
      const last30Volume = logs.filter((item) => {
        const days = Math.round((new Date() - new Date(`${item.date}T12:00:00`)) / 86400000);
        return days <= 29;
      }).reduce((sum, item) => sum + Number(item.weight || 0) * Number(item.reps || 0) * Number(item.sets || 0), 0);
      return { exercise: logs[0].exercise, totalVolume, averageWeight, last30Volume, sessions: logs.length };
    })
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 8)
    .map((item) => cardHtml({
      title: item.exercise,
      subtitle: `Volumen total ${formatNumber(item.totalVolume)} kg · peso medio ${formatNumber(item.averageWeight)} kg`,
      chips: [
        { label: `Últimos 30 días ${formatNumber(item.last30Volume)} kg`, type: "ghost" },
        { label: `${item.sessions} registros`, type: "ghost" }
      ]
    }));

  els.volumeSummary.innerHTML = volumeCards.length ? volumeCards.join("") : emptyHtml("Sin datos de volumen todavía.");
}

function renderTrendSummary(state, els) {
  const trendItems = buildTrendItems(state);
  els.trendSummary.innerHTML = trendItems.length ? trendItems.map((item) => cardHtml(item)).join("") : emptyHtml("Sin tendencias suficientes todavía.");
}

export function renderGoalSummary(state, els) {
  const goals = state.goals;
  const latestMeasurement = [...state.measurements].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const oldestMeasurement = [...state.measurements].sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  const bestMap = computeBestLiftMap(state);
  const firstLiftMap = computeFirstLiftMap(state);

  const cards = [];

  if (goals.focusGoal) {
    cards.push(cardHtml({
      title: "Meta principal del bloque",
      subtitle: goals.focusGoal,
      chips: [
        { label: goals.athleteName || "Atleta", type: "ghost" },
        ...(goals.goalDate ? [{ label: `Fecha objetivo ${goals.goalDate}`, type: "ghost" }] : [])
      ]
    }));
  }

  if (goals.weightGoal) {
    cards.push(goalCard({
      label: "Peso",
      currentValue: latestMeasurement?.bodyWeight,
      targetValue: goals.weightGoal,
      baselineValue: oldestMeasurement?.bodyWeight,
      suffix: "kg"
    }));
  }

  if (goals.waistGoal) {
    cards.push(goalCard({
      label: "Cintura",
      currentValue: latestMeasurement?.waist,
      targetValue: goals.waistGoal,
      baselineValue: oldestMeasurement?.waist,
      suffix: "cm"
    }));
  }

  if (goals.bodyFatGoal) {
    cards.push(goalCard({
      label: "Grasa corporal",
      currentValue: latestMeasurement?.bodyFat,
      targetValue: goals.bodyFatGoal,
      baselineValue: oldestMeasurement?.bodyFat,
      suffix: "%"
    }));
  }

  if (goals.benchGoal) {
    cards.push(goalCard({
      label: "Press banca",
      currentValue: bestMap["bench-press"]?.value,
      targetValue: goals.benchGoal,
      baselineValue: firstLiftMap["bench-press"]?.value,
      suffix: "kg"
    }));
  }

  if (goals.squatGoal) {
    cards.push(goalCard({
      label: "Sentadilla",
      currentValue: bestMap["squat"]?.value,
      targetValue: goals.squatGoal,
      baselineValue: firstLiftMap["squat"]?.value,
      suffix: "kg"
    }));
  }

  if (goals.deadliftGoal) {
    cards.push(goalCard({
      label: "Peso muerto",
      currentValue: bestMap["deadlift"]?.value || bestMap["romanian-deadlift"]?.value,
      targetValue: goals.deadliftGoal,
      baselineValue: firstLiftMap["deadlift"]?.value || firstLiftMap["romanian-deadlift"]?.value,
      suffix: "kg"
    }));
  }

  els.goalSummary.innerHTML = cards.length ? cards.join("") : emptyHtml("Todavía no has definido objetivos.");
}

function goalCard({ label, currentValue, targetValue, baselineValue, suffix }) {
  const current = currentValue === "" || currentValue == null ? null : Number(currentValue);
  const target = Number(targetValue);
  const baseline = baselineValue === "" || baselineValue == null ? null : Number(baselineValue);
  const delta = current == null ? null : target - current;
  const progress = computeGoalProgress({ baseline, current, target });

  return `
    <article class="list-item">
      <div class="list-head">
        <div>
          <h3 class="list-title">${label}</h3>
          <p class="list-subtitle">${current == null ? `Objetivo ${formatNumber(target)} ${suffix}. Aún no hay valor actual.` : `Actual ${formatNumber(current)} ${suffix} · Objetivo ${formatNumber(target)} ${suffix}`}</p>
        </div>
        <span class="chip ${progress >= 100 ? "success" : progress >= 70 ? "warning" : "ghost"}">${formatNumber(progress)}%</span>
      </div>
      <div class="goal-progress">
        <div class="goal-progress-bar"><span style="width:${Math.min(progress, 100)}%"></span></div>
        <div class="goal-progress-meta">
          <span>${baseline == null ? "Sin referencia inicial" : `Inicio ${formatNumber(baseline)} ${suffix}`}</span>
          <span>${delta == null ? "Sin valor actual" : `${delta > 0 ? "Te faltan" : "Ya superado por"} ${formatNumber(Math.abs(delta))} ${suffix}`}</span>
        </div>
      </div>
    </article>
  `;
}

export function renderGoalForm(state, els) {
  Object.entries(state.goals).forEach(([key, value]) => {
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
      title: "Manifest e iconos",
      subtitle: pwaStatus.manifestPresent ? "Manifest enlazado y rutas de iconos resueltas." : "No se ha encontrado el manifest o faltan iconos.",
      chips: [{ label: pwaStatus.manifestPresent ? "OK" : "Revisar", type: pwaStatus.manifestPresent ? "success" : "danger" }]
    },
    {
      title: "Service worker",
      subtitle: !pwaStatus.swSupported
        ? "Este navegador no soporta service worker."
        : pwaStatus.registration
          ? (pwaStatus.controlled ? "Registrado y controlando esta pestaña." : "Registrado, pero aún no controla esta pestaña.")
          : "Aún no hay registro activo.",
      chips: [{ label: !pwaStatus.swSupported ? "No soportado" : pwaStatus.registration ? (pwaStatus.controlled ? "Activo" : "Registrado") : "Pendiente", type: !pwaStatus.swSupported ? "warning" : pwaStatus.registration ? (pwaStatus.controlled ? "success" : "warning") : "ghost" }]
    },
    {
      title: "Instalación",
      subtitle: pwaStatus.standalone
        ? "La app ya está abierta como instalada."
        : pwaStatus.ios
          ? "En iPhone usa Compartir > Añadir a pantalla de inicio."
          : pwaStatus.installAvailable
            ? "El navegador ya permite instalarla desde el botón."
            : "Falta abrirla en un navegador compatible servido por HTTP/HTTPS.",
      chips: [{ label: pwaStatus.standalone ? "Instalada" : pwaStatus.installAvailable ? "Lista para instalar" : "Pendiente", type: pwaStatus.standalone ? "success" : pwaStatus.installAvailable ? "warning" : "ghost" }]
    },
    {
      title: "Actualización",
      subtitle: pwaStatus.updateReady ? "Hay una versión nueva lista para aplicar cuando pulses actualizar." : "No se detectan actualizaciones pendientes.",
      chips: [{ label: pwaStatus.updateReady ? "Actualizar" : "Al día", type: pwaStatus.updateReady ? "warning" : "success" }]
    },
    {
      title: "Guardado",
      subtitle: storageStatus.mode === "indexeddb"
        ? "Persistencia principal en IndexedDB con respaldo local."
        : "Se ha activado el modo de respaldo local porque IndexedDB ha fallado o no está disponible.",
      chips: [{ label: storageStatus.mode === "indexeddb" ? "IndexedDB" : "Respaldo local", type: storageStatus.mode === "indexeddb" ? "success" : "warning" }]
    }
  ];

  els.pwaStatusBox.innerHTML = items.map((item) => cardHtml(item)).join("");
}
