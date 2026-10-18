import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export function isAdmin(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "admin";
}

/** Usuario validado contra el servidor de Supabase (no solo la cookie). */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Para Route Handlers: devuelve el usuario o una respuesta 401/403 lista para devolver.
 *   const auth = await requireUser({ admin: true });
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireUser({ admin = false } = {}): Promise<User | NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (admin && !isAdmin(user)) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  return user;
}
