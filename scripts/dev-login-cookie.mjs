// Imprime la cabecera Cookie de una sesión de Supabase (para probar la API con curl).
// Uso (desde frontend/): node --env-file=.env.local scripts/dev-login-cookie.mjs <email> <contraseña> > /tmp/x.cookie
import { createServerClient } from "@supabase/ssr";

const jar = new Map();
const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
  },
});
const { error } = await supabase.auth.signInWithPassword({ email: process.argv[2], password: process.argv[3] });
if (error) throw error;
process.stdout.write([...jar].map(([n, v]) => `${n}=${v}`).join("; "));
