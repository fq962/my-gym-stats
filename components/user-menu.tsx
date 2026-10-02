"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { useSyncStatus } from "@/lib/sync";

/** Foto de perfil de Google en la esquina; al tocarla muestra la cuenta y "Cerrar sesión". */
export function UserMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const sync = useSyncStatus();

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (pathname === "/login" || !user) return null;

  const meta = user.user_metadata as {
    avatar_url?: string;
    picture?: string;
    full_name?: string;
    name?: string;
  };
  const avatar = meta.avatar_url ?? meta.picture;
  const name = meta.full_name ?? meta.name ?? user.email ?? "Usuario";

  async function signOut() {
    await getSupabase().auth.signOut();
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Cuenta"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-sm font-semibold"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={name}
            referrerPolicy="no-referrer"
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          name.charAt(0).toUpperCase()
        )}
        {sync.state === "error" && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface p-3 shadow-lg">
            <p className="truncate text-sm font-medium">{name}</p>
            {user.email && (
              <p className="truncate text-xs text-muted">{user.email}</p>
            )}
            <p
              className={`mt-2 text-xs ${sync.state === "error" ? "text-red-400" : "text-muted"}`}
            >
              {sync.state === "syncing" && "Sincronizando…"}
              {sync.state === "idle" && "Guardado en la nube"}
              {sync.state === "error" && `Error al sincronizar: ${sync.error}`}
            </p>
            <button
              onClick={signOut}
              className="mt-3 w-full rounded-lg bg-surface-2 py-2 text-xs font-medium active:opacity-70"
            >
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}
