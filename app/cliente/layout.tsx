import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/dal";

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("cliente_final");
  return (
    <AppShell role="cliente_final" email={user.email}>
      {children}
    </AppShell>
  );
}
