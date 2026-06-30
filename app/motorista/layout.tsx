import { AppShell } from "@/components/app-shell";
import { SwRegister } from "@/components/motorista/sw-register";
import { SyncBanner } from "@/components/motorista/sync-banner";
import { requireRole } from "@/lib/auth/dal";

export default async function MotoristaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("motorista");
  return (
    <AppShell role="motorista" email={user.email}>
      <SwRegister />
      <div className="-mx-4 -mt-6 mb-4">
        <SyncBanner />
      </div>
      {children}
    </AppShell>
  );
}
