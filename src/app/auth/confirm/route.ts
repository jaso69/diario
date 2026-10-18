import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["invite", "recovery"];

/**
 * Destino de los enlaces de los emails de invitación y de recuperación de contraseña
 * (plantillas en supabase/templates). Verifica el token, crea la sesión y lleva a elegir contraseña.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL("/set-password", request.url));
    console.error("verifyOtp", error.code, error.message);
  }
  return NextResponse.redirect(new URL("/login?error=enlace", request.url));
}
