import { requireRole } from "@/lib/auth/dal";
import { Card } from "@/components/ui";
import { ClientTester } from "./client-tester";
import { existsSync } from "fs";
import { resolve } from "path";

export default async function DiagnosticoPage() {
  await requireRole("gerencia");

  const dsnServer = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  const dsnConfiguradaServer = !!dsnServer;

  // Mascara a DSN para não expor segredo completo na tela
  const dsnMascarada = dsnServer
    ? dsnServer.replace(/:\/\/([^:]+):?([^@]*)@/, "://***@")
    : "Não configurada";

  // Verifica se há arquivos de carga de usuários preparados
  const arqMotoristas = resolve(process.cwd(), "scripts", "dados", "motoristas.csv");
  const arqEmpresas = resolve(process.cwd(), "scripts", "dados", "empresas.csv");
  const temMotoristas = existsSync(arqMotoristas);
  const temEmpresas = existsSync(arqEmpresas);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Diagnóstico e Validação do Piloto
        </h1>
        <p className="text-sm text-muted mt-1">
          Ferramenta operacional da gerência para validação de monitoramento (Sentry),
          resiliência e status de carga antes da entrega ao cliente.
        </p>
      </div>

      {/* Card 1: Monitoramento Sentry */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Monitoramento de Erros (Sentry)</h2>
            <p className="text-xs text-muted">
              Captura falhas em tempo real, especialmente na fila offline do motorista.
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              dsnConfiguradaServer
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {dsnConfiguradaServer ? "● Ativo no Servidor" : "○ Variável DSN Pendente"}
          </span>
        </div>

        <div className="bg-canvas p-3 rounded-md text-xs font-mono break-all text-muted">
          <span className="text-ink font-semibold">DSN Detectada:</span> {dsnMascarada}
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Simulação e Teste de Conexão
          </h3>
          <ClientTester dsnConfiguradaServer={dsnConfiguradaServer} />
        </div>
      </Card>

      {/* Card 2: Status dos Cadastros para o Piloto */}
      <Card className="p-5 space-y-4">
        <div className="border-b border-line pb-3">
          <h2 className="text-base font-semibold text-ink">Carga em Lote de Usuários (Piloto)</h2>
          <p className="text-xs text-muted">
            Status dos arquivos de dados para os 16 motoristas e ~20 empresas clientes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-lg border border-line p-3 bg-surface flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">Motoristas (16)</p>
              <p className="text-xs text-muted">scripts/dados/motoristas.csv</p>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                temMotoristas
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-gray-100 text-gray-600 dark:bg-dark-3 dark:text-gray-300"
              }`}
            >
              {temMotoristas ? "Arquivo Pronto" : "Aguardando CSV"}
            </span>
          </div>

          <div className="rounded-lg border border-line p-3 bg-surface flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">Empresas Clientes (~20)</p>
              <p className="text-xs text-muted">scripts/dados/empresas.csv</p>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                temEmpresas
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-gray-100 text-gray-600 dark:bg-dark-3 dark:text-gray-300"
              }`}
            >
              {temEmpresas ? "Arquivo Pronto" : "Aguardando CSV"}
            </span>
          </div>
        </div>

        <div className="rounded-md bg-canvas p-3 text-xs text-muted space-y-1">
          <p className="font-medium text-ink">Como executar a carga quando o Vítor/Matheus enviarem a lista:</p>
          <code className="block bg-dark text-white p-2 rounded text-[11px] font-mono">
            npm run importar:piloto
          </code>
          <p className="pt-1">
            Ou acesse diretamente a aba{" "}
            <a href="/gerencia/cadastros" className="text-brand underline font-medium">
              Cadastros
            </a>{" "}
            para cadastrar pontualmente pela interface web.
          </p>
        </div>
      </Card>
    </div>
  );
}

