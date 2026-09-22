"use client";

import { useToday } from "@/lib/use-today";
import { WeekStrip } from "@/components/week-strip";
import { WorkoutDay } from "@/components/workout-day";

export default function HomePage() {
  const date = useToday();

  if (!date) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-16 animate-pulse rounded-2xl bg-surface" />
        <div className="h-24 animate-pulse rounded-2xl bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
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
