"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass, primaryButtonClass } from "./AuthCard";

const MIN_LENGTH = 8;

export default function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_LENGTH) return setError(`Mínimo ${MIN_LENGTH} caracteres`);
    if (password !== repeat) return setError("Las contraseñas no coinciden");
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(
        error.code === "same_password"
          ? "La contraseña nueva debe ser distinta de la anterior"
          : error.code === "weak_password"
            ? "La contraseña es demasiado débil"
            : "No se pudo guardar la contraseña. El enlace puede haber caducado.",
      );
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="text-fg">Contraseña nueva</span>
        <input
          type="password"
          required
          minLength={MIN_LENGTH}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        <span className="text-fg">Repite la contraseña</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          className={inputClass}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={loading} className={primaryButtonClass}>
        {loading ? "Guardando…" : "Guardar y entrar"}
      </button>
    </form>
  );
}
