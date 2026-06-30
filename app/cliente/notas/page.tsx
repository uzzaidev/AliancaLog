import { Card } from "@/components/ui";

export default function ClienteNotas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Minhas entregas
        </h1>
        <p className="text-sm text-muted">
          Status e comprovantes das suas notas fiscais.
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">Em construção · Sprint 3.</span>{" "}
          Aqui virá a lista das NFs da sua empresa (filtradas automaticamente),
          com status em tempo real, filtros por período/status e o comprovante
          (foto do canhoto + horário + motorista).
        </p>
      </Card>
    </div>
  );
}
