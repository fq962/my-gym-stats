"use client";

import { useState } from "react";
import {
  DAY_KINDS,
  DAY_STYLES,
  WEEKDAY_NAMES,
  WEEK_ORDER,
  type DayKind,
  type UserExercise,
} from "@/lib/routine";
import {
  addToRoutine,
  createExercise,
  deleteExercise,
  exerciseList,
  moveInRoutine,
  removeFromRoutine,
  updateExercise,
  updateRoutineDay,
  useStore,
} from "@/lib/store";
import { ExerciseForm, ExercisePicker } from "@/components/exercise-picker";

export default function RoutinePage() {
  const store = useStore();
  const [openDay, setOpenDay] = useState<number | null>(null);
  const library = exerciseList(store);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[17px] font-semibold">Rutina</h1>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Mi semana
        </p>
        {WEEK_ORDER.map((dow) => (
          <DayCard
            key={dow}
            dow={dow}
            open={openDay === dow}
            onToggle={() => setOpenDay(openDay === dow ? null : dow)}
          />
        ))}
      </section>

      <LibrarySection library={library} />
    </div>
  );
}

function DayCard({
  dow,
  open,
  onToggle,
}: {
  dow: number;
  open: boolean;
  onToggle: () => void;
}) {
  const store = useStore();
  const day = store.routine[dow];
  const style = DAY_STYLES[day.kind];
  const [picking, setPicking] = useState(false);

  const exercises = day.exerciseIds
    .map((id) => store.exercises[id])
    .filter((e): e is UserExercise => Boolean(e));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2"
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
        <span className="w-20 shrink-0 text-sm font-semibold">
          {WEEKDAY_NAMES[dow]}
        </span>
        <span className={`min-w-0 flex-1 truncate text-sm ${style.text}`}>
          {day.label}
        </span>
        <span className="shrink-0 font-mono text-xs text-muted">
          {exercises.length}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${
            open ? "rotate-90" : ""
          }`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4">
          <label className="block text-[11px] font-medium text-muted">
            Nombre del día
          </label>
          <input
            value={day.label}
            onChange={(e) => updateRoutineDay(dow, { label: e.target.value })}
            className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[15px] outline-none focus:border-accent"
          />

          <p className="mt-3 text-[11px] font-medium text-muted">Tipo</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {DAY_KINDS.map((k) => {
              const active = day.kind === k.value;
              const s = DAY_STYLES[k.value];
              return (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => updateRoutineDay(dow, { kind: k.value as DayKind })}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    active ? `${s.border} ${s.bg} ${s.text}` : "border-border bg-surface-2 text-muted"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {k.label}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-[11px] font-medium text-muted">Ejercicios</p>
          {exercises.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Ninguno todavía. Añade los que hagas este día.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y divide-border">
              {exercises.map((ex, i) => (
                <li key={ex.id} className="flex items-center gap-1 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{ex.name}</span>
                    <span className="block font-mono text-[11px] text-muted">
                      {ex.targetSets}×{ex.targetReps}
                      {ex.group ? ` · ${ex.group}` : ""}
                    </span>
                  </span>
                  <IconBtn
                    label="Subir"
                    disabled={i === 0}
                    onClick={() => moveInRoutine(dow, i, i - 1)}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 15l6-6 6 6" />
                  </IconBtn>
                  <IconBtn
                    label="Bajar"
                    disabled={i === exercises.length - 1}
                    onClick={() => moveInRoutine(dow, i, i + 1)}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                  </IconBtn>
                  <IconBtn
                    label={`Quitar ${ex.name}`}
                    onClick={() => removeFromRoutine(dow, ex.id)}
                  >
                    <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                  </IconBtn>
                </li>
              ))}
            </ul>
          )}

          {picking ? (
            <div className="mt-3">
              <ExercisePicker
                exclude={day.exerciseIds}
                title={`Añadir a ${WEEKDAY_NAMES[dow].toLowerCase()}`}
                onClose={() => setPicking(false)}
                onPick={(ex) => {
                  addToRoutine(dow, ex.id);
                  setPicking(false);
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="mt-3 w-full rounded-xl border border-dashed border-border py-2.5 text-sm font-semibold text-muted active:bg-surface-2"
            >
              + Añadir ejercicio
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted disabled:opacity-25 active:bg-surface-2"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        {children}
      </svg>
    </button>
  );
}

function LibrarySection({ library }: { library: UserExercise[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Mis ejercicios
      </p>

      {library.length === 0 && !creating && (
        <p className="mt-2 text-sm text-muted">
          Aún no registras ninguno. Crea los ejercicios que haces y luego
          asígnalos a los días de la semana.
        </p>
      )}

      {library.length > 0 && (
        <ul className="mt-2 flex flex-col divide-y divide-border">
          {library.map((ex) =>
            editing === ex.id ? (
              <li key={ex.id} className="py-2">
                <ExerciseForm
                  initial={ex}
                  submitLabel="Guardar cambios"
                  onCancel={() => setEditing(null)}
                  onSubmit={(data) => {
                    updateExercise(ex.id, data);
                    setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li key={ex.id} className="flex items-center gap-1 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{ex.name}</span>
                  <span className="block font-mono text-[11px] text-muted">
                    {ex.targetSets}×{ex.targetReps}
                    {ex.group ? ` · ${ex.group}` : ""}
                  </span>
                </span>
                <IconBtn label={`Editar ${ex.name}`} onClick={() => setEditing(ex.id)}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 20h4L19 9l-4-4L4 16v4zM14.5 5.5l4 4"
                  />
                </IconBtn>
                <IconBtn
                  label={`Borrar ${ex.name}`}
                  onClick={() => {
                    if (
                      confirm(
                        `¿Borrar "${ex.name}"? Se quitará de tu rutina; el historial ya registrado se conserva.`,
                      )
                    )
                      deleteExercise(ex.id);
                  }}
                >
                  <path
                    strokeLinecap="round"
                    d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v6M14 11v6"
                  />
                </IconBtn>
              </li>
            ),
          )}
        </ul>
      )}

      {creating ? (
        <ExerciseForm
          submitLabel="Crear ejercicio"
          onCancel={() => setCreating(false)}
          onSubmit={(data) => {
            createExercise(data);
            setCreating(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-black"
        >
          + Nuevo ejercicio
        </button>
      )}
    </section>
  );
}
