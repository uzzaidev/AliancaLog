import { ClienteHeader } from "@/components/cliente/header";
import { ClienteNav } from "@/components/cliente/nav";
import { requireRole } from "@/lib/auth/dal";

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("cliente_final");
  return (
    <div className="min-h-full bg-canvas">
      <ClienteHeader empresa={user.nome ?? user.email} />
      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <ClienteNav />
        {children}
      </main>
    </div>
  );
}
