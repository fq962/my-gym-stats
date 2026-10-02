import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Supabase redirige aquí tras Google con ?code=...; lo cambiamos por una sesión. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Solo rutas internas, para evitar open redirects.
  const next = searchParams.get("next");
  const dest = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${dest}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
