/** Todas las fechas se manejan como "YYYY-MM-DD" en hora local. */
export type DateKey = string;

export function toKey(d: Date): DateKey {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

export function isValidKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(fromKey(key).getTime());
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export const WEEKDAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

const longFmt = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const monthFmt = new Intl.DateTimeFormat("es", { month: "long", year: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("es", { weekday: "long" });

export function formatLong(key: DateKey): string {
  return longFmt.format(fromKey(key));
}

export function formatWeekday(key: DateKey): string {
  return weekdayFmt.format(fromKey(key));
}

export function formatMonth(year: number, month: number): string {
  return monthFmt.format(new Date(year, month, 1));
}

/** Semanas de 7 días (lunes a domingo) que cubren el mes indicado. */
export function monthGrid(year: number, month: number): DateKey[][] {
  const first = new Date(year, month, 1);
  // getDay(): 0=domingo. Queremos que la semana empiece en lunes.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);

  const weeks: DateKey[][] = [];
  const cursor = new Date(start);
  while (true) {
    const week: DateKey[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(toKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // Paramos cuando la semana recién añadida ya pasó el fin de mes.
    const last = fromKey(week[6]);
    if (last.getMonth() !== month || last.getFullYear() !== year) break;
  }
  return weeks;
}

/** Lunes de la semana a la que pertenece `key`. */
export function startOfWeek(key: DateKey): DateKey {
  const d = fromKey(key);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return toKey(d);
}
