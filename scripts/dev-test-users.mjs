// Prueba end-to-end de usuarios: invitación por email, activación, roles, recuperación de contraseña y borrado.
// Solo para el entorno LOCAL (lee los emails de Mailpit). Necesita `npm run dev` y `supabase start`.
// Uso (desde frontend/): node --env-file=.env.local scripts/dev-test-users.mjs <email-admin> <contraseña-admin>
import { createServerClient } from "@supabase/ssr";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const [adminEmail, adminPassword] = process.argv.slice(2);
if (!adminEmail || !adminPassword) {
  console.error("Uso: node --env-file=.env.local scripts/dev-test-users.mjs <email-admin> <contraseña-admin>");
  process.exit(1);
}

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "✔" : "✘"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

/** Cliente de Supabase con un "tarro" de cookies en memoria, como el navegador. */
function sessionClient(jar = new Map()) {
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  return { client, jar, cookie: () => [...jar].map(([n, v]) => `${n}=${v}`).join("; ") };
}

async function login(email, password) {
  const s = sessionClient();
  const { error } = await s.client.auth.signInWithPassword({ email, password });
  return error ? null : s;
}

async function call(session, path, init = {}) {
  const res = await fetch(APP + path, {
    ...init,
    headers: { Cookie: session.cookie(), ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

/** Espera el último email enviado a `to` y devuelve el enlace de /auth/confirm. */
async function linkFromMail(to, since) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`).then((x) => x.json());
    const msg = r.messages?.find((m) => new Date(m.Created) >= since);
    if (msg) {
      const full = await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`).then((x) => x.json());
      const href = full.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1]?.replaceAll("&amp;", "&");
      return { subject: msg.Subject, href };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/** Abre el enlace del email como lo haría el navegador y devuelve la sesión creada. */
async function openLink(href) {
  const res = await fetch(href, { redirect: "manual" });
  const s = sessionClient();
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    const value = pair.slice(i + 1);
    if (value) s.jar.set(pair.slice(0, i), value);
  }
  return { location: res.headers.get("location") ?? "", session: s };
}

const admin = await login(adminEmail, adminPassword);
check("login admin", Boolean(admin));
if (!admin) process.exit(1);

const email = `invitado-${Date.now()}@local.test`;
let since = new Date(Date.now() - 1000);

// 1. Invitar
const inv = await call(admin, "/api/users", { method: "POST", body: JSON.stringify({ email, role: "user" }) });
check("invitar", inv.status === 201 && inv.data.user?.status === "invited", `${inv.status} ${inv.data.user?.status ?? inv.data.error}`);
const userId = inv.data.user?.id;
const dup = await call(admin, "/api/users", { method: "POST", body: JSON.stringify({ email, role: "user" }) });
check("invitar dos veces el mismo email → error", dup.status >= 400, `${dup.status} ${dup.data.error}`);

// 2. Email de invitación y activación
const mail = await linkFromMail(email, since);
check("email de invitación recibido", Boolean(mail?.href), mail?.subject);
const opened = await openLink(mail.href);
check("enlace → /set-password", opened.location.endsWith("/set-password"), opened.location);
const { error: pwError } = await opened.session.client.auth.updateUser({ password: "Invitado-1234" });
check("elegir contraseña", !pwError, pwError?.message);
const reused = await openLink(mail.href);
check("reutilizar el enlace → /login?error=enlace", reused.location.endsWith("/login?error=enlace"), reused.location);

const invited = await login(email, "Invitado-1234");
check("login del invitado con su contraseña", Boolean(invited));
let list = await call(admin, "/api/users");
check("aparece como activo", list.data.users?.find((u) => u.id === userId)?.status === "active");

// 3. Permisos y roles
const forbidden = await call(invited, "/api/users");
check("usuario normal no puede ver usuarios (403)", forbidden.status === 403, String(forbidden.status));
const promote = await call(admin, `/api/users/${userId}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) });
check("hacer administrador", promote.status === 200 && promote.data.user?.role === "admin");
const asAdmin = await login(email, "Invitado-1234");
check("con rol admin ya puede ver usuarios", (await call(asAdmin, "/api/users")).status === 200);
const resendActive = await call(admin, `/api/users/${userId}`, { method: "PATCH", body: JSON.stringify({ action: "resend" }) });
check("reenviar a un usuario ya activo → error", resendActive.status === 400, resendActive.data.error);

const me = list.data.users?.find((u) => u.email === adminEmail.toLowerCase());
const selfDemote = await call(admin, `/api/users/${me.id}`, { method: "PATCH", body: JSON.stringify({ role: "user" }) });
check("no puedes quitarte el rol admin", selfDemote.status === 400, selfDemote.data.error);
const selfDelete = await call(admin, `/api/users/${me.id}`, { method: "DELETE" });
check("no puedes eliminarte", selfDelete.status === 400, selfDelete.data.error);

// 4. Recuperar contraseña
since = new Date(Date.now() - 1000);
const anon = sessionClient();
await anon.client.auth.resetPasswordForEmail(email);
const recovery = await linkFromMail(email, since);
check("email de recuperación recibido", Boolean(recovery?.href), recovery?.subject);
const recOpened = await openLink(recovery.href);
check("enlace de recuperación → /set-password", recOpened.location.endsWith("/set-password"), recOpened.location);
await recOpened.session.client.auth.updateUser({ password: "Nueva-5678" });
check("login con la contraseña nueva", Boolean(await login(email, "Nueva-5678")));
const bad = await openLink(`${APP}/auth/confirm?token_hash=falso&type=recovery`);
check("enlace inválido → /login?error=enlace", bad.location.endsWith("/login?error=enlace"));

// 5. Invitación pendiente: reenviar y eliminar
const pendingEmail = `pendiente-${Date.now()}@local.test`;
const pending = await call(admin, "/api/users", { method: "POST", body: JSON.stringify({ email: pendingEmail, role: "user" }) });
since = new Date(Date.now() - 1000);
const resend = await call(admin, `/api/users/${pending.data.user.id}`, { method: "PATCH", body: JSON.stringify({ action: "resend" }) });
check("reenviar invitación pendiente", resend.status === 200, resend.data.error);
check("email reenviado recibido", Boolean((await linkFromMail(pendingEmail, since))?.href));

for (const id of [userId, pending.data.user.id]) {
  const del = await call(admin, `/api/users/${id}`, { method: "DELETE" });
  check("eliminar usuario de prueba", del.status === 200, del.data.error);
}
check("el eliminado ya no puede entrar", !(await login(email, "Nueva-5678")));

console.log(failures ? `\n${failures} comprobación(es) fallida(s)` : "\nTodo correcto");
process.exit(failures ? 1 : 0);
