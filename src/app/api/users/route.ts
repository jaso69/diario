import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { EMAIL_RE, isRole, toAppUser } from "@/lib/users";

export async function GET() {
  const auth = await requireUser({ admin: true });
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("listUsers", error);
    return NextResponse.json({ error: "No se pudo cargar la lista de usuarios" }, { status: 500 });
  }
  const users = data.users.map(toAppUser).sort((a, b) => a.email.localeCompare(b.email));
  return NextResponse.json({ users });
}

/** Invita por email: Supabase envía el enlace y el usuario elige su contraseña en /set-password. */
export async function POST(request: Request) {
  const auth = await requireUser({ admin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body?.role ?? "user";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Email no válido" }, { status: 400 });
  if (!isRole(role)) return NextResponse.json({ error: "Rol no válido" }, { status: 400 });

  const admin = createAdminClient().auth.admin;
  // Supabase reenvía sin error la invitación a un email pendiente; aquí se trata como duplicado
  // (para reenviar está PATCH { action: "resend" }) y así no se pisa el rol del usuario existente.
  const { data: existing } = await admin.listUsers({ perPage: 1000 });
  if (existing?.users.some((u) => u.email?.toLowerCase() === email)) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const { data, error } = await admin.inviteUserByEmail(email);
  if (error) {
    if (error.code === "email_exists") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
    if (error.code === "over_email_send_rate_limit") {
      return NextResponse.json({ error: "Se ha alcanzado el límite de emails. Inténtalo más tarde." }, { status: 429 });
    }
    console.error("inviteUserByEmail", error);
    return NextResponse.json({ error: "No se pudo enviar la invitación" }, { status: 500 });
  }

  // El rol va en app_metadata: el propio usuario no puede modificarlo (user_metadata sí)
  const { data: updated, error: roleError } = await admin.updateUserById(data.user.id, { app_metadata: { role } });
  if (roleError) console.error("updateUserById", roleError);
  return NextResponse.json({ user: toAppUser(updated?.user ?? data.user) }, { status: 201 });
}
