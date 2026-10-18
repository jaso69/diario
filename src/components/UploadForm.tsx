"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_MB } from "@/lib/types";

type Step = "idle" | "uploading" | "starting";

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function pick(f: File | undefined) {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Formato no soportado. Usa: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`El fichero supera ${MAX_UPLOAD_MB} MB`);
      return;
    }
    setError(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    try {
      setStep("uploading");
      const prep = await fetch("/api/manuals/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, size: file.size }),
      });
      const target = await prep.json();
      if (!prep.ok) throw new Error(target.error);

      const { error: upErr } = await createClient()
        .storage.from("manuals")
        .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type || undefined });
      if (upErr) throw new Error(`Error subiendo el fichero: ${upErr.message}`);

      setStep("starting");
      const res = await fetch("/api/manuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual_id: target.manual_id, path: target.path, filename: file.name, title, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/manuals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setStep("idle");
    }
  }

  const busy = step !== "idle";

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <h1 className="text-lg font-semibold">Subir manual</h1>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center text-sm ${
          dragging ? "border-accent bg-accent-soft" : "border-border-strong bg-surface hover:bg-surface-muted"
        }`}
      >
        <input
          type="file"
          accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
          disabled={busy}
        />
        {file ? (
          <>
            <span className="font-medium">{file.name}</span>
            <span className="text-fg-subtle">{(file.size / 1024 / 1024).toFixed(1)} MB · pulsa para cambiar</span>
          </>
        ) : (
          <>
            <span className="font-medium">Arrastra aquí el manual o pulsa para elegirlo</span>
            <span className="text-fg-subtle">
              PDF o Word, hasta {MAX_UPLOAD_MB} MB
            </span>
          </>
        )}
      </label>

      <label className="block text-sm">
        <span className="text-fg">Título</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </label>
      <label className="block text-sm">
        <span className="text-fg">Categoría o equipo (opcional)</span>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          maxLength={100}
          placeholder="Ej.: Calderas, Bombas, Línea 2…"
          className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={!file || busy}
        className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {step === "uploading" ? "Subiendo fichero…" : step === "starting" ? "Iniciando procesado…" : "Subir y procesar"}
      </button>
      <p className="text-xs text-fg-subtle">
        Tras subirlo, el manual se procesa en segundo plano (lectura, descripción de imágenes e indexado). Puedes seguir
        el estado en la biblioteca.
      </p>
    </form>
  );
}
