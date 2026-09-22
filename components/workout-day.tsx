"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DAY_STYLES,
  WEEKDAY_NAMES,
  type RoutineDay,
  type UserExercise,
} from "@/lib/routine";
import { addDays, fromKey, formatLong, type DateKey } from "@/lib/date";
import { useToday } from "@/lib/use-today";
import {
  addToRoutine,
  completedSets,
  deleteLog,
  lastPerformance,
  logVolume,
  saveLog,
  useStore,
  type ExerciseLog,
  type SetEntry,
  type Store,
  type WorkoutLog,
} from "@/lib/store";
import { ExercisePicker } from "@/components/exercise-picker";

function emptySet(): SetEntry {
  return { weight: null, reps: null, done: false };
}

function draftExercise(ex: UserExercise): ExerciseLog {
  return {
    exerciseId: ex.id,
    name: ex.name,
    sets: Array.from({ length: Math.max(1, ex.targetSets) }, emptySet),
  };
}

/** Sesión inicial a partir de la rutina configurada para ese día de la semana. */
function draftLog(date: DateKey, store: Store, routine: RoutineDay): WorkoutLog {
  return {
    date,
    kind: routine.kind,
    exercises: routine.exerciseIds
      .map((id) => store.exercises[id])
      .filter((e): e is UserExercise => Boolean(e))
      .map(draftExercise),
    notes: "",
    finished: false,
    bodyWeight: null,
  };
}

export function WorkoutDay({ date }: { date: DateKey }) {
  const store = useStore();
  const today = useToday();
  const dow = fromKey(date).getDay();
  const routine = store.routine[dow];
  const stored = store.logs[date];
  const log = stored ?? draftLog(date, store, routine);
  const isToday = date === today;
  const style = DAY_STYLES[log.kind];

  const [picking, setPicking] = useState(false);

  const volume = logVolume(log);
  const sets = completedSets(log);

  function update(next: Partial<WorkoutLog>) {
    saveLog({ ...log, ...next });
  }

  function updateExerciseAt(index: number, next: ExerciseLog) {
    const exercises = [...log.exercises];
    exercises[index] = next;
    update({ exercises });
  }

  const isRest = routine.kind === "descanso";
  const showRest = isRest && !stored && log.exercises.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <DateHeader date={date} isToday={isToday} />

      <div className={`rounded-2xl border ${style.border} ${style.bg} px-4 py-3.5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-lg font-semibold ${style.text}`}>{routine.label}</p>
            <p className="mt-0.5 text-sm text-muted">
              {log.exercises.length > 0
                ? `${log.exercises.length} ${
                    log.exercises.length === 1 ? "ejercicio" : "ejercicios"
                  } · ${sets} ${sets === 1 ? "serie hecha" : "series hechas"}`
                : "Sin ejercicios registrados"}
            </p>
          </div>
          {volume > 0 && (
            <div className="shrink-0 text-right">
              <p className="font-mono text-lg font-semibold tabular-nums">
                {Math.round(volume).toLocaleString("es")}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted">kg vol.</p>
            </div>
          )}
        </div>
      </div>

      {showRest ? (
        <RestDay onStart={() => saveLog(draftLog(date, store, routine))} />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {log.exercises.map((ex, i) => (
              <ExerciseCard
                key={`${ex.exerciseId}-${i}`}
                exercise={ex}
                date={date}
                store={store}
                onChange={(next) => updateExerciseAt(i, next)}
                onRemove={() =>
                  update({ exercises: log.exercises.filter((_, j) => j !== i) })
                }
              />
            ))}
          </div>

          {log.exercises.length === 0 && !picking && (
            <EmptyDay dow={dow} onAdd={() => setPicking(true)} />
          )}

          {picking ? (
            <ExercisePicker
              exclude={log.exercises.map((e) => e.exerciseId)}
              onClose={() => setPicking(false)}
              onPick={(ex) => {
                update({ exercises: [...log.exercises, draftExercise(ex)] });
                // Si aún no está en la rutina de este día, lo dejamos fijo para
                // los próximos; se puede quitar desde la pestaña Rutina.
                addToRoutine(dow, ex.id);
                setPicking(false);
              }}
            />
          ) : (
            log.exercises.length > 0 && (
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="rounded-2xl border border-dashed border-border py-3.5 text-sm font-semibold text-muted active:bg-surface"
              >
                + Añadir ejercicio
              </button>
            )
          )}
        </>
      )}

      <section className="rounded-2xl border border-border bg-surface p-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
          Peso corporal
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            placeholder="—"
            value={log.bodyWeight ?? ""}
            onChange={(e) =>
              update({
                bodyWeight: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="w-28 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-center font-mono text-base tabular-nums outline-none focus:border-accent"
          />
          <span className="text-sm text-muted">kg</span>
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
          Notas
        </label>
        <textarea
          rows={3}
          placeholder="Cómo te sentiste, molestias, energía…"
          value={log.notes}
          onChange={(e) => update({ notes: e.target.value })}
          className="mt-2 w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[15px] outline-none placeholder:text-muted/60 focus:border-accent"
        />
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => update({ finished: !log.finished })}
          className={`flex-1 rounded-xl px-4 py-3.5 text-[15px] font-semibold transition-colors ${
            log.finished
              ? "bg-accent text-black"
              : "border border-border bg-surface text-text active:bg-surface-2"
          }`}
        >
          {log.finished ? "✓ Entrenamiento completado" : "Marcar como completado"}
        </button>
        {stored && (
          <button
            type="button"
            onClick={() => {
              if (confirm("¿Borrar todo el registro de este día?")) deleteLog(date);
            }}
            aria-label="Borrar registro del día"
            className="rounded-xl border border-border bg-surface px-4 text-muted active:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function DateHeader({ date, isToday }: { date: DateKey; isToday: boolean }) {
  return (
    <header className="flex items-center justify-between gap-2">
      <Link
        href={`/dia/${addDays(date, -1)}`}
        aria-label="Día anterior"
        className="rounded-full border border-border bg-surface p-2 text-muted active:bg-surface-2"
      >
        <Chevron className="h-5 w-5 rotate-180" />
      </Link>

      <div className="min-w-0 text-center">
        <p className="truncate text-[15px] font-semibold capitalize">
          {isToday ? "Hoy" : formatLong(date)}
        </p>
        <p className="text-xs capitalize text-muted">
          {isToday ? formatLong(date) : date.split("-").reverse().join("/")}
        </p>
      </div>

      <Link
        href={`/dia/${addDays(date, 1)}`}
        aria-label="Día siguiente"
        className="rounded-full border border-border bg-surface p-2 text-muted active:bg-surface-2"
      >
        <Chevron className="h-5 w-5" />
      </Link>
    </header>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function EmptyDay({ dow, onAdd }: { dow: number; onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
      <p className="text-[15px] font-medium">
        Sin ejercicios para los {WEEKDAY_NAMES[dow].toLowerCase()}
      </p>
      <p className="mt-1 text-sm text-muted">
        Añádelos aquí o configúralos en la pestaña Rutina.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black"
        >
          Añadir ejercicio
        </button>
        <Link
          href="/rutina"
          className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold active:bg-border"
        >
          Ir a Rutina
        </Link>
      </div>
    </div>
  );
}

function RestDay({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-8 text-center">
      <p className="text-3xl">😴</p>
      <p className="mt-3 text-[15px] font-medium">Toca descansar</p>
      <p className="mt-1 text-sm text-muted">
        La recuperación también es parte de la rutina.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-5 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold active:bg-border"
      >
        Registrar entrenamiento igual
      </button>
    </div>
  );
}

function ExerciseCard({
  exercise,
  date,
  store,
  onChange,
  onRemove,
}: {
  exercise: ExerciseLog;
  date: DateKey;
  store: Store;
  onChange: (next: ExerciseLog) => void;
  onRemove: () => void;
}) {
  const meta = store.exercises[exercise.exerciseId];
  const last = useMemo(
    () => lastPerformance(store, exercise.exerciseId, date),
    [store, exercise.exerciseId, date],
  );

  function setAt(i: number, patch: Partial<SetEntry>) {
    const sets = [...exercise.sets];
    sets[i] = { ...sets[i], ...patch };
    onChange({ ...exercise, sets });
  }

  const doneCount = exercise.sets.filter((s) => s.done).length;
  const subtitle = [
    meta?.group,
    meta ? `objetivo ${meta.targetSets}×${meta.targetReps}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-snug">{exercise.name}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {subtitle}
            {subtitle && last ? " · " : ""}
            {last && (
              <span className="text-accent">
                última: {last.set.weight}kg×{last.set.reps ?? "?"}
              </span>
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 font-mono text-[11px] tabular-nums text-muted">
          {doneCount}/{exercise.sets.length}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 px-2 pb-2">
        <div className="grid grid-cols-[1.75rem_1fr_1fr_2.5rem] items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
          <span>#</span>
          <span>Kg</span>
          <span>Reps</span>
          <span />
        </div>

        {exercise.sets.map((s, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1.75rem_1fr_1fr_2.5rem] items-center gap-2 rounded-xl px-2 py-1.5 transition-colors ${
              s.done ? "bg-accent/10" : ""
            }`}
          >
            <span className="text-center font-mono text-xs text-muted">{i + 1}</span>
            <NumField
              value={s.weight}
              placeholder={last?.set.weight != null ? String(last.set.weight) : "0"}
              onChange={(v) => setAt(i, { weight: v })}
            />
            <NumField
              value={s.reps}
              placeholder={last?.set.reps != null ? String(last.set.reps) : "0"}
              onChange={(v) => setAt(i, { reps: v })}
            />
            <button
              type="button"
              aria-label={s.done ? `Desmarcar serie ${i + 1}` : `Marcar serie ${i + 1}`}
              aria-pressed={s.done}
              onClick={() => setAt(i, { done: !s.done })}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                s.done
                  ? "border-accent bg-accent text-black"
                  : "border-border bg-surface-2 text-muted"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex border-t border-border text-xs font-semibold text-muted">
        <button
          type="button"
          onClick={() => onChange({ ...exercise, sets: [...exercise.sets, emptySet()] })}
          className="flex-1 py-2.5 active:bg-surface-2"
        >
          + Serie
        </button>
        <button
          type="button"
          disabled={exercise.sets.length === 0}
          onClick={() => onChange({ ...exercise, sets: exercise.sets.slice(0, -1) })}
          className="flex-1 border-l border-border py-2.5 disabled:opacity-40 active:bg-surface-2"
        >
          − Serie
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex-1 border-l border-border py-2.5 active:bg-surface-2"
        >
          Quitar
        </button>
      </div>
    </section>
  );
}

function NumField({
  value,
  placeholder,
  onChange,
}: {
  value: number | null;
  placeholder: string;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      onFocus={(e) => e.currentTarget.select()}
      className="w-full rounded-xl border border-border bg-surface-2 px-2 py-2 text-center font-mono text-[15px] tabular-nums outline-none placeholder:text-muted/40 focus:border-accent"
    />
  );
}
