import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/dal";
import { ROLE_HOME } from "@/lib/types";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Se já estiver logado, vai direto para a home do perfil.
  const user = await getSessionUser();
  if (user?.role) redirect(ROLE_HOME[user.role]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo className="text-2xl text-ink" />
          <p className="text-sm text-muted">
            Controle de canhotos em tempo real
          </p>
        </div>
        <Card className="p-6">
          <LoginForm />
        </Card>
        <p className="mt-6 text-center text-xs text-muted">
          Rotta Logística · desenvolvido por UzzAI
        </p>
      </div>
    </div>
  );
}
