"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppUser, UserRole } from "@/lib/types";

const ROLE_LABEL: Record<UserRole, string> = { admin: "Administrador", user: "Usuario" };

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Error inesperado");
  return data;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export default function UserAdmin({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api("/api/users")
        .then((d) => setUsers(d.users))
        .catch((e) => setMessage({ kind: "error", text: e.message })),
    [],
  );

  useEffect(() => {
    api("/api/users")
      .then((d) => setUsers(d.users))
      .catch((e) => setMessage({ kind: "error", text: e.message }));
  }, []);

  async function run(key: string, action: () => Promise<string>) {
    setBusy(key);
    setMessage(null);
    try {
      setMessage({ kind: "ok", text: await action() });
      await load();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Error inesperado" });
    } finally {
      setBusy(null);
    }
  }

  function invite(e: React.FormEvent) {
    e.preventDefault();
    const target = email.trim();
    run("invite", async () => {
      await api("/api/users", { method: "POST", body: JSON.stringify({ email: target, role }) });
      setEmail("");
      setRole("user");
      return `Invitación enviada a ${target}`;
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Usuarios</h1>

      <form onSubmit={invite} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <label className="min-w-0 flex-1 basis-60 text-sm">
          <span className="text-fg">Invitar por email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="persona@empresa.com"
            className="mt-1 w-full rounded-md border border-border-strong bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>
        <label className="text-sm">
          <span className="text-fg">Rol</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1 block rounded-md border border-border-strong bg-surface px-3 py-2"
          >
            <option value="user">{ROLE_LABEL.user}</option>
            <option value="admin">{ROLE_LABEL.admin}</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy === "invite"}
          className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {busy === "invite" ? "Enviando…" : "Enviar invitación"}
        </button>
        <p className="basis-full text-xs text-fg-subtle">
          Recibirá un email con un enlace (válido 24 h) para activar la cuenta y elegir su contraseña. Los
          administradores pueden subir y borrar manuales y gestionar usuarios.
        </p>
      </form>

      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-green-700 dark:text-green-400" : "text-danger"}`}>{message.text}</p>
      )}

      {users === null && !message && <p className="text-sm text-fg-subtle">Cargando…</p>}
      {users && (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-muted text-left text-fg-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Rol</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Último acceso</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      {u.email}
                      {isMe && <span className="ml-2 text-xs text-fg-subtle">(tú)</span>}
                    </td>
                    <td className="px-4 py-2">
                      {isMe ? (
                        ROLE_LABEL[u.role]
                      ) : (
                        <select
                          value={u.role}
                          disabled={busy !== null}
                          onChange={(e) => {
                            const next = e.target.value as UserRole;
                            run(u.id, async () => {
                              await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ role: next }) });
                              return `${u.email} ahora es ${ROLE_LABEL[next].toLowerCase()}`;
                            });
                          }}
                          className="rounded-md border border-border-strong bg-surface px-2 py-1"
                        >
                          <option value="user">{ROLE_LABEL.user}</option>
                          <option value="admin">{ROLE_LABEL.admin}</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {u.status === "active" ? (
                        <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
                          Activo
                        </span>
                      ) : (
                        <span
                          className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                          title={`Invitado el ${formatDate(u.invited_at)}`}
                        >
                          Invitación pendiente
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-fg-subtle">{formatDate(u.last_sign_in_at)}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {!isMe && (
                        <span className="space-x-3">
                          {u.status === "invited" && (
                            <button
                              disabled={busy !== null}
                              onClick={() =>
                                run(u.id, async () => {
                                  await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ action: "resend" }) });
                                  return `Invitación reenviada a ${u.email}`;
                                })
                              }
                              className="text-fg-subtle hover:text-fg disabled:opacity-50"
                            >
                              Reenviar
                            </button>
                          )}
                          {confirming === u.id ? (
                            <>
                              <button
                                onClick={() => {
                                  setConfirming(null);
                                  run(u.id, async () => {
                                    await api(`/api/users/${u.id}`, { method: "DELETE" });
                                    return `${u.email} eliminado`;
                                  });
                                }}
                                className="text-danger hover:underline"
                              >
                                Confirmar
                              </button>
                              <button onClick={() => setConfirming(null)} className="text-fg-subtle hover:underline">
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              disabled={busy !== null}
                              onClick={() => setConfirming(u.id)}
                              className="text-fg-subtle hover:text-danger disabled:opacity-50"
                            >
                              Eliminar
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
