import { AppShell } from "@/components/app-shell";
import { GerenciaNav } from "@/components/gerencia/nav";
import { requireRole } from "@/lib/auth/dal";

export default async function GerenciaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("gerencia");
  return (
    <AppShell role="gerencia" email={user.email}>
      <GerenciaNav />
      {children}
    </AppShell>
  );
}
