"use client";

import Link from "next/link";
import { addDays, fromKey, startOfWeek, WEEKDAYS_SHORT, type DateKey } from "@/lib/date";
import { DAY_STYLES } from "@/lib/routine";
import { hasActivity, useStore } from "@/lib/store";
import { useToday } from "@/lib/use-today";

export function WeekStrip({ current }: { current: DateKey }) {
  const store = useStore();
  const monday = startOfWeek(current);
  const today = useToday();

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEKDAYS_SHORT.map((letter, i) => {
        const key = addDays(monday, i);
        const style = DAY_STYLES[store.routine[fromKey(key).getDay()].kind];
        const active = key === current;
        const done = hasActivity(store.logs[key]);

        return (
          <Link
            key={key}
            href={key === today ? "/" : `/dia/${key}`}
            className={`flex flex-col items-center gap-1 rounded-xl border py-2 transition-colors ${
              active
                ? "border-accent bg-accent/10"
                : "border-border bg-surface active:bg-surface-2"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase text-muted">
              {letter}
            </span>
            <span
              className={`font-mono text-sm tabular-nums ${
                key === today ? "font-bold text-accent" : ""
              }`}
            >
              {fromKey(key).getDate()}
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${style.dot} ${
                done ? "" : "opacity-30"
              }`}
            />
          </Link>
        );
      })}
    </div>
  );
}
