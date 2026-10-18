import ThemeToggle from "./ThemeToggle";

/** Marco común de las pantallas sin sesión completa: login, recuperar y elegir contraseña. */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-16">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-fg-subtle">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}

export const inputClass =
  "mt-1 w-full rounded-md border border-border-strong bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export const primaryButtonClass =
  "w-full rounded-md bg-accent px-3 py-2 font-medium text-white hover:bg-accent-hover disabled:opacity-60";
