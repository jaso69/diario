"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass, primaryButtonClass } from "./AuthCard";

export default function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Email o contraseña incorrectos" : error.message);
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {notice && <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-fg-muted">{notice}</p>}
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
      <label className="block text-sm">
        <span className="text-fg">Contraseña</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={loading} className={primaryButtonClass}>
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-fg-subtle hover:text-fg hover:underline">
          ¿Has olvidado tu contraseña?
        </Link>
      </p>
    </form>
  );
}
