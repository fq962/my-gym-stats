"use client";

import { useSyncExternalStore } from "react";
import { todayKey, type DateKey } from "./date";

const noopSubscribe = () => () => {};

/**
 * Fecha de hoy según el dispositivo. Devuelve `null` durante el render del
 * servidor para evitar desajustes de hidratación por zona horaria.
 */
export function useToday(): DateKey | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => todayKey(),
    () => null,
  );
}
