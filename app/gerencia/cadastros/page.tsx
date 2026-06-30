import { Card } from "@/components/ui";
import {
  EmpresaForm,
  MotoristaForm,
  VeiculoForm,
} from "@/components/gerencia/cadastro-forms";
import { listEmpresas, listMotoristas, listVeiculos } from "@/lib/data/gerencia";

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function Cadastros() {
  const [empresas, motoristas, veiculos] = await Promise.all([
    listEmpresas(),
    listMotoristas(),
    listVeiculos(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Cadastros</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <Secao titulo="Motoristas">
          <Card className="divide-y divide-line">
            {motoristas.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">Nenhum motorista.</p>
            )}
            {motoristas.map((m) => (
              <div key={m.id} className="px-4 py-2.5 text-sm">
                <div className="font-medium text-ink">{m.nome ?? m.email}</div>
                <div className="text-muted">{m.telefone ?? m.email}</div>
              </div>
            ))}
          </Card>
          <Card className="p-4">
            <MotoristaForm veiculos={veiculos} />
          </Card>
        </Secao>

        <Secao titulo="Empresas">
          <Card className="divide-y divide-line">
            {empresas.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">Nenhuma empresa.</p>
            )}
            {empresas.map((e) => (
              <div key={e.id} className="px-4 py-2.5 text-sm font-medium text-ink">
                {e.nome}
              </div>
            ))}
          </Card>
          <Card className="p-4">
            <EmpresaForm />
          </Card>
        </Secao>

        <Secao titulo="Veículos">
          <Card className="divide-y divide-line">
            {veiculos.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">Nenhum veículo.</p>
            )}
            {veiculos.map((v) => (
              <div key={v.id} className="px-4 py-2.5 text-sm">
                <span className="font-medium text-ink">{v.placa}</span>{" "}
                <span className="text-muted">{v.tipo}</span>
              </div>
            ))}
          </Card>
          <Card className="p-4">
            <VeiculoForm />
          </Card>
        </Secao>
      </div>
    </div>
  );
}
