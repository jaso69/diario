"use client";

import { useEffect, useState } from "react";
import type { Source } from "@/lib/types";

/** Muestra la imagen de una página del manual, con navegación a páginas contiguas. */
export default function PageViewer({ source, onClose }: { source: Source; onClose: () => void }) {
  const [page, setPage] = useState(source.page);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight") setPage((p) => p + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4" onClick={onClose}>
      <div
        className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-t-lg bg-surface px-4 py-2 text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 flex-1 truncate font-medium">
          {source.title} · página {page}
        </span>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded px-2 py-1 hover:bg-surface-muted">
          ← Anterior
        </button>
        <button onClick={() => setPage((p) => p + 1)} className="rounded px-2 py-1 hover:bg-surface-muted">
          Siguiente →
        </button>
        <button onClick={onClose} className="rounded px-2 py-1 hover:bg-surface-muted" aria-label="Cerrar">
          ✕
        </button>
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-auto bg-surface-muted" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por nuestra API */}
        <img src={`/api/pages/${source.manual_id}/${page}`} alt={`Página ${page}`} className="mx-auto" />
      </div>
    </div>
  );
}
