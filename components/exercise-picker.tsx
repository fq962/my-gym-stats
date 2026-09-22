"use client";

import { useState } from "react";
import type { UserExercise } from "@/lib/routine";
import { createExercise, exerciseList, useStore } from "@/lib/store";

/**
 * Selector de ejercicios de la biblioteca del usuario, con creación en línea.
 * Si la biblioteca está vacía, muestra directamente el formulario.
 */
export function ExercisePicker({
  exclude = [],
  onPick,
  onClose,
  title = "Añadir ejercicio",
}: {
  exclude?: string[];
  onPick: (exercise: UserExercise) => void;
  onClose: () => void;
  title?: string;
}) {
  const store = useStore();
  const all = exerciseList(store);
  const available = all.filter((e) => !exclude.includes(e.id));
  const [creating, setCreating] = useState(all.length === 0);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-muted"
        >
          Cerrar
        </button>
      </div>

      {!creating && (
        <>
          {available.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {available.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onPick(e)}
                  className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium active:bg-border"
                >
                  {e.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Ya añadiste todos tus ejercicios aquí.
            </p>
          )}

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-4 w-full rounded-xl border border-dashed border-border py-2.5 text-sm font-semibold text-muted active:bg-surface-2"
          >
            + Crear ejercicio nuevo
          </button>
        </>
      )}

      {creating && (
        <ExerciseForm
          onCancel={() => (all.length === 0 ? onClose() : setCreating(false))}
          onSubmit={(data) => {
            onPick(createExercise(data));
            setCreating(false);
          }}
          submitLabel="Crear y añadir"
        />
      )}
    </section>
  );
}

export function ExerciseForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Guardar",
}: {
  initial?: Partial<UserExercise>;
  onSubmit: (data: Omit<UserExercise, "id">) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [group, setGroup] = useState(initial?.group ?? "");
  const [targetSets, setTargetSets] = useState(String(initial?.targetSets ?? 4));
  const [targetReps, setTargetReps] = useState(initial?.targetReps ?? "8-12");

  const valid = name.trim().length > 0;

  function submit() {
    if (!valid) return;
    onSubmit({
      name: name.trim(),
      group: group.trim(),
      targetSets: Math.max(1, Number(targetSets) || 1),
      targetReps: targetReps.trim() || "8-12",
    });
    setName("");
    setGroup("");
  }

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <Field label="Nombre">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Press de banca"
          className={inputClass}
        />
      </Field>

      <Field label="Grupo muscular (opcional)">
        <input
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder="Pecho"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Series objetivo">
          <input
            type="number"
            inputMode="numeric"
            value={targetSets}
            onChange={(e) => setTargetSets(e.target.value)}
            className={`${inputClass} text-center font-mono tabular-nums`}
          />
        </Field>
        <Field label="Reps objetivo">
          <input
            value={targetReps}
            onChange={(e) => setTargetReps(e.target.value)}
            placeholder="8-12"
            className={`${inputClass} text-center font-mono`}
          />
        </Field>
      </div>

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border bg-surface-2 py-2.5 text-sm font-semibold text-muted active:bg-border"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={submit}
          className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-black disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[15px] outline-none placeholder:text-muted/50 focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
