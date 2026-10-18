"use client";

import Link from "next/link";
import { useState } from "react";
import AuthCard, { inputClass, primaryButtonClass } from "@/components/AuthCard";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    // Mismo mensaje exista o no la cuenta, para no revelar qué emails están registrados
    if (error && error.code === "over_email_send_rate_limit") {
      setError("Se han enviado demasiados emails. Inténtalo dentro de un rato.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te enviaremos un enlace para elegir una nueva">
      {sent ? (
        <p className="text-sm text-fg-muted">
          Si existe una cuenta con <strong>{email}</strong>, recibirás un email con el enlace en unos minutos. Revisa
          también la carpeta de spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-fg">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-fg-subtle hover:text-fg hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthCard>
  );
}
