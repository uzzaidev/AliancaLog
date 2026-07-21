import { Card } from "@/components/ui";
import {
  EmpresaForm,
  MotoristaForm,
  VeiculoForm,
} from "@/components/gerencia/cadastro-forms";
import { CadastroItemActions } from "@/components/gerencia/cadastro-item-actions";
import {
  alternarAtivoEmpresa,
  alternarAtivoMotorista,
  alternarAtivoVeiculo,
  excluirEmpresa,
  excluirMotorista,
  excluirVeiculo,
} from "@/app/gerencia/cadastros/actions";
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

function TagInativo() {
  return (
    <span className="ml-2 rounded-full bg-canvas px-1.5 py-0.5 text-xs font-medium text-muted">
      inativo
    </span>
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
                <div className="font-medium text-ink">
                  {m.nome ?? m.email}
                  {!m.ativo && <TagInativo />}
                </div>
                <div className="text-muted">{m.telefone ?? m.email}</div>
                <CadastroItemActions
                  ativo={m.ativo}
                  itemLabel={`o motorista ${m.nome ?? m.email}`}
                  onToggle={alternarAtivoMotorista.bind(null, m.id, !m.ativo)}
                  onExcluir={excluirMotorista.bind(null, m.id)}
                />
              </div>
            ))}
          </Card>
          <Card className="p-4">
            <MotoristaForm veiculos={veiculos.filter((v) => v.ativo)} />
          </Card>
        </Secao>

        <Secao titulo="Empresas">
          <Card className="divide-y divide-line">
            {empresas.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">Nenhuma empresa.</p>
            )}
            {empresas.map((e) => (
              <div key={e.id} className="px-4 py-2.5 text-sm">
                <div className="font-medium text-ink">
                  {e.nome}
                  {!e.ativo && <TagInativo />}
                </div>
                <CadastroItemActions
                  ativo={e.ativo}
                  itemLabel={`a empresa ${e.nome}`}
                  onToggle={alternarAtivoEmpresa.bind(null, e.id, !e.ativo)}
                  onExcluir={excluirEmpresa.bind(null, e.id)}
                />
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
                <div className="font-medium text-ink">
                  {v.placa} <span className="font-normal text-muted">{v.tipo}</span>
                  {!v.ativo && <TagInativo />}
                </div>
                <CadastroItemActions
                  ativo={v.ativo}
                  itemLabel={`o veículo ${v.placa}`}
                  onToggle={alternarAtivoVeiculo.bind(null, v.id, !v.ativo)}
                  onExcluir={excluirVeiculo.bind(null, v.id)}
                />
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
