"use client";

import { useMemo, useState } from "react";
import { addDays, fromKey, startOfWeek, todayKey, type DateKey } from "@/lib/date";
import {
  completedSets,
  exerciseHistory,
  hasActivity,
  loggedExercises,
  logVolume,
  replaceAll,
  useStore,
  type Store,
} from "@/lib/store";
import { useToday } from "@/lib/use-today";

export default function ProgressPage() {
  const store = useStore();
  const today = useToday();

  const exercises = useMemo(() => loggedExercises(store), [store]);
  const [selected, setSelected] = useState<string | null>(null);
  const exerciseId = selected ?? exercises[0]?.id ?? null;

  const sessions = Object.values(store.logs).filter(hasActivity);
  const totalVolume = sessions.reduce((a, l) => a + logVolume(l), 0);
  const totalSets = sessions.reduce((a, l) => a + completedSets(l), 0);

  const weeks = useMemo(() => {
    if (!today) return [];
    const thisMonday = startOfWeek(today);
    return Array.from({ length: 8 }, (_, i) => {
      const start = addDays(thisMonday, (i - 7) * 7);
      const end = addDays(start, 7);
      const logs = Object.entries(store.logs).filter(
        ([d, l]) => d >= start && d < end && hasActivity(l),
      );
      return {
        start,
        volume: logs.reduce((a, [, l]) => a + logVolume(l), 0),
        sessions: logs.length,
      };
    });
  }, [store, today]);

  const history = useMemo(
    () => (exerciseId ? exerciseHistory(store, exerciseId) : []),
    [store, exerciseId],
  );

  const streak = useMemo(() => {
    if (!today) return 0;
    let count = 0;
    let cursor = today;
    // Cuenta días hacia atrás; los días de descanso no rompen la racha.
    for (let i = 0; i < 400; i++) {
      const log = store.logs[cursor];
      const dow = fromKey(cursor).getDay();
      const isRest = dow === 0 || dow === 3 || dow === 6;
      if (hasActivity(log)) count++;
      else if (!isRest && cursor !== today) break;
      cursor = addDays(cursor, -1);
    }
    return count;
  }, [store, today]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[17px] font-semibold">Progreso</h1>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Entrenamientos" value={String(sessions.length)} />
        <Stat label="Series totales" value={String(totalSets)} />
        <Stat
          label="Volumen total"
          value={`${(totalVolume / 1000).toFixed(1)} t`}
        />
        <Stat label="Sesiones en racha" value={String(streak)} />
      </div>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Volumen por semana
        </p>
        {weeks.some((w) => w.volume > 0) ? (
          <WeeklyBars weeks={weeks} />
        ) : (
          <Empty text="Registra series para ver tu volumen semanal." />
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Progresión por ejercicio
        </p>

        {exercises.length === 0 ? (
          <Empty text="Aún no hay ejercicios registrados." />
        ) : (
          <>
            <select
              value={exerciseId ?? ""}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-3 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[15px] outline-none focus:border-accent"
            >
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>

            {history.length > 1 ? (
              <LineChart points={history.map((p) => p.topWeight)} />
            ) : (
              <Empty text="Necesitas al menos 2 sesiones para ver la curva." />
            )}

            <ul className="mt-3 flex flex-col divide-y divide-border">
              {[...history].reverse().slice(0, 8).map((p) => (
                <li
                  key={p.date}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-muted">
                    {p.date.split("-").reverse().join("/")}
                  </span>
                  <span className="font-mono tabular-nums">
                    {p.topWeight} kg × {p.reps ?? "?"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <RecordsCard store={store} />
      <DataCard store={store} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3.5">
      <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-4 text-sm text-muted">{text}</p>;
}

function WeeklyBars({
  weeks,
}: {
  weeks: { start: DateKey; volume: number; sessions: number }[];
}) {
  const max = Math.max(...weeks.map((w) => w.volume), 1);

  return (
    <div className="mt-4 flex h-36 items-end gap-1.5">
      {weeks.map((w) => (
        <div key={w.start} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="font-mono text-[9px] tabular-nums text-muted">
            {w.volume > 0 ? Math.round(w.volume / 1000) : ""}
          </span>
          <div
            className={`w-full rounded-md ${w.volume > 0 ? "bg-accent" : "bg-surface-2"}`}
            style={{ height: `${Math.max((w.volume / max) * 100, 4)}%` }}
          />
          <span className="font-mono text-[9px] tabular-nums text-muted">
            {fromKey(w.start).getDate()}/{fromKey(w.start).getMonth() + 1}
          </span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ points }: { points: number[] }) {
  const W = 300;
  const H = 110;
  const pad = 10;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0]} ${H} L${coords[0][0]} ${H} Z`;

  return (
    <div className="mt-4">
      <div className="flex justify-between font-mono text-[10px] tabular-nums text-muted">
        <span>mín {min} kg</span>
        <span>máx {max} kg</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label="Progresión de peso">
        <path d={area} fill="var(--color-accent)" opacity="0.12" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--color-accent)" />
        ))}
      </svg>
    </div>
  );
}

function RecordsCard({ store }: { store: Store }) {
  const records = useMemo(() => {
    const best = new Map<string, { name: string; weight: number; date: DateKey }>();
    for (const [date, log] of Object.entries(store.logs)) {
      for (const ex of log.exercises) {
        for (const s of ex.sets) {
          if (!s.done || s.weight == null) continue;
          const prev = best.get(ex.exerciseId);
          if (!prev || s.weight > prev.weight) {
            best.set(ex.exerciseId, { name: ex.name, weight: s.weight, date });
          }
        }
      }
    }
    return [...best.values()].sort((a, b) => b.weight - a.weight);
  }, [store]);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Récords personales
      </p>
      {records.length === 0 ? (
        <Empty text="Marca series como completadas para registrar tus PR." />
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-border">
          {records.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 truncate text-sm">{r.name}</span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-accent">
                {r.weight} kg
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DataCard({ store }: { store: Store }) {
  function download() {
    const blob = new Blob([JSON.stringify(store, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gym-stats-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Datos
      </p>
      <p className="mt-2 text-sm text-muted">
        Todo se guarda en este dispositivo. Exporta de vez en cuando para no perder
        el historial.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={download}
          className="flex-1 rounded-xl border border-border bg-surface-2 py-2.5 text-sm font-semibold active:bg-border"
        >
          Exportar JSON
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                "¿Borrar todo el historial de entrenamientos? Tu rutina y tus ejercicios se conservan. Esto no se puede deshacer.",
              )
            )
              replaceAll({ ...store, logs: {} });
          }}
          className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-muted active:bg-border"
        >
          Borrar historial
        </button>
      </div>
    </section>
  );
}
