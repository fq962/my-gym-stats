"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatMonth,
  fromKey,
  monthGrid,
  WEEKDAYS_SHORT,
  type DateKey,
} from "@/lib/date";
import { DAY_STYLES, WEEKDAY_NAMES, WEEK_ORDER } from "@/lib/routine";
import { completedSets, hasActivity, logVolume, useStore } from "@/lib/store";
import { useToday } from "@/lib/use-today";

type Month = { y: number; m: number };

export default function CalendarPage() {
  const store = useStore();
  const today = useToday();
  // `null` hasta que el usuario navega: por defecto mostramos el mes actual.
  const [override, setOverride] = useState<Month | null>(null);

  const cursor: Month | null =
    override ??
    (today ? { y: fromKey(today).getFullYear(), m: fromKey(today).getMonth() } : null);

  if (!cursor) {
    return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;
  }

  const weeks = monthGrid(cursor.y, cursor.m);
  const inMonth = (key: DateKey) => fromKey(key).getMonth() === cursor.m;

  const monthLogs = Object.entries(store.logs).filter(
    ([date]) => inMonth(date) && fromKey(date).getFullYear() === cursor.y,
  );
  const sessions = monthLogs.filter(([, log]) => hasActivity(log));
  const monthVolume = sessions.reduce((a, [, log]) => a + logVolume(log), 0);
  const monthSets = sessions.reduce((a, [, log]) => a + completedSets(log), 0);

  function shift(delta: number) {
    const d = new Date(cursor!.y, cursor!.m + delta, 1);
    setOverride({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Mes anterior"
          className="rounded-full border border-border bg-surface p-2 text-muted active:bg-surface-2"
        >
          <Chevron className="h-5 w-5 rotate-180" />
        </button>
        <h1 className="text-[17px] font-semibold capitalize">
          {formatMonth(cursor.y, cursor.m)}
        </h1>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Mes siguiente"
          className="rounded-full border border-border bg-surface p-2 text-muted active:bg-surface-2"
        >
          <Chevron className="h-5 w-5" />
        </button>
      </header>

      <div className="rounded-2xl border border-border bg-surface p-2">
        <div className="grid grid-cols-7 gap-1 pb-1">
          {WEEKDAYS_SHORT.map((d, i) => (
            <span
              key={i}
              className="py-1 text-center text-[10px] font-semibold uppercase text-muted"
            >
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((key) => {
            const style = DAY_STYLES[store.routine[fromKey(key).getDay()].kind];
            const log = store.logs[key];
            const done = hasActivity(log);
            const isToday = key === today;
            const current = inMonth(key);

            return (
              <Link
                key={key}
                href={isToday ? "/" : `/dia/${key}`}
                className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm transition-colors ${
                  done ? `${style.bg} ${style.border}` : "border-transparent"
                } ${isToday ? "ring-2 ring-accent ring-inset" : ""} ${
                  current ? "" : "opacity-30"
                } active:bg-surface-2`}
              >
                <span
                  className={`font-mono tabular-nums ${
                    done ? style.text : "text-text"
                  }`}
                >
                  {fromKey(key).getDate()}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${style.dot} ${
                    done ? "" : "opacity-25"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Sesiones" value={String(sessions.length)} />
        <Stat label="Series" value={String(monthSets)} />
        <Stat
          label="Volumen"
          value={`${Math.round(monthVolume / 1000).toLocaleString("es")}t`}
        />
      </div>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Tu rutina
          </p>
          <Link href="/rutina" className="text-xs font-semibold text-accent">
            Editar
          </Link>
        </div>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {WEEK_ORDER.map((dow) => {
            const day = store.routine[dow];
            const s = DAY_STYLES[day.kind];
            return (
              <li key={dow} className="flex items-center gap-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <span className="w-20 shrink-0 text-muted">{WEEKDAY_NAMES[dow]}</span>
                <span className={`min-w-0 flex-1 truncate font-medium ${s.text}`}>
                  {day.label}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {day.exerciseIds.length || ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 py-3 text-center">
      <p className="font-mono text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
