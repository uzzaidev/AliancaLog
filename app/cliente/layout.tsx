import { AppShell } from "@/components/app-shell";
import { ClienteNav } from "@/components/cliente/nav";
import { requireRole } from "@/lib/auth/dal";

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("cliente_final");
  return (
    <AppShell role="cliente_final" email={user.email}>
      <ClienteNav />
      {children}
    </AppShell>
  );
}
