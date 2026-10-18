import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { n8nFetch, relayJson } from "@/lib/n8n";
import { createAdminClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser({ admin: true });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return NextResponse.json({ error: "manual_id inválido" }, { status: 400 });
  }

  const res = await n8nFetch(`manual?id=${id}`, { method: "DELETE" });
  if (res.ok) {
    const storage = createAdminClient().storage.from("manuals");
    const { data: files } = await storage.list(id);
    if (files?.length) await storage.remove(files.map((f) => `${id}/${f.name}`));
  }
  return relayJson(res);
}
