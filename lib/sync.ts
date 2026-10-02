"use client";

import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchRemote, pushDiff, type Remote } from "./remote";
import { EMPTY_STORE, getSnapshot, hydrate, onStoreChange, type Store } from "./store";

export type SyncStatus = { state: "idle" | "syncing" | "error"; error?: string };

let status: SyncStatus = { state: "idle" };
const statusListeners = new Set<() => void>();

function setStatus(next: SyncStatus) {
  status = next;
  statusListeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => {
        statusListeners.delete(l);
      };
    },
    () => status,
    () => status,
  );
}

type Session = {
  sb: SupabaseClient;
  remote: Remote;
  /** Último estado que sabemos que está en Supabase */
  synced: Store;
  timer: ReturnType<typeof setTimeout> | null;
  running: boolean;
  stopped: boolean;
  unsubscribe: () => void;
};

let session: Session | null = null;
let starting = 0;

const DEBOUNCE_MS = 700;
const RETRY_MS = 5000;

function schedule(s: Session, delay = DEBOUNCE_MS) {
  if (s.stopped) return;
  if (s.timer) clearTimeout(s.timer);
  s.timer = setTimeout(() => void flush(s), delay);
}

async function flush(s: Session) {
  if (s.running || s.stopped) return;
  s.running = true;
  if (s.timer) clearTimeout(s.timer);
  s.timer = null;
  try {
    while (!s.stopped) {
      const target = getSnapshot();
      if (target === s.synced) break;
      setStatus({ state: "syncing" });
      await pushDiff(s.sb, s.remote, s.synced, target);
      s.synced = target;
    }
    if (!s.stopped) setStatus({ state: "idle" });
  } catch (e) {
    console.error("[sync] no se pudo guardar en Supabase", e);
    setStatus({ state: "error", error: e instanceof Error ? e.message : String(e) });
    schedule(s, RETRY_MS);
  } finally {
    s.running = false;
  }
}

/** Baja los datos del usuario y, a partir de ahí, sube cada cambio local. */
export async function startSync(sb: SupabaseClient, userId: string) {
  if (session?.remote.userId === userId) return;
  stopSync();
  const token = ++starting;
  setStatus({ state: "syncing" });
  try {
    const { store, remote, empty } = await fetchRemote(sb, userId);
    if (token !== starting) return;

    const s: Session = {
      sb,
      remote,
      synced: store,
      timer: null,
      running: false,
      stopped: false,
      unsubscribe: () => {},
    };
    session = s;
    // Si la nube está vacía, lo que hay en local (primer uso) se sube; si no, la nube manda.
    if (!empty) hydrate(store);
    s.unsubscribe = onStoreChange(() => schedule(s));
    setStatus({ state: "idle" });
    if (getSnapshot() !== s.synced) schedule(s, 0);
  } catch (e) {
    if (token !== starting) return;
    console.error("[sync] no se pudo cargar desde Supabase", e);
    setStatus({ state: "error", error: e instanceof Error ? e.message : String(e) });
  }
}

/** Cierra la sesión de sync. Con `clear`, también borra los datos locales del usuario. */
export function stopSync(clear = false) {
  starting++;
  if (session) {
    session.stopped = true;
    if (session.timer) clearTimeout(session.timer);
    session.unsubscribe();
    session = null;
  }
  if (clear) hydrate(EMPTY_STORE);
  setStatus({ state: "idle" });
}

/** Intenta subir ya mismo lo pendiente (p. ej. al ocultar la pestaña). */
export function flushNow() {
  if (session) void flush(session);
}
