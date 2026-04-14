import { slugify, titleCase } from "./utils.js";

export const EXERCISE_CATALOG = [
  {
    id: "bench-press",
    name: "Press banca",
    aliases: ["press de banca", "banca", "bench press"],
    muscleGroup: "Pecho",
    pattern: "Empuje horizontal"
  },
  {
    id: "incline-bench-press",
    name: "Press banca inclinado",
    aliases: ["press inclinado", "incline bench press"],
    muscleGroup: "Pecho",
    pattern: "Empuje inclinado"
  },
  {
    id: "barbell-row",
    name: "Remo con barra",
    aliases: ["remo barra", "barbell row"],
    muscleGroup: "Espalda",
    pattern: "Tracción horizontal"
  },
  {
    id: "overhead-press",
    name: "Press militar",
    aliases: ["militar", "shoulder press", "overhead press"],
    muscleGroup: "Hombro",
    pattern: "Empuje vertical"
  },
  {
    id: "squat",
    name: "Sentadilla",
    aliases: ["back squat", "squat"],
    muscleGroup: "Pierna",
    pattern: "Dominante de rodilla"
  },
  {
    id: "deadlift",
    name: "Peso muerto",
    aliases: ["deadlift"],
    muscleGroup: "Cadena posterior",
    pattern: "Bisagra de cadera"
  },
  {
    id: "romanian-deadlift",
    name: "Peso muerto rumano",
    aliases: ["rumano", "rdl", "romanian deadlift"],
    muscleGroup: "Cadena posterior",
    pattern: "Bisagra de cadera"
  },
  {
    id: "leg-press",
    name: "Prensa",
    aliases: ["leg press", "prensa de pierna"],
    muscleGroup: "Pierna",
    pattern: "Dominante de rodilla"
  },
  {
    id: "weighted-pull-up",
    name: "Dominadas lastradas",
    aliases: ["dominada lastrada", "weighted pull up", "weighted pull-up"],
    muscleGroup: "Espalda",
    pattern: "Tracción vertical"
  },
  {
    id: "pull-up",
    name: "Dominadas",
    aliases: ["pull up", "pull-up"],
    muscleGroup: "Espalda",
    pattern: "Tracción vertical"
  },
  {
    id: "lat-pulldown",
    name: "Jalón al pecho",
    aliases: ["jalon al pecho", "lat pulldown", "jalón"],
    muscleGroup: "Espalda",
    pattern: "Tracción vertical"
  },
  {
    id: "dumbbell-press",
    name: "Press mancuernas",
    aliases: ["press con mancuernas", "db press", "dumbbell press"],
    muscleGroup: "Pecho",
    pattern: "Empuje horizontal"
  }
];

const EXERCISE_BY_SLUG = new Map();
for (const item of EXERCISE_CATALOG) {
  EXERCISE_BY_SLUG.set(slugify(item.name), item);
  item.aliases.forEach((alias) => EXERCISE_BY_SLUG.set(slugify(alias), item));
}

export function getExerciseMeta(rawName) {
  const cleaned = String(rawName ?? "").trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return {
      id: "",
      name: "",
      muscleGroup: "",
      pattern: "",
      isCatalogMatch: false,
      key: ""
    };
  }

  const match = EXERCISE_BY_SLUG.get(slugify(cleaned));
  if (match) {
    return {
      ...match,
      isCatalogMatch: true,
      key: match.id
    };
  }

  const normalizedName = titleCase(cleaned);
  return {
    id: `custom-${slugify(normalizedName)}`,
    name: normalizedName,
    muscleGroup: "",
    pattern: "",
    isCatalogMatch: false,
    key: slugify(normalizedName)
  };
}

export function normalizeWorkoutRecord(raw) {
  const meta = getExerciseMeta(raw.exercise || raw.exerciseName || raw.name || "");
  return {
    ...raw,
    exercise: meta.name,
    exerciseId: raw.exerciseId || meta.id,
    exerciseKey: raw.exerciseKey || meta.key,
    muscleGroup: raw.muscleGroup || meta.muscleGroup || "",
    movementPattern: raw.movementPattern || meta.pattern || ""
  };
}

export function normalizeRoutineExercise(raw) {
  const meta = getExerciseMeta(raw.name || "");
  return {
    ...raw,
    name: meta.name,
    catalogId: raw.catalogId || meta.id,
    exerciseKey: raw.exerciseKey || meta.key,
    muscleGroup: raw.muscleGroup || meta.muscleGroup || "",
    movementPattern: raw.movementPattern || meta.pattern || ""
  };
}

export function collectExerciseOptions({ workouts = [], routines = [] } = {}) {
  const merged = new Map();

  EXERCISE_CATALOG.forEach((item) => merged.set(item.id, { name: item.name, id: item.id, muscleGroup: item.muscleGroup }));

  workouts.forEach((item) => {
    const meta = getExerciseMeta(item.exercise || item.exerciseName);
    if (meta.name) merged.set(meta.id, { name: meta.name, id: meta.id, muscleGroup: meta.muscleGroup || item.muscleGroup || "" });
  });

  routines.forEach((routine) => {
    (routine.exercises || []).forEach((item) => {
      const meta = getExerciseMeta(item.name);
      if (meta.name) merged.set(meta.id, { name: meta.name, id: meta.id, muscleGroup: meta.muscleGroup || item.muscleGroup || "" });
    });
  });

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}
