import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import SetPasswordForm from "@/components/SetPasswordForm";
import { getUser } from "@/lib/auth";

/** Se llega desde /auth/confirm (invitación o recuperación) con la sesión ya creada. */
export default async function SetPasswordPage() {
  const user = await getUser();
  if (!user) redirect("/login?error=enlace");
  return (
    <AuthCard title="Elige tu contraseña" subtitle={user.email}>
      <SetPasswordForm />
    </AuthCard>
  );
}
