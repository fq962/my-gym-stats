"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";

function LoginForm() {
  const failed = useSearchParams().get("error") === "auth";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    failed ? "No se pudo iniciar sesión. Inténtalo de nuevo." : null,
  );

  async function signIn() {
    setLoading(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">My Gym Stats</h1>
        <p className="mt-1 text-sm text-muted">
          Inicia sesión para guardar tus entrenamientos
        </p>
      </div>
      <button
        onClick={signIn}
        disabled={loading}
        className="flex w-full max-w-xs items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium transition-colors active:bg-surface-2 disabled:opacity-60"
      >
        <GoogleIcon className="h-5 w-5" />
        {loading ? "Redirigiendo…" : "Continuar con Google"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.9a5.05 5.05 0 0 1-2.19 3.31v2.75h3.54c2.07-1.91 3.25-4.72 3.25-8.3z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.75c-.98.66-2.24 1.06-3.74 1.06-2.88 0-5.31-1.94-6.18-4.55H2.17v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.82 14.1A6.6 6.6 0 0 1 5.47 12c0-.73.13-1.44.35-2.1V7.06H2.17A11 11 0 0 0 1 12c0 1.77.43 3.45 1.17 4.94l3.65-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.17 7.06l3.65 2.84C6.69 7.32 9.12 5.38 12 5.38z" />
    </svg>
  );
}
