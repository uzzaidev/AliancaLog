import { GerenciaTopbar } from "@/components/gerencia/topbar";
import { GerenciaBottomNav } from "@/components/gerencia/nav";
import { requireRole } from "@/lib/auth/dal";

export default async function GerenciaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("gerencia");
  return (
    <div className="min-h-full">
      <GerenciaTopbar email={user.email} />
      <main className="mx-auto max-w-[1400px] px-4 py-5 pb-20 sm:pb-5">
        {children}
      </main>
      <GerenciaBottomNav />
    </div>
  );
}
