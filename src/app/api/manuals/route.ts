import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { n8nFetch, relayJson } from "@/lib/n8n";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  return relayJson(await n8nFetch("manuals"));
}

/**
 * Lanza la ingesta de un manual ya subido a Storage (ver upload-url).
 * n8n responde cuando el VPS ya tiene su copia del original, así que después se borra de Storage
 * (también si falla: cada subida usa un manual_id nuevo y el fichero quedaría huérfano).
 */
export async function POST(request: Request) {
  const auth = await requireUser({ admin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const { manual_id, path, filename, title, category } = body ?? {};
  if (typeof manual_id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(manual_id)) {
    return NextResponse.json({ error: "manual_id inválido" }, { status: 400 });
  }
  if (typeof path !== "string" || !path.startsWith(`${manual_id}/`) || typeof filename !== "string") {
    return NextResponse.json({ error: "Fichero inválido" }, { status: 400 });
  }

  // URL firmada de 1 h para que el doc-parser descargue el original
  const storage = createAdminClient().storage.from("manuals");
  const { data, error } = await storage.createSignedUrl(path, 3600);
  if (error || !data) {
    return NextResponse.json({ error: "No se encuentra el fichero subido" }, { status: 400 });
  }
  let url = data.signedUrl;
  const backendBase = env.ingestFileBaseUrl();
  if (backendBase) {
    const signed = new URL(url);
    url = `${backendBase.replace(/\/$/, "")}${signed.pathname}${signed.search}`;
  }

  try {
    const res = await n8nFetch("ingest", {
      method: "POST",
      body: JSON.stringify({
        manual_id,
        url,
        filename,
        title: typeof title === "string" ? title.trim() : "",
        category: typeof category === "string" ? category.trim() : "",
      }),
    });
    return await relayJson(res);
  } finally {
    const { error: rmErr } = await storage.remove([path]);
    if (rmErr) console.error("borrar original de Storage", rmErr);
  }
}
