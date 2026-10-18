// Crea (o actualiza) un usuario de la app. Uso:
//   node --env-file=.env.local scripts/create-user.mjs <email> <contraseña> [admin]
import { createClient } from "@supabase/supabase-js";

const [email, password, role] = process.argv.slice(2);
if (!email || !password) {
  console.error("Uso: node --env-file=.env.local scripts/create-user.mjs <email> <contraseña> [admin]");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const app_metadata = { role: role === "admin" ? "admin" : "user" };

const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, app_metadata });
if (error?.code === "email_exists") {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const user = list.users.find((u) => u.email === email);
  const { error: upd } = await supabase.auth.admin.updateUserById(user.id, { password, app_metadata });
  if (upd) throw upd;
  console.log(`Actualizado ${email} (${app_metadata.role})`);
} else if (error) {
  throw error;
} else {
  console.log(`Creado ${data.user.email} (${app_metadata.role})`);
}
