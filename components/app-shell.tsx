// Casca padrão das áreas autenticadas: cabeçalho com a marca, identificação do
// usuário/perfil e botão de sair. Recebe os dados já resolvidos pela DAL.
import { type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui";
import { logout } from "@/lib/auth/actions";
import { ROLE_LABEL, type Role } from "@/lib/types";

export function AppShell({
  role,
  email,
  children,
}: {
  role: Role;
  email: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="text-ink" />
            <span className="hidden rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand sm:inline">
              {ROLE_LABEL[role]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {email && (
              <span className="hidden text-sm text-muted sm:inline">
                {email}
              </span>
            )}
            <form action={logout}>
              <Button variant="ghost" type="submit" className="px-3">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
