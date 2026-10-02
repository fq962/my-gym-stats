import { uuid } from "./uuid";

export type DayKind = "torso" | "pierna" | "opcional" | "descanso";

/** Un ejercicio de tu biblioteca. Lo creas tú, no viene predefinido. */
export type UserExercise = {
  id: string;
  name: string;
  group: string;
  targetSets: number;
  targetReps: string;
};

/** Configuración de un día de la semana. Índice 0 = domingo (Date.getDay()). */
export type RoutineDay = {
  kind: DayKind;
  label: string;
  exerciseIds: string[];
};

export const DAY_KINDS: { value: DayKind; label: string }[] = [
  { value: "torso", label: "Torso" },
  { value: "pierna", label: "Pierna" },
  { value: "opcional", label: "Opcional" },
  { value: "descanso", label: "Descanso" },
];

export const DAY_STYLES: Record<
  DayKind,
  { text: string; bg: string; dot: string; border: string }
> = {
  torso: { text: "text-torso", bg: "bg-torso/12", dot: "bg-torso", border: "border-torso/40" },
  pierna: { text: "text-pierna", bg: "bg-pierna/12", dot: "bg-pierna", border: "border-pierna/40" },
  opcional: { text: "text-opcional", bg: "bg-opcional/12", dot: "bg-opcional", border: "border-opcional/40" },
  descanso: { text: "text-muted", bg: "bg-descanso/12", dot: "bg-descanso", border: "border-border" },
};

export const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/** Orden de presentación: lunes primero. Valores = Date.getDay(). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Estructura inicial de la semana: solo el tipo de día, sin ejercicios.
 * Los ejercicios se registran desde la pestaña Rutina.
 */
export const DEFAULT_ROUTINE: RoutineDay[] = [
  { kind: "descanso", label: "Descanso", exerciseIds: [] },
  { kind: "torso", label: "Pecho / Espalda", exerciseIds: [] },
  { kind: "pierna", label: "Pierna", exerciseIds: [] },
  { kind: "descanso", label: "Descanso", exerciseIds: [] },
  { kind: "torso", label: "Pecho / Espalda", exerciseIds: [] },
  { kind: "pierna", label: "Pierna", exerciseIds: [] },
  { kind: "opcional", label: "Opcional", exerciseIds: [] },
];

export function newExerciseId(): string {
  return uuid();
}
