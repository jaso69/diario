import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_MB } from "@/lib/types";

/**
 * Paso 1 de la subida: reserva un manual_id y devuelve un token de subida firmado.
 * El navegador sube el fichero directamente a Supabase Storage (sin pasar por Vercel,
 * que limita el tamaño del body de las funciones).
 */
export async function POST(request: Request) {
  const auth = await requireUser({ admin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const size = Number(body?.size);
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: `Formato no soportado. Usa: ${ALLOWED_EXTENSIONS.join(", ")}` }, { status: 400 });
  }
  if (!size || size > MAX_UPLOAD_MB * 1024 * 1024) {
    return NextResponse.json({ error: `El fichero supera ${MAX_UPLOAD_MB} MB` }, { status: 400 });
  }

  const manualId = `m_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  const path = `${manualId}/original.${ext}`;
  const { data, error } = await createAdminClient().storage.from("manuals").createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl", error);
    return NextResponse.json({ error: "No se pudo preparar la subida" }, { status: 500 });
  }
  return NextResponse.json({ manual_id: manualId, path: data.path, token: data.token });
}
