import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Cliente con la sesión del usuario (cookies). Para Server Components y Route Handlers. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy ya refresca la sesión.
        }
      },
    },
  });
}

/** Cliente con la clave secreta: salta RLS. Solo en el servidor y tras comprobar permisos. */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl, env.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
