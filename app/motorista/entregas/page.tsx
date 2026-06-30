import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { ConfirmarButton } from "@/components/motorista/confirmar-button";
import { getRomaneiosDoDia } from "@/lib/data/motorista";

export default async function MotoristaEntregas() {
  const romaneios = await getRomaneiosDoDia();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">
        Minhas entregas · hoje
      </h1>

      {romaneios.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted">
          Nenhum romaneio para hoje.
        </Card>
      )}

      {romaneios.map((r) => (
        <Card key={r.id} className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">{r.total} NFs</span>
            <Badge tone={r.confirmado_em ? "info" : "neutral"}>
              {r.confirmado_em ? "Em andamento" : "Aguardando confirmação"}
            </Badge>
          </div>
          <div className="text-sm text-muted">
            {r.concluidas} de {r.total} concluídas
          </div>
          {r.confirmado_em ? (
            <Link href={`/motorista/romaneio/${r.id}`} className="block">
              <Button variant="secondary" className="w-full">
                Abrir entregas
              </Button>
            </Link>
          ) : (
            <ConfirmarButton romaneioId={r.id} />
          )}
        </Card>
      ))}
    </div>
  );
}
