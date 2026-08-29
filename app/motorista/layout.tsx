import { MotoristaHeader } from "@/components/motorista/header";
import { PosicaoTracker } from "@/components/motorista/posicao-tracker";
import { SwRegister } from "@/components/motorista/sw-register";
import { SyncBanner } from "@/components/motorista/sync-banner";
import { requireRole } from "@/lib/auth/dal";
import { getRomaneiosDoDia } from "@/lib/data/motorista";
import { RealtimeRefresher } from "@/components/gerencia/realtime-refresher";

export default async function MotoristaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("motorista");
  const romaneios = await getRomaneiosDoDia();
  const total = romaneios.reduce((s, r) => s + r.total, 0);
  const feitas = romaneios.reduce((s, r) => s + r.concluidas, 0);
  // getRomaneiosDoDia já filtra status='ativo' (A-001) — só falta checar se
  // algum já foi confirmado pelo motorista (saiu pra rua de fato).
  const rastreando = romaneios.some((r) => r.confirmado_em !== null);

  return (
    <div className="min-h-full bg-canvas">
      <SwRegister />
      <RealtimeRefresher channel="motorista-atualizacao" showIndicator={false} />
      <PosicaoTracker motoristaId={user.id} ativo={rastreando} />
      <MotoristaHeader
        nome={user.nome ?? user.email ?? "Motorista"}
        stats={{ total, feitas, pendentes: total - feitas }}
      />
      <SyncBanner />
      <main className="mx-auto max-w-md px-4 py-4">{children}</main>
    </div>
  );
}
