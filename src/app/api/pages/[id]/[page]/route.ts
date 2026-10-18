import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { n8nFetch } from "@/lib/n8n";

/** Imagen de una página de un manual (para ver la fuente citada). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; page: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id, page } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || !/^\d{1,5}$/.test(page)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const res = await n8nFetch(`page?id=${id}&page=${page}`);
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: "Página no encontrada" }, { status: 404 });
  }
  return new Response(res.body, {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=86400" },
  });
}
