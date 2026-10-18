import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/** Llama a un webhook de n8n con la clave compartida. Solo en el servidor. */
export function n8nFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-API-Key", env.n8nApiKey());
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${env.n8nUrl()}/webhook/${path}`, { ...init, headers, cache: "no-store" });
}

/** Reenvía una respuesta JSON de n8n, traduciendo los errores a un mensaje legible. */
export async function relayJson(res: Response) {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    console.error(`n8n ${res.status}: ${text.slice(0, 500)}`);
    const message = (data as { message?: string } | null)?.message;
    return NextResponse.json(
      { error: message && res.status < 500 ? message : "El servicio de manuales no está disponible" },
      { status: res.status === 403 ? 502 : res.status >= 500 ? 502 : res.status },
    );
  }
  return NextResponse.json(data, { status: res.status });
}
