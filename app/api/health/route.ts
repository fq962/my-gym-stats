import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Verifica la conexión con Supabase: GET /api/health */
export async function GET() {
  try {
    const { error } = await getSupabaseAdmin()
      .from("exercises")
      .select("id", { head: true, count: "exact" });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message;
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
