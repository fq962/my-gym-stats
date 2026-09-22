"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { isValidKey, type DateKey } from "@/lib/date";
import { WeekStrip } from "@/components/week-strip";
import { WorkoutDay } from "@/components/workout-day";

export default function DayPage() {
  const params = useParams<{ fecha: string }>();
  const date = params.fecha as DateKey;

  if (!date || !isValidKey(date)) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-[15px] font-medium">Fecha no válida</p>
        <Link href="/" className="mt-3 inline-block text-sm font-semibold text-accent">
          Volver a hoy
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WeekStrip current={date} />
      <WorkoutDay date={date} />
    </div>
  );
}
