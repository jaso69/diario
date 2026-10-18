"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Manual, ManualStatus } from "@/lib/types";

const STATUS: Record<ManualStatus, { label: string; className: string }> = {
  ready: { label: "Listo", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900" },
  processing: { label: "Procesando…", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900" },
  error: { label: "Error", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900" },
};

async function fetchManuals(): Promise<{ manuals?: Manual[]; error?: string }> {
  try {
    const res = await fetch("/api/manuals");
    const data = await res.json();
    return res.ok ? { manuals: data.manuals } : { error: data.error ?? "No se pudo cargar la biblioteca" };
  } catch {
    return { error: "No se pudo cargar la biblioteca" };
  }
}

export default function ManualList({ isAdmin }: { isAdmin: boolean }) {
  const [manuals, setManuals] = useState<Manual[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const apply = useCallback((result: { manuals?: Manual[]; error?: string }) => {
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setManuals(result.manuals ?? []);
  }, []);

  const load = useCallback(() => fetchManuals().then(apply), [apply]);

  useEffect(() => {
    fetchManuals().then(apply);
  }, [apply]);

  // Mientras haya manuales procesándose, refresca cada 5 s
  useEffect(() => {
    if (!manuals?.some((m) => m.status === "processing")) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [manuals, load]);

  async function remove(id: string) {
    setConfirming(null);
    const res = await fetch(`/api/manuals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo borrar");
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Biblioteca de manuales</h1>
        {isAdmin && (
          <Link href="/admin/upload" className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">
            Subir manual
          </Link>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {manuals === null && !error && <p className="text-sm text-fg-subtle">Cargando…</p>}
      {manuals?.length === 0 && <p className="text-sm text-fg-subtle">Todavía no hay manuales.</p>}
      {manuals && manuals.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-muted text-left text-fg-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Título</th>
                <th className="px-4 py-2 font-medium">Categoría</th>
                <th className="px-4 py-2 font-medium">Páginas</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Subido</th>
                {isAdmin && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {manuals.map((m) => (
                <tr key={m.manual_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-medium">{m.title}</div>
                    <div className="text-xs text-fg-subtle">{m.filename}</div>
                  </td>
                  <td className="px-4 py-2">{m.category || "—"}</td>
                  <td className="px-4 py-2">{m.page_count ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS[m.status].className}`} title={m.error ?? ""}>
                      {STATUS[m.status].label}
                    </span>
                    {m.status === "error" && m.error && <div className="mt-1 max-w-xs text-xs text-danger">{m.error}</div>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-fg-subtle">
                    {new Date(m.created_at).toLocaleDateString("es-ES")}
                  </td>
                  {isAdmin && (
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {confirming === m.manual_id ? (
                        <span className="space-x-2">
                          <button onClick={() => remove(m.manual_id)} className="text-danger hover:underline">
                            Confirmar
                          </button>
                          <button onClick={() => setConfirming(null)} className="text-fg-subtle hover:underline">
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirming(m.manual_id)} className="text-fg-subtle hover:text-danger">
                          Borrar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
