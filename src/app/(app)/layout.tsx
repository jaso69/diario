import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { getUser, isAdmin } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  if (!user) redirect("/login");
  const admin = isAdmin(user);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold">
            Manuales
          </Link>
          <nav className="flex gap-4 text-sm text-fg-muted">
            <Link href="/" className="hover:text-fg">
              Consultar
            </Link>
            <Link href="/manuals" className="hover:text-fg">
              Biblioteca
            </Link>
            {admin && (
              <>
                <Link href="/admin/upload" className="hover:text-fg">
                  Subir manual
                </Link>
                <Link href="/admin/users" className="hover:text-fg">
                  Usuarios
                </Link>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-fg-subtle">
            <span className="hidden sm:inline">{user.email}</span>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button className="rounded-md border border-border-strong px-2.5 py-1 hover:bg-surface-muted">Salir</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
