import AuthCard from "@/components/AuthCard";
import LoginForm from "@/components/LoginForm";

const NOTICES: Record<string, string> = {
  enlace: "El enlace no es válido o ha caducado. Pide al administrador una nueva invitación o usa «¿Has olvidado tu contraseña?».",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <AuthCard title="Consulta de manuales" subtitle="Inicia sesión para continuar">
      <LoginForm notice={typeof error === "string" ? NOTICES[error] : undefined} />
    </AuthCard>
  );
}
