"use client";

import { useSyncExternalStore } from "react";
import type { DateKey } from "./date";
import {
  DEFAULT_ROUTINE,
  newExerciseId,
  type DayKind,
  type RoutineDay,
  type UserExercise,
} from "./routine";

export type SetEntry = {
  weight: number | null;
  reps: number | null;
  done: boolean;
};

export type ExerciseLog = {
  exerciseId: string;
  /** Guardamos el nombre para que el historial sobreviva a cambios en la biblioteca */
  name: string;
  sets: SetEntry[];
};

export type WorkoutLog = {
  date: DateKey;
  kind: DayKind;
  exercises: ExerciseLog[];
  notes: string;
  /** Marcado manualmente como sesión completada */
  finished: boolean;
  bodyWeight: number | null;
};

export type Store = {
  logs: Record<DateKey, WorkoutLog>;
  /** Biblioteca de ejercicios registrados por el usuario */
  exercises: Record<string, UserExercise>;
  /** 7 posiciones, índice 0 = domingo */
  routine: RoutineDay[];
};

const KEY = "my-gym-stats:v1";

const EMPTY: Store = { logs: {}, exercises: {}, routine: DEFAULT_ROUTINE };

let cache: Store | null = null;
const listeners = new Set<() => void>();

/** Rellena campos que puedan faltar en datos guardados por versiones anteriores. */
function migrate(raw: Partial<Store> | null): Store {
  if (!raw || typeof raw !== "object") return EMPTY;
  const routine =
    Array.isArray(raw.routine) && raw.routine.length === 7
      ? raw.routine
      : DEFAULT_ROUTINE;
  return {
    logs: raw.logs ?? {},
    exercises: raw.exercises ?? {},
    routine,
  };
}

function read(): Store {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return migrate(JSON.parse(raw));
  } catch {
    return EMPTY;
  }
}

function emit(next: Store) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Cuota llena o almacenamiento bloqueado: el estado en memoria sigue siendo válido.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Sincroniza entre pestañas
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = read();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Store {
  if (cache === null) cache = read();
  return cache;
}

function getServerSnapshot(): Store {
  return EMPTY;
}

export function useStore(): Store {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// --- Registros de entrenamiento ----------------------------------------

export function saveLog(log: WorkoutLog) {
  const s = getSnapshot();
  emit({ ...s, logs: { ...s.logs, [log.date]: log } });
}

export function deleteLog(date: DateKey) {
  const s = getSnapshot();
  const logs = { ...s.logs };
  delete logs[date];
  emit({ ...s, logs });
}

export function replaceAll(store: Store) {
  emit(migrate(store));
}

// --- Biblioteca de ejercicios -------------------------------------------

export function createExercise(data: Omit<UserExercise, "id">): UserExercise {
  const s = getSnapshot();
  const exercise: UserExercise = { ...data, id: newExerciseId() };
  emit({ ...s, exercises: { ...s.exercises, [exercise.id]: exercise } });
  return exercise;
}

export function updateExercise(id: string, patch: Partial<UserExercise>) {
  const s = getSnapshot();
  const current = s.exercises[id];
  if (!current) return;
  emit({ ...s, exercises: { ...s.exercises, [id]: { ...current, ...patch } } });
}

/** Borra el ejercicio de la biblioteca y de la rutina. El historial se conserva. */
export function deleteExercise(id: string) {
  const s = getSnapshot();
  const exercises = { ...s.exercises };
  delete exercises[id];
  emit({
    ...s,
    exercises,
    routine: s.routine.map((d) => ({
      ...d,
      exerciseIds: d.exerciseIds.filter((x) => x !== id),
    })),
  });
}

export function exerciseList(store: Store): UserExercise[] {
  return Object.values(store.exercises).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

// --- Rutina semanal ------------------------------------------------------

export function updateRoutineDay(dow: number, patch: Partial<RoutineDay>) {
  const s = getSnapshot();
  const routine = s.routine.map((d, i) => (i === dow ? { ...d, ...patch } : d));
  emit({ ...s, routine });
}

export function addToRoutine(dow: number, exerciseId: string) {
  const s = getSnapshot();
  const day = s.routine[dow];
  if (day.exerciseIds.includes(exerciseId)) return;
  updateRoutineDay(dow, { exerciseIds: [...day.exerciseIds, exerciseId] });
}

export function removeFromRoutine(dow: number, exerciseId: string) {
  const s = getSnapshot();
  updateRoutineDay(dow, {
    exerciseIds: s.routine[dow].exerciseIds.filter((x) => x !== exerciseId),
  });
}

export function moveInRoutine(dow: number, from: number, to: number) {
  const s = getSnapshot();
  const ids = [...s.routine[dow].exerciseIds];
  if (to < 0 || to >= ids.length) return;
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved);
  updateRoutineDay(dow, { exerciseIds: ids });
}

// --- Cálculos derivados -------------------------------------------------

export function setVolume(s: SetEntry): number {
  if (!s.done || s.weight == null || s.reps == null) return 0;
  return s.weight * s.reps;
}

export function logVolume(log: WorkoutLog): number {
  return log.exercises.reduce(
    (acc, ex) => acc + ex.sets.reduce((a, s) => a + setVolume(s), 0),
    0,
  );
}

export function completedSets(log: WorkoutLog): number {
  return log.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.done).length,
    0,
  );
}

/** ¿Hay algo registrado en este día? */
export function hasActivity(log: WorkoutLog | undefined): boolean {
  if (!log) return false;
  return log.finished || completedSets(log) > 0;
}

export function bestSet(ex: ExerciseLog): SetEntry | null {
  let best: SetEntry | null = null;
  for (const s of ex.sets) {
    if (!s.done || s.weight == null) continue;
    if (!best || s.weight > best.weight!) best = s;
  }
  return best;
}

export type ExerciseHistoryPoint = {
  date: DateKey;
  topWeight: number;
  reps: number | null;
  volume: number;
};

/** Historial cronológico de un ejercicio: mejor serie por sesión. */
export function exerciseHistory(
  store: Store,
  exerciseId: string,
): ExerciseHistoryPoint[] {
  const points: ExerciseHistoryPoint[] = [];
  for (const date of Object.keys(store.logs).sort()) {
    const log = store.logs[date];
    const ex = log.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const best = bestSet(ex);
    if (!best || best.weight == null) continue;
    points.push({
      date,
      topWeight: best.weight,
      reps: best.reps,
      volume: ex.sets.reduce((a, s) => a + setVolume(s), 0),
    });
  }
  return points;
}

/** Ejercicios que ya tienen al menos una serie registrada. */
export function loggedExercises(store: Store): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const log of Object.values(store.logs)) {
    for (const ex of log.exercises) {
      if (ex.sets.some((s) => s.done && s.weight != null)) {
        seen.set(ex.exerciseId, ex.name);
      }
    }
  }
  return [...seen]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Última sesión anterior a `before` que incluya el ejercicio. */
export function lastPerformance(
  store: Store,
  exerciseId: string,
  before: DateKey,
): { date: DateKey; set: SetEntry } | null {
  const dates = Object.keys(store.logs)
    .filter((d) => d < before)
    .sort()
    .reverse();
  for (const date of dates) {
    const ex = store.logs[date].exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const best = bestSet(ex);
    if (best) return { date, set: best };
  }
  return null;
}
