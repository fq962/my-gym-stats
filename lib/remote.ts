import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateKey } from "./date";
import { DEFAULT_ROUTINE, type DayKind, type RoutineDay, type UserExercise } from "./routine";
import type { ExerciseLog, SetEntry, Store, WorkoutLog } from "./store";
import { uuid } from "./uuid";

/** Estado que acompaña a la sesión de sincronización. */
export type Remote = {
  userId: string;
  /** fecha -> id de workout_logs */
  logIds: Map<DateKey, string>;
  /** ids de ejercicios que existen en la tabla (activos o archivados) */
  knownExercises: Set<string>;
};

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

async function selectAll<T>(
  sb: SupabaseClient,
  table: string,
  userId: string,
  orderBy: string,
): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const rows = check(
      await sb
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .order(orderBy)
        .range(from, from + size - 1),
    ) as T[];
    out.push(...rows);
    if (rows.length < size) return out;
  }
}

// --- Lectura -----------------------------------------------------------

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string;
  target_sets: number;
  target_reps: string;
  archived_at: string | null;
};
type DayRow = { dow: number; kind: DayKind; label: string };
type DayExerciseRow = { dow: number; exercise_id: string; position: number };
type LogRow = {
  id: string;
  date: string;
  kind: DayKind;
  notes: string;
  finished: boolean;
  body_weight: number | string | null;
};
type LogExerciseRow = {
  id: string;
  workout_id: string;
  exercise_id: string | null;
  name: string;
  position: number;
};
type SetRow = {
  workout_exercise_id: string;
  position: number;
  weight: number | string | null;
  reps: number | null;
  done: boolean;
};

const num = (v: number | string | null): number | null => (v == null ? null : Number(v));

export async function fetchRemote(
  sb: SupabaseClient,
  userId: string,
): Promise<{ store: Store; remote: Remote; empty: boolean }> {
  const [exRows, dayRows, dayExRows, logRows, logExRows, setRows] = await Promise.all([
    selectAll<ExerciseRow>(sb, "exercises", userId, "id"),
    selectAll<DayRow>(sb, "routine_days", userId, "dow"),
    selectAll<DayExerciseRow>(sb, "routine_day_exercises", userId, "exercise_id"),
    selectAll<LogRow>(sb, "workout_logs", userId, "id"),
    selectAll<LogExerciseRow>(sb, "workout_exercises", userId, "id"),
    selectAll<SetRow>(sb, "workout_sets", userId, "id"),
  ]);

  const exercises: Store["exercises"] = {};
  const knownExercises = new Set<string>();
  for (const r of exRows) {
    knownExercises.add(r.id);
    if (r.archived_at) continue;
    exercises[r.id] = {
      id: r.id,
      name: r.name,
      group: r.muscle_group,
      targetSets: r.target_sets,
      targetReps: r.target_reps,
    };
  }

  const routine: RoutineDay[] = DEFAULT_ROUTINE.map((d) => ({ ...d, exerciseIds: [] }));
  for (const r of dayRows) {
    if (r.dow >= 0 && r.dow < 7) routine[r.dow] = { kind: r.kind, label: r.label, exerciseIds: [] };
  }
  for (const r of [...dayExRows].sort((a, b) => a.position - b.position)) {
    if (exercises[r.exercise_id]) routine[r.dow]?.exerciseIds.push(r.exercise_id);
  }

  const setsByExercise = new Map<string, SetRow[]>();
  for (const s of setRows) {
    const list = setsByExercise.get(s.workout_exercise_id) ?? [];
    list.push(s);
    setsByExercise.set(s.workout_exercise_id, list);
  }
  const exercisesByLog = new Map<string, LogExerciseRow[]>();
  for (const e of logExRows) {
    const list = exercisesByLog.get(e.workout_id) ?? [];
    list.push(e);
    exercisesByLog.set(e.workout_id, list);
  }

  const logs: Store["logs"] = {};
  const logIds = new Map<DateKey, string>();
  for (const l of logRows) {
    logIds.set(l.date, l.id);
    logs[l.date] = {
      date: l.date,
      kind: l.kind,
      notes: l.notes,
      finished: l.finished,
      bodyWeight: num(l.body_weight),
      exercises: (exercisesByLog.get(l.id) ?? [])
        .sort((a, b) => a.position - b.position)
        .map<ExerciseLog>((e) => ({
          // Si el ejercicio fue borrado de la biblioteca, usamos la fila como id estable.
          exerciseId: e.exercise_id ?? e.id,
          name: e.name,
          sets: (setsByExercise.get(e.id) ?? [])
            .sort((a, b) => a.position - b.position)
            .map<SetEntry>((s) => ({ weight: num(s.weight), reps: s.reps, done: s.done })),
        })),
    };
  }

  const empty =
    Object.keys(exercises).length === 0 &&
    logRows.length === 0 &&
    dayExRows.length === 0;

  return { store: { logs, exercises, routine }, remote: { userId, logIds, knownExercises }, empty };
}

// --- Escritura ---------------------------------------------------------

const sameExercise = (a: UserExercise, b: UserExercise) =>
  a.name === b.name &&
  a.group === b.group &&
  a.targetSets === b.targetSets &&
  a.targetReps === b.targetReps;

/** Sube a Supabase solo lo que cambió entre `prev` (lo ya sincronizado) y `next`. */
export async function pushDiff(
  sb: SupabaseClient,
  remote: Remote,
  prev: Store,
  next: Store,
): Promise<void> {
  const { userId } = remote;
  const now = new Date().toISOString();

  // 1. Ejercicios (antes que rutina y registros por las llaves foráneas).
  const upserts = Object.values(next.exercises).filter((e) => {
    const old = prev.exercises[e.id];
    return !old || !sameExercise(old, e);
  });
  if (upserts.length) {
    check(
      await sb.from("exercises").upsert(
        upserts.map((e) => ({
          id: e.id,
          user_id: userId,
          name: e.name,
          muscle_group: e.group,
          target_sets: e.targetSets,
          target_reps: e.targetReps,
          archived_at: null,
          updated_at: now,
        })),
      ),
    );
    upserts.forEach((e) => remote.knownExercises.add(e.id));
  }
  // Borrado suave: el historial sigue apuntando al ejercicio.
  const removed = Object.keys(prev.exercises).filter((id) => !next.exercises[id]);
  if (removed.length) {
    check(
      await sb
        .from("exercises")
        .update({ archived_at: now, updated_at: now })
        .eq("user_id", userId)
        .in("id", removed),
    );
  }

  // 2. Rutina semanal.
  for (let dow = 0; dow < 7; dow++) {
    const before = prev.routine[dow];
    const day = next.routine[dow];
    if (before === day) continue;
    check(
      await sb
        .from("routine_days")
        .upsert({ user_id: userId, dow, kind: day.kind, label: day.label, updated_at: now }),
    );
    const sameIds =
      before &&
      before.exerciseIds.length === day.exerciseIds.length &&
      before.exerciseIds.every((id, i) => id === day.exerciseIds[i]);
    if (sameIds) continue;
    check(
      await sb.from("routine_day_exercises").delete().eq("user_id", userId).eq("dow", dow),
    );
    if (day.exerciseIds.length) {
      check(
        await sb.from("routine_day_exercises").insert(
          day.exerciseIds.map((exercise_id, position) => ({
            user_id: userId,
            dow,
            exercise_id,
            position,
          })),
        ),
      );
    }
  }

  // 3. Registros de entrenamiento.
  for (const date of Object.keys(prev.logs)) {
    if (next.logs[date]) continue;
    const id = remote.logIds.get(date);
    if (!id) continue;
    await clearLogChildren(sb, id);
    check(await sb.from("workout_logs").delete().eq("id", id));
    remote.logIds.delete(date);
  }
  for (const [date, log] of Object.entries(next.logs)) {
    if (prev.logs[date] === log) continue;
    await writeLog(sb, remote, log, now);
  }
}

async function clearLogChildren(sb: SupabaseClient, logId: string) {
  const rows = check(
    await sb.from("workout_exercises").select("id").eq("workout_id", logId),
  ) as { id: string }[];
  if (rows.length) {
    check(
      await sb.from("workout_sets").delete().in("workout_exercise_id", rows.map((r) => r.id)),
    );
  }
  check(await sb.from("workout_exercises").delete().eq("workout_id", logId));
}

async function writeLog(sb: SupabaseClient, remote: Remote, log: WorkoutLog, now: string) {
  const fields = {
    kind: log.kind,
    notes: log.notes,
    finished: log.finished,
    body_weight: log.bodyWeight,
    updated_at: now,
  };
  let id = remote.logIds.get(log.date);
  if (id) {
    check(await sb.from("workout_logs").update(fields).eq("id", id));
    await clearLogChildren(sb, id);
  } else {
    id = uuid();
    check(
      await sb
        .from("workout_logs")
        .insert({ id, user_id: remote.userId, date: log.date, ...fields }),
    );
    remote.logIds.set(log.date, id);
  }

  const exRows = log.exercises.map((e, position) => ({
    id: uuid(),
    workout_id: id,
    user_id: remote.userId,
    // Solo referenciamos ejercicios que existen en la tabla.
    exercise_id: remote.knownExercises.has(e.exerciseId) ? e.exerciseId : null,
    name: e.name,
    position,
  }));
  if (!exRows.length) return;
  check(await sb.from("workout_exercises").insert(exRows));

  const setRows = log.exercises.flatMap((e, i) =>
    e.sets.map((s, position) => ({
      workout_exercise_id: exRows[i].id,
      user_id: remote.userId,
      position,
      weight: s.weight,
      reps: s.reps,
      done: s.done,
    })),
  );
  if (setRows.length) check(await sb.from("workout_sets").insert(setRows));
}
