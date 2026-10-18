import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { isRole, toAppUser } from "@/lib/users";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Cambia el rol ({ role }) o reenvía la invitación ({ action: "resend" }). */
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireUser({ admin: true });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Usuario no válido" }, { status: 400 });
  const body = await request.json().catch(() => null);
  const admin = createAdminClient().auth.admin;

  const { data: found, error: getError } = await admin.getUserById(id);
  if (getError || !found.user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (body?.action === "resend") {
    if (found.user.email_confirmed_at) {
      return NextResponse.json({ error: "El usuario ya ha activado su cuenta" }, { status: 400 });
    }
    const { error } = await admin.inviteUserByEmail(found.user.email!);
    if (error) {
      console.error("reenviar invitación", error);
      const limit = error.code === "over_email_send_rate_limit";
      return NextResponse.json(
        { error: limit ? "Se ha alcanzado el límite de emails. Inténtalo más tarde." : "No se pudo reenviar la invitación" },
        { status: limit ? 429 : 500 },
      );
    }
    return NextResponse.json({ user: toAppUser(found.user) });
  }

  if (!isRole(body?.role)) return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
  if (id === auth.id) {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 });
  }
  const { data, error } = await admin.updateUserById(id, {
    app_metadata: { ...found.user.app_metadata, role: body.role },
  });
  if (error) {
    console.error("cambiar rol", error);
    return NextResponse.json({ error: "No se pudo cambiar el rol" }, { status: 500 });
  }
  return NextResponse.json({ user: toAppUser(data.user) });
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireUser({ admin: true });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Usuario no válido" }, { status: 400 });
  if (id === auth.id) return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });

  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  if (error) {
    console.error("deleteUser", error);
    return NextResponse.json({ error: "No se pudo eliminar el usuario" }, { status: 500 });
  }
  return NextResponse.json({ deleted: id });
}
