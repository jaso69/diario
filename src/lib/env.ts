function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  // Funciones para que solo fallen al usarse (y nunca se lean en el navegador)
  supabaseSecretKey: () => required("SUPABASE_SECRET_KEY"),
  n8nUrl: () => required("N8N_URL").replace(/\/$/, ""),
  n8nApiKey: () => required("N8N_API_KEY"),
  anthropicApiKey: () => required("ANTHROPIC_API_KEY"),
  // Solo en desarrollo: origen con el que el VPS/Docker alcanza Supabase (p.ej. http://host.docker.internal:54321)
  ingestFileBaseUrl: () => process.env.INGEST_FILE_BASE_URL,
};
