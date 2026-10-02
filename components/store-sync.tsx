"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { flushNow, startSync, stopSync } from "@/lib/sync";

/** Conecta el store local con Supabase mientras haya una sesión iniciada. */
export function StoreSync() {
  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => {
      if (data.session) void startSync(sb, data.session.user.id);
    });
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      if (session) void startSync(sb, session.user.id);
      else if (event === "SIGNED_OUT") stopSync(true);
    });
    const onHide = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onHide);
      stopSync();
    };
  }, []);

  return null;
}
